# Testing checklist

Internal testing only. Use a development build or preview APK. Expo Go is not valid for these tests.

## TEST 1 — First launch permissions

1. Install the APK and open the app.
2. Confirm the consent screen explains precise location, background location, timestamps, GPS accuracy, and optional audio/file uploads.
3. Accept consent.
4. Confirm Android shows its own permission dialogs (foreground location, notifications, then background location).
5. Confirm the dashboard shows Granted/Denied for each permission.
6. Deny background location once and confirm the app explains that background tracking will not work.
7. Tap Open Settings, enable the permission, return, and Retry.

Expected: no hidden prompts, no crashes on deny.

## TEST 2 — Enable tracking and SQLite

1. Grant foreground + background location.
2. Tap Start Tracking.
3. Confirm the persistent notification: "Location service active".
4. Confirm Last Location updates.
5. Open Location History and confirm rows appear.

Expected: each row has a UUID, coordinates, timestamp, accuracy, and `pending` or `uploaded`.

## TEST 3 — Offline collection

1. Turn off Wi-Fi and mobile data.
2. Keep tracking ON.
3. Walk or move the device.
4. Confirm Pending Upload increases.
5. Confirm no crash and no backend calls are required for recording.

Expected: GPS collection is independent of the network.

## TEST 4 — Reconnect sync

1. From TEST 3, turn networking back on.
2. Wait for automatic sync, or tap Sync Now.
3. Confirm pending count decreases.
4. In Supabase Table Editor, confirm `locations` rows exist with those UUIDs.
5. Force a second Sync Now.

Expected: duplicate UUIDs are not duplicated on the server. `acceptedIds` covers already-known IDs.

## TEST 5 — Screen locked

1. Start tracking.
2. Lock the screen for several minutes.
3. Unlock and check history.

Expected: additional points where Android still allows the location FGS. OEM battery savers may thin the interval. Document the actual gap.

## TEST 6 — Force-close

1. Start tracking.
2. Swipe the app from Recents (or Force stop in system settings).
3. Wait two minutes.
4. Reopen the app.

Document actual behavior. On many OEMs, swiping Recents kills the process and location stops. Force stop always stops tracking. The app restores tracking when opened again if Tracking enabled is still true.

## TEST 7 — Reboot

1. Start tracking.
2. Reboot the phone without opening the app.
3. After boot, check whether new points appear.
4. Open the app.

Document actual behavior. A normal third-party app is not restarted by Android after reboot. Tracking should resume after the user opens the app, because the enabled flag is stored in SQLite.

## TEST 8 — Drive upload

1. Connect Google Drive in Settings.
2. Open Audio Recorder.
3. Start Recording, speak, Stop Recording.
4. Turn off the network before upload if it is too fast; confirm the file is queued (`pending`).
5. Reconnect.
6. Confirm the file appears in the configured Drive folder.

Also test Import Existing Audio File with a recording produced by the system Phone app or OEM recorder, if the device has one.

## TEST 9 — Google Sheets

1. Confirm locations exist in Supabase with `sheet_synced = false`.
2. Invoke `sync-google-sheet` (dashboard, curl, or cron).
3. Confirm rows appear in the sheet with columns Device ID, Timestamp, Latitude, Longitude, Accuracy, Altitude, Speed, Heading.
4. Confirm those rows now have `sheet_synced = true`.
5. Invoke the function again and confirm it does not duplicate those rows.

## Additional checks

- Stop Tracking removes the FGS notification.
- Clear Uploaded Records does not delete `pending` rows.
- Export Debug Logs writes a text file under the app document directory.
- Debug screen shows device ID, Android version, task registered, pending counts, last API error.
- Changing location interval in Settings requires restarting tracking to apply.
