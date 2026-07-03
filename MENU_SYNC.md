# Sync local menu catalog to live server (Supabase)

Your menu items (names, prices, categories, peg combos) are defined in code under `src/data/*-menu-seed.ts`. Local dev (`npm run dev`) loads them into the browser automatically. Production uses **Supabase**.

## Option A — One-click sync (recommended)

Use this after you deploy to Vercel and want the live site to match your catalog.

1. **Push latest code** to GitHub so Vercel redeploys.
2. Open your **live site** (not `localhost`).
3. Log in as **super admin** (`admin@pourstop.com`).
4. Go to **Admin → Inventory**.
5. Click **Sync to Live** (next to + New Item).
6. Confirm — all catalog items upload to Supabase with **0 stock**.

What it does:
- Adds missing items
- Updates existing items **matched by name** (price, category, combos)
- Sets **stock to 0** for every catalog item
- Does **not** delete extra items you added manually on the server

After sync, refresh the page — inventory should match local.

---

## Option B — SQL in Supabase (no deploy needed)

If the button is not available yet, run these in **Supabase → SQL Editor** (in order):

1. `supabase/schema.sql` (once, if not done)
2. `supabase/seed-spirit-menu.sql`
3. `supabase/seed-premium-spirits.sql`
4. `supabase/seed-soft-beverages.sql`
5. `supabase/seed-beer.sql`
6. `supabase/seed-liqueur-tequila.sql`

Each file is safe to re-run.

---

## Important notes

| Topic | Detail |
|--------|--------|
| **Local vs live** | `npm run dev` = browser storage only. Live site = Supabase. They do not auto-sync until you deploy + click **Sync to Live** or run SQL. |
| **Stock** | Sync sets catalog items to **0 stock**. Use **Add Stock** on live when bottles arrive. |
| **Sales / bills** | Sync only updates menu + stock entries for catalog items. Orders and history are untouched. |
| **Who can sync** | Only **super admin** on production (cloud mode). |

---

## Troubleshooting

**"Sync to Live" button not visible**
- You must be on the **deployed** site (Vercel), not localhost.
- You must be logged in as **super admin**.

**Sync failed / Unauthorized**
- Check Vercel env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Re-login and try again.

**Item missing after sync**
- Add it to the correct `src/data/*-menu-seed.ts` file, deploy, then sync again.
