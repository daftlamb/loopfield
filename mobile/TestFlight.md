# Loopfield 1.0 (7)

Release archive and App Store Connect distribution-signed IPA exported on 2026-09-15.

- Bundle ID: `com.daftlamb.loopfield`
- Team: `AC8ABF9K2Q`
- Version: `1.0`, build: `7`
- Icon: pixel LOOP / FIELD wordmark, 1024 × 1024 RGB PNG, no alpha.
- Archive: `../Loopfield-Releases/1.0-7/Loopfield.xcarchive`
- IPA: `../Loopfield-Releases/1.0-7/IPA/App.ipa`
- Upload options: `../Loopfield-Releases/1.0-7/ExportOptions.plist`
- App Store Connect app ID: `6811978571` (created successfully).
- Current status: **uploaded successfully** on 2026-09-15 at 00:58 CST. Xcode reports `Upload succeeded` and `EXPORT SUCCEEDED`; Apple accepted the package and began processing. TestFlight availability is still pending.
- Verification: 47 Node tests passed, including Pad/Bass roundtrips and MIDI arpeggios; 16 real OfflineAudioContext render combinations passed (four voices × two ratchet counts × two gates), with finite nonzero output and silent tails. Release archive succeeded and the app was installed/launched on the connected iPhone.
- Landscape layout and continuous playback verified in WebKit at 852 × 393, with portrait controls restored at 393 × 852. Native orientation code compiles; Simulator stays portrait on sequencer, but automated taps into Visual were not delivered, so the native Visual rotation path still needs a manual phone check.

The app uses no custom encryption. `ITSAppUsesNonExemptEncryption` is false. Existing privacy manifests are included. Build 7 adds layered Pad, sub-oscillator Bass, and landscape fullscreen for Visual. The canvas keeps its aspect ratio; portrait returns to the controls.

## Beta description

Loopfield is an offline eight-track sequencer and synthesizer. Build 32-step patterns, arrange songs, shape sounds with FM, Bell, Pluck, Pad and Bass voices, add effects, and explore audio-reactive pixel scenes. English and Chinese interfaces are available in the help panel.

## What to test

- Create and edit a pattern; check note, velocity, probability, ratchet and gate controls.
- Switch between Pattern and Song playback and edit the arrangement while stopped.
- Try Bell, Pluck, Pad, Bass and effects on individual tracks and the master bus.
- Switch languages during playback; verify edits and undo history stay intact.
- Open Visual, rotate into both landscape directions, verify status/home bars fade, rotate back, and check playback continues. Other pages remain portrait.
- Shake the phone to change palettes, and try disabling it in the help panel.
- Save a copy, restart the app, import/export a project, and export a short WAV.
- Report audio dropouts, stuck notes, clipped controls, or save/restore problems, including device model and iOS version.

## Upload reference

Confirm the Loopfield app record uses the exact bundle ID above. Do not create a duplicate if it already exists. App record creation and upload are covered by [Apple’s App Store Connect workflow](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow) and [upload guide](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds).

The completed upload used the following command (do not resend build 7):

```sh
xcodebuild -exportArchive \
  -archivePath '../Loopfield-Releases/1.0-7/Loopfield.xcarchive' \
  -exportOptionsPlist '../Loopfield-Releases/1.0-7/ExportOptions.plist' \
  -exportPath '../Loopfield-Releases/1.0-7/Upload' \
  -allowProvisioningUpdates
```

After upload, verify processing status in TestFlight before adding a build to a testing group. Tester recipients and external review contact information have not been provided; no invitations have been sent and no public testing link has been created.
