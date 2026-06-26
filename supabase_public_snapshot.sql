-- Публичный снимок проекта «Фронтовая агитбригада»
-- Выполнить один раз в Supabase → SQL Editor → New query → Run.
-- Скрипт безопасен для повторного запуска.

begin;

create table if not exists public.project_public_snapshots (
  project_id uuid primary key references public.projects(id) on delete cascade,
  project_code text not null unique,
  snapshot jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null
);

alter table public.project_public_snapshots enable row level security;

-- Прямой доступ к таблице не выдаём: чтение и публикация идут только через RPC.
revoke all on public.project_public_snapshots from anon, authenticated;

drop policy if exists project_public_snapshots_no_direct_access on public.project_public_snapshots;
create policy project_public_snapshots_no_direct_access
on public.project_public_snapshots
for all
using (false)
with check (false);

create or replace function public.publish_project_snapshot(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_project public.projects%rowtype;
  v_actual_publications bigint := 0;
  v_actual_views bigint := 0;
  v_snapshot jsonb;
begin
  if auth.uid() is null then
    raise exception 'Требуется авторизация';
  end if;

  if not exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
      and pm.role in ('owner'::public.project_role, 'manager'::public.project_role)
  ) then
    raise exception 'Публиковать открытую часть может только руководитель или координатор';
  end if;

  select * into v_project
  from public.projects
  where id = p_project_id;

  if not found then
    raise exception 'Проект не найден';
  end if;

  select count(*), coalesce(sum(p.views), 0)
    into v_actual_publications, v_actual_views
  from public.publications p
  where p.project_id = p_project_id;

  v_snapshot := jsonb_build_object(
    'version', 1,
    'published_at', now(),
    'project', jsonb_build_object(
      'code', v_project.code,
      'name', v_project.name,
      'description', v_project.description,
      'municipality', v_project.municipality,
      'start_date', v_project.start_date,
      'end_date', v_project.end_date,
      'plan_events', v_project.plan_events,
      'plan_unique_participants', v_project.plan_unique_participants,
      'plan_publications', v_project.plan_publications,
      'plan_views', v_project.plan_views
    ),
    'kpis', jsonb_build_object(
      'actual_events', (
        select count(*) from public.events e
        where e.project_id = p_project_id and e.status = 'completed'
      ),
      'actual_unique_participants', (
        select coalesce(sum(e.actual_unique_participants), 0) from public.events e
        where e.project_id = p_project_id
      ),
      'actual_repeat_participants', (
        select coalesce(sum(e.actual_repeat_participants), 0) from public.events e
        where e.project_id = p_project_id
      ),
      'actual_publications', v_actual_publications,
      'actual_views', v_actual_views,
      'plan_events', v_project.plan_events,
      'plan_unique_participants', v_project.plan_unique_participants,
      'plan_repeat_participants', (
        select coalesce(sum(e.plan_repeat_participants), 0) from public.events e
        where e.project_id = p_project_id
      ),
      'plan_publications', v_project.plan_publications,
      'plan_views', v_project.plan_views
    ),
    'events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'code', e.code,
          'sort_order', e.sort_order,
          'name', e.name,
          'description', e.description,
          'due_date', e.due_date,
          'status', e.status,
          'plan_unique_participants', e.plan_unique_participants,
          'plan_repeat_participants', e.plan_repeat_participants,
          'plan_publications', e.plan_publications,
          'plan_views', e.plan_views,
          'actual_unique_participants', e.actual_unique_participants,
          'actual_repeat_participants', e.actual_repeat_participants,
          'actual_publications', e.actual_publications,
          'actual_views', e.actual_views,
          'activities', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', a.id,
                'activity_code', a.activity_code,
                'sort_order', a.sort_order,
                'activity_date', a.activity_date,
                'end_date', a.end_date,
                'title', a.title,
                'description', a.description,
                'location', a.location,
                'lead_name', a.lead_name,
                'support_names', a.support_names,
                'plan_unique_participants', a.plan_unique_participants,
                'plan_repeat_participants', a.plan_repeat_participants,
                'plan_publications', a.plan_publications,
                'plan_views', a.plan_views,
                'status', a.status
              ) order by a.activity_date nulls last, a.sort_order
            )
            from public.event_activities a
            where a.event_id = e.id
          ), '[]'::jsonb)
        ) order by e.sort_order
      )
      from public.events e
      where e.project_id = p_project_id
    ), '[]'::jsonb)
  );

  insert into public.project_public_snapshots (
    project_id, project_code, snapshot, published_at, published_by
  ) values (
    p_project_id, v_project.code, v_snapshot, now(), auth.uid()
  )
  on conflict (project_id) do update set
    project_code = excluded.project_code,
    snapshot = excluded.snapshot,
    published_at = excluded.published_at,
    published_by = excluded.published_by;

  return v_snapshot;
end;
$$;

create or replace function public.get_public_project_snapshot(p_project_code text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select snapshot
  from public.project_public_snapshots
  where project_code = p_project_code
  limit 1;
$$;

revoke all on function public.publish_project_snapshot(uuid) from public;
grant execute on function public.publish_project_snapshot(uuid) to authenticated;

revoke all on function public.get_public_project_snapshot(text) from public;
grant execute on function public.get_public_project_snapshot(text) to anon, authenticated;

commit;
