# Admin dashboard — deploy to Vercel

Internal web map for the Android Location Tracker (Leaflet + OpenStreetMap, free).

---

## Fix if you see raw `index.js` code on Vercel

That means the project Root Directory is wrong (repo root instead of `admin`).

1. Open your project on [Vercel](https://vercel.com/dashboard) (e.g. **locationtracker-sage**)
2. **Settings → General → Root Directory → Edit** → set to **`admin`** → Save
3. **Settings → Environment Variables** → add the 3 vars below if missing
4. **Deployments → … → Redeploy**

Then https://locationtracker-sage.vercel.app/ should show the map dashboard.

---

## What you need ready

1. A [Vercel](https://vercel.com) account (GitHub login is fine)
2. Your Supabase project URL: `https://qnbcgvnujaasvzjjawtw.supabase.co`
3. Your Supabase **anon / publishable** key (same one in the app `.env`)
4. Edge Function `admin-locations` already deployed (it should be)

---

## Step-by-step (recommended: Vercel website)

### 1. Push this project to GitHub

If the repo is not on GitHub yet:

```bash
cd /Users/akila/Desktop/appandroid
git status
# commit if needed, then create/push a GitHub repo
```

### 2. Import the project in Vercel

1. Open [https://vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Before deploying, set:

| Setting | Value |
|---|---|
| **Framework Preset** | Next.js |
| **Root Directory** | `admin` ← click Edit and choose the `admin` folder |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | leave default |

### 3. Add environment variables

In the same Vercel screen → **Environment Variables**, add all three:

```
NEXT_PUBLIC_SUPABASE_URL=https://qnbcgvnujaasvzjjawtw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_iovGuHM-USPLQ_D_S8LKbQ_fFNDFOMQ
NEXT_PUBLIC_ADMIN_API_URL=https://qnbcgvnujaasvzjjawtw.supabase.co/functions/v1/admin-locations
```

(Use Production + Preview checkboxes so both environments work.)

### 4. Deploy

Click **Deploy**. Wait for the build to finish. Open the URL Vercel gives you (something like `https://….vercel.app`).

### 5. Later updates

Every push to your connected Git branch rebuilds the dashboard automatically.

---

## Alternative: deploy from your Mac (CLI)

```bash
cd /Users/akila/Desktop/appandroid/admin
npx vercel login
npx vercel
```

When prompted:

- **Set up and deploy?** Yes
- **Which scope?** your account
- **Link to existing project?** No (first time)
- **Project name?** e.g. `location-tracker-admin`
- **In which directory is your code?** `.` (you are already inside `admin`)
- **Want to override settings?** No

Then add env vars:

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel env add NEXT_PUBLIC_ADMIN_API_URL
```

Paste the same values as above when asked, then:

```bash
npx vercel --prod
```

---

## Local test before deploy (optional)

```bash
cd /Users/akila/Desktop/appandroid/admin
cp .env.example .env.local
# put your anon/publishable key in .env.local
npm install
npm run dev
```

Open http://localhost:3000

---

## If the map is empty

1. Confirm the Android app is syncing (Home → Pending goes down, Last sync updates)
2. In Supabase → Table Editor → `locations` has rows
3. In Supabase → Edge Functions → `admin-locations` is deployed
4. On Vercel → Project → Settings → Environment Variables — all 3 keys are set, then **Redeploy**

## Map notes

- Tiles: OpenStreetMap (free)
- Default center: Sri Lanka (`7.8731, 80.7718`)
- No Google Maps key required
