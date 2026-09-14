# Loopfield 1.0 (6)

Release archive and App Store Connect distribution-signed IPA exported on 2026-09-15.

- Bundle ID: `com.daftlamb.loopfield`
- Team: `AC8ABF9K2Q`
- Version: `1.0`, build: `6`
- Icon: pixel LOOP / FIELD wordmark, 1024 × 1024 RGB PNG, no alpha.
- Archive: `../Loopfield-Releases/1.0-6/Loopfield.xcarchive`
- IPA: `../Loopfield-Releases/1.0-6/IPA/App.ipa`
- Upload options: `../Loopfield-Releases/1.0-6/ExportOptions.plist`
- Current status: **not uploaded**. Xcode upload stopped at `IDEDistributionFetchAppRecordStep` with `Error Downloading App Information`. Local App Store Connect export succeeded. The in-app browser is at the App Store Connect sign-in page. App record existence and access still need verification after sign-in.

The app uses no custom encryption. `ITSAppUsesNonExemptEncryption` is false. Existing privacy manifests are included. Debug tests passed in Build 5; this build changes the icon and distribution metadata, with Release archive and distribution export verified. The archived app has also been installed and launched on the connected iPhone.

## Beta description

Loopfield is an offline eight-track sequencer and synthesizer. Build 32-step patterns, arrange songs, shape sounds with FM, Bell and Pluck voices, add effects, and explore audio-reactive pixel scenes. English and Chinese interfaces are available in the help panel.

## What to test

- Create and edit a pattern; check note, velocity, probability, ratchet and gate controls.
- Switch between Pattern and Song playback and edit the arrangement while stopped.
- Try Bell, Pluck and effects on individual tracks and the master bus.
- Switch languages during playback; verify edits and undo history stay intact.
- Shake the phone to change palettes, and try disabling it in the help panel.
- Save a copy, restart the app, import/export a project, and export a short WAV.
- Report audio dropouts, stuck notes, clipped controls, or save/restore problems, including device model and iOS version.

## Resume upload

Confirm the Loopfield app record uses the exact bundle ID above. Do not create a duplicate if it already exists. App record creation and upload are covered by [Apple’s App Store Connect workflow](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow) and [upload guide](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds).

From the repository directory:

```sh
xcodebuild -exportArchive \
  -archivePath '../Loopfield-Releases/1.0-6/Loopfield.xcarchive' \
  -exportOptionsPlist '../Loopfield-Releases/1.0-6/ExportOptions.plist' \
  -exportPath '../Loopfield-Releases/1.0-6/Upload' \
  -allowProvisioningUpdates
```

After upload, verify processing status in TestFlight before adding a build to a testing group. Tester recipients and external review contact information have not been provided; no invitations have been sent and no public testing link has been created.
