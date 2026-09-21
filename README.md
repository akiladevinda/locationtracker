# Internal Location Tracker

Android-only React Native Expo app for internal testing. It collects precise location with explicit user consent, stores points locally in SQLite, and bulk-uploads them when the network returns. Google Sheets sync happens on the backend. Google Drive uploads use user OAuth. Automatic phone-call recording is not implemented because modern Android does not allow it for a normal third-party app.

This is not an Expo Go app. Background location, foreground services, SQLite, and audio recording require a development build or an APK built with EAS.

## Architecture

```
ANDROID APP
    GPS
     |
     v
Background Location Task  (expo-location + expo-task-manager + Android FGS)
     |
     v
SQLite  (expo-sqlite, offline-first)
     |
     v
Sync Queue  (lock + batch 200 + exponential backoff)
     |
     +-------------------+
     |                   |
  Offline             Online
     |                   |
Store locally            v
                    Backend API
                    (Supabase Edge Function locations-batch)
                         |
                         v
                      Postgres
                      /        \
                     v          v
              Google Sheets   Admin / SQL
              (sync-google-sheet)

Audio file (user-started recording or imported file)
     |
     v
Local file + uploads queue
     |
     v
Google Drive API  (user OAuth, private folder)
```

## Requirements

- Node.js 20.19.4+, 22.13+, or 24.3+ (React Native 0.86 warns on Node 24.1)
- npm
- Android device or emulator (API 26+)
- Expo account for EAS builds
- Supabase project (free tier)
- Google Cloud project if you want Sheets + Drive

Do not use Expo Go. Native background location is not available there on Android.

## Installation

```bash
npm install
cp .env.example .env
# fill EXPO_PUBLIC_* values
npx expo install
```

## Environment setup

Copy `.env.example` to `.env`.

Mobile variables (public client config):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_BACKEND_URL` (optional; defaults to `{SUPABASE_URL}/functions/v1`)
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (Web OAuth client ID)
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_DRIVE_FOLDER_ID`

Backend secrets (Edge Functions only, never in the APK):

- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SHEET_RANGE` (optional, default `Sheet1!A1`)

## Supabase setup

1. Create a free Supabase project.
2. Run `supabase/migrations/001_init.sql` in the SQL editor.
3. Deploy functions:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy locations-batch
npx supabase functions deploy sync-google-sheet
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
npx supabase secrets set GOOGLE_SHEET_ID=...
npx supabase secrets set GOOGLE_SHEET_RANGE=Sheet1!A1
```

4. Put the project URL and anon key in `.env`. Never put the service-role key in the app.

`POST /functions/v1/locations-batch` accepts:

```json
{
  "deviceId": "uuid",
  "locations": [
    {
      "id": "uuid",
      "latitude": 12.9,
      "longitude": 77.6,
      "accuracy": 8,
      "altitude": 900,
      "speed": 0.4,
      "heading": 90,
      "recordedAt": "2026-09-21T05:00:00.000Z"
    }
  ]
}
```

Response:

```json
{ "success": true, "acceptedIds": ["uuid"] }
```

Uploads are idempotent. Duplicate location UUIDs are ignored (`ON CONFLICT DO NOTHING` via upsert + ignoreDuplicates).

## Database setup

Local SQLite tables:

- `locations` with indexes on `sync_status` and `recorded_at`
- `uploads` for Drive file queue
- `app_settings` key/value
- `debug_logs`

Schema version is stored in `PRAGMA user_version` and applied by `services/database/migrations.ts`.

Server Postgres tables are in `supabase/migrations/001_init.sql`. RLS is enabled and anon/authenticated have no direct table grants. Only Edge Functions using the service role write data.

## Google API setup

1. Create a Google Cloud project.
2. Enable **Google Drive API** and **Google Sheets API**.
3. Configure the OAuth consent screen (Internal or Testing).
4. Create OAuth credentials:
   - **Android** client: package `com.internal.locationtracker`, SHA-1 from your keystore / EAS credentials.
   - **Web** client: used for the PKCE token exchange. Add redirect URI `locationtracker://oauthredirect`.
5. Never hardcode a Google password. Tokens are stored in `expo-secure-store`. Access tokens are never logged.

### Google Sheets setup (service account)

Sheets sync is backend-only. The phone never writes to Sheets.

1. Create a service account.
2. Download the JSON key.
3. Store it only as `GOOGLE_SERVICE_ACCOUNT_JSON` in Supabase secrets.
4. Share the target spreadsheet with the service-account email as Editor.
5. Put a header row in the sheet:

`Device ID | Timestamp | Latitude | Longitude | Accuracy | Altitude | Speed | Heading`

6. Invoke `sync-google-sheet` on a schedule (Supabase cron, GitHub Action, or manual HTTP call). It fetches up to 500 unsynced rows, appends them in one API call, then sets `sheet_synced = true`.

Never bundle the service-account JSON inside the APK.

### Google Drive setup (user OAuth)

1. Create a Drive folder owned by the Google account that will sign in.
2. Copy the folder ID from the URL (`https://drive.google.com/drive/folders/FOLDER_ID`).
3. Set `EXPO_PUBLIC_GOOGLE_DRIVE_FOLDER_ID`.
4. In the app, open Settings → Connect Google Drive.
5. Scope used: `https://www.googleapis.com/auth/drive.file` (files created by this app only). The folder is not made publicly writable.

## Android permission setup

On first launch the app shows a consent screen, then requests permissions separately:

1. Foreground location (`ACCESS_FINE_LOCATION`)
2. Notifications (`POST_NOTIFICATIONS`, Android 13+) so the required FGS notification can appear
3. Background location (`ACCESS_BACKGROUND_LOCATION`)
4. Microphone, only if the user uses the recorder

If a permission is denied, the UI explains which capability will not work and offers Retry + Open Settings.

Required Android 14/15 foreground-service type: `location` (`FOREGROUND_SERVICE_LOCATION`). The persistent notification **Location service active / Location tracking is running** is required by Android and is not hidden.

## Development build

```bash
npx expo install expo-dev-client
eas login
eas build:configure
eas build -p android --profile development
npx expo start --dev-client
```

Install the development APK, then scan the QR code from `npx expo start --dev-client`.

## APK generation

Preview profile produces an APK for internal testing:

```bash
npm install
eas login
eas build:configure
eas build -p android --profile preview
```

Production profile produces an AAB.

Local native project (optional):

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

Install:

```bash
adb install app.apk
```

or `adb install -r path/to/downloaded.apk`.

## Local run

```bash
npm install
npx tsc --noEmit
npx expo start --dev-client
```

## Testing offline mode

See `TESTING.md` tests 3 and 4. GPS collection never waits for the backend. Records are marked `pending` in SQLite and uploaded in batches of 200 when connectivity returns.

## Testing background location

See `TESTING.md` tests 5–7. Keep the required notification visible. Disable battery optimization for this app on the device if OEM killing is aggressive.

## Known Android limitations

See `docs/ANDROID_LIMITATIONS.md`.

Summary:

- 10 second GPS interval is a request, not a guarantee
- Doze, App Standby, and OEM battery savers can delay or stop updates
- Swiping the app from Recents is a kill on many OEMs
- Force-stop permanently stops tracking until the user opens the app
- Reboot does not auto-restart a normal third-party location service; tracking resumes when the app is opened if it was left ON
- Android 13 needs notification permission for the FGS notification
- Android 14+ requires `FOREGROUND_SERVICE_LOCATION`
- Android 15 tightens background FGS starts; start tracking while the app is in the foreground

## Call recording limitations

See `docs/CALL_RECORDING.md`.

Automatic incoming-call audio capture is **not supported** for a normal third-party app on modern Android. This project implements:

- Explicit start/stop microphone recording
- Import of an existing file created by the system Phone app or OEM recorder
- Queued Google Drive upload when online

## Battery optimization notes

The home screen warns: **Battery optimization may reduce background tracking reliability.** Settings has a button that opens Android battery optimization settings. The app does not silently request ignore-optimizations exemption and does not hide the FGS notification.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| No GPS points | Permission screen, GPS toggle, indoor GPS |
| Points only while app is open | Background location denied, or notification permission denied |
| Background stops after a few minutes | OEM battery saver; open battery optimization settings |
| Pending count never drops | Backend URL, anon key, function deployed, network |
| Duplicate points on server | Harmless; UUID primary key ignores duplicates |
| Drive upload fails | Sign in with Google, folder ID, `drive.file` scope |
| Sheets empty | Run `sync-google-sheet`, share sheet with service account |
| Expo Go missing APIs | Use a development build / APK |

## Project layout

```
app/                 Expo Router screens
components/          Simple dashboard widgets
services/            Location, SQLite, sync, Google, audio
tasks/               BACKGROUND_LOCATION_TASK
hooks/               Tracking / network / sync
config/              Constants and env
supabase/            SQL + Edge Functions
docs/                Android and call-recording limitations
```
