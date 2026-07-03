# Supabase + Vercel Setup — The Pour Stop

Follow these steps **in order**. Do not share your secret keys in chat or GitHub.

---

## Step 1 — Create a Supabase project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. Choose a name (e.g. `the-pour-stop`)
4. Set a **strong database password** and save it somewhere safe
5. Pick a **region** close to your users
6. Wait until the project status is **Active** (green)

---

## Step 2 — Copy your API keys

1. In Supabase, open your project
2. Click **Project Settings** (gear icon, bottom left)
3. Under **Configuration**, click **API Keys**
4. Copy these two values:

| Supabase label | Put in `.env.local` as |
|----------------|-------------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

> Do **not** put the `service_role` key in the frontend or in `NEXT_PUBLIC_*` variables.

---

## Step 3 — Add environment variables locally

1. In your project folder, copy the template:

   ```bash
   copy env.local.template .env.local
   ```

   (On Mac/Linux: `cp env.local.template .env.local`)

2. Open `.env.local` and paste your real URL and anon key.

3. **Recommended:** also add `SUPABASE_SERVICE_ROLE_KEY` from the same API Keys page
   (the `service_role` key — server only, never commit or share).

4. **Restart** the dev server after saving:

   ```bash
   npm run dev
   ```

---

## Step 4 — Create database tables (SQL)

1. In Supabase, go to **SQL Editor**
2. Click **New query**
3. Open the file `supabase/schema.sql` from this project
4. Copy **all** the SQL and paste it into the editor
5. Click **Run**
6. You should see **Success** with no errors

This creates:
- `profiles` (users)
- `categories`, `menu_items`, `stock_entries`
- `stock_additions`, `restaurant_tables`, `orders`, `bill_activity`
- Default categories (Beer, Whisky, etc.)
- Row Level Security policies

---

## Step 5 — Create the super admin login

1. In Supabase, go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Fill in:
   - **Email:** `admin@pourstop.com`
   - **Password:** choose a strong password (you can use `admin123` for testing only)
   - **Auto Confirm User:** ON
4. Click **Create user**

---

## Step 6 — Link super admin to profiles table

1. Go back to **SQL Editor** → **New query**
2. Open `supabase/seed-super-admin.sql` from this project
3. Copy, paste, and **Run**

This sets the user's role to `super_admin` in the `profiles` table.

---

## Step 7 — Verify connection

1. Make sure `npm run dev` is running
2. Open: [http://localhost:3000/setup](http://localhost:3000/setup)
3. You should see:
   - **Env vars OK**
   - **Database Connected**
   - All 8 tables **OK**
   - Categories count ≥ 11
   - Profiles count ≥ 1

If something fails, read the error on that page and re-run the SQL step.

---

## Step 8 — What works now vs. what's next

### Done in this phase
- Supabase packages installed
- Database schema + RLS SQL files
- Environment variable template
- Connection health check at `/setup`

### Still using browser storage (next phase)
The app **still saves data in localStorage** until we migrate each module:
- Login / auth
- Inventory & stock
- Orders & billing
- Tables & sales history

**Tell your developer (or ask in chat): "Continue Supabase migration"** to wire the app to the database.

---

## Step 9 — Deploy to Vercel (after migration)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. In Vercel → **Settings** → **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

Use the **same** Supabase project for production — one database for everyone.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Env vars missing | Create `.env.local`, restart `npm run dev` |
| Table missing | Re-run `supabase/schema.sql` |
| Profiles count = 0 | Create user in Auth, run `seed-super-admin.sql` |
| RLS errors later | Make sure user is logged in via Supabase Auth |
| Can't find API keys | Project Settings → Configuration → **API Keys** |

---

## Files reference

| File | Purpose |
|------|---------|
| `env.local.template` | Copy to `.env.local` |
| `supabase/schema.sql` | Run once in SQL Editor |
| `supabase/seed-super-admin.sql` | Run after creating admin user |
| `src/lib/supabase/` | Supabase client code |
| `/setup` | Connection test page |
