-- Run AFTER you create the super admin user in:
-- Supabase → Authentication → Users → Add user
-- Email: admin@pourstop.com  |  Password: (your choice)  |  Auto Confirm: ON

insert into public.profiles (id, name, email, role, is_active, permissions)
select
  id,
  'Super Admin',
  email,
  'super_admin',
  true,
  null
from auth.users
where email = 'admin@pourstop.com'
on conflict (id) do update
  set role = 'super_admin',
      is_active = true,
      name = 'Super Admin';
