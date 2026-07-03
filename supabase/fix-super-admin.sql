-- Fix super admin role and remove a manager account
-- Run in: Supabase → SQL Editor → New query
--
-- 1. Change YOUR_SUPER_ADMIN_EMAIL to the email you use to log in
-- 2. Change MANAGER_EMAIL_TO_DELETE if you want to remove another account (optional)

-- ─── Promote your account to super admin ─────────────────────────────────────
UPDATE public.profiles
SET
  role = 'super_admin',
  name = 'Super Admin',
  is_active = true,
  permissions = null
WHERE email = 'admin@pourstop.com';  -- ← change if you used a different email

-- ─── Optional: delete a manager account completely ───────────────────────────
-- Uncomment and set the manager email you want to remove:

-- DELETE FROM auth.users
-- WHERE email = 'manager@example.com';

-- ─── Verify ──────────────────────────────────────────────────────────────────
SELECT id, name, email, role, is_active
FROM public.profiles
ORDER BY created_at;
