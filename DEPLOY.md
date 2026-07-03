# Deploy The Pour Stop — Local vs Production

## How data storage works

| Environment | Where data is saved |
|-------------|---------------------|
| **Local** (`npm run dev`) | Browser **localStorage** (same as before) |
| **Production** (Vercel) | **Supabase** database (shared for all users) |

The app switches automatically:
- `NODE_ENV=development` → local browser storage
- `NODE_ENV=production` + Supabase env vars → cloud database

You do **not** need Supabase keys in `.env.local` for local dev unless you want to test production mode locally.

---

## PART A — Supabase (production database)

### A1. Create project
[supabase.com/dashboard](https://supabase.com/dashboard) → **New project**

### A2. Copy API keys
**Project Settings** → **Configuration** → **API Keys**

| Supabase | Environment variable |
|----------|----------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable `sb_publishable_...` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret `sb_secret_...` | `SUPABASE_SERVICE_ROLE_KEY` |

### A3. Run SQL
1. **SQL Editor** → paste `supabase/schema.sql` → **Run**
2. **Authentication** → **Users** → create `admin@pourstop.com` (Auto Confirm ON)
3. **SQL Editor** → run `supabase/seed-super-admin.sql`

---

## PART B — Local development (optional Supabase)

For normal local work, **no `.env.local` needed** — data stays in the browser.

Optional: create `.env.local` only if you want to test `/setup` locally.

```powershell
copy env.local.template .env.local
npm run dev
```

Login locally: `admin@pourstop.com` / `admin123` (browser storage)

---

## PART C — GitHub

```powershell
git add .
git commit -m "Add Supabase production mode and Vercel deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/inventorythepourstop.git
git push -u origin main
```

---

## PART D — Vercel (production)

### D1. Import repo
[vercel.com](https://vercel.com) → **Add New** → **Project** → import GitHub repo

### D2. Environment variables (required for production)
Add all three for **Production**:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Without these, production would fall back to browser storage (not suitable for a live bar).

### D3. Deploy
Click **Deploy** → open `https://your-app.vercel.app`

### D4. Login on production
Use the **Supabase Auth** password you set for `admin@pourstop.com` (not necessarily `admin123`).

### D5. Verify
- `https://your-app.vercel.app/setup` → database connected
- `https://your-app.vercel.app/login` → super admin login works
- Add inventory on production → check **Supabase** → **Table Editor** → `menu_items`

---

## Summary

```
Local dev     →  localStorage  →  admin@pourstop.com / admin123
Vercel live   →  Supabase      →  admin@pourstop.com / (your Supabase password)
```

---

## Security
- Never commit `.env.local`
- Never put `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*`
- Change default passwords before going live
