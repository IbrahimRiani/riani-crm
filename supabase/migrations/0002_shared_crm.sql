-- 0002_shared_crm.sql — CRM compartido multiusuario (una sola cartera)
-- Seguro sobre datos existentes: no borra ni modifica leads/activities/tasks.
-- Ejecutar DESPUÉS de 0001_init.sql en el SQL Editor de Supabase.

-- ============ 1) PERFILES CON ROL ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- ============ 2) ALTA AUTOMÁTICA DE PERFIL (member) PARA FUTUROS USUARIOS ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'member')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ 3) USUARIOS EXISTENTES → ADMIN (propietario inicial) ============
-- Los nuevos registros desde la app entran como member. Para degradar a alguien
-- a member: update public.profiles set role = 'member' where email = '...';
insert into public.profiles (id, email, role)
select id, email, 'admin' from auth.users
on conflict (id) do update set email = excluded.email, role = 'admin';

-- ============ 4) HELPER ADMIN (evita recursión en las policies) ============
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to authenticated;

-- ============ 5) RESPONSABLE DEL LEAD ============
alter table public.leads
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
create index if not exists leads_assigned_to_idx on public.leads(assigned_to);

-- Conservar responsable: el creador actual pasa a ser responsable del lead
update public.leads set assigned_to = user_id
where assigned_to is null and user_id in (select id from public.profiles);

-- ============ 6) RLS: PERFILES (lectura para todos los autenticados) ============
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select to authenticated using (true);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update to authenticated using (public.is_admin());

-- ============ 7) RLS: CARTERA COMPARTIDA ============
-- Cualquier usuario autenticado ve y edita todo. Borrar leads: solo admin.
-- Se mantiene user_id = creador (trazabilidad) y RLS sigue bloqueando a anónimos.

-- ---- leads ----
drop policy if exists "leads_select_own" on public.leads;
drop policy if exists "leads_insert_own" on public.leads;
drop policy if exists "leads_update_own" on public.leads;
drop policy if exists "leads_delete_own" on public.leads;

drop policy if exists "leads_select_shared" on public.leads;
create policy "leads_select_shared"
  on public.leads for select to authenticated using (true);

drop policy if exists "leads_insert_shared" on public.leads;
create policy "leads_insert_shared"
  on public.leads for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "leads_update_shared" on public.leads;
create policy "leads_update_shared"
  on public.leads for update to authenticated using (true);

drop policy if exists "leads_delete_admin" on public.leads;
create policy "leads_delete_admin"
  on public.leads for delete to authenticated using (public.is_admin());

-- ---- activities ----
drop policy if exists "activities_select_own" on public.activities;
drop policy if exists "activities_insert_own" on public.activities;
drop policy if exists "activities_update_own" on public.activities;
drop policy if exists "activities_delete_own" on public.activities;

drop policy if exists "activities_select_shared" on public.activities;
create policy "activities_select_shared"
  on public.activities for select to authenticated using (true);

drop policy if exists "activities_insert_shared" on public.activities;
create policy "activities_insert_shared"
  on public.activities for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "activities_update_shared" on public.activities;
create policy "activities_update_shared"
  on public.activities for update to authenticated using (true);

drop policy if exists "activities_delete_shared" on public.activities;
create policy "activities_delete_shared"
  on public.activities for delete to authenticated using (true);

-- ---- tasks ----
drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

drop policy if exists "tasks_select_shared" on public.tasks;
create policy "tasks_select_shared"
  on public.tasks for select to authenticated using (true);

drop policy if exists "tasks_insert_shared" on public.tasks;
create policy "tasks_insert_shared"
  on public.tasks for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "tasks_update_shared" on public.tasks;
create policy "tasks_update_shared"
  on public.tasks for update to authenticated using (true);

drop policy if exists "tasks_delete_shared" on public.tasks;
create policy "tasks_delete_shared"
  on public.tasks for delete to authenticated using (true);
