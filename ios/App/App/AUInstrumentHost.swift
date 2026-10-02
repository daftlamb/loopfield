import UIKit
import WebKit
import AVFoundation
import AudioToolbox
import CoreAudioKit

// The web sequencer owns musical decisions; this host owns plugin instances and rendering.
final class AUInstrumentHost: NSObject, WKScriptMessageHandlerWithReply {
    weak var owner: UIViewController?
    weak var webView: WKWebView?
    private let componentManager = AVAudioUnitComponentManager.shared()
    private var engine = AVAudioEngine()
    private var units = [Int: AVAudioUnit]()
    private var mixers = [Int: AVAudioMixerNode]()
    private var assignments = [Int: [String: Any]]()
    private var generation = 0
    private var configuring = false
    private struct MIDIEvent {
        var track: Int; var note: UInt8; var velocity: UInt8; var at: Double; var token: Int; var on: Bool
    }
    private var pending = [MIDIEvent]()
    private var active = [Int: Int]()
    private var nextToken = 0
    private var timer: Timer?
    private var observers = [NSObjectProtocol]()
    private var editor: AUPluginEditor?
    init(owner: UIViewController, webView: WKWebView?) {
        self.owner = owner; self.webView = webView
        super.init()
        for name in [UIApplication.willResignActiveNotification, AVAudioSession.interruptionNotification, AVAudioSession.routeChangeNotification, AVAudioSession.mediaServicesWereResetNotification] {
            observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] notification in
                if name == AVAudioSession.interruptionNotification,
                   let type = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                   type != AVAudioSession.InterruptionType.began.rawValue { return }
                if name == AVAudioSession.routeChangeNotification,
                   let reason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
                   reason != AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue { return }
                self?.stop()
                if name == AVAudioSession.mediaServicesWereResetNotification {
                    self?.units.removeAll(); self?.mixers.removeAll(); self?.assignments.removeAll()
                    self?.engine = AVAudioEngine()
                    self?.webView?.evaluateJavaScript("window.dispatchEvent(new Event('loopfield-au-reset'))", completionHandler: nil)
                }
            })
        }
    }
    deinit { timer?.invalidate(); for observer in observers { NotificationCenter.default.removeObserver(observer) } }
    #if DEBUG
    func runAudioDiagnostic() {
        // Exercise the same host graph and MIDI path with Apple's sampler when
        // the device has no third-party AUv3 instruments installed.
        let sampler = AVAudioUnitSampler(), mixer = AVAudioMixerNode()
        let lock = NSLock(); var peak: Float = 0
        var result: [String: Any] = ["thirdPartyInstruments": instruments().count]
        func finish() {
            self.stop(); self.engine.mainMixerNode.removeTap(onBus: 0)
            self.engine.disconnectNodeOutput(sampler); self.engine.detach(sampler)
            self.engine.disconnectNodeOutput(mixer); self.engine.detach(mixer)
            self.units.removeAll(); self.mixers.removeAll(); self.assignments.removeAll()
            if let data = try? JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted]), let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
                try? data.write(to: directory.appendingPathComponent("auv3-audio-check.json"), options: .atomic)
            }
        }
        do {
            let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 1)!
            let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 44100)!
            buffer.frameLength = 44100
            for i in 0..<44100 { buffer.floatChannelData![0][i] = Float(sin(Double(i) * 2 * .pi * 261.6256 / 44100)) * 0.2 }
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("loopfield-au-test.caf")
            do { let file = try AVAudioFile(forWriting: url, settings: format.settings); try file.write(from: buffer) }
            try sampler.loadAudioFiles(at: [url])
            self.engine.attach(sampler); self.engine.attach(mixer)
            self.engine.connect(sampler, to: mixer, format: nil); self.engine.connect(mixer, to: self.engine.mainMixerNode, format: nil)
            self.units[0] = sampler; self.mixers[0] = mixer; self.assignments[0] = ["id": "0:0:0", "name": "Diagnostic sampler"]
            self.engine.mainMixerNode.outputVolume = 0.2
            self.engine.mainMixerNode.installTap(onBus: 0, bufferSize: 512, format: nil) { buffer, _ in
                guard let channels = buffer.floatChannelData else { return }
                var value: Float = 0
                for i in 0..<Int(buffer.frameLength) { value = max(value, abs(channels[0][i])) }
                lock.lock(); peak = max(peak, value); lock.unlock()
            }
            try AVAudioSession.sharedInstance().setActive(true); try self.startRendering()
            result["midiSchedulingAvailable"] = sampler.auAudioUnit.scheduleMIDIEventBlock != nil
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                result["runningBeforeNote"] = self.engine.isRunning
                result["renderTime"] = String(describing: sampler.lastRenderTime)
                let event: [String: Any] = ["note": 60, "velocity": 100, "at": Date().timeIntervalSince1970 * 1000 + 100, "duration": 0.2]
                self.schedule(["track": 0, "events": [event]])
                result["acceptedEvents"] = self.pending.count
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                lock.lock(); result["scheduledPeak"] = peak; lock.unlock()
                result["pendingCount"] = self.pending.count
                result["runningAfterNote"] = self.engine.isRunning
                sampler.startNote(60, withVelocity: 100, onChannel: 0)
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
                lock.lock(); result["peak"] = peak; lock.unlock()
                do {
                    let saved = try self.states()
                    let data = (saved[0] as? [String: Any])?["state"] as? String
                    result["stateSaved"] = data != nil
                    if let data, let raw = Data(base64Encoded: data), let state = try PropertyListSerialization.propertyList(from: raw, format: nil) as? [String: Any] {
                        sampler.auAudioUnit.fullStateForDocument = state; result["stateRestored"] = true
                    }
                } catch { result["stateError"] = error.localizedDescription }
                self.stop(); result["stopped"] = !self.engine.isRunning && self.pending.isEmpty
                finish()
            }
        } catch { result["error"] = error.localizedDescription; finish() }
    }
    func runSwitchDiagnostic() {
        let list = instruments()
        guard let tabla = list.first(where: { $0.name == "Tabla" }), let syn = list.first(where: { $0.name == "SYNQUAD" }) else { return }
        let t: [String: Any] = ["id": identifier(tabla.audioComponentDescription), "name": tabla.name]
        let s: [String: Any] = ["id": identifier(syn.audioComponentDescription), "name": syn.name]
        var slots: [Any] = [t, s] + Array(repeating: NSNull(), count: 6)
        func report(_ result: [String: Any]) {
            self.stop()
            if let data = try? JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted]), let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
                try? data.write(to: directory.appendingPathComponent("auv3-switch-check.json"), options: .atomic)
            }
        }
        configure(["slots": slots]) { value, error in
            guard error == nil, (value as? [String: Any])?["errors"] as? [String] == [] else { report(["error": error ?? String(describing: value)]); return }
            do { try AVAudioSession.sharedInstance().setActive(true); try self.startRendering() }
            catch { report(["error": error.localizedDescription]); return }
            let otherUnit = self.units[1]
            let event: [String: Any] = ["note": 36, "velocity": 100, "at": Date().timeIntervalSince1970 * 1000 + 9000, "duration": 0.2]
            self.schedule(["track": 1, "events": [event]])
            slots[0] = s
            self.configure(["slots": slots]) { value, error in
                report(["error": error ?? "", "result": value ?? NSNull(),
                        "engineStillRunning": self.engine.isRunning,
                        "otherInstrumentPreserved": self.units[1] === otherUnit,
                        "otherNotesPreserved": self.pending.contains(where: { $0.track == 1 }),
                        "replacementLoaded": self.assignments[0]?["name"] as? String ?? ""])
            }
        }
    }
    func writeInstrumentDiagnostic() {
        let query = AudioComponentDescription(componentType: kAudioUnitType_MusicDevice, componentSubType: 0, componentManufacturer: 0, componentFlags: 0, componentFlagsMask: 0)
        let result = componentManager.components(matching: query).map { component -> [String: Any] in
            var registered = AudioComponentDescription()
            let status = AudioComponentGetDescription(component.audioComponent, &registered)
            return ["id": identifier(component.audioComponentDescription), "name": component.name,
                    "descriptorFlags": component.audioComponentDescription.componentFlags,
                    "registeredFlags": registered.componentFlags, "status": status]
        }
        if let data = try? JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted]),
           let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            try? data.write(to: directory.appendingPathComponent("auv3-instruments.json"), options: .atomic)
        }
    }
    #endif
    private func identifier(_ d: AudioComponentDescription) -> String { "\(d.componentType):\(d.componentSubType):\(d.componentManufacturer)" }
    private func instruments() -> [AVAudioUnitComponent] {
        let d = AudioComponentDescription(componentType: kAudioUnitType_MusicDevice, componentSubType: 0, componentManufacturer: 0, componentFlags: 0, componentFlagsMask: 0)
        return componentManager.components(matching: d).filter {
            $0.audioComponentDescription.componentFlags & AudioComponentFlags.isV3AudioUnit.rawValue != 0
        }.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.protocol == "capacitor",
              let body = message.body as? [String: Any], let action = body["action"] as? String else {
            replyHandler(nil, "Invalid AUv3 request"); return
        }
        switch action {
        case "list": replyHandler(["instruments": instruments().map { ["id": identifier($0.audioComponentDescription), "name": $0.name] }], nil)
        case "configure": configure(body, reply: replyHandler)
        case "start":
            do { try AVAudioSession.sharedInstance().setActive(true); if !units.isEmpty && !engine.isRunning { try startRendering() }; replyHandler([:], nil) }
            catch { replyHandler(nil, error.localizedDescription) }
        case "stop": stop(); replyHandler([:], nil)
        case "mix":
            engine.mainMixerNode.outputVolume = Float(clamp(body["master"], 0, 1, 0.58)) * 0.65
            if let tracks = body["tracks"] as? [[String: Any]] {
                for (i, track) in tracks.prefix(8).enumerated() {
                    mixers[i]?.outputVolume = (track["mute"] as? Bool == true) ? 0 : Float(clamp(track["volume"], 0, 1, 0.5))
                    mixers[i]?.pan = Float(clamp(track["pan"], -1, 1, 0))
                }
            }
            replyHandler([:], nil)
        case "notes": schedule(body); replyHandler([:], nil)
        case "states":
            do { replyHandler(["slots": try states()], nil) } catch { replyHandler(nil, error.localizedDescription) }
        case "show": show(body, reply: replyHandler)
        default: replyHandler(nil, "Unknown AUv3 action")
        }
    }
    private func clamp(_ value: Any?, _ low: Double, _ high: Double, _ fallback: Double) -> Double {
        guard let number = value as? Double, number.isFinite else { return fallback }
        return min(high, max(low, number))
    }
    private func configure(_ body: [String: Any], reply completion: @escaping (Any?, String?) -> Void) {
        var completed = false
        func reply(_ value: Any?, _ error: String?) { guard !completed else { return }; completed = true; completion(value, error) }
        guard !configuring, let slots = body["slots"] as? [Any], slots.count == 8 else { reply(nil, "Instrument loading is busy or invalid"); return }
        configuring = true; let request = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
            guard !completed, let self else { return }
            self.configuring = false; reply(nil, "Instrument loading timed out. Try again or choose BUILT-IN.")
        }
        let components = instruments()
        func load(_ index: Int, _ errors: [String]) {
            guard !completed else { return }
            guard self.generation == request else { self.configuring = false; reply(nil, "Instrument loading cancelled"); return }
            guard index < 8 else { self.configuring = false; reply(["errors": errors], nil); return }
            let slot = slots[index] as? [String: Any]
            if let slot, let previous = self.assignments[index], NSDictionary(dictionary: slot).isEqual(to: previous), self.units[index] != nil { load(index + 1, errors); return }
            guard let slot else { self.removeTrack(index); load(index + 1, errors); return }
            guard let id = slot["id"] as? String, let component = components.first(where: { self.identifier($0.audioComponentDescription) == id }) else {
                load(index + 1, errors + ["Track \(index + 1): instrument missing. Install its app or choose BUILT-IN."]); return
            }
            AVAudioUnit.instantiate(with: component.audioComponentDescription, options: .loadOutOfProcess) { [weak self] unit, error in
                DispatchQueue.main.async {
                    guard let self else { return }
                    guard !completed else { return }
                    guard self.generation == request else { self.configuring = false; reply(nil, "Instrument loading cancelled"); return }
                    guard let unit, unit.auAudioUnit.scheduleMIDIEventBlock != nil else {
                        load(index + 1, errors + [error?.localizedDescription ?? "Instrument has no MIDI input"]); return
                    }
                    do {
                        if let encoded = slot["state"] as? String, !encoded.isEmpty {
                            guard encoded.count <= 2_000_000, let data = Data(base64Encoded: encoded),
                                  let state = try PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] else { throw self.failure("Invalid plugin state") }
                            unit.auAudioUnit.fullStateForDocument = state
                        }
                        let format = unit.outputFormat(forBus: 0)
                        guard format.channelCount > 0, format.channelCount <= 2, format.sampleRate > 0 else { throw self.failure("This instrument needs an unsupported output format") }
                        let mixer = AVAudioMixerNode()
                        self.removeTrack(index)
                        self.engine.attach(unit); self.engine.attach(mixer)
                        self.engine.connect(unit, to: mixer, format: format)
                        self.engine.connect(mixer, to: self.engine.mainMixerNode, format: nil)
                        self.units[index] = unit; self.mixers[index] = mixer; self.assignments[index] = slot
                        load(index + 1, errors)
                    } catch { load(index + 1, errors + [error.localizedDescription]) }
                }
            }
        }
        load(0, [])
    }
    // Only the replaced slot is silenced; the transport and other units keep running.
    private func removeTrack(_ index: Int) {
        pending.removeAll { $0.track == index }
        active = active.filter { $0.key / 128 != index }
        if let old = units.removeValue(forKey: index) {
            old.auAudioUnit.reset()
            engine.disconnectNodeOutput(old); engine.detach(old)
        }
        if let old = mixers.removeValue(forKey: index) { engine.disconnectNodeOutput(old); engine.detach(old) }
        assignments.removeValue(forKey: index)
    }
    private func failure(_ message: String) -> NSError { NSError(domain: "Loopfield.AUv3", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
    private func startRendering() throws {
        engine.prepare(); try engine.start()
        guard timer == nil else { return }
        let timer = Timer(timeInterval: 0.002, repeats: true) { [weak self] _ in self?.flushMIDI() }
        RunLoop.main.add(timer, forMode: .common); self.timer = timer
    }
    func stop() {
        timer?.invalidate(); timer = nil
        generation += 1; pending.removeAll(); active.removeAll()
        for unit in units.values {
            if let send = unit.auAudioUnit.scheduleMIDIEventBlock {
                for cc: UInt8 in [64, 123, 120] { let bytes: [UInt8] = [0xB0, cc, 0]; bytes.withUnsafeBufferPointer { send(AUEventSampleTimeImmediate, 0, 3, $0.baseAddress!) } }
            }
        }
        engine.pause()
        for unit in units.values { unit.auAudioUnit.reset() }
    }
    private func schedule(_ body: [String: Any]) {
        guard engine.isRunning, let index = body["track"] as? Int, units[index] != nil,
              let events = body["events"] as? [[String: Any]], events.count <= 512 else { return }
        let wall = Date().timeIntervalSince1970 * 1000
        for event in events {
            guard let note = event["note"] as? Int, (0...127).contains(note), let at = event["at"] as? Double, at.isFinite,
                  at >= wall - 2000, at <= wall + 10000 else { continue }
            nextToken += 1
            let velocity = UInt8(clamp(event["velocity"], 1, 127, 100)), duration = clamp(event["duration"], 0.005, 8, 0.1)
            pending.append(MIDIEvent(track: index, note: UInt8(note), velocity: velocity, at: at, token: nextToken, on: true))
            pending.append(MIDIEvent(track: index, note: UInt8(note), velocity: 0, at: at + duration * 1000, token: nextToken, on: false))
        }
        pending.sort { $0.at == $1.at ? (!$0.on && $1.on) : $0.at < $1.at }
        flushMIDI()
    }
    // Keep future events cancellable, then submit due MIDI for the next render cycle.
    // This first host uses a control-thread timer, not sample-accurate scheduling.
    private func flushMIDI() {
        guard engine.isRunning else { return }
        let wall = Date().timeIntervalSince1970 * 1000
        while let event = pending.first, event.at <= wall {
            guard let unit = units[event.track], let send = unit.auAudioUnit.scheduleMIDIEventBlock else { pending.removeFirst(); continue }
            pending.removeFirst()
            let key = event.track * 128 + Int(event.note)
            let at = AUEventSampleTimeImmediate
            func midi(_ status: UInt8, _ velocity: UInt8) {
                let bytes: [UInt8] = [status, event.note, velocity]
                bytes.withUnsafeBufferPointer { send(at, 0, 3, $0.baseAddress!) }
            }
            if event.on {
                if active[key] != nil { midi(0x80, 0) }
                midi(0x90, event.velocity); active[key] = event.token
            } else if active[key] == event.token { midi(0x80, 0); active.removeValue(forKey: key) }
        }
    }
    private func states() throws -> [Any] {
        try (0..<8).map { index -> Any in
            guard var slot = assignments[index], let unit = units[index] else { return NSNull() }
            if let state = unit.auAudioUnit.fullStateForDocument {
                let data = try PropertyListSerialization.data(fromPropertyList: state, format: .binary, options: 0)
                let encoded = data.base64EncodedString()
                guard encoded.count <= 2_000_000 else { throw failure("Track \(index + 1): plugin state is too large to save (1.5 MB limit)") }
                slot["state"] = encoded
            }
            assignments[index] = slot
            return slot
        }
    }
    private func show(_ body: [String: Any], reply: @escaping (Any?, String?) -> Void) {
        guard let index = body["track"] as? Int, let unit = units[index], editor == nil else { reply(nil, "Load an instrument first"); return }
        unit.auAudioUnit.requestViewController { [weak self] view in
            DispatchQueue.main.async {
                guard let self, let owner = self.owner, owner.presentedViewController == nil else { reply(nil, "Another editor is open"); return }
                guard let view else { reply(nil, "This plugin does not provide an editor"); return }
                let editor = AUPluginEditor(plugin: view, name: self.assignments[index]?["name"] as? String ?? "AUv3")
                self.editor = editor
                editor.onClose = { [weak self] in
                    self?.editor = nil
                    self?.webView?.evaluateJavaScript("window.dispatchEvent(new Event('loopfield-au-state'))", completionHandler: nil)
                    reply([:], nil)
                }
                editor.modalPresentationStyle = .fullScreen
                owner.present(editor, animated: true)
            }
        }
    }
}

private final class AUPluginEditor: UIViewController {
    let plugin: UIViewController
    let pluginName: String
    var onClose: (() -> Void)?
    init(plugin: UIViewController, name: String) { self.plugin = plugin; pluginName = name; super.init(nibName: nil, bundle: nil) }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = .black
        let title = UILabel(); title.text = pluginName; title.textColor = .white; title.font = .monospacedSystemFont(ofSize: 14, weight: .regular)
        let close = UIButton(type: .system); close.setTitle("×", for: .normal); close.titleLabel?.font = .monospacedSystemFont(ofSize: 26, weight: .regular); close.tintColor = .white; close.accessibilityLabel = "Close instrument"
        close.addTarget(self, action: #selector(done), for: .touchUpInside)
        addChild(plugin); view.addSubview(title); view.addSubview(close); view.addSubview(plugin.view); plugin.didMove(toParent: self)
        for child in [title, close, plugin.view!] { child.translatesAutoresizingMaskIntoConstraints = false }
        NSLayoutConstraint.activate([
            title.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16), title.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), title.heightAnchor.constraint(equalToConstant: 44), title.trailingAnchor.constraint(lessThanOrEqualTo: close.leadingAnchor, constant: -8),
            close.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -8), close.topAnchor.constraint(equalTo: title.topAnchor), close.widthAnchor.constraint(equalToConstant: 44), close.heightAnchor.constraint(equalToConstant: 44),
            plugin.view.topAnchor.constraint(equalTo: title.bottomAnchor), plugin.view.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor), plugin.view.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor), plugin.view.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])
    }
    @objc private func done() { dismiss(animated: true) { [weak self] in self?.onClose?(); self?.onClose = nil } }
}
