-- Ibra CRM — migración inicial
-- Tablas: leads, activities, tasks + RLS por usuario (auth.uid())

-- ============ LEADS ============
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 200),
  business_type text,
  city text,
  province text,
  website text,
  phone text,
  whatsapp text,
  email text,
  contact_name text,
  status text not null default 'new'
    check (status in ('new','contacted','whatsapp_sent','meeting','demo','proposal','won','lost')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high')),
  source text not null default 'manual'
    check (source in ('manual','lead_hunter','referral','website','other')),
  notes text,
  deal_value integer check (deal_value is null or (deal_value >= 0 and deal_value <= 100000000)),
  next_follow_up date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_next_follow_up_idx on public.leads(next_follow_up);
create index if not exists leads_search_idx on public.leads
  using gin (to_tsvector('spanish', coalesce(company_name,'') || ' ' || coalesce(contact_name,'') || ' ' || coalesce(city,'')));

-- ============ ACTIVITIES ============
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null
    check (type in ('note','call','whatsapp','email','meeting','status_change')),
  description text,
  created_at timestamptz not null default now()
);

create index if not exists activities_lead_id_idx on public.activities(lead_id);
create index if not exists activities_user_id_idx on public.activities(user_id);

-- ============ TASKS ============
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_lead_id_idx on public.tasks(lead_id);
create index if not exists tasks_due_date_idx on public.tasks(due_date);

-- ============ UPDATED_AT TRIGGER ============
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at before update on public.leads
  for each row execute function public.handle_updated_at();

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.handle_updated_at();

-- ============ RLS ============
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;

-- Leads
drop policy if exists "leads_select_own" on public.leads;
create policy "leads_select_own" on public.leads for select using (auth.uid() = user_id);
drop policy if exists "leads_insert_own" on public.leads;
create policy "leads_insert_own" on public.leads for insert with check (auth.uid() = user_id);
drop policy if exists "leads_update_own" on public.leads;
create policy "leads_update_own" on public.leads for update using (auth.uid() = user_id);
drop policy if exists "leads_delete_own" on public.leads;
create policy "leads_delete_own" on public.leads for delete using (auth.uid() = user_id);

-- Activities
drop policy if exists "activities_select_own" on public.activities;
create policy "activities_select_own" on public.activities for select using (auth.uid() = user_id);
drop policy if exists "activities_insert_own" on public.activities;
create policy "activities_insert_own" on public.activities for insert with check (auth.uid() = user_id);
drop policy if exists "activities_update_own" on public.activities;
create policy "activities_update_own" on public.activities for update using (auth.uid() = user_id);
drop policy if exists "activities_delete_own" on public.activities;
create policy "activities_delete_own" on public.activities for delete using (auth.uid() = user_id);

-- Tasks
drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id);
drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id);
drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id);
drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id);
