-- Актуализация закрытой части проекта «Фронтовая агитбригада»
-- Выполнить один раз в Supabase → SQL Editor → New query → Run.
-- Скрипт безопасен для повторного запуска: таблицы создаются при отсутствии,
-- рабочая группа и активности обновляются по уникальным кодам.

begin;

-- 1. Рабочая группа проекта: хранится отдельно от учётных записей доступа.
create table if not exists public.working_group_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  member_code text not null,
  sort_order integer not null default 0,
  full_name text not null,
  role_title text,
  responsibility text,
  focus text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, member_code)
);

create index if not exists working_group_members_project_idx
  on public.working_group_members(project_id, sort_order, is_active);

-- 2. Вложенные рабочие активности 12 официальных строк календаря.
create table if not exists public.event_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  activity_code text not null,
  sort_order integer not null default 0,
  activity_date date,
  end_date date,
  title text not null,
  description text,
  location text,
  lead_name text,
  support_names text,
  plan_unique_participants integer not null default 0 check (plan_unique_participants >= 0),
  plan_repeat_participants integer not null default 0 check (plan_repeat_participants >= 0),
  plan_publications integer not null default 0 check (plan_publications >= 0),
  plan_views bigint not null default 0 check (plan_views >= 0),
  status text not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, activity_code)
);

create index if not exists event_activities_project_date_idx
  on public.event_activities(project_id, activity_date, sort_order);

-- updated_at
create or replace trigger set_updated_at_trigger
  before update on public.working_group_members
  for each row execute procedure public.set_updated_at();

create or replace trigger set_updated_at_trigger
  before update on public.event_activities
  for each row execute procedure public.set_updated_at();

-- Аудит изменений
create or replace trigger audit_row_change_trigger
  after insert or update or delete on public.working_group_members
  for each row execute procedure public.audit_row_change();

create or replace trigger audit_row_change_trigger
  after insert or update or delete on public.event_activities
  for each row execute procedure public.audit_row_change();

-- RLS
alter table public.working_group_members enable row level security;
alter table public.event_activities enable row level security;

drop policy if exists working_group_members_select on public.working_group_members;
create policy working_group_members_select on public.working_group_members
  for select to authenticated
  using (private.is_project_member(project_id));

drop policy if exists working_group_members_manage on public.working_group_members;
create policy working_group_members_manage on public.working_group_members
  for all to authenticated
  using (private.has_project_role(project_id, array['owner','manager']::public.project_role[]))
  with check (private.has_project_role(project_id, array['owner','manager']::public.project_role[]));

drop policy if exists event_activities_select on public.event_activities;
create policy event_activities_select on public.event_activities
  for select to authenticated
  using (private.is_project_member(project_id));

drop policy if exists event_activities_manage on public.event_activities;
create policy event_activities_manage on public.event_activities
  for all to authenticated
  using (private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[]))
  with check (private.has_project_role(project_id, array['owner','manager','organizer']::public.project_role[]));

grant select, insert, update, delete on public.working_group_members to authenticated;
grant select, insert, update, delete on public.event_activities to authenticated;

-- 3. Актуальный состав рабочей группы.
insert into public.working_group_members (
  project_id, member_code, sort_order, full_name, role_title, responsibility, focus
)
values
('fa202627-2026-4000-8000-000000000001','WG-01',1,'Иван Брунов','Руководитель проекта','Общее руководство, договорная работа, закупки, партнёры, контроль реализации и итоговая отчётность.','Руководство проектом'),
('fa202627-2026-4000-8000-000000000001','WG-02',2,'Евгений Кустов','Координатор взаимодействия со школами','Взаимодействие со школами и Движением Первых, формирование групп, согласование площадок и календаря.','Школы и Движение Первых'),
('fa202627-2026-4000-8000-000000000001','WG-03',3,'Валерия Синявина','Координатор образовательного содержания','Образовательные программы, интерактивные уроки, методические материалы и конкурс «Истории моей семьи».','Содержание и методика'),
('fa202627-2026-4000-8000-000000000001','WG-04',4,'Егор Дыкуль','Координатор исторических активностей','Историческая реконструкция, мастер-классы, квесты и интеллектуальные игры.','Исторические активности'),
('fa202627-2026-4000-8000-000000000001','WG-05',5,'Анастасия Таран','Координатор комплекса «Судьбы времён»','Разработка сценария, станций и заданий, подготовка и проведение комплекса активностей «Судьбы времён».','Судьбы времён'),
('fa202627-2026-4000-8000-000000000001','WG-06',6,'Виктор Антонов','Технический координатор','Оборудование, реквизит, монтаж площадок, техническое обеспечение, хранение имущества и безопасность.','Техническое направление'),
('fa202627-2026-4000-8000-000000000001','WG-07',7,'Виктория Панкратова','Координатор учёта участников','Регистрация участников, контроль уникальности и повторных посещений, согласия и подтверждающие документы.','Учёт участников')
on conflict (project_id, member_code) do update set
  sort_order = excluded.sort_order,
  full_name = excluded.full_name,
  role_title = excluded.role_title,
  responsibility = excluded.responsibility,
  focus = excluded.focus,
  is_active = true;

-- 4. Уточнение официальных строк календаря и ответственных в описаниях.
update public.events set description = 'Разработка и утверждение фирменного стиля, бренд-элементов, макетов информационной и сувенирной продукции. Ответственные: Иван Брунов, Анастасия Таран.' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-01';
update public.events set description = 'Подготовка и размещение не менее пяти стартовых информационных материалов. Ответственные: Иван Брунов, Евгений Кустов, Анастасия Таран.' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-02';
update public.events set description = 'Не менее четырёх собраний команды, закупки, договоры, планы работы, площадки и формы регистрации. Ответственные: Иван Брунов, Евгений Кустов, Виктор Антонов, Виктория Панкратова.' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-03';
update public.events set description = 'Четыре открытых мастер-класса по исторической реконструкции. Ответственные: Егор Дыкуль, Валерия Синявина; взаимодействие со школами — Евгений Кустов.' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-04';
update public.events set description = 'Десять интерактивных уроков и уроков мужества. Ответственные: Валерия Синявина, Евгений Кустов; историческая часть — Егор Дыкуль.' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-05';
update public.events set description = 'Два исторических квеста, две интеллектуальные игры и комплекс активностей «Судьбы времён». Егор Дыкуль отвечает за квесты и интеллектуальные игры; Анастасия Таран — за «Судьбы времён».' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-06';
update public.events set description = 'Конкурс «Истории моей семьи», творческий финал и выставка семейных реликвий. Ответственные: Валерия Синявина, Евгений Кустов, Виктория Панкратова.' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-07';
update public.events set description = 'Главная интерактивная площадка проекта 9 мая 2027 года. Руководитель — Иван Брунов; программа — Егор Дыкуль и Валерия Синявина; школы — Евгений Кустов; техника — Виктор Антонов; регистрация — Виктория Панкратова.' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-08';
update public.events set description = 'Итоговая мультимедийная выставка и организованные экскурсии для новых участников. Ответственные: Валерия Синявина, Евгений Кустов, Виктор Антонов, Виктория Панкратова.' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-09';
update public.events set description = 'Итоговое собрание рабочей группы, не менее десяти партнёров и 20 ранее зарегистрированных молодых участников. Ответственные: Иван Брунов, Евгений Кустов, Виктория Панкратова.' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-10';
update public.events set description = 'Размещение не менее десяти итоговых материалов. Материалы предоставляет вся рабочая группа, итоговое согласование — Иван Брунов.' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-11';
update public.events set description = 'Подготовка и проверка содержательной и финансовой отчётности. Ответственный — Иван Брунов; сведения и материалы предоставляет вся рабочая группа.' where project_id='fa202627-2026-4000-8000-000000000001' and code='EVT-12';

-- 5. Детальный рабочий календарь.
with event_ids as (
  select code, id from public.events
  where project_id = 'fa202627-2026-4000-8000-000000000001'
), activities(event_code, activity_code, sort_order, activity_date, end_date, title, description, location, lead_name, support_names, plan_unique, plan_repeat, plan_publications, plan_views, notes) as (
  values
  ('EVT-01','01-01',1,'2026-08-03'::date,null,'Установочное обсуждение визуальной концепции','Определение визуального направления и перечня макетов.','г. Кемь','Иван Брунов, Анастасия Таран','Рабочая группа',0,0,0,0,null),
  ('EVT-01','01-02',2,'2026-08-17'::date,'2026-08-20'::date,'Согласование и утверждение фирменного стиля','Финальная проверка логотипа, афиш, роллапов и макетов сувенирной продукции.','г. Кемь','Иван Брунов, Анастасия Таран','Рабочая группа',0,0,1,500,null),

  ('EVT-02','02-01',1,'2026-08-21'::date,'2026-08-31'::date,'Пять стартовых материалов','Презентация проекта, цель и задачи, форматы, команда и приглашение школ к участию.','Онлайн','Иван Брунов, Евгений Кустов, Анастасия Таран','Рабочая группа',0,0,5,4000,null),

  ('EVT-03','03-01',1,'2026-08-04'::date,null,'Первое собрание рабочей группы','Запуск проекта и первичное распределение функций.','г. Кемь','Иван Брунов','Рабочая группа',0,0,0,0,null),
  ('EVT-03','03-02',2,'2026-08-18'::date,null,'Второе собрание рабочей группы','Утверждение дизайна, технических заданий и плана закупок.','г. Кемь','Иван Брунов','Рабочая группа',0,0,0,0,null),
  ('EVT-03','03-03',3,'2026-09-08'::date,null,'Третье собрание рабочей группы','Согласование школ, площадок и графика выездов.','г. Кемь','Евгений Кустов','Рабочая группа',0,0,0,0,null),
  ('EVT-03','03-04',4,'2026-09-25'::date,null,'Контрольное собрание рабочей группы','Проверка оборудования, договоров, форм регистрации и готовности команды.','г. Кемь','Иван Брунов','Рабочая группа',0,0,1,500,null),

  ('EVT-04','04-01',1,'2026-09-03'::date,null,'Окончание Второй мировой войны: карта, хроника, исторические предметы','Мастер-класс по исторической реконструкции.','Образовательная организация Кемского округа','Егор Дыкуль, Валерия Синявина','Евгений Кустов, Виктор Антонов, Виктория Панкратова',25,0,0,0,null),
  ('EVT-04','04-02',2,'2026-09-10'::date,null,'Исторический источник: письмо, фотография, семейный документ','Мастер-класс по работе с историческими источниками.','Образовательная организация Кемского округа','Егор Дыкуль, Валерия Синявина','Евгений Кустов, Виктория Панкратова',25,0,0,0,null),
  ('EVT-04','04-03',3,'2026-10-09'::date,null,'Полевой быт, связь и медицинская помощь','Интерактивный мастер-класс с предметами и реконструкторским оборудованием.','Образовательная организация Кемского округа','Егор Дыкуль','Евгений Кустов, Виктор Антонов, Виктория Панкратова',25,0,0,0,null),
  ('EVT-04','04-04',4,'2026-10-23'::date,null,'Архивный поиск: как восстановить судьбу человека','Мастер-класс по архивной и исследовательской работе.','Образовательная организация Кемского округа','Егор Дыкуль, Валерия Синявина','Евгений Кустов, Виктория Панкратова',25,0,5,3000,'Пять публикаций и 3000 просмотров учитываются по циклу в целом.'),

  ('EVT-05','05-01',1,'2026-11-06'::date,null,'Карельский фронт: история рядом с нами','Интерактивный урок.','Образовательная организация Кемского округа','Валерия Синявина','Евгений Кустов, Егор Дыкуль, Виктория Панкратова',20,0,0,0,null),
  ('EVT-05','05-02',2,'2026-11-13'::date,null,'Фронтовая агитбригада: слово, музыка и поддержка бойцов','Интерактивный урок.','Образовательная организация Кемского округа','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,0,0,null),
  ('EVT-05','05-03',3,'2026-11-20'::date,null,'Один день полевого штаба','Интерактивный урок.','Образовательная организация Кемского округа','Валерия Синявина, Егор Дыкуль','Евгений Кустов, Виктор Антонов, Виктория Панкратова',20,0,0,0,null),
  ('EVT-05','05-04',4,'2026-11-27'::date,null,'Фронтовой корреспондент и военная газета','Интерактивный урок.','Образовательная организация Кемского округа','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,0,0,null),
  ('EVT-05','05-05',5,'2026-12-03'::date,null,'Вернуть имя: День Неизвестного Солдата','Урок мужества.','Образовательная организация Кемского округа','Валерия Синявина','Евгений Кустов, Егор Дыкуль, Виктория Панкратова',20,0,0,0,null),
  ('EVT-05','05-06',6,'2026-12-04'::date,null,'Волонтёры исторической памяти','Интерактивное занятие и добровольческая практика.','Образовательная организация Кемского округа','Евгений Кустов, Валерия Синявина','Виктория Панкратова',20,0,0,0,null),
  ('EVT-05','05-07',7,'2026-12-09'::date,null,'Герои Отечества и жители Кемского округа','Урок мужества на основе проверенных локальных историй.','Образовательная организация Кемского округа','Валерия Синявина, Евгений Кустов','Егор Дыкуль, Виктория Панкратова',20,0,0,0,null),
  ('EVT-05','05-08',8,'2026-12-11'::date,null,'Письмо с фронта как исторический источник','Интерактивный урок.','Образовательная организация Кемского округа','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,0,0,null),
  ('EVT-05','05-09',9,'2026-12-17'::date,null,'История одного предмета','Интерактивный урок.','Образовательная организация Кемского округа','Валерия Синявина, Егор Дыкуль','Евгений Кустов, Виктория Панкратова',20,0,0,0,null),
  ('EVT-05','05-10',10,'2026-12-22'::date,null,'Итоговый интерактивный урок-квиз','Завершение осенне-зимнего образовательного цикла.','Образовательная организация Кемского округа','Валерия Синявина, Евгений Кустов','Егор Дыкуль, Виктория Панкратова',20,0,5,3000,'Пять публикаций и 3000 просмотров учитываются по циклу в целом.'),

  ('EVT-06','06-01',1,'2027-01-27'::date,null,'Исторический квест «Блокадный маршрут»','Первая активность игрового цикла.','Кемский муниципальный округ','Егор Дыкуль','Евгений Кустов, Виктор Антонов, Виктория Панкратова',60,0,2,2500,null),
  ('EVT-06','06-02',2,'2027-02-02'::date,null,'Интеллектуальная игра «Перелом»','Вторая активность игрового цикла.','Кемский муниципальный округ','Егор Дыкуль','Евгений Кустов, Виктория Панкратова',40,20,2,2500,null),
  ('EVT-06','06-03',3,'2027-02-15'::date,null,'Интеллектуальная игра «Служение Отечеству: связь поколений»','Третья активность игрового цикла.','Кемский муниципальный округ','Егор Дыкуль','Евгений Кустов, Виктория Панкратова',0,60,2,2500,null),
  ('EVT-06','06-04',4,'2027-02-18'::date,null,'Исторический квест «Разведка»','Четвёртая активность игрового цикла.','Кемский муниципальный округ','Егор Дыкуль','Евгений Кустов, Виктор Антонов, Виктория Панкратова',0,60,2,2500,null),
  ('EVT-06','06-05',5,'2027-02-23'::date,null,'Комплекс активностей «Судьбы времён»','Кульминационная активность игрового блока: сценарий, станции и задания.','Кемский муниципальный округ','Анастасия Таран','Евгений Кустов, Егор Дыкуль, Виктор Антонов, Виктория Панкратова, Иван Брунов',0,60,5,6000,'Анастасия Таран отвечает за подготовку и проведение комплекса.'),

  ('EVT-07','07-01',1,'2027-03-01'::date,'2027-03-22'::date,'Приём работ конкурса «Истории моей семьи»','Сбор семейных историй, фотографий и документов.','Кемский муниципальный округ','Валерия Синявина','Евгений Кустов, Виктория Панкратова',80,0,2,1500,null),
  ('EVT-07','07-02',2,'2027-03-27'::date,'2027-03-31'::date,'Финал «Письма, которые заговорили» и выставка семейных реликвий','Творческий финал, объявление результатов и выставка.','г. Кемь','Валерия Синявина','Евгений Кустов, Виктория Панкратова, Иван Брунов',20,0,3,2500,null),

  ('EVT-08','08-01',1,'2027-04-19'::date,null,'Без срока давности: документ, свидетельство, память','Подготовительный исторический модуль и обучение будущих ведущих станций.','г. Кемь','Валерия Синявина, Егор Дыкуль','Евгений Кустов, Виктория Панкратова',0,0,0,0,'Подготовительная активность не заменяет охват главной площадки.'),
  ('EVT-08','08-02',2,'2027-05-09'::date,null,'Главная площадка «Фронтовая агитбригада»','Фронтовая редакция, полевая почта, связь, медицинский пост, разведка, семейный архив и другие станции.','г. Кемь','Иван Брунов','Вся рабочая группа',400,0,5,4000,null),

  ('EVT-09','09-01',1,'2027-05-19'::date,null,'Открытие выставки «Агитбригада в лицах и событиях»','Открытие финальной мультимедийной выставки.','г. Кемь','Валерия Синявина','Евгений Кустов, Виктор Антонов, Виктория Панкратова',40,0,2,1500,null),
  ('EVT-09','09-02',2,'2027-05-21'::date,null,'Первая организованная экскурсия','Экскурсия для новых участников проекта.','г. Кемь','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,1,800,null),
  ('EVT-09','09-03',3,'2027-05-25'::date,null,'Вторая организованная экскурсия','Экскурсия для новых участников проекта.','г. Кемь','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,1,800,null),
  ('EVT-09','09-04',4,'2027-05-28'::date,null,'Третья организованная экскурсия','Экскурсия для новых участников проекта.','г. Кемь','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,1,900,null),

  ('EVT-10','10-01',1,'2027-06-10'::date,null,'Итоговое собрание рабочей группы и партнёров','Рабочая группа, не менее 10 партнёров и 20 ранее зарегистрированных молодых участников.','г. Кемь','Иван Брунов, Евгений Кустов','Виктория Панкратова, рабочая группа',0,20,1,500,null),
  ('EVT-11','11-01',1,'2027-06-10'::date,'2027-06-20'::date,'Итоговая информационная кампания','Десять материалов: участники, школьные команды, семейные реликвии, волонтёры, партнёры, фото и видео.','Онлайн','Иван Брунов','Рабочая группа',0,0,10,12000,null),
  ('EVT-12','12-01',1,'2027-06-21'::date,'2027-06-30'::date,'Подготовка итоговой содержательной и финансовой отчётности','Проверка реестров, доказательств, публикаций, просмотров, фотоархива и финансовых документов.','г. Кемь','Иван Брунов','Вся рабочая группа',0,0,1,500,null)
)
insert into public.event_activities (
  project_id, event_id, activity_code, sort_order, activity_date, end_date,
  title, description, location, lead_name, support_names,
  plan_unique_participants, plan_repeat_participants, plan_publications, plan_views, notes
)
select
  'fa202627-2026-4000-8000-000000000001'::uuid,
  e.id,
  a.activity_code,
  a.sort_order,
  a.activity_date,
  a.end_date,
  a.title,
  a.description,
  a.location,
  a.lead_name,
  a.support_names,
  a.plan_unique,
  a.plan_repeat,
  a.plan_publications,
  a.plan_views,
  a.notes
from activities a
join event_ids e on e.code = a.event_code
on conflict (event_id, activity_code) do update set
  sort_order = excluded.sort_order,
  activity_date = excluded.activity_date,
  end_date = excluded.end_date,
  title = excluded.title,
  description = excluded.description,
  location = excluded.location,
  lead_name = excluded.lead_name,
  support_names = excluded.support_names,
  plan_unique_participants = excluded.plan_unique_participants,
  plan_repeat_participants = excluded.plan_repeat_participants,
  plan_publications = excluded.plan_publications,
  plan_views = excluded.plan_views,
  notes = excluded.notes;

commit;
