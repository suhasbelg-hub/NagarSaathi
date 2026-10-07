-- NagarSaathi Schema & RLS Migration
-- Target: Supabase PostgreSQL

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('citizen', 'staff', 'contractor', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'grievance_status') then
    create type grievance_status as enum ('filed', 'triaged', 'assigned', 'in_progress', 'resolved');
  end if;
  if not exists (select 1 from pg_type where typname = 'priority_level') then
    create type priority_level as enum ('low', 'medium', 'high', 'critical');
  end if;
  if not exists (select 1 from pg_type where typname = 'profile_status') then
    create type profile_status as enum ('pending', 'approved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'bid_status') then
    create type bid_status as enum ('submitted', 'awarded', 'rejected');
  end if;
end $$;

-- 1. Users (Mirrors auth.users, stores roles and profiles)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  email text not null unique,
  role user_role not null default 'citizen',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Categories
create table if not exists public.categories (
  id text primary key,
  name text not null unique,
  description text not null default ''
);

-- 3. Zones
create table if not exists public.zones (
  name text primary key check (char_length(name) between 2 and 80)
);

-- 4. Contractor Profiles
create table if not exists public.contractor_profiles (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 120),
  license_number text not null unique check (license_number ~ '^[A-Za-z0-9/\-]{4,60}$'),
  trade_category_id text not null references public.categories(id),
  preferred_zones text[] not null check (array_length(preferred_zones, 1) between 1 and 10),
  status profile_status not null default 'pending',
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) between 10 and 500),
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Grievances
create table if not exists public.grievances (
  id text primary key,
  reference_number text unique,
  citizen_id uuid not null references public.users(id),
  category_id text not null references public.categories(id),
  zone text not null references public.zones(name),
  description text not null check (char_length(description) between 20 and 2000),
  photos jsonb not null default '[]'::jsonb,
  status grievance_status not null default 'filed',
  priority priority_level,
  assigned_contractor_id text references public.contractor_profiles(id),
  resolution jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- 6. Contractor Bids
create table if not exists public.contractor_bids (
  id text primary key,
  contractor_id text not null references public.contractor_profiles(id) on delete cascade,
  grievance_id text not null references public.grievances(id) on delete cascade,
  bid_notes text not null check (char_length(bid_notes) between 10 and 1000),
  status bid_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contractor_id, grievance_id)
);

-- 7. Status History
create table if not exists public.status_history (
  id text primary key,
  grievance_id text not null references public.grievances(id) on delete cascade,
  status grievance_status not null,
  updated_by uuid not null references public.users(id),
  actor_name text not null,
  actor_role user_role not null,
  notes text not null default '',
  timestamp timestamptz not null default now()
);

-- 8. Work Orders
create table if not exists public.work_orders (
  id text primary key,
  grievance_id text not null references public.grievances(id) on delete cascade,
  contractor_id text not null references public.contractor_profiles(id),
  bid_id text references public.contractor_bids(id),
  status text not null default 'assigned',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Role Helper Function (Security Definer to prevent recursive RLS)
create or replace function public.current_user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

-- Indexes
create index if not exists idx_grievances_citizen on public.grievances(citizen_id, created_at desc);
create index if not exists idx_grievances_status on public.grievances(status, priority, created_at);
create index if not exists idx_grievances_zone_cat on public.grievances(zone, category_id) where status = 'triaged';
create index if not exists idx_grievances_contractor on public.grievances(assigned_contractor_id) where assigned_contractor_id is not null;
create index if not exists idx_bids_grievance on public.contractor_bids(grievance_id, status);
create index if not exists idx_bids_contractor on public.contractor_bids(contractor_id, created_at desc);
create index if not exists idx_history_grievance on public.status_history(grievance_id, timestamp);
create index if not exists idx_profiles_status on public.contractor_profiles(status);
create index if not exists idx_profiles_match on public.contractor_profiles(trade_category_id) where status = 'approved';

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.zones enable row level security;
alter table public.grievances enable row level security;
alter table public.contractor_profiles enable row level security;
alter table public.contractor_bids enable row level security;
alter table public.status_history enable row level security;
alter table public.work_orders enable row level security;

-- RLS: Reference Data
create policy if not exists categories_read on public.categories for select using (true);
create policy if not exists zones_read on public.zones for select using (true);

-- RLS: Users
create policy if not exists users_select_self on public.users
  for select using (id = auth.uid() or public.current_user_role() in ('staff', 'admin'));

create policy if not exists users_update_self on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.users where id = auth.uid()));

-- RLS: Grievances
create policy if not exists grievances_citizen_select on public.grievances
  for select using (
    citizen_id = auth.uid()
    or public.current_user_role() in ('staff', 'admin')
    or (
      public.current_user_role() = 'contractor' and (
        assigned_contractor_id = (select id from public.contractor_profiles where user_id = auth.uid())
        or (
          status = 'triaged' and exists (
            select 1 from public.contractor_profiles cp
            where cp.user_id = auth.uid() and cp.status = 'approved'
              and cp.trade_category_id = grievances.category_id
              and grievances.zone = any(cp.preferred_zones)
          )
        )
      )
    )
  );

create policy if not exists grievances_citizen_insert on public.grievances
  for insert with check (
    citizen_id = auth.uid()
    and public.current_user_role() = 'citizen'
    and status = 'filed'
    and priority is null
    and assigned_contractor_id is null
  );

create policy if not exists grievances_staff_update on public.grievances
  for update using (public.current_user_role() = 'staff')
  with check (public.current_user_role() = 'staff' and status in ('triaged', 'assigned'));

create policy if not exists grievances_contractor_update on public.grievances
  for update using (
    public.current_user_role() = 'contractor'
    and assigned_contractor_id = (select id from public.contractor_profiles where user_id = auth.uid())
    and status in ('assigned', 'in_progress')
  )
  with check (status in ('in_progress', 'resolved'));

create policy if not exists grievances_admin_all on public.grievances
  for all using (public.current_user_role() = 'admin');

-- RLS: Contractor Profiles
create policy if not exists profiles_read on public.contractor_profiles
  for select using (
    user_id = auth.uid()
    or public.current_user_role() in ('staff', 'admin')
    or status = 'approved'
  );

create policy if not exists profiles_insert_owner on public.contractor_profiles
  for insert with check (
    user_id = auth.uid()
    and public.current_user_role() = 'contractor'
    and status = 'pending'
  );

create policy if not exists profiles_update_owner on public.contractor_profiles
  for update using (user_id = auth.uid() and status in ('pending', 'rejected'))
  with check (user_id = auth.uid() and status = 'pending' and approved_by is null and approved_at is null);

create policy if not exists profiles_admin_manage on public.contractor_profiles
  for update using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- RLS: Contractor Bids
create policy if not exists bids_select on public.contractor_bids
  for select using (
    contractor_id = (select id from public.contractor_profiles where user_id = auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );

create policy if not exists bids_insert on public.contractor_bids
  for insert with check (
    contractor_id = (select id from public.contractor_profiles where user_id = auth.uid())
    and public.current_user_role() = 'contractor'
    and exists (select 1 from public.contractor_profiles p where p.user_id = auth.uid() and p.status = 'approved')
    and exists (select 1 from public.grievances g where g.id = grievance_id and g.status = 'triaged')
  );

create policy if not exists bids_staff_update on public.contractor_bids
  for update using (public.current_user_role() = 'staff')
  with check (status in ('awarded', 'rejected'));

-- RLS: Status History
create policy if not exists history_select on public.status_history
  for select using (
    public.current_user_role() in ('staff', 'admin')
    or exists (select 1 from public.grievances g where g.id = grievance_id and g.citizen_id = auth.uid())
    or exists (select 1 from public.grievances g where g.id = grievance_id and g.assigned_contractor_id = (select id from public.contractor_profiles where user_id = auth.uid()))
  );

create policy if not exists history_insert on public.status_history
  for insert with check (updated_by = auth.uid());

-- Storage Bucket Setup (in storage schema)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('grievance-photos', 'grievance-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('fix-photos', 'fix-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
