-- Фронтовая агитбригада: базовая схема Supabase
-- Версия 1.0
-- Выполните этот файл в Supabase SQL Editor от начала до конца.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Справочники

do $$ begin
  create type public.project_role as enum (
    'owner', 'manager', 'finance', 'media', 'organizer', 'mentor', 'viewer'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.member_status as enum ('invited', 'active', 'blocked');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_status as enum (
    'planned', 'preparing', 'in_progress', 'completed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_status as enum ('new', 'in_progress', 'done', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_status as enum ('missing', 'draft', 'uploaded', 'verified', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.budget_status as enum ('planned', 'contracting', 'ordered', 'paid', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.risk_level as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null;
end $$;

-- Общие функции

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Профили пользователей

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', email)
from auth.users
on conflict (id) do nothing;

-- Проекты и участники команды

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  region text,
  municipality text,
  start_date date not null,
  end_date date not null,
  status text not null default 'active',
  current_phase text,
  plan_events integer not null check (plan_events >= 0),
  plan_unique_participants integer not null check (plan_unique_participants >= 0),
  plan_publications integer not null check (plan_publications >= 0),
  plan_views bigint not null check (plan_views >= 0),
  plan_budget numeric(14,2) not null check (plan_budget >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  role public.project_role not null default 'viewer',
  status public.member_status not null default 'active',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_member_identity_check
    check (user_id is not null or invited_email is not null)
);

create unique index if not exists project_members_project_user_uidx
  on public.project_members(project_id, user_id)
  where user_id is not null;

create unique index if not exists project_members_project_email_uidx
  on public.project_members(project_id, lower(invited_email))
  where invited_email is not null and user_id is null;

create index if not exists project_members_user_idx
  on public.project_members(user_id, project_id, status);

-- RLS-помощники. Функции находятся в закрытой схеме private.

create or replace function private.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members pm
    join public.profiles pr on pr.id = pm.user_id
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
      and pm.status = 'active'
      and pr.is_blocked = false
  );
$$;

create or replace function private.has_project_role(
  p_project_id uuid,
  p_roles public.project_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members pm
    join public.profiles pr on pr.id = pm.user_id
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
      and pm.status = 'active'
      and pm.role = any(p_roles)
      and pr.is_blocked = false
  );
$$;

create or replace function private.shares_project(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members me
    join public.project_members other_member
      on other_member.project_id = me.project_id
    where me.user_id = (select auth.uid())
      and me.status = 'active'
      and other_member.user_id = p_other_user_id
      and other_member.status = 'active'
  );
$$;

grant execute on function private.is_project_member(uuid) to authenticated;
grant execute on function private.has_project_role(uuid, public.project_role[]) to authenticated;
grant execute on function private.shares_project(uuid) to authenticated;

-- Календарь и задачи

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null,
  sort_order integer not null default 0,
  task_name text,
  name text not null,
  description text,
  location text,
  due_date date not null,
  actual_date date,
  status public.event_status not null default 'planned',
  responsible_user_id uuid references auth.users(id) on delete set null,
  plan_unique_participants integer not null default 0,
  plan_repeat_participants integer not null default 0,
  plan_publications integer not null default 0,
  plan_views bigint not null default 0,
  actual_unique_participants integer not null default 0,
  actual_repeat_participants integer not null default 0,
  actual_publications integer not null default 0,
  actual_views bigint not null default 0,
  result_summary text,
  problems text,
  unplanned_results text,
  success_assessment text,
  development_prospects text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, code)
);

create index if not exists events_project_due_idx
  on public.events(project_id, due_date, status);

create table if not exists public.event_checklist (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  category text,
  required boolean not null default true,
  completed boolean not null default false,
  due_date date,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_checklist_event_idx
  on public.event_checklist(event_id, completed, required);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'new',
  priority public.risk_level not null default 'medium',
  due_date date,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_project_due_idx
  on public.tasks(project_id, due_date, status);

-- Участники и посещения

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  external_id text,
  full_name text not null,
  birth_date date,
  contact_type text,
  contact_value text,
  organization text,
  municipality text,
  consent_personal_data boolean not null default false,
  consent_media boolean not null default false,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists participants_external_id_uidx
  on public.participants(project_id, external_id)
  where external_id is not null and btrim(external_id) <> '';

create index if not exists participants_name_birth_idx
  on public.participants(project_id, lower(full_name), birth_date);

create table if not exists public.participant_attendance (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  attended_at timestamptz not null default now(),
  confirmed boolean not null default true,
  source text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(event_id, participant_id)
);

create index if not exists attendance_project_event_idx
  on public.participant_attendance(project_id, event_id, confirmed);

create or replace function public.validate_attendance_project()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  event_project uuid;
  participant_project uuid;
begin
  select project_id into event_project
  from public.events where id = new.event_id;

  select project_id into participant_project
  from public.participants where id = new.participant_id;

  if event_project is null or participant_project is null
     or event_project <> new.project_id
     or participant_project <> new.project_id then
    raise exception 'Мероприятие, участник и запись посещения должны относиться к одному проекту';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_attendance_project_trigger on public.participant_attendance;
create trigger validate_attendance_project_trigger
  before insert or update on public.participant_attendance
  for each row execute procedure public.validate_attendance_project();

-- Публикации и медиапоказатели

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text,
  platform text,
  media_name text,
  media_characteristics text,
  url text not null,
  published_at timestamptz,
  views bigint not null default 0 check (views >= 0),
  screenshot_path text,
  grant_mention boolean not null default false,
  hashtags_present boolean not null default false,
  date_visible boolean not null default false,
  views_visible boolean not null default false,
  verified boolean not null default false,
  verification_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, url)
);

create index if not exists publications_project_date_idx
  on public.publications(project_id, published_at);

-- Бюджет и финансовые документы

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null,
  category text not null,
  item_type text not null,
  name text not null,
  description text,
  quantity numeric(12,3) not null default 1 check (quantity >= 0),
  unit text,
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  planned_amount numeric(14,2) not null check (planned_amount >= 0),
  actual_amount numeric(14,2) not null default 0 check (actual_amount >= 0),
  supplier text,
  contract_number text,
  contract_date date,
  payment_date date,
  status public.budget_status not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, code)
);

create index if not exists budget_items_project_status_idx
  on public.budget_items(project_id, status);

create table if not exists public.financial_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  budget_item_id uuid not null references public.budget_items(id) on delete cascade,
  document_type text not null,
  document_number text,
  document_date date,
  amount numeric(14,2),
  file_path text,
  status public.document_status not null default 'missing',
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  notes text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_documents_item_idx
  on public.financial_documents(budget_item_id, document_type, status);

-- Общие подтверждающие документы

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  category text not null,
  title text not null,
  description text,
  file_path text,
  external_url text,
  status public.document_status not null default 'missing',
  document_date date,
  uploaded_by uuid references auth.users(id) on delete set null,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_documents_project_event_idx
  on public.project_documents(project_id, event_id, category, status);

-- Качественные показатели и анкеты

create table if not exists public.quality_metrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  unit text not null,
  planned_value numeric(14,2),
  actual_value numeric(14,2),
  is_contractual boolean not null default false,
  measurement_method text,
  evidence_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, code)
);

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  participant_id uuid references public.participants(id) on delete set null,
  survey_type text not null,
  answers jsonb not null default '{}'::jsonb,
  score numeric(10,2),
  submitted_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- Партнёры, риски и отчётность

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  support_type text,
  support_description text,
  planned_amount numeric(14,2),
  actual_amount numeric(14,2),
  contact_person text,
  contact_details text,
  confirmation_path text,
  status text not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  description text,
  probability public.risk_level not null default 'medium',
  impact public.risk_level not null default 'medium',
  mitigation text,
  owner_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'open',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  section_key text not null,
  title text not null,
  content text,
  status public.document_status not null default 'draft',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, section_key)
);

create table if not exists public.report_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null,
  appendix_number integer,
  title text not null,
  description text,
  required boolean not null default true,
  status public.document_status not null default 'missing',
  responsible_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  evidence_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, code)
);

-- Журнал действий

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  project_id uuid,
  user_id uuid,
  table_name text not null,
  record_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_project_date_idx
  on public.activity_log(project_id, created_at desc);

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_project_id uuid;
  row_record_id text;
begin
  if tg_op = 'DELETE' then
    row_project_id := old.project_id;
    row_record_id := old.id::text;
    insert into public.activity_log (
      project_id, user_id, table_name, record_id, action, old_data
    ) values (
      row_project_id, auth.uid(), tg_table_name, row_record_id, tg_op, to_jsonb(old)
    );
    return old;
  else
    row_project_id := new.project_id;
    row_record_id := new.id::text;
    insert into public.activity_log (
      project_id, user_id, table_name, record_id, action, old_data, new_data
    ) values (
      row_project_id, auth.uid(), tg_table_name, row_record_id, tg_op,
      case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
      to_jsonb(new)
    );
    return new;
  end if;
end;
$$;

-- Защита утверждённых показателей от изменения через приложение

create or replace function public.protect_project_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.plan_events is distinct from new.plan_events
     or old.plan_unique_participants is distinct from new.plan_unique_participants
     or old.plan_publications is distinct from new.plan_publications
     or old.plan_views is distinct from new.plan_views
     or old.plan_budget is distinct from new.plan_budget
     or old.start_date is distinct from new.start_date
     or old.end_date is distinct from new.end_date then
    raise exception 'Утверждённые показатели и сроки проекта заблокированы. Изменения требуют отдельной процедуры.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_project_plan_trigger on public.projects;
create trigger protect_project_plan_trigger
  before update on public.projects
  for each row execute procedure public.protect_project_plan();

-- updated_at-триггеры

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'projects', 'project_members', 'events', 'event_checklist',
    'tasks', 'participants', 'publications', 'budget_items',
    'financial_documents', 'project_documents', 'quality_metrics',
    'partners', 'risks', 'report_sections', 'report_requirements'
  ]
  loop
    execute format('drop trigger if exists set_updated_at_trigger on public.%I', table_name);
    execute format(
      'create trigger set_updated_at_trigger before update on public.%I for each row execute procedure public.set_updated_at()',
      table_name
    );
  end loop;
end $$;

-- Аудит ключевых таблиц

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'events', 'event_checklist', 'tasks', 'participants',
    'participant_attendance', 'publications', 'budget_items',
    'financial_documents', 'project_documents', 'quality_metrics',
    'partners', 'risks', 'report_sections', 'report_requirements'
  ]
  loop
    execute format('drop trigger if exists audit_row_change_trigger on public.%I', table_name);
    execute format(
      'create trigger audit_row_change_trigger after insert or update or delete on public.%I for each row execute procedure public.audit_row_change()',
      table_name
    );
  end loop;
end $$;

-- Получение агрегированных KPI без раскрытия персональных данных

create or replace function public.get_project_kpis(p_project_id uuid)
returns table (
  plan_events integer,
  actual_events bigint,
  plan_unique_participants integer,
  actual_unique_participants bigint,
  plan_publications integer,
  actual_publications bigint,
  plan_views bigint,
  actual_views bigint,
  plan_budget numeric,
  actual_budget numeric,
  overdue_events bigint,
  missing_financial_documents bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_project_member(p_project_id) then
    raise exception 'Нет доступа к проекту';
  end if;

  return query
  select
    p.plan_events,
    (select count(*) from public.events e
      where e.project_id = p.id and e.status = 'completed'),
    p.plan_unique_participants,
    (select count(distinct pa.participant_id)
       from public.participant_attendance pa
       join public.participants part on part.id = pa.participant_id
       join public.events ev on ev.id = pa.event_id
      where pa.project_id = p.id
        and pa.confirmed = true
        and part.birth_date is not null
        and extract(year from age(coalesce(ev.actual_date, ev.due_date), part.birth_date)) between 14 and 35),
    p.plan_publications,
    (select count(*) from public.publications pub where pub.project_id = p.id),
    p.plan_views,
    (select coalesce(sum(pub.views), 0) from public.publications pub where pub.project_id = p.id),
    p.plan_budget,
    (select coalesce(sum(b.actual_amount), 0) from public.budget_items b where b.project_id = p.id),
    (select count(*) from public.events e
      where e.project_id = p.id and e.due_date < current_date
        and e.status not in ('completed', 'cancelled')),
    (select count(*) from public.financial_documents fd
      where fd.project_id = p.id and fd.status in ('missing', 'rejected'))
  from public.projects p
  where p.id = p_project_id;
end;
$$;

revoke all on function public.get_project_kpis(uuid) from public;
grant execute on function public.get_project_kpis(uuid) to authenticated;

-- Первый зарегистрированный пользователь может забрать пустой проект как owner.

create or replace function public.claim_project_owner(p_project_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_project_id uuid;
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Необходимо войти в систему';
  end if;

  select id into v_project_id
  from public.projects
  where code = p_project_code;

  if v_project_id is null then
    raise exception 'Проект не найден';
  end if;

  if exists (
    select 1 from public.project_members
    where project_id = v_project_id and status = 'active'
  ) then
    raise exception 'В проекте уже назначен участник команды';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  insert into public.profiles(id, email, full_name)
  values (v_user_id, v_email, v_email)
  on conflict (id) do nothing;

  insert into public.project_members(project_id, user_id, invited_email, role, status)
  values (v_project_id, v_user_id, v_email, 'owner', 'active');

  update public.projects
  set created_by = v_user_id, updated_at = now()
  where id = v_project_id;

  return v_project_id;
end;
$$;

revoke all on function public.claim_project_owner(text) from public;
grant execute on function public.claim_project_owner(text) to authenticated;

-- Добавление уже зарегистрированного пользователя в команду по email.

create or replace function public.add_existing_project_member(
  p_project_id uuid,
  p_email text,
  p_role public.project_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_member_id uuid;
begin
  if not private.has_project_role(
    p_project_id,
    array['owner']::public.project_role[]
  ) then
    raise exception 'Только руководитель проекта может добавлять участников команды';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;

  if v_user_id is null then
    raise exception 'Пользователь с таким email ещё не зарегистрирован';
  end if;

  insert into public.project_members(project_id, user_id, invited_email, role, status)
  values (p_project_id, v_user_id, lower(p_email), p_role, 'active')
  on conflict (project_id, user_id) where user_id is not null
  do update set role = excluded.role, status = 'active', updated_at = now()
  returning id into v_member_id;

  return v_member_id;
end;
$$;

revoke all on function public.add_existing_project_member(uuid, text, public.project_role) from public;
grant execute on function public.add_existing_project_member(uuid, text, public.project_role) to authenticated;

-- RLS

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.events enable row level security;
alter table public.event_checklist enable row level security;
alter table public.tasks enable row level security;
alter table public.participants enable row level security;
alter table public.participant_attendance enable row level security;
alter table public.publications enable row level security;
alter table public.budget_items enable row level security;
alter table public.financial_documents enable row level security;
alter table public.project_documents enable row level security;
alter table public.quality_metrics enable row level security;
alter table public.survey_responses enable row level security;
alter table public.partners enable row level security;
alter table public.risks enable row level security;
alter table public.report_sections enable row level security;
alter table public.report_requirements enable row level security;
alter table public.activity_log enable row level security;

-- Профили

drop policy if exists profiles_select_shared_project on public.profiles;
create policy profiles_select_shared_project
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select private.shares_project(id))
);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Проекты

drop policy if exists projects_select_members on public.projects;
create policy projects_select_members
on public.projects for select to authenticated
using ((select private.is_project_member(id)));

drop policy if exists projects_update_management on public.projects;
create policy projects_update_management
on public.projects for update to authenticated
using ((select private.has_project_role(id, array['owner','manager']::public.project_role[])))
with check ((select private.has_project_role(id, array['owner','manager']::public.project_role[])));

-- Команда

drop policy if exists members_select_members on public.project_members;
create policy members_select_members
on public.project_members for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists members_manage_owner on public.project_members;
create policy members_manage_owner
on public.project_members for all to authenticated
using ((select private.has_project_role(project_id, array['owner']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner']::public.project_role[])));

-- Мероприятия

drop policy if exists events_select_members on public.events;
create policy events_select_members
on public.events for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists events_manage_team on public.events;
create policy events_manage_team
on public.events for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])));

-- Чек-листы мероприятий

drop policy if exists checklist_select_members on public.event_checklist;
create policy checklist_select_members
on public.event_checklist for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists checklist_manage_team on public.event_checklist;
create policy checklist_manage_team
on public.event_checklist for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])));

-- Задачи

drop policy if exists tasks_select_members on public.tasks;
create policy tasks_select_members
on public.tasks for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists tasks_insert_management on public.tasks;
create policy tasks_insert_management
on public.tasks for insert to authenticated
with check ((select private.has_project_role(project_id, array['owner','manager']::public.project_role[])));

drop policy if exists tasks_update_management_or_assignee on public.tasks;
create policy tasks_update_management_or_assignee
on public.tasks for update to authenticated
using (
  (select private.has_project_role(project_id, array['owner','manager']::public.project_role[]))
  or assigned_to = (select auth.uid())
)
with check (
  (select private.has_project_role(project_id, array['owner','manager']::public.project_role[]))
  or assigned_to = (select auth.uid())
);

drop policy if exists tasks_delete_management on public.tasks;
create policy tasks_delete_management
on public.tasks for delete to authenticated
using ((select private.has_project_role(project_id, array['owner','manager']::public.project_role[])));

-- Участники и посещения: персональные данные доступны только рабочей группе.

drop policy if exists participants_select_working_team on public.participants;
create policy participants_select_working_team
on public.participants for select to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])));

drop policy if exists participants_manage_working_team on public.participants;
create policy participants_manage_working_team
on public.participants for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])));

drop policy if exists attendance_select_working_team on public.participant_attendance;
create policy attendance_select_working_team
on public.participant_attendance for select to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])));

drop policy if exists attendance_manage_working_team on public.participant_attendance;
create policy attendance_manage_working_team
on public.participant_attendance for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])));

-- Публикации

drop policy if exists publications_select_members on public.publications;
create policy publications_select_members
on public.publications for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists publications_manage_media on public.publications;
create policy publications_manage_media
on public.publications for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','media']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager','media']::public.project_role[])));

-- Бюджет

drop policy if exists budget_select_members on public.budget_items;
create policy budget_select_members
on public.budget_items for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists budget_manage_finance on public.budget_items;
create policy budget_manage_finance
on public.budget_items for all to authenticated
using ((select private.has_project_role(project_id, array['owner','finance']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','finance']::public.project_role[])));

drop policy if exists financial_documents_select_finance_team on public.financial_documents;
create policy financial_documents_select_finance_team
on public.financial_documents for select to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','finance']::public.project_role[])));

drop policy if exists financial_documents_manage_finance on public.financial_documents;
create policy financial_documents_manage_finance
on public.financial_documents for all to authenticated
using ((select private.has_project_role(project_id, array['owner','finance']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','finance']::public.project_role[])));

-- Общие документы

drop policy if exists project_documents_select_members on public.project_documents;
create policy project_documents_select_members
on public.project_documents for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists project_documents_manage_team on public.project_documents;
create policy project_documents_manage_team
on public.project_documents for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','finance','media','organizer']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager','finance','media','organizer']::public.project_role[])));

-- Качественные показатели и анкеты

drop policy if exists quality_metrics_select_members on public.quality_metrics;
create policy quality_metrics_select_members
on public.quality_metrics for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists quality_metrics_manage_team on public.quality_metrics;
create policy quality_metrics_manage_team
on public.quality_metrics for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])));

drop policy if exists surveys_select_working_team on public.survey_responses;
create policy surveys_select_working_team
on public.survey_responses for select to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])));

drop policy if exists surveys_manage_working_team on public.survey_responses;
create policy surveys_manage_working_team
on public.survey_responses for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[])));

-- Партнёры, риски и отчёты

drop policy if exists partners_select_members on public.partners;
create policy partners_select_members
on public.partners for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists partners_manage_management on public.partners;
create policy partners_manage_management
on public.partners for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager']::public.project_role[])));

drop policy if exists risks_select_members on public.risks;
create policy risks_select_members
on public.risks for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists risks_manage_management on public.risks;
create policy risks_manage_management
on public.risks for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager']::public.project_role[])));

drop policy if exists report_sections_select_members on public.report_sections;
create policy report_sections_select_members
on public.report_sections for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists report_sections_manage_management on public.report_sections;
create policy report_sections_manage_management
on public.report_sections for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager']::public.project_role[])));

drop policy if exists report_requirements_select_members on public.report_requirements;
create policy report_requirements_select_members
on public.report_requirements for select to authenticated
using ((select private.is_project_member(project_id)));

drop policy if exists report_requirements_manage_management on public.report_requirements;
create policy report_requirements_manage_management
on public.report_requirements for all to authenticated
using ((select private.has_project_role(project_id, array['owner','manager']::public.project_role[])))
with check ((select private.has_project_role(project_id, array['owner','manager']::public.project_role[])));

drop policy if exists activity_log_select_management on public.activity_log;
create policy activity_log_select_management
on public.activity_log for select to authenticated
using ((select private.has_project_role(project_id, array['owner','manager']::public.project_role[])));

-- Права API

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- Закрытые файловые хранилища

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('project-documents', 'project-documents', false, 52428800),
  ('finance', 'finance', false, 52428800),
  ('media-screenshots', 'media-screenshots', false, 52428800)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

-- Путь каждого файла должен начинаться с UUID проекта:
-- <project_uuid>/<event-or-budget-code>/<filename>

drop policy if exists storage_project_docs_select on storage.objects;
create policy storage_project_docs_select
on storage.objects for select to authenticated
using (
  bucket_id = 'project-documents'
  and (select private.is_project_member(((storage.foldername(name))[1])::uuid))
);

drop policy if exists storage_project_docs_insert on storage.objects;
create policy storage_project_docs_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-documents'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','manager','finance','media','organizer']::public.project_role[]
  ))
);

drop policy if exists storage_project_docs_update on storage.objects;
create policy storage_project_docs_update
on storage.objects for update to authenticated
using (
  bucket_id = 'project-documents'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','manager','finance','media','organizer']::public.project_role[]
  ))
)
with check (
  bucket_id = 'project-documents'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','manager','finance','media','organizer']::public.project_role[]
  ))
);

drop policy if exists storage_project_docs_delete on storage.objects;
create policy storage_project_docs_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-documents'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','manager']::public.project_role[]
  ))
);

drop policy if exists storage_finance_select on storage.objects;
create policy storage_finance_select
on storage.objects for select to authenticated
using (
  bucket_id = 'finance'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','manager','finance']::public.project_role[]
  ))
);

drop policy if exists storage_finance_insert on storage.objects;
create policy storage_finance_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'finance'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','finance']::public.project_role[]
  ))
);

drop policy if exists storage_finance_update on storage.objects;
create policy storage_finance_update
on storage.objects for update to authenticated
using (
  bucket_id = 'finance'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','finance']::public.project_role[]
  ))
)
with check (
  bucket_id = 'finance'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','finance']::public.project_role[]
  ))
);

drop policy if exists storage_finance_delete on storage.objects;
create policy storage_finance_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'finance'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','finance']::public.project_role[]
  ))
);

drop policy if exists storage_media_select on storage.objects;
create policy storage_media_select
on storage.objects for select to authenticated
using (
  bucket_id = 'media-screenshots'
  and (select private.is_project_member(((storage.foldername(name))[1])::uuid))
);

drop policy if exists storage_media_insert on storage.objects;
create policy storage_media_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'media-screenshots'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','manager','media']::public.project_role[]
  ))
);

drop policy if exists storage_media_update on storage.objects;
create policy storage_media_update
on storage.objects for update to authenticated
using (
  bucket_id = 'media-screenshots'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','manager','media']::public.project_role[]
  ))
)
with check (
  bucket_id = 'media-screenshots'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','manager','media']::public.project_role[]
  ))
);

drop policy if exists storage_media_delete on storage.objects;
create policy storage_media_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'media-screenshots'
  and (select private.has_project_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','manager','media']::public.project_role[]
  ))
);

commit;
