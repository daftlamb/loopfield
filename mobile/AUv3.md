# AUv3 instrument host — development build 12

First iteration: use installed AUv3 instruments inside Loopfield on iOS. This does not turn Loopfield into an AUv3 extension and does not host AUv3 effects.

## Use

Select a track, open SOUND, and tap the INSTRUMENT choice (initially BUILT-IN). Select an installed instrument, then OPEN for its editor. Choose BUILT-IN to return to the internal synth. Each of the eight track slots has one project-wide instrument assignment shared by all patterns.

The sequencer sends notes, velocity, gate lengths, ratchets, probability decisions and generated arpeggio notes. Master level and track level, pan, mute and solo affect plugin output. Plugin state is captured periodically and before project export, library copies and project replacement. State uses Apple's fullStateForDocument; external sample files are not bundled. Keep the plugin app installed. Missing plugins retain their saved project assignment/state and show an error until reinstalled or replaced.

## First-iteration limits

- Native plugin audio bypasses Web Audio effects, sound LFO modulation and the audio analyzer used by reactive visuals.
- Projects containing AUv3 assignments cannot export WAV yet. JSON project export remains available.
- No host tempo/transport callbacks or plugin parameter automation. An instrument's internal tempo-synced effects/arpeggiator will not follow Loopfield BPM automatically.
- MIDI dispatch uses a 2 ms control-thread timer and next-render-cycle delivery. It is not sample accurate, and UI stalls can introduce jitter. Timing under plugin-editor interaction requires device testing.
- Main mono/stereo instrument output only; no MIDI processors, multiple output buses, AU effects or generic parameter editor for editor-less plugins.
- Instrument state limited to approximately 1.5 MB binary per slot (2 million base64 characters); combined serialized states limited to 12 million characters. Project import limit is 16 MiB.
- Current arpeggio events use planned note durations; cross-step cancellation is not yet equivalent to the internal synth for every arp mode.

## Validation

63 JavaScript tests pass, including legacy project compatibility, assignment/state validation, timestamp conversion, missing-plugin retry, cancellation during loading, mix/solo forwarding, state capture without reinstantiation and unsupported browser/WAV paths. Static/mobile bundles and signed Debug iOS build pass.

Discovery initially returned only Apple components because the host was missing its inter-app-audio signing entitlement. After adding this entitlement to both Debug and Release, the signed Debug build on iPhone `mog` discovers 16 AUv3 instrument components, including Tabla and SYNQUAD (verified 2026-10-02). Both component descriptor and registered flags are 14, so the existing AUv3 filter accepts them. Third-party instantiation, plugin editor interaction, multi-plugin load, preset sound restoration, interruption recovery and long-run timing in Loopfield remain unverified. Do not treat this build as release-qualified AUv3 support.

Debug-only `--loopfield-au-list` writes Documents/auv3-instruments.json. `--loopfield-au-probe` uses Apple's sampler and a generated sine sample through the host graph/MIDI queue and writes Documents/auv3-audio-check.json. This is an internal audio-path check, not a third-party AUv3 compatibility test. Normal launches do not run either diagnostic. On mog, the final sampler check accepted both note events, measured scheduled audio peak 0.0107032, drained the event queue, saved/restored state, and stopped the engine successfully.

## Apple references

- https://developer.apple.com/documentation/avfaudio/avaudiounit/instantiate(with:options:completionhandler:)
- https://developer.apple.com/documentation/audiotoolbox/auaudiounit/requestviewcontroller(completionhandler:)
- https://developer.apple.com/documentation/audiotoolbox/auaudiounit/fullstatefordocument
- https://developer.apple.com/documentation/audiotoolbox/1387633-aueventsampletime

The component manager is retained for the host lifetime. Debug list diagnostics include unfiltered instrument names, IDs and both descriptor/registered flags, with a second snapshot after startup. The entitlement must remain enabled when signing future TestFlight builds.

## Live instrument replacement — 2026-10-02

Selecting a different instrument no longer stops or resets the sequencer. The project assignment stays unchanged while the replacement loads. Native configuration instantiates and validates the new unit before detaching the old slot, clears only that slot's pending MIDI/active notes, and leaves other units and their queued events running. Loading errors keep the original project assignment. Explicit Stop/background interruption cancels the pending replacement without restarting transport. A short sound discontinuity on the replaced track is still possible; this is not crossfaded switching.

65 JavaScript tests pass, including deferred replacement and Stop cancellation. Signed iPhone test with Tabla → SYNQUAD reports engineStillRunning=true, otherInstrumentPreserved=true, otherNotesPreserved=true, replacementLoaded=SYNQUAD, errors=[]. Debug-only --loopfield-au-switch writes Documents/auv3-switch-check.json. This checks live graph replacement and scheduling preservation; subjective glitches and plugin-specific behavior still require listening tests.

## Opening plugin editors without stopping — 2026-10-02

Sonic Synth reproduced a separate interruption: presenting its editor with `.fullScreen` removed the sequencer WKWebView from the window. The web visibility handler then stopped audio. Presenting with `.overFullScreen` keeps the underlying web view attached without bypassing actual app-background or audio-interruption handlers.

Signed iPhone regression probe (`--loopfield-au-editor`, `Documents/auv3-editor-check.json`) loads Sonic Synth and opens the normal host editor. Before the fix: editorPresented=true, runningBeforeEditor=true, runningWithEditor=false, sequencerViewInWindow=false. After the fix: all four are true. The probe verifies native playback remains active through presentation; parameter interaction and extended listening remain manual checks.
