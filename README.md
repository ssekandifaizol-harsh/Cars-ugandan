# Cars Uganda

A car-selling web app (PWA) for a showroom in Uganda. Buyers browse cars and enquire on WhatsApp. The owner adds cars from his phone in under 3 minutes.

**Stack:** React + Vite + Tailwind · Supabase (database, login, photos) · Cloudflare Pages (hosting)

## What's inside

| Buyers (no login) | Owner (login) | Admin |
| --- | --- | --- |
| Home, browse with filters and sort, car page with photo gallery, WhatsApp button, share link, finance calculator, saved cars, contact page, enquiry form, dark mode, installable app | 4-step add-car wizard with photo guide (14 angles), drafts, edit, publish/hide, available/reserved/sold, featured cars, private details (plate, VIN, buying price), live enquiry inbox with phone alerts, shop settings (WhatsApp, logo, colour, hours, hide prices, USD) | Give/remove owner access, audit log of price and status changes |

## Setup (do these in order)

### 1. Supabase database
1. Open your Supabase project → **SQL Editor** → New query.
2. Easiest: let the GitHub pipeline (step 5) run it for you. By hand: paste all of `supabase/migrations/20261117000000_init.sql` and press **Run** — but then the pipeline will try to run it again, so pick one way.
   - **Check:** Table Editor shows `shops`, `cars`, `car_private`, `car_photos`, `enquiries`, `profiles`, `audit_log`. Storage shows a bucket `car-photos`.
   - **If it fails:** read the error line number. Running it twice gives "already exists" errors — that's fine if the first run worked.
3. **Authentication → Providers → Email:** keep Email on. **Authentication → Sign In / Up:** turn **off** "Allow new users to sign up". Why: only people you invite can log in.
4. **Authentication → URL Configuration:** set Site URL to your live address (e.g. `https://cars-uganda.pages.dev`) and add `http://localhost:5173/**` to Redirect URLs.

### 2. Make yourself admin
1. **Authentication → Users → Invite user** → your email. Open the email, set a password.
2. In SQL Editor run (with your email):
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   - **Check:** log in on the site → you see **Manage** → **Admin** tab.

### 3. Make the client an owner
1. **Invite user** → client's email. He opens the email and sets a password.
2. In the app: **Manage → Admin → Give owner access** → type his email → **Make owner**.
3. He logs in → **Shop settings** → adds his WhatsApp number. Done.

### 4. Run on your computer
```bash
cp .env.example .env      # then paste URL + publishable key from Supabase > Project Settings > API
npm install
npm run dev               # open http://localhost:5173
```
**If the yellow "Setup needed" bar shows:** `.env` is missing or the names are wrong. Restart `npm run dev` after editing it.

### 5. Automatic deploys (GitHub → Supabase → Cloudflare)
Every push to `main` runs `.github/workflows/deploy.yml`:
1. **database** — sends new files in `supabase/migrations/` to Supabase (`supabase db push`).
2. **website** — builds the app and publishes it to Cloudflare Pages project `cars-uganda`.

Pull requests only build and get a preview link; they never touch the real database.

Add these 7 secrets in GitHub → repo **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Where to get it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable key (`sb_publishable_…`) |
| `SUPABASE_PROJECT_ID` | The project ref: the part of the URL before `.supabase.co` |
| `SUPABASE_DB_PASSWORD` | The database password you set when creating the project (reset it under Project Settings → Database if forgotten) |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → your avatar → Account → Access Tokens → Generate |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → **Create Custom Token** → Permissions: *Account · Cloudflare Pages · Edit* → Account Resources: your account |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right side "Account ID" |

**Check:** GitHub → **Actions** tab → latest "Deploy" run is green. The site is at `https://cars-uganda.pages.dev`.
**If it fails:** click the red step. "Invalid access token" = wrong `SUPABASE_ACCESS_TOKEN`; "password authentication failed" = wrong `SUPABASE_DB_PASSWORD`; "Authentication error" from Cloudflare = token missing the Pages permission.

To add a database change later: create a new file `supabase/migrations/<YYYYMMDDHHMMSS>_what_it_does.sql`. Never edit a migration that already ran.

## Security, in plain words
- **Row Level Security** on every table: the database itself refuses what you're not allowed to see, even if someone copies the app's key.
- Buyers can only *read published cars* and *send* an enquiry. They can never read enquiries, private details, or drafts.
- Private details (plate, VIN, buying price, seller) live in their own locked table.
- No public sign-up. Owners are invited and promoted by the admin only.
- Enquiry spam guard: max 5 per phone per hour, plus a hidden bot trap.
- Photos: images only, max 5 MB, owner can only upload into his own shop folder.
- Only the *publishable* key is in the app. Never put the service-role key in this repo.

**Test it:** open the site logged out, then in the browser console run
`(await (await fetch(SUPABASE_URL + '/rest/v1/car_private?select=*', {headers:{apikey:KEY}})).json())` → must be `[]`.

## Phase 2 (not built yet)
- Push alerts when the app is fully closed (needs a push server).
- Automatic WhatsApp messages (needs Meta WhatsApp Business approval).
- Cloudflare Turnstile on the enquiry form, two-step login (MFA) for admin, car compare page, Luganda.
