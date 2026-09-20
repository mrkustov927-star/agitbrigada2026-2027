-- Фронтовая агитбригада
-- Разовая актуализация базы под утверждённую заявку Росмолодёжь.Гранты.
-- Дата подготовки: 20.09.2026
--
-- ВАЖНО:
-- 1. Состав действующей рабочей группы этим скриптом НЕ изменяется.
-- 2. due_date = внутренний рабочий срок команды.
-- 3. grant_due_date = официальная крайняя дата строки календарного плана по заявке.
-- 4. Смета приводится к 16 строкам ровно в структуре утверждённой заявки.
-- 5. Скрипт рассчитан на однократный запуск в Supabase SQL Editor.

begin;

-- Утверждённые показатели защищены триггером. На время этой согласованной миграции
-- отключаем только этот триггер и включаем его обратно до commit.
alter table public.projects disable trigger protect_project_plan_trigger;

alter table public.events
  add column if not exists grant_due_date date;

-- Паспорт и договорные KPI.
update public.projects
set
  start_date = '2026-07-01',
  end_date = '2027-06-30',
  plan_events = 12,
  plan_unique_participants = 1000,
  plan_publications = 57,
  plan_views = 52000,
  plan_budget = 920000.00
where code = 'AGITBRIGADA-2026-2027';

-- Все строки календарного плана в выгрузке заявки имеют крайнюю дату 30.06.2027.
update public.events
set grant_due_date = '2027-06-30'
where project_id = 'fa202627-2026-4000-8000-000000000001'::uuid;

-- Четыре задачи проекта и 12 этапов: названия приведены к единой логике.
update public.events set
  task_name = 'Проведение информационной кампании проекта и решение организационных вопросов',
  name = 'Разработка визуального наполнения и дизайна проекта'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-01';

update public.events set
  task_name = 'Проведение информационной кампании проекта и решение организационных вопросов',
  name = 'Создание пула пресс-релизов проекта'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-02';

update public.events set
  task_name = 'Проведение информационной кампании проекта и решение организационных вопросов',
  name = 'Организационная подготовка, закупки и договоры'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-03';

update public.events set
  task_name = 'Проведение серии просветительских мероприятий среди молодежи 14-35 лет в Кемском муниципальном районе',
  name = 'Цикл мастер-классов по исторической реконструкции'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-04';

update public.events set
  task_name = 'Проведение серии просветительских мероприятий среди молодежи 14-35 лет в Кемском муниципальном районе',
  name = 'Интерактивные уроки и «Уроки мужества»'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-05';

update public.events set
  task_name = 'Проведение серии просветительских мероприятий среди молодежи 14-35 лет в Кемском муниципальном районе',
  name = 'Исторические квесты и интеллектуальные игры'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-06';

update public.events set
  task_name = 'Популяризация истории Великой Отечественной войны 1941 - 1945 гг. на Карельском фронте среди молодежи 14-35 лет через проведение массовых мероприятий',
  name = 'Конкурс «Истории моей семьи»'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-07';

update public.events set
  task_name = 'Популяризация истории Великой Отечественной войны 1941 - 1945 гг. на Карельском фронте среди молодежи 14-35 лет через проведение массовых мероприятий',
  name = 'Главная интерактивная площадка ко Дню Победы «Фронтовая агитбригада»',
  description = 'Масштабная интерактивная площадка ко Дню Победы. Рабочая дата команды — 09.05.2027. В выгрузке заявки указано «9 мая 2026 года», что не соответствует периоду реализации 07.2026–06.2027; для реализации используется 09.05.2027.'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-08';

update public.events set
  task_name = 'Популяризация истории Великой Отечественной войны 1941 - 1945 гг. на Карельском фронте среди молодежи 14-35 лет через проведение массовых мероприятий',
  name = 'Финальная выставка «Агитбригада в лицах и событиях»'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-09';

update public.events set
  task_name = 'Подведение итогов проекта и анализ его результатов',
  name = 'Итоговое собрание рабочей группы'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-10';

update public.events set
  task_name = 'Подведение итогов проекта и анализ его результатов',
  name = 'Публикация итоговых материалов проекта'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-11';

update public.events set
  task_name = 'Подведение итогов проекта и анализ его результатов',
  name = 'Итоговая содержательная и финансовая отчётность'
where project_id='fa202627-2026-4000-8000-000000000001'::uuid and code='EVT-12';

-- Нормализация сметы.
-- Выполняем только если база ещё не приведена к каноническим 16 строкам.
do $$
declare
  pid uuid := 'fa202627-2026-4000-8000-000000000001'::uuid;
  target_id uuid;
  source_id uuid;
  merged_actual numeric;
begin
  if not exists (
    select 1
    from public.budget_items
    where project_id = pid
      and code = 'BUD-01'
      and name = 'Изготовление полиграфической продукции'
  ) then

    -- Полиграфия: старые BUD-01 + BUD-02 -> новая BUD-01.
    select id into target_id from public.budget_items where project_id=pid and code='BUD-01';
    select id into source_id from public.budget_items where project_id=pid and code='BUD-02';
    select coalesce(sum(actual_amount),0) into merged_actual
      from public.budget_items where project_id=pid and code in ('BUD-01','BUD-02');
    if target_id is not null and source_id is not null then
      update public.financial_documents set budget_item_id=target_id where budget_item_id=source_id;
      update public.budget_items set actual_amount=merged_actual where id=target_id;
      delete from public.budget_items where id=source_id;
    end if;

    -- Сувенирная продукция: старые BUD-03 + BUD-04 -> новая BUD-02.
    select id into target_id from public.budget_items where project_id=pid and code='BUD-03';
    select id into source_id from public.budget_items where project_id=pid and code='BUD-04';
    select coalesce(sum(actual_amount),0) into merged_actual
      from public.budget_items where project_id=pid and code in ('BUD-03','BUD-04');
    if target_id is not null and source_id is not null then
      update public.financial_documents set budget_item_id=target_id where budget_item_id=source_id;
      update public.budget_items set actual_amount=merged_actual where id=target_id;
      delete from public.budget_items where id=source_id;
    end if;

    -- Палатки: старые BUD-07 + BUD-09 -> новая BUD-07.
    select id into target_id from public.budget_items where project_id=pid and code='BUD-07';
    select id into source_id from public.budget_items where project_id=pid and code='BUD-09';
    select coalesce(sum(actual_amount),0) into merged_actual
      from public.budget_items where project_id=pid and code in ('BUD-07','BUD-09');
    if target_id is not null and source_id is not null then
      update public.financial_documents set budget_item_id=target_id where budget_item_id=source_id;
      update public.budget_items set actual_amount=merged_actual where id=target_id;
      delete from public.budget_items where id=source_id;
    end if;

    -- Временно освобождаем коды, чтобы безопасно перенумеровать строки.
    update public.budget_items
      set code = 'TMP-' || code
    where project_id=pid and code like 'BUD-%';

    update public.budget_items set
      code='BUD-01', category='Полиграфическая продукция', item_type='Услуга',
      name='Изготовление полиграфической продукции',
      description='Благодарственные письма — 50 шт.; сертификаты — 150 шт.; ролл-ап 2000×850 мм — 2 шт.',
      quantity=1, unit='услуга', unit_price=46000.00, planned_amount=46000.00
    where project_id=pid and code='TMP-BUD-01';

    update public.budget_items set
      code='BUD-02', category='Подарки, сувенирная продукция', item_type='Услуга',
      name='Изготовление сувенирной продукции',
      description='Сувенирный пакет: блокнот, ручка, значок, открытка — 70 шт.; футболка — 40 шт.; кепка — 40 шт.',
      quantity=1, unit='услуга', unit_price=122280.00, planned_amount=122280.00
    where project_id=pid and code='TMP-BUD-03';

    update public.budget_items set
      code='BUD-03', category='Дополнительные услуги и товары для проекта', item_type='Товар',
      name='Лавка складная', description='Лавка складная садовая 180×25×43 см — 4 шт.',
      quantity=1, unit='позиция', unit_price=32424.00, planned_amount=32424.00
    where project_id=pid and code='TMP-BUD-14';

    update public.budget_items set
      code='BUD-04', category='Дополнительные услуги и товары для проекта', item_type='Товар',
      name='Стол раскладной', description='Стол раскладной 180×74×74 см — 6 шт.',
      quantity=1, unit='позиция', unit_price=67200.00, planned_amount=67200.00
    where project_id=pid and code='TMP-BUD-11';

    update public.budget_items set
      code='BUD-05', category='Дополнительные услуги и товары для проекта', item_type='Товар',
      name='Маскировочная сеть', description='Маскировочная сеть 3×12 м — 1 шт.',
      quantity=1, unit='позиция', unit_price=12600.00, planned_amount=12600.00
    where project_id=pid and code='TMP-BUD-10';

    update public.budget_items set
      code='BUD-06', category='Дополнительные услуги и товары для проекта', item_type='Товар',
      name='Массогабаритные макеты гранат',
      description='Макет гранаты РГ-42 — 1 шт.; РГД-33 — 1 шт.; Ф-1 — 1 шт.; подсумок для гранат — 1 шт.',
      quantity=1, unit='комплект', unit_price=28101.00, planned_amount=28101.00
    where project_id=pid and code='TMP-BUD-17';

    update public.budget_items set
      code='BUD-07', category='Дополнительные услуги и товары для проекта', item_type='Товар',
      name='Палатка', description='Палатка 13,6 м² — 1 шт.; палатка 20 м² — 1 шт.',
      quantity=1, unit='комплект', unit_price=195040.00, planned_amount=195040.00
    where project_id=pid and code='TMP-BUD-07';

    update public.budget_items set
      code='BUD-08', category='Дополнительные услуги и товары для проекта', item_type='Товар',
      name='Массогабаритный макет Пистолет-пулемет MP-40',
      description='Макет Пистолет-пулемет MP-40 (Шмайсер) — 1 шт.',
      quantity=1, unit='шт.', unit_price=29785.00, planned_amount=29785.00
    where project_id=pid and code='TMP-BUD-15';

    update public.budget_items set
      code='BUD-09', category='Дополнительные услуги и товары для проекта', item_type='Товар',
      name='Термос', description='Термос армейский 36 л — 4 шт.',
      quantity=1, unit='позиция', unit_price=78388.00, planned_amount=78388.00
    where project_id=pid and code='TMP-BUD-13';

    update public.budget_items set
      code='BUD-10', category='Дополнительные услуги и товары для проекта', item_type='Товар',
      name='Удлинитель', description='Удлинитель силовой на катушке, 40 м — 2 шт.',
      quantity=1, unit='позиция', unit_price=11182.00, planned_amount=11182.00
    where project_id=pid and code='TMP-BUD-12';

    update public.budget_items set
      code='BUD-11', category='Дополнительные услуги и товары для проекта', item_type='Товар',
      name='Походная посуда',
      description='Кастрюля 50 л — 1 шт.; металлическая крышка — 4 шт.; половник 46 см — 2 шт.; термопоты — 3 шт.',
      quantity=1, unit='комплект', unit_price=46000.00, planned_amount=46000.00
    where project_id=pid and code='TMP-BUD-08';

    update public.budget_items set
      code='BUD-12', category='Дополнительные услуги и товары для проекта', item_type='Товар',
      name='Массогабаритный макет Пистолет-пулемет с ремнем ППШ-41',
      description='Макет Пистолет-пулемет с ремнем ППШ-41 — 1 шт.',
      quantity=1, unit='шт.', unit_price=19000.00, planned_amount=19000.00
    where project_id=pid and code='TMP-BUD-18';

    update public.budget_items set
      code='BUD-13', category='Дополнительные услуги и товары для проекта', item_type='Товар',
      name='Массогабаритный макет револьвера системы Нагана',
      description='Макет револьвера системы Нагана — 1 шт.',
      quantity=1, unit='шт.', unit_price=49000.00, planned_amount=49000.00
    where project_id=pid and code='TMP-BUD-16';

    update public.budget_items set
      code='BUD-14', category='Дополнительные услуги и товары для проекта', item_type='Услуга',
      name='Оплата труда фотографа проекта',
      description='Не менее 30 часов работы; по итогам — не менее 100 обработанных фотографий.',
      quantity=1, unit='услуга', unit_price=45000.00, planned_amount=45000.00
    where project_id=pid and code='TMP-BUD-06';

    update public.budget_items set
      code='BUD-15', category='Дополнительные услуги и товары для проекта', item_type='Услуга',
      name='Оплата услуг дизайнера',
      description='25 часов; бренд-бук, баннеры, афиши, оформление мероприятий и сувенирной продукции; не менее 15 макетов.',
      quantity=1, unit='услуга', unit_price=50000.00, planned_amount=50000.00
    where project_id=pid and code='TMP-BUD-05';

    update public.budget_items set
      code='BUD-16', category='Дополнительные услуги и товары для проекта', item_type='Услуга',
      name='Проведение мастер-классов приглашенными специалистами',
      description='Два преподавателя; двадцать мастер-классов; не менее 40 часов работы каждого, не менее 10 мероприятий каждый.',
      quantity=1, unit='услуга', unit_price=88000.00, planned_amount=88000.00
    where project_id=pid and code='TMP-BUD-19';

  end if;
end $$;

-- Контроль: после нормализации должно быть ровно 16 строк на 920 000 рублей.
do $$
declare
  cnt integer;
  total numeric;
begin
  select count(*), coalesce(sum(planned_amount),0)
    into cnt, total
  from public.budget_items
  where project_id='fa202627-2026-4000-8000-000000000001'::uuid;

  if cnt <> 16 or total <> 920000.00 then
    raise exception 'Смета после актуализации не сошлась: строк %, сумма %', cnt, total;
  end if;
end $$;

alter table public.projects enable trigger protect_project_plan_trigger;

commit;

-- Контрольные выборки после выполнения:
-- select start_date, end_date, plan_events, plan_unique_participants, plan_publications, plan_views, plan_budget
-- from public.projects where code='AGITBRIGADA-2026-2027';
--
-- select code, name, due_date as working_due_date, grant_due_date, plan_unique_participants,
--        plan_repeat_participants, plan_publications, plan_views
-- from public.events
-- where project_id='fa202627-2026-4000-8000-000000000001'::uuid
-- order by sort_order;
--
-- select code, name, planned_amount, actual_amount
-- from public.budget_items
-- where project_id='fa202627-2026-4000-8000-000000000001'::uuid
-- order by code;
