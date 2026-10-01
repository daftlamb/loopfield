import UIKit
import Capacitor
import AVFAudio
import WebKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = LoopfieldViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

final class LoopfieldViewController: CAPBridgeViewController {
    private var observers: [NSObjectProtocol] = []
    private var lastShake: TimeInterval = -.infinity
    private var paletteStatusStyle: UIStatusBarStyle = .darkContent
    private lazy var appearanceHandler = PaletteAppearanceHandler(owner: self)
    override var preferredStatusBarStyle: UIStatusBarStyle { paletteStatusStyle }
    private var visualMode = false
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { visualMode ? .allButUpsideDown : .portrait }
    private var immersive: Bool { visualMode && (view.window?.windowScene?.interfaceOrientation.isLandscape ?? false) }
    override var prefersStatusBarHidden: Bool { immersive }
    fileprivate func updateVisualMode(_ enabled: Bool) {
        guard visualMode != enabled else { return }
        visualMode = enabled
        setNeedsUpdateOfSupportedInterfaceOrientations()
        if !enabled { view.window?.windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: .portrait)) }
        setNeedsStatusBarAppearanceUpdate()
        setNeedsUpdateOfHomeIndicatorAutoHidden()
    }
    override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
        super.viewWillTransition(to: size, with: coordinator)
        coordinator.animate(alongsideTransition: { [weak self] _ in
            self?.setNeedsStatusBarAppearanceUpdate()
            self?.setNeedsUpdateOfHomeIndicatorAutoHidden()
        })
    }
    override var canBecomeFirstResponder: Bool { true }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        becomeFirstResponder()
    }

    override func motionEnded(_ motion: UIEvent.EventSubtype, with event: UIEvent?) {
        guard motion == .motionShake, UIApplication.shared.applicationState == .active else { return }
        let now = ProcessInfo.processInfo.systemUptime
        guard now - lastShake >= 1.2 else { return }
        lastShake = now
        webView?.evaluateJavaScript("window.dispatchEvent(new Event('loopfield-shake'))", completionHandler: nil)
    }

    fileprivate func updatePalette(_ name: String) {
        guard ["paper", "gameboy", "amber", "midnight", "ink", "mono", "eva", "cyber"].contains(name) else { return }
        paletteStatusStyle = ["amber", "midnight", "mono", "eva", "cyber"].contains(name) ? .lightContent : .darkContent
        setNeedsStatusBarAppearanceUpdate()
    }
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.scrollView.bounces = false
        UIApplication.shared.applicationSupportsShakeToEdit = false
        webView?.configuration.userContentController.add(appearanceHandler, name: "loopfieldAppearance")
        webView?.configuration.userContentController.add(appearanceHandler, name: "loopfieldVisual")
        let center = NotificationCenter.default
        for name in [UIApplication.willResignActiveNotification, AVAudioSession.interruptionNotification, AVAudioSession.mediaServicesWereResetNotification] {
            observers.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] notification in
                if name == AVAudioSession.interruptionNotification,
                   let type = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                   type != AVAudioSession.InterruptionType.began.rawValue { return }
                self?.webView?.evaluateJavaScript("window.dispatchEvent(new Event('loopfield-interruption'))", completionHandler: nil)
            })
        }
        observers.append(center.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] notification in
            guard let reason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
                  reason == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue else { return }
            self?.webView?.evaluateJavaScript("window.dispatchEvent(new Event('loopfield-interruption'))", completionHandler: nil)
        })
        observers.append(center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            self?.webView?.evaluateJavaScript("window.dispatchEvent(new Event('loopfield-active'))", completionHandler: nil)
        })
    }
    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "loopfieldAppearance")
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "loopfieldVisual")
        for observer in observers { NotificationCenter.default.removeObserver(observer) }
    }
}

// WKUserContentController retains its handler, so the handler keeps only a weak owner.
private final class PaletteAppearanceHandler: NSObject, WKScriptMessageHandler {
    weak var owner: LoopfieldViewController?
    init(owner: LoopfieldViewController) { self.owner = owner }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame else { return }
        if message.name == "loopfieldVisual", let enabled = message.body as? Bool {
            owner?.updateVisualMode(enabled)
            return
        }
        guard let palette = message.body as? String else { return }
        owner?.updatePalette(palette)
    }
}
