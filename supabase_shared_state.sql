-- Фронтовая агитбригада: слой синхронизации автономного MVP
-- Выполните после supabase_schema.sql и supabase_seed.sql.

begin;

create table if not exists public.project_sections (
  project_id uuid not null references public.projects(id) on delete cascade,
  section_key text not null,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, section_key)
);

create index if not exists project_sections_project_idx
  on public.project_sections(project_id, section_key);

alter table public.project_sections enable row level security;

-- Все активные участники команды могут читать общий рабочий дашборд.
drop policy if exists project_sections_select_members on public.project_sections;
create policy project_sections_select_members
on public.project_sections for select to authenticated
using ((select private.is_project_member(project_id)));

-- Общие управленческие разделы.
drop policy if exists project_sections_manage_general on public.project_sections;
create policy project_sections_manage_general
on public.project_sections for all to authenticated
using (
  section_key in ('version','meta','report','settings','team','partners','risks')
  and (select private.has_project_role(project_id, array['owner','manager']::public.project_role[]))
)
with check (
  section_key in ('version','meta','report','settings','team','partners','risks')
  and (select private.has_project_role(project_id, array['owner','manager']::public.project_role[]))
);

-- Журнал изменений может дополнять любой участник с правом редактирования.
drop policy if exists project_sections_manage_activity on public.project_sections;
create policy project_sections_manage_activity
on public.project_sections for all to authenticated
using (
  section_key = 'activityLog'
  and (select private.has_project_role(project_id, array['owner','manager','finance','media','organizer']::public.project_role[]))
)
with check (
  section_key = 'activityLog'
  and (select private.has_project_role(project_id, array['owner','manager','finance','media','organizer']::public.project_role[]))
);

-- Мероприятия и доказательная база.
drop policy if exists project_sections_manage_events on public.project_sections;
create policy project_sections_manage_events
on public.project_sections for all to authenticated
using (
  section_key in ('events','documents','quality')
  and (select private.has_project_role(project_id, array['owner','manager','finance','media','organizer']::public.project_role[]))
)
with check (
  section_key in ('events','documents','quality')
  and (select private.has_project_role(project_id, array['owner','manager','finance','media','organizer']::public.project_role[]))
);

-- Участники.
drop policy if exists project_sections_manage_participants on public.project_sections;
create policy project_sections_manage_participants
on public.project_sections for all to authenticated
using (
  section_key = 'participants'
  and (select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[]))
)
with check (
  section_key = 'participants'
  and (select private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[]))
);

-- Медиа.
drop policy if exists project_sections_manage_media on public.project_sections;
create policy project_sections_manage_media
on public.project_sections for all to authenticated
using (
  section_key = 'publications'
  and (select private.has_project_role(project_id, array['owner','manager','media']::public.project_role[]))
)
with check (
  section_key = 'publications'
  and (select private.has_project_role(project_id, array['owner','manager','media']::public.project_role[]))
);

-- Финансы.
drop policy if exists project_sections_manage_budget on public.project_sections;
create policy project_sections_manage_budget
on public.project_sections for all to authenticated
using (
  section_key = 'budget'
  and (select private.has_project_role(project_id, array['owner','finance']::public.project_role[]))
)
with check (
  section_key = 'budget'
  and (select private.has_project_role(project_id, array['owner','finance']::public.project_role[]))
);

-- Системное обновление updated_at.
drop trigger if exists project_sections_set_updated_at on public.project_sections;
create trigger project_sections_set_updated_at
before update on public.project_sections
for each row execute procedure public.set_updated_at();

grant select, insert, update, delete on public.project_sections to authenticated;
revoke all on public.project_sections from anon;

-- Включаем realtime для синхронизации между устройствами.
do $$
begin
  alter publication supabase_realtime add table public.project_sections;
exception
  when duplicate_object then null;
end $$;

commit;
