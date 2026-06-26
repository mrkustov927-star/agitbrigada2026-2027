const { supabase, projectId } = window.AGIT;

const appHost = document.getElementById('app');
let closedData = null;
let loadingPromise = null;
let enhanceScheduled = false;

const FALLBACK_TEAM = [
  { member_code: 'WG-01', sort_order: 1, full_name: 'Иван Брунов', role_title: 'Руководитель проекта', responsibility: 'Общее руководство, договорная работа, закупки, партнёры, контроль реализации и итоговая отчётность.', focus: 'Руководство проектом' },
  { member_code: 'WG-02', sort_order: 2, full_name: 'Евгений Кустов', role_title: 'Координатор взаимодействия со школами', responsibility: 'Взаимодействие со школами и Движением Первых, формирование групп, согласование площадок и календаря.', focus: 'Школы и Движение Первых' },
  { member_code: 'WG-03', sort_order: 3, full_name: 'Валерия Синявина', role_title: 'Координатор образовательного содержания', responsibility: 'Образовательные программы, интерактивные уроки, методические материалы и конкурс «Истории моей семьи».', focus: 'Содержание и методика' },
  { member_code: 'WG-04', sort_order: 4, full_name: 'Егор Дыкуль', role_title: 'Координатор исторических активностей', responsibility: 'Историческая реконструкция, мастер-классы, квесты и интеллектуальные игры.', focus: 'Исторические активности' },
  { member_code: 'WG-05', sort_order: 5, full_name: 'Анастасия Таран', role_title: 'Координатор комплекса «Судьбы времён»', responsibility: 'Разработка сценария, станций и заданий, подготовка и проведение комплекса активностей «Судьбы времён».', focus: 'Судьбы времён' },
  { member_code: 'WG-06', sort_order: 6, full_name: 'Виктор Антонов', role_title: 'Технический координатор', responsibility: 'Оборудование, реквизит, монтаж площадок, техническое обеспечение, хранение имущества и безопасность.', focus: 'Техническое направление' },
  { member_code: 'WG-07', sort_order: 7, full_name: 'Виктория Панкратова', role_title: 'Координатор учёта участников', responsibility: 'Регистрация участников, контроль уникальности и повторных посещений, согласия и подтверждающие документы.', focus: 'Учёт участников' },
];

const FALLBACK_ACTIVITIES = [
  ['EVT-01','01-01',1,'2026-08-03',null,'Установочное обсуждение визуальной концепции','Иван Брунов, Анастасия Таран','Рабочая группа',0,0,0,0],
  ['EVT-01','01-02',2,'2026-08-17','2026-08-20','Согласование и утверждение фирменного стиля','Иван Брунов, Анастасия Таран','Рабочая группа',0,0,1,500],
  ['EVT-02','02-01',1,'2026-08-21','2026-08-31','Пять стартовых информационных материалов','Иван Брунов, Евгений Кустов, Анастасия Таран','Рабочая группа',0,0,5,4000],
  ['EVT-03','03-01',1,'2026-08-04',null,'Первое собрание рабочей группы','Иван Брунов','Рабочая группа',0,0,0,0],
  ['EVT-03','03-02',2,'2026-08-18',null,'Второе собрание рабочей группы','Иван Брунов','Рабочая группа',0,0,0,0],
  ['EVT-03','03-03',3,'2026-09-08',null,'Согласование школ, площадок и графика выездов','Евгений Кустов','Рабочая группа',0,0,0,0],
  ['EVT-03','03-04',4,'2026-09-25',null,'Контрольное собрание по готовности','Иван Брунов','Рабочая группа',0,0,1,500],
  ['EVT-04','04-01',1,'2026-09-03',null,'Окончание Второй мировой войны: карта, хроника, исторические предметы','Егор Дыкуль, Валерия Синявина','Евгений Кустов, Виктор Антонов, Виктория Панкратова',25,0,0,0],
  ['EVT-04','04-02',2,'2026-09-10',null,'Исторический источник: письмо, фотография, семейный документ','Егор Дыкуль, Валерия Синявина','Евгений Кустов, Виктория Панкратова',25,0,0,0],
  ['EVT-04','04-03',3,'2026-10-09',null,'Полевой быт, связь и медицинская помощь','Егор Дыкуль','Евгений Кустов, Виктор Антонов, Виктория Панкратова',25,0,0,0],
  ['EVT-04','04-04',4,'2026-10-23',null,'Архивный поиск: как восстановить судьбу человека','Егор Дыкуль, Валерия Синявина','Евгений Кустов, Виктория Панкратова',25,0,5,3000],
  ['EVT-05','05-01',1,'2026-11-06',null,'Карельский фронт: история рядом с нами','Валерия Синявина','Евгений Кустов, Егор Дыкуль, Виктория Панкратова',20,0,0,0],
  ['EVT-05','05-02',2,'2026-11-13',null,'Фронтовая агитбригада: слово, музыка и поддержка бойцов','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,0,0],
  ['EVT-05','05-03',3,'2026-11-20',null,'Один день полевого штаба','Валерия Синявина, Егор Дыкуль','Евгений Кустов, Виктор Антонов, Виктория Панкратова',20,0,0,0],
  ['EVT-05','05-04',4,'2026-11-27',null,'Фронтовой корреспондент и военная газета','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,0,0],
  ['EVT-05','05-05',5,'2026-12-03',null,'Вернуть имя: День Неизвестного Солдата','Валерия Синявина','Евгений Кустов, Егор Дыкуль, Виктория Панкратова',20,0,0,0],
  ['EVT-05','05-06',6,'2026-12-04',null,'Волонтёры исторической памяти','Евгений Кустов, Валерия Синявина','Виктория Панкратова',20,0,0,0],
  ['EVT-05','05-07',7,'2026-12-09',null,'Герои Отечества и жители Кемского округа','Валерия Синявина, Евгений Кустов','Егор Дыкуль, Виктория Панкратова',20,0,0,0],
  ['EVT-05','05-08',8,'2026-12-11',null,'Письмо с фронта как исторический источник','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,0,0],
  ['EVT-05','05-09',9,'2026-12-17',null,'История одного предмета','Валерия Синявина, Егор Дыкуль','Евгений Кустов, Виктория Панкратова',20,0,0,0],
  ['EVT-05','05-10',10,'2026-12-22',null,'Итоговый интерактивный урок-квиз','Валерия Синявина, Евгений Кустов','Егор Дыкуль, Виктория Панкратова',20,0,5,3000],
  ['EVT-06','06-01',1,'2027-01-27',null,'Исторический квест «Блокадный маршрут»','Егор Дыкуль','Евгений Кустов, Виктор Антонов, Виктория Панкратова',60,0,2,2500],
  ['EVT-06','06-02',2,'2027-02-02',null,'Интеллектуальная игра «Перелом»','Егор Дыкуль','Евгений Кустов, Виктория Панкратова',40,20,2,2500],
  ['EVT-06','06-03',3,'2027-02-15',null,'Игра «Служение Отечеству: связь поколений»','Егор Дыкуль','Евгений Кустов, Виктория Панкратова',0,60,2,2500],
  ['EVT-06','06-04',4,'2027-02-18',null,'Исторический квест «Разведка»','Егор Дыкуль','Евгений Кустов, Виктор Антонов, Виктория Панкратова',0,60,2,2500],
  ['EVT-06','06-05',5,'2027-02-23',null,'Комплекс активностей «Судьбы времён»','Анастасия Таран','Евгений Кустов, Егор Дыкуль, Виктор Антонов, Виктория Панкратова, Иван Брунов',0,60,5,6000],
  ['EVT-07','07-01',1,'2027-03-01','2027-03-22','Приём работ конкурса «Истории моей семьи»','Валерия Синявина','Евгений Кустов, Виктория Панкратова',80,0,2,1500],
  ['EVT-07','07-02',2,'2027-03-27','2027-03-31','Финал «Письма, которые заговорили» и выставка реликвий','Валерия Синявина','Евгений Кустов, Виктория Панкратова, Иван Брунов',20,0,3,2500],
  ['EVT-08','08-01',1,'2027-04-19',null,'Без срока давности: документ, свидетельство, память','Валерия Синявина, Егор Дыкуль','Евгений Кустов, Виктория Панкратова',0,0,0,0],
  ['EVT-08','08-02',2,'2027-05-09',null,'Главная площадка «Фронтовая агитбригада»','Иван Брунов','Вся рабочая группа',400,0,5,4000],
  ['EVT-09','09-01',1,'2027-05-19',null,'Открытие выставки «Агитбригада в лицах и событиях»','Валерия Синявина','Евгений Кустов, Виктор Антонов, Виктория Панкратова',40,0,2,1500],
  ['EVT-09','09-02',2,'2027-05-21',null,'Первая организованная экскурсия','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,1,800],
  ['EVT-09','09-03',3,'2027-05-25',null,'Вторая организованная экскурсия','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,1,800],
  ['EVT-09','09-04',4,'2027-05-28',null,'Третья организованная экскурсия','Валерия Синявина','Евгений Кустов, Виктория Панкратова',20,0,1,900],
  ['EVT-10','10-01',1,'2027-06-10',null,'Итоговое собрание рабочей группы и партнёров','Иван Брунов, Евгений Кустов','Виктория Панкратова, рабочая группа',0,20,1,500],
  ['EVT-11','11-01',1,'2027-06-10','2027-06-20','Итоговая информационная кампания','Иван Брунов','Рабочая группа',0,0,10,12000],
  ['EVT-12','12-01',1,'2027-06-21','2027-06-30','Подготовка итоговой содержательной и финансовой отчётности','Иван Брунов','Вся рабочая группа',0,0,1,500],
].map(([event_code, activity_code, sort_order, activity_date, end_date, title, lead_name, support_names, plan_unique_participants, plan_repeat_participants, plan_publications, plan_views]) => ({
  event_code, activity_code, sort_order, activity_date, end_date, title, lead_name, support_names,
  plan_unique_participants, plan_repeat_participants, plan_publications, plan_views,
}));

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const formatDate = value => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('ru-RU')
  : '—';

const initials = fullName => String(fullName || '')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0]?.toUpperCase() || '')
  .join('');

function normalizeActivities(rows, events) {
  const eventById = new Map(events.map(event => [event.id, event]));
  return rows.map(row => ({
    ...row,
    event_code: row.event_code || eventById.get(row.event_id)?.code,
  })).sort((a, b) => {
    const eventA = events.find(event => event.code === a.event_code)?.sort_order || 0;
    const eventB = events.find(event => event.code === b.event_code)?.sort_order || 0;
    return eventA - eventB || Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });
}

async function loadClosedData() {
  if (closedData) return closedData;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [projectResult, eventsResult, teamResult, activitiesResult] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('events').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('working_group_members').select('*').eq('project_id', projectId).eq('is_active', true).order('sort_order'),
      supabase.from('event_activities').select('*').eq('project_id', projectId).order('activity_date').order('sort_order'),
    ]);

    const project = projectResult.data || {};
    const events = eventsResult.data || [];
    const teamFromDb = teamResult.error ? [] : (teamResult.data || []);
    const activitiesFromDb = activitiesResult.error ? [] : (activitiesResult.data || []);

    closedData = {
      project,
      events,
      team: teamFromDb.length ? teamFromDb : FALLBACK_TEAM,
      activities: activitiesFromDb.length ? normalizeActivities(activitiesFromDb, events) : FALLBACK_ACTIVITIES,
      persisted: Boolean(teamFromDb.length && activitiesFromDb.length),
    };
    return closedData;
  })().finally(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}

function actualRepeatParticipants(events) {
  return events.reduce((sum, item) => sum + Number(item.actual_repeat_participants || 0), 0);
}

function planRepeatParticipants(events) {
  return events.reduce((sum, item) => sum + Number(item.plan_repeat_participants || 0), 0);
}

function nextActivity(activities) {
  const now = new Date();
  return activities.find(item => new Date(`${item.activity_date}T23:59:59`) >= now) || activities.at(-1) || null;
}

function renderPassport(data) {
  if (document.getElementById('closedProjectPassport')) return;
  const current = nextActivity(data.activities);
  const section = document.createElement('section');
  section.id = 'closedProjectPassport';
  section.className = 'closed-actualization-block';
  section.innerHTML = `
    <div class="closed-section-head">
      <div><h3>Актуальный паспорт проекта</h3><p>Утверждённые сроки, показатели и текущая рабочая структура.</p></div>
      <span class="closed-source-badge">актуализировано 26.06.2026</span>
    </div>
    ${!data.persisted ? '<div class="closed-migration-note"><strong>Режим предварительного просмотра.</strong> Актуальный план уже показан на сайте. Для хранения и дальнейшего редактирования в общей базе выполните файл <code>supabase_closed_actualization.sql</code> в SQL Editor Supabase.</div>' : ''}
    <div class="closed-passport">
      <div class="closed-passport-main">
        <h3>${esc(data.project.name || 'Фронтовая агитбригада')}</h3>
        <p>${esc(data.project.description || 'Интерактивная историческая площадка и комплекс мероприятий по сохранению исторической памяти и гражданско-патриотическому воспитанию молодёжи 14–35 лет.')}</p>
        <div class="closed-passport-meta">
          <span>Период: ${formatDate(data.project.start_date || '2026-08-01')} — ${formatDate(data.project.end_date || '2027-06-30')}</span>
          <span>Территория: ${esc(data.project.municipality || 'Кемский муниципальный округ')}</span>
          <span>Рабочая группа: ${data.team.length} человек</span>
        </div>
        <div class="closed-kpi-grid">
          <div class="closed-kpi"><strong>${Number(data.project.plan_events || 12).toLocaleString('ru-RU')}</strong><span>официальных строк календаря</span></div>
          <div class="closed-kpi"><strong>${Number(data.project.plan_unique_participants || 1000).toLocaleString('ru-RU')}</strong><span>уникальных участников 14–35 лет</span></div>
          <div class="closed-kpi"><strong>${planRepeatParticipants(data.events) || 220}</strong><span>повторных участий; факт: ${actualRepeatParticipants(data.events)}</span></div>
          <div class="closed-kpi"><strong>${Number(data.project.plan_publications || 57).toLocaleString('ru-RU')}</strong><span>публикаций</span></div>
          <div class="closed-kpi"><strong>${Number(data.project.plan_views || 52000).toLocaleString('ru-RU')}</strong><span>просмотров</span></div>
        </div>
      </div>
      <aside class="closed-passport-side">
        <h3>Ближайшая рабочая точка</h3>
        ${current ? `<div class="closed-next-activity"><strong>${formatDate(current.activity_date)} · ${esc(current.title)}</strong><span>Ответственный: ${esc(current.lead_name || 'не назначен')}</span></div>` : '<p>Рабочие активности ещё не внесены.</p>'}
      </aside>
    </div>`;
  appHost.append(section);
}

function renderDetailedCalendar(data) {
  if (document.getElementById('closedDetailedCalendar')) return;
  const section = document.createElement('section');
  section.id = 'closedDetailedCalendar';
  section.className = 'closed-actualization-block';

  const grouped = new Map();
  data.activities.forEach(activity => {
    if (!grouped.has(activity.event_code)) grouped.set(activity.event_code, []);
    grouped.get(activity.event_code).push(activity);
  });

  const eventHtml = data.events.map(event => {
    const activities = grouped.get(event.code) || [];
    return `<article class="closed-detail-event">
      <div class="closed-detail-event-head">
        <div class="closed-event-code">${esc(event.code)}</div>
        <div>
          <h4>${esc(event.name)}</h4>
          <p>${esc(event.description || '')}</p>
          <div class="closed-event-plans">
            <span>уникальные: ${Number(event.plan_unique_participants || 0)}</span>
            <span>повторные: ${Number(event.plan_repeat_participants || 0)}</span>
            <span>публикации: ${Number(event.plan_publications || 0)}</span>
            <span>просмотры: ${Number(event.plan_views || 0).toLocaleString('ru-RU')}</span>
          </div>
        </div>
        <div class="closed-event-deadline">срок<br>${formatDate(event.due_date)}</div>
      </div>
      <div class="closed-activity-list">
        ${activities.length ? activities.map(activity => `<div class="closed-activity-row">
          <div class="closed-activity-date">${formatDate(activity.activity_date)}${activity.end_date ? `<br>— ${formatDate(activity.end_date)}` : ''}</div>
          <div class="closed-activity-title"><strong>${esc(activity.title)}</strong><span>${esc(activity.location || '')}</span></div>
          <div class="closed-activity-owner"><strong>Ответственный:</strong><br>${esc(activity.lead_name || '—')}${activity.support_names ? `<br><span>Поддержка: ${esc(activity.support_names)}</span>` : ''}</div>
          <div class="closed-activity-plan"><strong>План:</strong><br>${Number(activity.plan_unique_participants || 0)} уник. · ${Number(activity.plan_repeat_participants || 0)} повтор.<br>${Number(activity.plan_publications || 0)} публ. · ${Number(activity.plan_views || 0).toLocaleString('ru-RU')} просм.</div>
        </div>`).join('') : '<div class="closed-activity-row"><div class="closed-activity-title"><strong>Детализация не требуется</strong><span>Работа ведётся по официальной строке календаря.</span></div></div>'}
      </div>
    </article>`;
  }).join('');

  section.innerHTML = `
    <div class="closed-section-head">
      <div><h3>Детальный рабочий календарь</h3><p>Вложенные активности не увеличивают количество официальных строк, но позволяют управлять датами, охватом и ответственностью.</p></div>
      <span class="closed-source-badge">12 строк · ${data.activities.length} активностей</span>
    </div>
    ${!data.persisted ? '<div class="closed-migration-note">Для сохранения этих активностей в Supabase и последующего редактирования выполните <code>supabase_closed_actualization.sql</code>.</div>' : ''}
    <div class="closed-detail-list">${eventHtml}</div>`;
  appHost.append(section);
}

function renderWorkingGroup(data) {
  if (document.getElementById('closedWorkingGroup')) return;
  const existingGrid = appHost.querySelector('.grid.grid-3');
  const section = document.createElement('section');
  section.id = 'closedWorkingGroup';
  section.className = 'closed-actualization-block';
  section.innerHTML = `
    <div class="closed-section-head">
      <div><h3>Рабочая группа проекта</h3><p>Содержательный и организационный состав команды. Учётные записи доступа показаны отдельно.</p></div>
      <span class="closed-source-badge">${data.team.length} человек</span>
    </div>
    ${!data.persisted ? '<div class="closed-migration-note">Состав уже отображается на сайте из согласованного плана. Для хранения в общей базе выполните <code>supabase_closed_actualization.sql</code>.</div>' : ''}
    <div class="closed-team-grid">
      ${data.team.map(member => `<article class="closed-team-member ${member.full_name === 'Анастасия Таран' || member.full_name === 'Иван Брунов' ? 'focus-member' : ''}">
        <div class="closed-team-initials">${esc(initials(member.full_name))}</div>
        <h4>${esc(member.full_name)}</h4>
        <div class="closed-team-role">${esc(member.role_title || '')}</div>
        <p>${esc(member.responsibility || '')}</p>
        <span class="closed-team-focus">${esc(member.focus || '')}</span>
      </article>`).join('')}
    </div>
    <h3 class="closed-access-heading">Учётные записи и права доступа</h3>`;

  if (existingGrid) appHost.insertBefore(section, existingGrid);
  else appHost.append(section);
}

async function enhanceCurrentPage() {
  if (!appHost || !appHost.children.length) return;
  const data = await loadClosedData();
  const page = location.hash.slice(1) || 'dashboard';

  if (page === 'dashboard') renderPassport(data);
  if (page === 'calendar') renderDetailedCalendar(data);
  if (page === 'team') renderWorkingGroup(data);
}

function scheduleEnhance() {
  if (enhanceScheduled) return;
  enhanceScheduled = true;
  setTimeout(() => {
    enhanceScheduled = false;
    enhanceCurrentPage().catch(error => console.error('[closed-actualization]', error));
  }, 80);
}

const observer = new MutationObserver(scheduleEnhance);
observer.observe(appHost, { childList: true, subtree: false });
window.addEventListener('hashchange', scheduleEnhance);
scheduleEnhance();
