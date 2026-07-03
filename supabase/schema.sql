-- The Pour Stop — Supabase schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query → Run

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Profiles (linked to Supabase Auth) ───────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('super_admin', 'manager')),
  is_active boolean not null default true,
  permissions jsonb,
  created_at timestamptz not null default now()
);

-- ─── Categories ───────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ─── Menu items ───────────────────────────────────────────────────────────────
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  unit_type text not null check (unit_type in ('bottle', 'pour')),
  sell_price numeric not null default 0,
  serving_size_ml numeric not null default 0,
  pour_sizes jsonb,
  bottle_size_ml numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Stock levels ─────────────────────────────────────────────────────────────
create table if not exists public.stock_entries (
  menu_item_id uuid primary key references public.menu_items (id) on delete cascade,
  stock_quantity numeric not null default 0,
  purchase_price numeric not null default 0,
  low_stock_threshold numeric not null default 5,
  updated_at timestamptz not null default now()
);

-- ─── Stock addition log ───────────────────────────────────────────────────────
create table if not exists public.stock_additions (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  item_name text not null,
  category text not null,
  unit_type text not null,
  quantity numeric not null,
  purchase_price numeric not null default 0,
  type text not null check (type in ('initial', 'restock', 'adjustment')),
  manager_id uuid references public.profiles (id) on delete set null,
  manager_name text not null,
  added_at timestamptz not null default now()
);

-- ─── Restaurant tables ────────────────────────────────────────────────────────
create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  number integer not null,
  name text not null,
  status text not null default 'available' check (status in ('available', 'running')),
  active_order_id uuid,
  created_at timestamptz not null default now()
);

-- ─── Orders / bills ───────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('table', 'walk_in')),
  status text not null check (status in ('active', 'completed', 'cancelled')),
  table_id uuid references public.restaurant_tables (id) on delete set null,
  table_number integer,
  customer_name text not null,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount_label text,
  discount_percent numeric not null default 0,
  discount_amount numeric not null default 0,
  total numeric not null default 0,
  payment_method text,
  payment_cash_amount numeric not null default 0,
  payment_online_amount numeric not null default 0,
  manager_id uuid references public.profiles (id) on delete set null,
  manager_name text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ─── Bill activity log ────────────────────────────────────────────────────────
create table if not exists public.bill_activity (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  type text not null,
  table_number integer,
  customer_name text,
  item_name text,
  quantity numeric,
  previous_quantity numeric,
  serving_size_ml numeric,
  unit_type text,
  amount numeric,
  bill_total numeric,
  discount_label text,
  discount_percent numeric,
  discount_amount numeric,
  payment_method text,
  payment_cash_amount numeric,
  payment_online_amount numeric,
  manager_name text not null,
  created_at timestamptz not null default now()
);

-- ─── Default categories ───────────────────────────────────────────────────────
insert into public.categories (name, slug) values
  ('Soft Beverages', 'soft_beverage'),
  ('Beer', 'beer'),
  ('Cocktails', 'cocktail'),
  ('Whisky', 'whisky'),
  ('Premium Whisky', 'premium_whisky'),
  ('Single Malt', 'single_malt'),
  ('Vodka', 'vodka'),
  ('Rum', 'rum'),
  ('Gin', 'gin'),
  ('Tequila', 'tequila'),
  ('Liqueur', 'liqueur'),
  ('Wine', 'wine'),
  ('Other', 'other')
on conflict (slug) do nothing;

-- ─── Helper: current user's role ──────────────────────────────────────────────
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and is_active = true
  );
$$;

-- Auto-create profile row when a user signs up (optional; super admin is created manually)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'manager'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.stock_entries enable row level security;
alter table public.stock_additions enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.orders enable row level security;
alter table public.bill_activity enable row level security;

-- Profiles: users read own; super admin reads/writes all
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_super_admin());

create policy "profiles_select_all_super_admin" on public.profiles
  for select to authenticated
  using (public.is_super_admin());

create policy "profiles_update_super_admin" on public.profiles
  for update to authenticated
  using (public.is_super_admin());

create policy "profiles_insert_super_admin" on public.profiles
  for insert to authenticated
  with check (public.is_super_admin());

create policy "profiles_delete_super_admin" on public.profiles
  for delete to authenticated
  using (public.is_super_admin());

-- Shared app data: any authenticated active staff member
create policy "staff_read_categories" on public.categories
  for select to authenticated using (true);

-- Allows /setup health check before login (category names are not sensitive)
create policy "anon_read_categories_health" on public.categories
  for select to anon using (true);

create policy "staff_write_categories" on public.categories
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

create policy "staff_read_menu" on public.menu_items
  for select to authenticated using (true);

create policy "staff_write_menu" on public.menu_items
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

create policy "staff_read_stock" on public.stock_entries
  for select to authenticated using (true);

create policy "staff_write_stock" on public.stock_entries
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

create policy "staff_read_stock_additions" on public.stock_additions
  for select to authenticated using (true);

create policy "staff_write_stock_additions" on public.stock_additions
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

create policy "staff_read_tables" on public.restaurant_tables
  for select to authenticated using (true);

create policy "staff_write_tables" on public.restaurant_tables
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

create policy "staff_read_orders" on public.orders
  for select to authenticated using (true);

create policy "staff_write_orders" on public.orders
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

create policy "staff_read_activity" on public.bill_activity
  for select to authenticated using (true);

create policy "staff_write_activity" on public.bill_activity
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

-- ─── After creating super admin in Authentication → Users, run this: ──────────
-- (Replace email if you used a different one)
--
-- insert into public.profiles (id, name, email, role, is_active, permissions)
-- select
--   id,
--   'Super Admin',
--   email,
--   'super_admin',
--   true,
--   null
-- from auth.users
-- where email = 'admin@pourstop.com'
-- on conflict (id) do update set role = 'super_admin', is_active = true;
