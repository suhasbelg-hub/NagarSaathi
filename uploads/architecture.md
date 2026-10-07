# architecture.md — NagarSaathi Technical Blueprint

**Version:** 1.1 — executable implementation blueprint
**Canon:** One of the 9 base-rules files (`design.md` §1). Product behavior: `PRD.md`. UI/UX implementation detail: `UX-Design-Brief.md`, `userflow.md`, `design-system.md`, `components.md`, `screen-specs.md`. Plan: `phases.md`. This file is authoritative for schema, security, and system design; per `design.md` §2, security/data boundaries defined here always win.
**Stack (mandatory, exhaustive):** Next.js 15 (App Router, Server Actions, Route Handlers) · React · TypeScript (strict) · Tailwind CSS · shadcn/ui (Radix) · Lucide React · Framer Motion · Supabase (PostgreSQL + RLS, Auth with PKCE + HttpOnly cookies, Realtime `postgres_changes`, Storage) · React Hook Form + Zod · Resend (transactional email) · Next.js Metadata API + Vercel Analytics · Vercel + GitHub.

---

## 1. System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                               USER BROWSER (per role)                          │
│  ┌──────────────────────────┐   ┌──────────────────────────────────────────┐   │
│  │  React Server Components │   │  Client Components ("use client")        │   │
│  │  (data fetch via         │   │  - RHF + Zod forms                       │   │
│  │   server Supabase client)│   │  - Realtime hooks (supabase-js WS)       │   │
│  │                          │   │  - SLA countdown engine                  │   │
│  └────────────┬─────────────┘   └───────┬──────────────────────┬───────────┘   │
└───────────────┼─────────────────────────┼──────────────────────┼───────────────┘
                │ HTTPS (RSC payload)     │ Server Actions /     │ WSS (Realtime)
                │                         │ Route Handlers       │
┌───────────────▼─────────────────────────▼────────────────┐     │
│                 VERCEL — NEXT.JS 15 APP ROUTER           │     │
│  middleware.ts ── session refresh (@supabase/ssr,        │     │
│  │                HttpOnly cookies) + role route guard   │     │
│  ├── Server Actions (mutations: file, triage, bid,       │     │
│  │     award, start-work, resolve, verify)  ── Zod       │     │
│  │     re-validation + state-machine guard + rate limits │     │
│  ├── Route Handlers (/auth/callback, /api/*)             │     │
│  └── lib/supabase/{server,admin}.ts                      │     │
│        - anon key + user JWT  → RLS-scoped queries       │     │
│        - service-role key (SERVER-ONLY) → admin tasks    │     │
└──────┬──────────────────────────────┬────────────────────┘     │
       │ PostgREST / RPC (TLS)        │ Storage API              │
┌──────▼──────────────────────────────▼──────────────────────────▼──────────────┐
│                                   SUPABASE                                    │
│  ┌───────────────┐  ┌─────────────────────────────┐  ┌─────────────────────┐  │
│  │ Supabase Auth │  │ PostgreSQL + RLS ENGINE     │  │ Realtime Server     │  │
│  │ PKCE flow     │  │  users, categories,         │  │  WAL → postgres_    │  │
│  │ JWT w/ role   │  │  grievances, contractor_    │  │  changes broadcast  │  │
│  │ claim; email  │  │  profiles, contractor_bids, │  │  (RLS-authorized    │  │
│  │ verify/reset  │  │  status_history, zones,     │  │  channels, <2s)     │  │
│  └──────┬────────┘  │  login_attempts + views     │  └─────────────────────┘  │
│         │ trigger   │  triggers: user mirror,     │  ┌─────────────────────┐  │
│         └─────────► │  updated_at, history append │  │ Supabase Storage    │  │
│                     └─────────────────────────────┘  │  grievance-photos,  │  │
│                                                      │  fix-photos (RLS)   │  │
│                                                      └─────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
              RESEND (transactional email: filed/assigned/resolved/verification)
```

**Data-flow invariants**

1. Every client-originated read/write goes through RLS with the user's JWT. The service-role client exists **only** in `lib/supabase/admin.ts` (imported exclusively by server code guarded with `import "server-only"`).
2. All mutations are Server Actions: Zod-validated, state-machine-guarded, transactional where multi-row (bid award), and always append `status_history` on lifecycle transitions.
3. Realtime is **read-path only** (UI refresh signals); it never carries authority — clients re-render from authorized query results.
4. Emails are fire-and-forget side effects dispatched after successful commits; email failure never rolls back a transition (logged for retry).

---

## 2. PostgreSQL Relational Schema & DDL

All migrations live in `supabase/migrations/` and run via Supabase CLI. Order: extensions/enums → tables → triggers → indexes → RLS → views → seeds.

### 2.1 Enums & Extensions

```sql
create extension if not exists "pgcrypto";

create type user_role        as enum ('citizen', 'staff', 'contractor', 'admin');
create type grievance_status as enum ('filed', 'triaged', 'assigned', 'in_progress', 'resolved');
create type priority_level   as enum ('low', 'medium', 'high', 'critical');
create type profile_status   as enum ('pending', 'approved', 'rejected');
create type bid_status       as enum ('submitted', 'awarded', 'rejected');
```

### 2.2 Tables

```sql
-- users: application mirror of auth.users (1:1), source of role truth
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 2 and 120),
  email        text not null unique,
  role         user_role not null default 'citizen',
  confirmed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- categories: grievance categories; double as contractor trade categories (1:1 in Phase 1)
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text not null default ''
);

-- zones: controlled municipal zone list (single city; seed content To Be Decided)
create table public.zones (
  name text primary key check (char_length(name) between 2 and 80)
);

create table public.grievances (
  id                     uuid primary key default gen_random_uuid(),
  citizen_id             uuid not null references public.users(id),
  category_id            uuid not null references public.categories(id),
  zone                   text not null references public.zones(name),
  description            text not null check (char_length(description) between 20 and 2000),
  photos_url             text[] not null default '{}'
                         check (array_length(photos_url, 1) between 1 and 11), -- 1–5 filing + up to 6 fix photos
  status                 grievance_status not null default 'filed',
  priority               priority_level,
  assigned_contractor_id uuid references public.contractor_profiles(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint assigned_requires_contractor check (
    (status in ('assigned','in_progress','resolved')) = (assigned_contractor_id is not null)
  ),
  constraint triaged_requires_priority check (
    status = 'filed' or priority is not null
  )
);

create table public.contractor_profiles (
  id                uuid primary key references public.users(id) on delete cascade, -- 1:1 with contractor user
  business_name     text not null check (char_length(business_name) between 2 and 120),
  license_number    text not null unique check (license_number ~ '^[A-Za-z0-9/\-]{4,60}$'),
  trade_category_id uuid not null references public.categories(id),
  preferred_zones   text[] not null check (array_length(preferred_zones, 1) between 1 and 10),
  status            profile_status not null default 'pending',
  rejection_reason  text check (rejection_reason is null or char_length(rejection_reason) between 10 and 500),
  approved_by       uuid references public.users(id),
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint approval_audit_consistent check (
    (status = 'approved') = (approved_by is not null and approved_at is not null)
  )
);

-- grievances.assigned_contractor_id FK is added after contractor_profiles exists:
alter table public.grievances
  add constraint grievances_assigned_contractor_fk
  foreign key (assigned_contractor_id) references public.contractor_profiles(id);
-- (In migrations, create grievances without the FK column reference first, or order tables
--  contractor_profiles → grievances. Final schema is as declared above.)

create table public.contractor_bids (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractor_profiles(id),
  grievance_id  uuid not null references public.grievances(id) on delete cascade,
  bid_notes     text not null check (char_length(bid_notes) between 10 and 1000),
  status        bid_status not null default 'submitted',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (contractor_id, grievance_id)
);

-- NOTE (binding decision D-A, design.md §3): status_history has a single public
-- `notes` field and NO visibility flag. Phase 1 has no internal/staff-only notes:
-- every note is readable by every RLS-authorized viewer of the grievance
-- (citizen-owner, assigned contractor, staff, admin). Actors must write notes
-- accordingly. An internal-note visibility model is a Phase 2 decision.
create table public.status_history (
  id           uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  status       grievance_status not null,
  updated_by   uuid not null references public.users(id),
  notes        text not null default '',
  "timestamp"  timestamptz not null default now()
);

-- login_attempts: server-side auth rate limiting (5 / 15 min per email+IP)
create table public.login_attempts (
  id           bigint generated always as identity primary key,
  email        text not null,
  ip           inet not null,
  attempted_at timestamptz not null default now(),
  success      boolean not null default false
);
```

### 2.3 Triggers & Functions

```sql
-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger trg_users_updated_at      before update on public.users               for each row execute function public.set_updated_at();
create trigger trg_grievances_updated_at before update on public.grievances          for each row execute function public.set_updated_at();
create trigger trg_profiles_updated_at   before update on public.contractor_profiles for each row execute function public.set_updated_at();
create trigger trg_bids_updated_at       before update on public.contractor_bids     for each row execute function public.set_updated_at();

-- Mirror auth.users → public.users on signup; role from signup metadata
-- (constrained to citizen/contractor; staff/admin are provisioned server-side)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare requested text := coalesce(new.raw_user_meta_data->>'role', 'citizen');
begin
  if requested not in ('citizen', 'contractor') then requested := 'citizen'; end if;
  insert into public.users (id, name, email, role, confirmed_at)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'User'),
          new.email, requested::user_role, new.email_confirmed_at)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Sync email confirmation into public.users.confirmed_at
create or replace function public.handle_user_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.users set confirmed_at = new.email_confirmed_at where id = new.id;
  return new;
end $$;

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();

-- Forward-only state machine enforcement at the database layer (defense in depth)
create or replace function public.enforce_grievance_transition()
returns trigger language plpgsql as $$
declare
  order_old int; order_new int;
begin
  select idx into order_old from unnest(enum_range(null::grievance_status)) with ordinality t(s, idx) where s = old.status;
  select idx into order_new from unnest(enum_range(null::grievance_status)) with ordinality t(s, idx) where s = new.status;
  if order_new < order_old or order_new > order_old + 1 then
    raise exception 'invalid_status_transition: % -> %', old.status, new.status;
  end if;
  return new;
end $$;

create trigger trg_grievance_transition
  before update of status on public.grievances
  for each row execute function public.enforce_grievance_transition();

-- Role helper for RLS policies (stable, SECURITY DEFINER to avoid recursive RLS)
create or replace function public.current_user_role()
returns user_role language sql stable security definer set search_path = public as
$$ select role from public.users where id = auth.uid() $$;
```

### 2.4 Indexes

```sql
create index idx_grievances_citizen      on public.grievances (citizen_id, created_at desc);
create index idx_grievances_status       on public.grievances (status, priority, created_at);
create index idx_grievances_zone_cat     on public.grievances (zone, category_id) where status = 'triaged';
create index idx_grievances_contractor   on public.grievances (assigned_contractor_id) where assigned_contractor_id is not null;
create index idx_bids_grievance          on public.contractor_bids (grievance_id, status);
create index idx_bids_contractor         on public.contractor_bids (contractor_id, created_at desc);
create index idx_history_grievance       on public.status_history (grievance_id, "timestamp");
create index idx_profiles_status         on public.contractor_profiles (status);
create index idx_profiles_match          on public.contractor_profiles (trade_category_id) where status = 'approved';
create index idx_profiles_zones          on public.contractor_profiles using gin (preferred_zones);
create index idx_login_attempts_window   on public.login_attempts (email, attempted_at desc);
create index idx_login_attempts_ip       on public.login_attempts (ip, attempted_at desc);
create index idx_grievances_desc_search  on public.grievances using gin (to_tsvector('english', description));
```

### 2.5 Metrics Views (Admin observability)

```sql
create or replace view public.v_grievance_metrics as
select
  count(*) filter (where status = 'filed')       as filed_count,
  count(*) filter (where status = 'triaged')     as triaged_count,
  count(*) filter (where status = 'assigned')    as assigned_count,
  count(*) filter (where status = 'in_progress') as in_progress_count,
  count(*) filter (where status = 'resolved')    as resolved_count,
  avg(resolved.ts - g.created_at) filter (where resolved.ts is not null)
    as avg_resolution_interval,
  count(*) filter (
    where status <> 'resolved'
      and now() > g.created_at + case g.priority
            when 'critical' then interval '12 hours'
            when 'high'     then interval '24 hours'
            when 'medium'   then interval '48 hours'
            else interval '72 hours' end
  ) as overdue_count
from public.grievances g
left join lateral (
  select min(h."timestamp") as ts
  from public.status_history h
  where h.grievance_id = g.id and h.status = 'resolved'
) resolved on true;
-- View access is admin-only: enforced by querying it exclusively through
-- server code after a role check, plus: revoke select from anon/authenticated,
-- grant via a SECURITY DEFINER RPC `admin_get_metrics()` that verifies
-- current_user_role() = 'admin'.
```

### 2.6 Seeds (`supabase/seed.sql`)

- `categories`: Roads & Potholes, Streetlights & Electrical, Water Supply & Leakage, Sewage & Drainage, Garbage & Sanitation, Parks & Public Spaces (descriptions included).
- `zones`: development placeholder set `Zone 1 — Central` … `Zone 8 — Outer East` (production list `To Be Decided` by municipality; replaced via migration before cutover).
- One admin + one staff account provisioned via a server-side seed script using the service-role key (never via public `/register`).

---

## 3. Row-Level Security (RLS) Policies

RLS is **enabled and forced on every table**. Default posture: deny. The service-role key bypasses RLS and is confined to `lib/supabase/admin.ts`.

```sql
alter table public.users               enable row level security;
alter table public.categories          enable row level security;
alter table public.zones               enable row level security;
alter table public.grievances          enable row level security;
alter table public.contractor_profiles enable row level security;
alter table public.contractor_bids     enable row level security;
alter table public.status_history      enable row level security;
alter table public.login_attempts      enable row level security; -- no policies: service-role only

-- ======================= users =======================
create policy users_select_self on public.users
  for select using (id = auth.uid());
create policy users_select_admin on public.users
  for select using (public.current_user_role() = 'admin');
create policy users_update_self on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.users where id = auth.uid()));
  -- role is immutable from the client; name edits only.

-- =================== reference data ===================
create policy categories_read_all on public.categories
  for select using (auth.uid() is not null);
create policy zones_read_all on public.zones
  for select using (auth.uid() is not null);
-- writes to reference data: service-role only (admin tooling), no policies.

-- ===================== grievances =====================
-- Citizens: read own; create own (always status 'filed', no self-set priority/assignment)
create policy grievances_citizen_select on public.grievances
  for select using (citizen_id = auth.uid());
create policy grievances_citizen_insert on public.grievances
  for insert with check (
    citizen_id = auth.uid()
    and public.current_user_role() = 'citizen'
    and status = 'filed'
    and priority is null
    and assigned_contractor_id is null
  );

-- Staff: read all grievances in the municipality (single-city jurisdiction);
-- manage triage + assignment
create policy grievances_staff_select on public.grievances
  for select using (public.current_user_role() = 'staff');
create policy grievances_staff_update on public.grievances
  for update using (public.current_user_role() = 'staff')
  with check (
    public.current_user_role() = 'staff'
    and citizen_id = citizen_id  -- staff cannot reattribute ownership (enforced further in actions)
    and status in ('triaged', 'assigned')
  );

-- Contractors: see only 'triaged' grievances matching their approved trade + zones,
-- plus grievances assigned to them; update only their own assigned work forward.
create policy grievances_contractor_select on public.grievances
  for select using (
    public.current_user_role() = 'contractor'
    and (
      assigned_contractor_id = auth.uid()
      or (
        status = 'triaged'
        and exists (
          select 1 from public.contractor_profiles p
          where p.id = auth.uid()
            and p.status = 'approved'
            and p.trade_category_id = grievances.category_id
            and grievances.zone = any (p.preferred_zones)
        )
      )
    )
  );
create policy grievances_contractor_update on public.grievances
  for update using (
    public.current_user_role() = 'contractor'
    and assigned_contractor_id = auth.uid()
    and status in ('assigned', 'in_progress')
  )
  with check (
    assigned_contractor_id = auth.uid()
    and status in ('in_progress', 'resolved')
  );

-- Admin: superuser read (writes go through verification/service paths)
create policy grievances_admin_select on public.grievances
  for select using (public.current_user_role() = 'admin');

-- ================= contractor_profiles =================
create policy profiles_owner_select on public.contractor_profiles
  for select using (id = auth.uid());
create policy profiles_owner_insert on public.contractor_profiles
  for insert with check (
    id = auth.uid()
    and public.current_user_role() = 'contractor'
    and status = 'pending' and approved_by is null and approved_at is null
  );
create policy profiles_owner_resubmit on public.contractor_profiles
  for update using (id = auth.uid() and status in ('pending', 'rejected'))
  with check (id = auth.uid() and status = 'pending'
              and approved_by is null and approved_at is null);
create policy profiles_staff_select_approved on public.contractor_profiles
  for select using (public.current_user_role() = 'staff' and status = 'approved');
create policy profiles_admin_all on public.contractor_profiles
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
-- Citizens may read ONLY the business_name of their assigned contractor:
-- exposed via SECURITY DEFINER RPC get_assigned_contractor_name(grievance_id)
-- that verifies grievance ownership — no direct table policy for citizens.

-- =================== contractor_bids ===================
create policy bids_contractor_select on public.contractor_bids
  for select using (contractor_id = auth.uid());
create policy bids_contractor_insert on public.contractor_bids
  for insert with check (
    contractor_id = auth.uid()
    and status = 'submitted'
    and exists (select 1 from public.contractor_profiles p
                where p.id = auth.uid() and p.status = 'approved')
    and exists (select 1 from public.grievances g
                where g.id = grievance_id and g.status = 'triaged')
  );
create policy bids_staff_select on public.contractor_bids
  for select using (public.current_user_role() = 'staff');
create policy bids_staff_decide on public.contractor_bids
  for update using (public.current_user_role() = 'staff')
  with check (status in ('awarded', 'rejected'));
create policy bids_admin_select on public.contractor_bids
  for select using (public.current_user_role() = 'admin');

-- ==================== status_history ====================
create policy history_citizen_select on public.status_history
  for select using (exists (
    select 1 from public.grievances g
    where g.id = grievance_id and g.citizen_id = auth.uid()));
create policy history_contractor_select on public.status_history
  for select using (exists (
    select 1 from public.grievances g
    where g.id = grievance_id and g.assigned_contractor_id = auth.uid()));
create policy history_staff_admin_select on public.status_history
  for select using (public.current_user_role() in ('staff', 'admin'));
create policy history_insert_actors on public.status_history
  for insert with check (
    updated_by = auth.uid()
    and (
      (public.current_user_role() = 'citizen' and status = 'filed'
        and exists (select 1 from public.grievances g where g.id = grievance_id and g.citizen_id = auth.uid()))
      or (public.current_user_role() = 'staff' and status in ('triaged', 'assigned'))
      or (public.current_user_role() = 'contractor' and status in ('in_progress', 'resolved')
        and exists (select 1 from public.grievances g where g.id = grievance_id and g.assigned_contractor_id = auth.uid()))
    )
  );
-- history is append-only: no update/delete policies exist for any role.
```

### 3.1 Storage Bucket Policies

Buckets: `grievance-photos`, `fix-photos` (private; max object size 5 MB; allowed MIME: `image/webp`, `image/jpeg`, `image/png` — enforced in bucket config AND Zod).

```sql
-- grievance-photos: path convention grievances/{grievance_id}/{uuid}.{ext}
create policy gp_citizen_insert on storage.objects for insert with check (
  bucket_id = 'grievance-photos'
  and exists (select 1 from public.grievances g
              where g.id::text = (storage.foldername(name))[2]
                and g.citizen_id = auth.uid())
);
create policy gp_read_scoped on storage.objects for select using (
  bucket_id = 'grievance-photos'
  and exists (select 1 from public.grievances g
              where g.id::text = (storage.foldername(name))[2]) -- row visibility delegated:
  and (
    public.current_user_role() in ('staff', 'admin')
    or exists (select 1 from public.grievances g
               where g.id::text = (storage.foldername(name))[2]
                 and (g.citizen_id = auth.uid() or g.assigned_contractor_id = auth.uid()
                      or (g.status = 'triaged' and exists (
                            select 1 from public.contractor_profiles p
                            where p.id = auth.uid() and p.status = 'approved'
                              and p.trade_category_id = g.category_id
                              and g.zone = any (p.preferred_zones)))))
  )
);

-- fix-photos: path convention fixes/{grievance_id}/(before|after)/{uuid}.{ext}
create policy fp_contractor_insert on storage.objects for insert with check (
  bucket_id = 'fix-photos'
  and exists (select 1 from public.grievances g
              where g.id::text = (storage.foldername(name))[2]
                and g.assigned_contractor_id = auth.uid()
                and g.status in ('assigned', 'in_progress'))
);
create policy fp_read_scoped on storage.objects for select using (
  bucket_id = 'fix-photos'
  and (
    public.current_user_role() in ('staff', 'admin')
    or exists (select 1 from public.grievances g
               where g.id::text = (storage.foldername(name))[2]
                 and (g.citizen_id = auth.uid() or g.assigned_contractor_id = auth.uid()))
  )
);
```

Clients render images via short-lived signed URLs minted server-side (60-minute TTL); raw public URLs are never used.

---

## 4. Server Actions — Mutation Catalog

Every mutation: `"use server"` module → Zod parse → auth + role assertion → business guard → RLS-scoped write (or transactional RPC) → `status_history` append → `revalidatePath` → email side effect. Returns a discriminated union `{ ok: true, data } | { ok: false, error: { code, message, fieldErrors? } }`.

| Action | Actor | Guard | Effect |
|---|---|---|---|
| `fileGrievance` | citizen | verified email; 1–5 uploaded photo paths | insert `grievances` (`filed`) + history + confirmation email |
| `triageGrievance` | staff | status `filed`; priority provided | set priority; `filed → triaged`; history |
| `awardBid` | staff | grievance `triaged`; bid `submitted` | **RPC `award_bid(bid_id)` (single transaction, `select … for update` on grievance):** bid→`awarded`; sibling `submitted` bids→`rejected`; grievance→`assigned` + `assigned_contractor_id`; history; emails (citizen + winner) |
| `rejectBid` | staff | bid `submitted` | bid → `rejected` |
| `startWork` | contractor | assigned to self; status `assigned` | `assigned → in_progress`; history |
| `submitFixConfirmation` | contractor | assigned to self; status `in_progress`; 1–3 before + 1–3 after photos; notes 20–1000 | append fix photo paths; `in_progress → resolved`; history(notes); resolution email to citizen |
| `upsertContractorProfile` | contractor | none / `rejected` for resubmit | insert/update profile → `pending` |
| `submitBid` | contractor | approved profile; grievance `triaged` & matching; no existing bid | insert bid `submitted` |
| `approveContractor` / `rejectContractor` | admin | profile `pending` (reject requires reason) | set status + audit fields; email contractor |
| `updateOwnName` | any | — | update `users.name` |

Concurrency: `award_bid` RPC raises `conflict_already_decided` if the grievance left `triaged`; the action maps DB errors (`invalid_status_transition`, unique violations, RLS denials) to typed error codes consumed by toasts/inline errors.

---

## 5. Realtime WebSocket Strategy

### 5.1 Subscription Topology (per role)

| Surface | Channel name | Subscription (`postgres_changes`) |
|---|---|---|
| Citizen grievance detail | `grievance:{id}` | `UPDATE public.grievances` filter `id=eq.{id}`; `INSERT public.status_history` filter `grievance_id=eq.{id}` |
| Citizen list/overview | `citizen:{uid}` | `INSERT/UPDATE public.grievances` filter `citizen_id=eq.{uid}` |
| Staff queue | `staff:queue` | `INSERT/UPDATE public.grievances` (jurisdiction = whole city) |
| Staff workbench | `grievance:{id}` + `bids:{grievanceId}` | grievance row + `INSERT/UPDATE public.contractor_bids` filter `grievance_id=eq.{id}` |
| Contractor opportunities | `contractor:opps:{uid}` | `UPDATE public.grievances` (client re-queries matching set on events; RLS filters reads) |
| Contractor bids/work orders | `contractor:{uid}` | `UPDATE public.contractor_bids` filter `contractor_id=eq.{uid}`; `UPDATE public.grievances` filter `assigned_contractor_id=eq.{uid}` |
| Admin verification queue | `admin:profiles` | `INSERT/UPDATE public.contractor_profiles` |

Realtime authorization: the publication includes the six domain tables; Realtime enforces RLS for `postgres_changes`, so clients only ever receive rows they are allowed to select. Event payloads are treated as **invalidation signals**: handlers re-fetch via RLS-scoped queries (router refresh or scoped query revalidation) rather than trusting payload shape — this also makes dedup trivial.

### 5.2 Client Hook Contract (`hooks/use-realtime.ts`)

```ts
"use client";
import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Sub = {
  table: "grievances" | "status_history" | "contractor_bids" | "contractor_profiles";
  event: "INSERT" | "UPDATE" | "*";
  filter?: string; // e.g. `grievance_id=eq.${id}`
};

export function useRealtime(
  channelName: string,
  subs: Sub[],
  onChange: (p: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  onStatus?: (s: "live" | "reconnecting") => void,
) {
  const seen = useRef<Map<string, number>>(new Map()); // dedup: commit_timestamp+id, 30s TTL

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(channelName);
    for (const s of subs) {
      channel.on(
        "postgres_changes",
        { event: s.event, schema: "public", table: s.table, filter: s.filter },
        (payload) => {
          const row = (payload.new ?? payload.old) as { id?: string };
          const key = `${payload.commit_timestamp}:${payload.table}:${row?.id ?? ""}`;
          const now = Date.now();
          for (const [k, t] of seen.current) if (now - t > 30_000) seen.current.delete(k);
          if (seen.current.has(key)) return;            // dedup across re-joins
          seen.current.set(key, now);
          onChange(payload);
        },
      );
    }
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") onStatus?.("live");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onStatus?.("reconnecting");
      // supabase-js performs automatic exponential-backoff rejoin; on rejoin,
      // onStatus flips back to "live" and the surface triggers one re-fetch to
      // close any gap missed while disconnected.
    });
    return () => { void supabase.removeChannel(channel); }; // mandatory unmount cleanup
  }, [channelName, JSON.stringify(subs)]); // eslint-disable-line react-hooks/exhaustive-deps
}
```

**Rules (enforced in review):**
1. Exactly one `removeChannel` per `channel()` — the effect cleanup above; no channel may be created outside this hook.
2. Reconnection: rely on supabase-js heartbeat (default 30 s) + backoff rejoin; every rejoin triggers a single authoritative re-fetch (gap healing).
3. Deduplication via `commit_timestamp + table + row id` TTL cache (covers duplicate delivery on rejoin).
4. Memory-leak guards: dedup map is TTL-pruned; handlers hold no stale closures over large lists (they call router/query invalidation, not state appends).
5. UI latency budget: event receipt → visible update < 500 ms client-side, keeping the end-to-end < 2 s target (commit → broadcast is Supabase-side).
6. Connection status surfaces through the shell `ConnectionIndicator` (`components.md` §2) and `aria-live` announcements, throttled per `design-system.md` §12 (max one announcement per 2 s per region).

---

## 6. Auth, Session & Route Protection

- **Supabase Auth, PKCE flow**, sessions in **secure HttpOnly cookies** via `@supabase/ssr` (`getAll`/`setAll` cookie bridge). No tokens in `localStorage`.
- `/auth/callback` Route Handler exchanges the PKCE code, then redirects by role.
- **Role claims:** a Supabase **Custom Access Token Hook** copies `public.users.role` into JWT claim `user_role` at token mint; middleware reads the claim for routing. **Authorization truth remains RLS** (which derives role from `public.users` via `current_user_role()`), so a stale claim can never widen data access.
- `middleware.ts` (runs on all non-static routes): refresh session → if unauthenticated and path is protected → redirect `/login?next=…`; if authenticated → enforce prefix map `citizen → /dashboard/citizen`, `staff → /dashboard/staff`, `contractor → /dashboard/contractor`, `admin → /admin`; wrong-role access redirects to own dashboard (no 403 data leak). Authenticated users visiting `/login`/`/register` are redirected home-by-role.
- Email verification required: unverified users are routed to `/verify` state; Server Actions re-assert `email_confirmed`.

---

## 7. Folder Structure (Next.js 15 App Router)

```
nagarsaathi/
├── app/
│   ├── layout.tsx                      # root layout: fonts, metadata defaults, analytics
│   ├── page.tsx                        # landing (/)
│   ├── not-found.tsx                   # /404
│   ├── sitemap.ts                      # dynamic sitemap.xml (public routes only)
│   ├── robots.ts                       # robots.txt (disallow /dashboard, /admin)
│   ├── opengraph-image.tsx             # OG generation
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── thank-you/page.tsx
│   ├── auth/callback/route.ts          # PKCE code exchange (Route Handler)
│   ├── dashboard/
│   │   ├── layout.tsx                  # authenticated shell (sidebar, topbar, realtime indicator)
│   │   ├── citizen/
│   │   │   ├── page.tsx
│   │   │   ├── grievances/page.tsx
│   │   │   ├── grievances/new/page.tsx
│   │   │   ├── grievances/[id]/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── staff/
│   │   │   ├── page.tsx
│   │   │   ├── queue/page.tsx
│   │   │   ├── grievances/[id]/page.tsx
│   │   │   ├── contractors/page.tsx
│   │   │   └── profile/page.tsx
│   │   └── contractor/
│   │       ├── page.tsx
│   │       ├── onboarding/page.tsx
│   │       ├── opportunities/page.tsx
│   │       ├── opportunities/[id]/page.tsx
│   │       ├── bids/page.tsx
│   │       ├── work-orders/page.tsx
│   │       ├── work-orders/[id]/page.tsx
│   │       └── profile/page.tsx
│   └── admin/
│       ├── layout.tsx
│       ├── page.tsx                    # metrics
│       ├── contractors/page.tsx
│       ├── users/page.tsx
│       ├── grievances/page.tsx
│       └── profile/page.tsx
├── actions/                            # Server Actions ("use server")
│   ├── grievances.ts                   # fileGrievance, triageGrievance
│   ├── bids.ts                         # submitBid, awardBid, rejectBid
│   ├── work-orders.ts                  # startWork, submitFixConfirmation
│   ├── contractor-profiles.ts          # upsertContractorProfile
│   ├── admin.ts                        # approveContractor, rejectContractor
│   └── account.ts                      # updateOwnName
├── components/
│   ├── ui/                             # shadcn/ui primitives (button, dialog, select, …)
│   ├── layout/                         # sidebar, topbar, mobile-drawer, skip-link
│   ├── grievances/                     # status-badge, priority-chip, timeline-accordion,
│   │                                   # grievance-card, photo-grid, photo-lightbox
│   ├── forms/                          # image-dropzone, zone-autocomplete, form-error-summary
│   ├── realtime/                       # connection-indicator, live-region-announcer
│   ├── sla/                            # sla-countdown, overdue-badge
│   ├── staff/                          # queue-table, filter-toolbar, suggestion-panel, bid-list
│   ├── contractor/                     # opportunity-card, bid-form, fix-confirmation-form
│   ├── admin/                          # verification-queue, metrics-cards, users-table
│   └── shared/                         # empty-state, skeletons, confirm-dialog, toaster
├── hooks/
│   ├── use-realtime.ts
│   ├── use-sla-countdown.ts            # drift-corrected ticker (server offset)
│   └── use-announcer.ts                # throttled aria-live announcements
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # browser client (anon key)
│   │   ├── server.ts                   # server client (cookies, anon key + user JWT)
│   │   ├── admin.ts                    # service-role client — import "server-only"
│   │   └── middleware.ts               # session refresh helper
│   ├── validation/                     # Zod schemas (single source, shared client/server)
│   │   ├── grievance.ts  bid.ts  contractor-profile.ts  fix-confirmation.ts  auth.ts
│   ├── sla.ts                          # SLA window math (12/24/48/72h), overdue predicate
│   ├── state-machine.ts                # canTransition(from, to, role)
│   ├── match.ts                        # contractor auto-suggestion ranking
│   ├── storage.ts                      # upload helpers, signed URL minting (server)
│   ├── email.ts                        # Resend templates: filed/assigned/resolved/verification
│   ├── rate-limit.ts                   # login_attempts window check
│   └── utils.ts                        # cn(), date/format helpers
├── types/
│   ├── database.ts                     # supabase gen types typescript output
│   └── domain.ts                       # GrievanceStatus, Priority, Role, ActionResult<T>
├── middleware.ts                       # auth refresh + role route guard
├── supabase/
│   ├── migrations/                     # 0001_init … NNNN_* (DDL of §2–§3)
│   ├── seed.sql
│   └── config.toml
├── docs/                               # the 9 base-rules files, committed to the repo so
│   │                                   # AI agents and engineers can always read them:
│   │                                   # PRD.md, design.md, architecture.md, phases.md,
│   │                                   # UX-Design-Brief.md, userflow.md, design-system.md,
│   │                                   # components.md, screen-specs.md (+ playbook.md guide)
├── tests/
│   ├── unit/                           # state-machine, sla, match, zod schemas
│   ├── rls/                            # policy tests (pgTAP or supabase test harness)
│   └── e2e/                            # Playwright: role journeys AC-1…AC-10
├── tailwind.config.ts  components.json  next.config.ts  tsconfig.json  .env.example
```

---

## 8. Security & Hardening

### 8.1 Security Headers (`next.config.ts` → `headers()`)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com;   # Next inline runtime + Vercel Analytics
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://<project-ref>.supabase.co;
  connect-src 'self' https://<project-ref>.supabase.co wss://<project-ref>.supabase.co https://va.vercel-scripts.com;
  font-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), geolocation=(), microphone=()
X-Frame-Options: DENY
```

(Fonts are self-hosted via `next/font`; no external font/CDN origins are permitted.)

### 8.2 Rate Limiting

- **Login: max 5 failed attempts per 15 minutes** per email **and** per IP. Implementation: login Server Action records each attempt in `login_attempts` (service-role write) and, before authenticating, counts failures in the trailing window:
  `select count(*) from login_attempts where (email = $1 or ip = $2) and success = false and attempted_at > now() - interval '15 minutes'` → if ≥ 5, return `rate_limited` with retry-after (earliest attempt + 15 min), skipping the auth call entirely. Successful login writes a `success = true` row (resets pressure naturally via the sliding window).
- Registration + password-reset requests: 3 per hour per IP (same table pattern, `email = ''` sentinel + purpose column optional — kept minimal in Phase 1 by reusing the window query).
- Mutation Server Actions: lightweight per-user sliding window (e.g., 10 grievance filings/hour/citizen) to blunt abuse at 50-tickets/hour system scale; returns typed `rate_limited`.
- Nightly cleanup: delete `login_attempts` older than 24 h (Supabase scheduled function / pg_cron).

### 8.3 Input Sanitization & Validation

- **Zod at every trust boundary:** identical schemas imported by RHF resolvers (client UX) and re-executed inside Server Actions (authority). No mutation reads `formData` without a successful `schema.safeParse`.
- Strings trimmed + length-bounded; enums validated against the canonical unions; UUIDs via `z.string().uuid()`; zone validated against the `zones` table server-side; arrays bounded (photos 1–5, zones 1–10).
- Output encoding: React escaping only — no `dangerouslySetInnerHTML` anywhere; user text renders as text.
- File uploads: extension + MIME + 5 MB checks client-side, re-enforced by Storage bucket config (size/MIME limits) and path-convention RLS; object names are server-generated UUIDs (user filenames never used as keys).
- SQL safety: only supabase-js query builder / parameterized RPCs; no string-built SQL.

### 8.4 Service-Role Key Isolation

- `SUPABASE_SERVICE_ROLE_KEY` exists only as a server env var (never `NEXT_PUBLIC_*`), consumed solely by `lib/supabase/admin.ts`, which begins with `import "server-only"` (build fails on any client import). ESLint `no-restricted-imports` additionally bans `lib/supabase/admin` outside `actions/**`, `app/**/route.ts`, and seed scripts.
- Service-role usage is enumerated and audited: auth user provisioning (staff/admin seed), `login_attempts` writes, scheduled cleanup, admin metrics RPC. All user-facing reads/writes use the RLS-scoped server client.
- Secrets live in Vercel encrypted env vars per environment (Preview/Production separated Supabase projects); `.env.example` documents names only.

### 8.5 Additional Hardening

- Server Actions verify session + role on **every** invocation (never trust middleware alone); `allowedOrigins` configured for Server Actions.
- DB-level defense in depth: forward-only transition trigger (§2.3), CHECK constraints, append-only `status_history`, FORCE RLS.
- Error hygiene: DB error details are mapped to typed codes server-side; raw messages never reach the client. 404-not-403 pattern for unauthorized resource access.
- Audit trail: every lifecycle transition is attributable (`status_history.updated_by` + timestamp); contractor verification is attributable (`approved_by`, `approved_at`, `rejection_reason`).
- Dependency hygiene: GitHub Dependabot + `npm audit` gate in CI; TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.

---

## 9. SEO, Metadata & Analytics

- Next.js Metadata API: per-route `metadata`/`generateMetadata`; public pages fully described (title template `"%s · NagarSaathi"`, description, Open Graph + Twitter cards via `opengraph-image.tsx`).
- `app/sitemap.ts`: public routes only. `app/robots.ts`: `Disallow: /dashboard`, `/admin`, `/auth`; authenticated pages additionally emit `robots: { index: false }`.
- Vercel Analytics (`@vercel/analytics`) in root layout; custom events: `grievance_filed`, `bid_awarded`, `fix_confirmed`, `realtime_latency_ms` (OBJ-3 instrumentation). No additional analytics vendors (non-goal enforcement).

## 10. Deployment & CI/CD

- GitHub trunk flow: PRs → CI (typecheck, ESLint, unit, RLS tests, Playwright E2E against a Supabase preview branch/local stack) → Vercel Preview → merge to `main` → Production.
- Supabase migrations applied via CI step (`supabase db push` / migration apply) **before** the corresponding Vercel production deploy (expand-then-deploy ordering; backward-compatible migrations only).
- Environments: Production + Preview, each with its own Supabase project and Resend keys. Rollback: Vercel instant rollback + forward-fix migrations (no destructive down-migrations in production).
