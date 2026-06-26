-- Публичная синхронизация календаря проекта «Фронтовая агитбригада»
-- Выполнить один раз в Supabase → SQL Editor → New query → Run.
-- Функция отдаёт только безопасные данные открытой части сайта.

create or replace function public.get_public_project_timeline(p_project_code text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'project', jsonb_build_object(
      'id', p.id,
      'code', p.code,
      'name', p.name,
      'description', p.description,
      'municipality', p.municipality,
      'start_date', p.start_date,
      'end_date', p.end_date,
      'plan_events', p.plan_events,
      'plan_unique_participants', p.plan_unique_participants,
      'plan_publications', p.plan_publications,
      'plan_views', p.plan_views,
      'updated_at', p.updated_at
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
          'updated_at', e.updated_at,
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
                'status', a.status,
                'updated_at', a.updated_at
              ) order by a.activity_date, a.sort_order
            )
            from public.event_activities a
            where a.event_id = e.id
          ), '[]'::jsonb)
        ) order by e.sort_order
      )
      from public.events e
      where e.project_id = p.id
    ), '[]'::jsonb)
  )
  from public.projects p
  where p.code = p_project_code
  limit 1;
$$;

revoke all on function public.get_public_project_timeline(text) from public;
grant execute on function public.get_public_project_timeline(text) to anon, authenticated;
