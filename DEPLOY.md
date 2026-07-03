# Deploy The Pour Stop — Supabase + Vercel

Complete checklist. Do steps **in order**.

---

## PART A — Supabase (database)

### A1. Create project
1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name, database password, region → wait until **Active**

### A2. Copy API keys
**Project Settings** → **Configuration** → **API Keys**

| Copy from Supabase | Environment variable |
|--------------------|----------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key `sb_publishable_...` (or legacy `anon` key) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret key `sb_secret_...` (or legacy `service_role` key) | `SUPABASE_SERVICE_ROLE_KEY` |

### A3. Local `.env.local`
```powershell
copy env.local.template .env.local
```
Fill in the three values. Restart: `npm run dev`

### A4. Run database SQL
1. Supabase → **SQL Editor** → **New query**
2. Paste all of `supabase/schema.sql` → **Run**

### A5. Create super admin
1. **Authentication** → **Users** → **Add user**
2. Email: `admin@pourstop.com`, password, **Auto Confirm: ON**
3. SQL Editor → run `supabase/seed-super-admin.sql`

### A6. Test locally
Open [http://localhost:3000/setup](http://localhost:3000/setup) — all tables should be **OK**.

---

## PART B — GitHub (code)

### B1. Create repo
GitHub → **New repository** → name e.g. `inventorythepourstop`

### B2. Push code
```powershell
cd "C:\Users\soura\Desktop\Oscenox Info\oscenoxprojects\inventorythepourstop"
git add .
git commit -m "Prepare for Supabase and Vercel deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/inventorythepourstop.git
git push -u origin main
```

---

## PART C — Vercel (hosting)

### C1. Import project
1. [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repo
3. Framework: **Next.js** (auto)

### C2. Environment variables (before first deploy)
**Settings** → **Environment Variables** — add for Production, Preview, Development:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your secret / service_role key |

### C3. Deploy
Click **Deploy**. Your site will be at `https://your-project.vercel.app`

### C4. Test live setup page
`https://your-project.vercel.app/setup` — should match local `/setup` results.

### C5. Custom domain (optional)
Vercel → **Settings** → **Domains** → add your domain.

---

## PART D — Important: what works today

| Feature | Status |
|---------|--------|
| Site hosted on Vercel | ✅ After Part C |
| Supabase database created | ✅ After Part A |
| Connection test `/setup` | ✅ |
| Login, inventory, sales in cloud | ⏳ Needs code migration |

The app still uses **browser localStorage** for daily operations until we wire each module to Supabase. Deploying now puts the site online; **shared live data** needs the migration phase.

**Next:** Ask in chat: *"Continue Supabase migration"* to connect login, inventory, orders, and sales to the database.

---

## Security checklist
- [ ] Never commit `.env.local` or paste secret keys in chat
- [ ] Change `admin123` password after going live
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only in Vercel server env (not `NEXT_PUBLIC_*`)
