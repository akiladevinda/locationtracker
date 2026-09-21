# Call recording investigation

This document records what is and is not possible for a normal third-party Android app in 2026. This project does not bypass Android privacy or security controls.

## Goal

Understand whether incoming/outgoing call audio can be recorded by this app, then implement the closest **legitimate** alternative.

## Platform restrictions

### Android 9 (API 28) and earlier

Some apps used `MediaRecorder.AudioSource.VOICE_CALL` or mixed `VOICE_UPLINK` / `VOICE_DOWNLINK`. Even then, behavior was OEM-specific and often silent (one side only, or no audio).

### Android 10+

- Privacy indicators show when the microphone or camera is used.
- Background microphone access is heavily restricted.
- `CAPTURE_AUDIO_OUTPUT` is a privileged/signature permission. A Play-distributed or sideloaded third-party app cannot obtain it.

### Android 11–13

- The `VOICE_CALL` audio source is not available to regular apps.
- Accessibility services cannot be used as a hidden capture channel. Using Accessibility to record calls is against Google Play policy and is a privacy abuse even for internal sideload if done secretly.
- Foreground-service microphone type exists, but it records the **device microphone**, not the telephony voice mix.

### Android 14–15

- Foreground services must declare a type. Microphone FGS is `FOREGROUND_SERVICE_MICROPHONE` and still does not grant telephony mix.
- Starting FGS from the background is restricted. A call-state broadcast cannot silently start recording.
- Notification permission (Android 13+) is required to show the FGS notification. Hiding that notification is not allowed.

### Google Play

Call recording apps that capture both sides of a phone call are not permitted for ordinary third-party apps. Accessibility-based workarounds are policy violations. This internal APK still must not implement those techniques.

### OEM differences

Samsung, Xiaomi, Oppo, Vivo, and some carrier builds sometimes include **system** call recording inside the Phone app. That recording is created by a privileged component, not by this app. The user can sometimes export or share the file.

## VOICE_CALL availability

For a normal app using public Android / Expo APIs:

| Source | Available? |
| --- | --- |
| `DEFAULT` / `MIC` | Yes, with `RECORD_AUDIO` and user consent |
| `VOICE_COMMUNICATION` | Yes, for VoIP in the same app |
| `VOICE_CALL` | No for third-party apps on modern Android |
| `VOICE_UPLINK` / `VOICE_DOWNLINK` | No for third-party apps |
| Telephony mix via Accessibility | Not implemented; not permitted |
| Hidden mic while a call is active | Not implemented |

## What this app implements

Closest compliant alternatives, isolated from location tracking:

1. **Manual recorder** (`app/record.tsx`) using `expo-audio`. The user taps Start Recording and Stop Recording. Status is visible.
2. **Import existing file** via the system picker, so a recording created by the OEM Phone app can be queued.
3. **Upload queue** to a private Google Drive folder after the user signs in with OAuth.

The app never:

- hooks phone call state to start a recorder
- uses Accessibility to capture audio
- disables privacy indicators
- requests `CAPTURE_AUDIO_OUTPUT`
- records in the background without an explicit user-started recorder UI

## Conclusion

Full incoming-call audio recording is **not supported** by modern Android APIs for a normal third-party application. The manual recorder plus file import is the supported path.
