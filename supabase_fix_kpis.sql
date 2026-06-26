-- Исправление функции KPI для дашборда «Фронтовая агитбригада»
-- Выполнить один раз в Supabase → SQL Editor → New query → Run.
-- Причина: sum(bigint) в PostgreSQL возвращает numeric, тогда как actual_views объявлен bigint.

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
    p.plan_events::integer,
    (select count(*)::bigint
       from public.events e
      where e.project_id = p.id
        and e.status = 'completed'),
    p.plan_unique_participants::integer,
    (select count(distinct pa.participant_id)::bigint
       from public.participant_attendance pa
       join public.participants part on part.id = pa.participant_id
       join public.events ev on ev.id = pa.event_id
      where pa.project_id = p.id
        and pa.confirmed = true
        and part.birth_date is not null
        and extract(year from age(coalesce(ev.actual_date, ev.due_date), part.birth_date)) between 14 and 35),
    p.plan_publications::integer,
    (select count(*)::bigint
       from public.publications pub
      where pub.project_id = p.id),
    p.plan_views::bigint,
    (select coalesce(sum(pub.views), 0)::bigint
       from public.publications pub
      where pub.project_id = p.id),
    p.plan_budget::numeric,
    (select coalesce(sum(b.actual_amount), 0)::numeric
       from public.budget_items b
      where b.project_id = p.id),
    (select count(*)::bigint
       from public.events e
      where e.project_id = p.id
        and e.due_date < current_date
        and e.status not in ('completed', 'cancelled')),
    (select count(*)::bigint
       from public.financial_documents fd
      where fd.project_id = p.id
        and fd.status in ('missing', 'rejected'))
  from public.projects p
  where p.id = p_project_id;
end;
$$;

revoke all on function public.get_project_kpis(uuid) from public;
grant execute on function public.get_project_kpis(uuid) to authenticated;
