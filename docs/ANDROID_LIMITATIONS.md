# Android location limitations

This app requests high-accuracy updates about every 10 seconds. Android does not promise that interval.

## Why frequency varies

- **Doze / App Standby**: the system batches wakelocks and network. Location FGS is more reliable than a plain background task, but still not real-time in deep Doze.
- **OEM battery optimization**: aggressive vendors (Xiaomi, Oppo, Vivo, Huawei, some Samsung modes) kill or freeze apps that leave Recents.
- **App termination**: swiping away from Recents is a process kill on many devices. Force stop from Settings always stops tracking.
- **Foreground service rules**:
  - Android 8+ already expected an FGS + notification for ongoing location.
  - Android 13 requires `POST_NOTIFICATIONS` or the user may not see the required notification.
  - Android 14 requires `FOREGROUND_SERVICE_LOCATION`.
  - Android 15 restricts starting a FGS from the background. Start tracking while the UI is open.
- **GPS availability**: indoors, tunnels, or a disabled location toggle produce gaps or coarse results.
- **Reboot**: Android does not restart this app after boot. Tracking resumes when the user opens the app if the saved setting is ON.

## What we configure

```
accuracy: Location.Accuracy.High
timeInterval: 10000
distanceInterval: 0
foregroundService.notificationTitle: "Location service active"
foregroundService.notificationBody: "Location tracking is running"
killServiceOnDestroy: false
```

`killServiceOnDestroy: false` asks Android not to tear down the FGS if the activity is destroyed. It is not a bypass of Force stop, OEM killers, or Play policy.

## What we do not do

- Hide or remove the FGS notification
- Silently ignore battery optimizations
- Use Accessibility, device-admin, or overlay tricks to keep alive
- Restart after Force stop without user action
- Target iOS

## Practical guidance for testers

1. Grant foreground location, then background location, then notifications.
2. Leave the location notification visible.
3. Open Battery optimization settings from the app and set this app to Unrestricted / Not optimized.
4. On Xiaomi/Oppo/Vivo, also enable Autostart if the OEM provides that screen.
5. Treat 10 seconds as a best-effort target. Measure actual gaps on the test device and record them in TEST 5–7.
