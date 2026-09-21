# Google Sheets sync

Spreadsheet used by this project:

https://docs.google.com/spreadsheets/d/10VCfYb0pfZnw8mJkm5zgX76CHussUA8i52BhDTATvWQ/edit

Sheet ID: `10VCfYb0pfZnw8mJkm5zgX76CHussUA8i52BhDTATvWQ`

## One-time setup (required)

1. In Google Cloud, create a **service account** (or reuse the one for Drive).
2. Download its JSON key.
3. Copy the service account email (looks like `something@….iam.gserviceaccount.com`).
4. Open the spreadsheet → **Share** → add that email as **Editor**.
5. In Supabase Dashboard → **Edge Functions → Secrets**, set:

```
GOOGLE_SHEET_ID=10VCfYb0pfZnw8mJkm5zgX76CHussUA8i52BhDTATvWQ
GOOGLE_SHEET_RANGE=Sheet1!A1
GOOGLE_SERVICE_ACCOUNT_JSON=<paste the full JSON on one line>
```

6. Deploy / redeploy:

```bash
npx supabase functions deploy sync-google-sheet
npx supabase functions deploy locations-batch
```

## How it works

- Phone uploads locations → `locations-batch` stores them in Supabase.
- That function then triggers `sync-google-sheet`.
- Unsynced rows (`sheet_synced = false`) are appended to the sheet.
- Header row is written automatically if the sheet is empty.
- Columns: Device ID, Timestamp, Latitude, Longitude, Accuracy, Altitude, Speed, Heading

## Manual test

```bash
curl -X POST "https://qnbcgvnujaasvzjjawtw.supabase.co/functions/v1/sync-google-sheet" \
  -H "Authorization: Bearer YOUR_ANON_OR_SERVICE_KEY" \
  -H "apikey: YOUR_ANON_OR_SERVICE_KEY"
```
