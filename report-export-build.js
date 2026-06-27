import * as XLSX from 'xlsx-js-style';
import { PLAN, fmtDate, n, sum, yn, lab, sheet, link } from './report-export-core.js';

const add = (wb, ws, name) => XLSX.utils.book_append_sheet(wb, ws, name);

export function buildReportWorkbook(d) {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: 'Фронтовая агитбригада — экспорт для отчёта',
    Author: PLAN.recipient,
    CreatedDate: new Date(),
  };

  const completedEvents = d.events.filter(e => e.status === 'completed' || e.actual_date).length;
  const registeredPeople = d.people.length;
  const actualParticipants = registeredPeople || sum(d.events, 'actual_unique_participants');
  const actualPublications = d.pubs.length;
  const actualViews = sum(d.pubs, 'views');
  const actualBudget = sum(d.budget, 'actual_amount');

  const passportRows = [
    ['Руководитель / грантополучатель', PLAN.recipient, '', 'Показатель', 'План', 'Факт', 'Выполнение', 'Статус'],
    ['Название проекта', PLAN.name, '', 'Мероприятия', PLAN.events, completedEvents, completedEvents / PLAN.events, completedEvents >= PLAN.events ? 'Достигнуто' : 'В работе'],
    ['Регион', PLAN.region, '', 'Участники', PLAN.participants, actualParticipants, actualParticipants / PLAN.participants, actualParticipants >= PLAN.participants ? 'Достигнуто' : 'В работе'],
    ['География', PLAN.geo, '', 'Публикации', PLAN.pubs, actualPublications, actualPublications / PLAN.pubs, actualPublications >= PLAN.pubs ? 'Достигнуто' : 'В работе'],
    ['Период реализации', `${PLAN.start} — ${PLAN.end}`, '', 'Просмотры', PLAN.views, actualViews, actualViews / PLAN.views, actualViews >= PLAN.views ? 'Достигнуто' : 'В работе'],
    ['Дата достижения результатов', PLAN.end, '', 'Бюджет, руб.', PLAN.budget, actualBudget, actualBudget / PLAN.budget, actualBudget === PLAN.budget ? 'Закрыто' : 'В работе'],
    ['Номер соглашения', 'Заполнить вручную', '', '', '', '', '', ''],
  ];
  add(wb, sheet(
    'Фронтовая агитбригада — экспорт для отчёта',
    `Сформировано из закрытой части сайта ${new Date().toLocaleString('ru-RU')}. Плановые значения зафиксированы строго по проектной заявке.`,
    ['Поле', 'Значение', '', 'Сводный показатель', 'План', 'Факт', 'Выполнение', 'Статус'],
    passportRows,
    [28, 55, 3, 24, 14, 14, 14, 17],
  ), '00_Паспорт');

  const indicatorRows = [
    ['Количество мероприятий, проведённых в рамках проекта', 'ед.', PLAN.events, completedEvents, completedEvents / PLAN.events, completedEvents - PLAN.events, 'Письмо руководителя + фотоархив', completedEvents >= PLAN.events ? 'Достигнуто' : 'Не достигнуто'],
    ['Количество участников мероприятий, вовлечённых в реализацию проекта', 'чел.', PLAN.participants, actualParticipants, actualParticipants / PLAN.participants, actualParticipants - PLAN.participants, registeredPeople ? 'Реестр участников с ФИО и контактом' : 'Предварительный факт из карточек мероприятий; реестр участников пуст', actualParticipants >= PLAN.participants ? 'Достигнуто' : 'Не достигнуто'],
    ['Количество публикаций', 'ед.', PLAN.pubs, actualPublications, actualPublications / PLAN.pubs, actualPublications - PLAN.pubs, 'Активные ссылки + скриншоты', actualPublications >= PLAN.pubs ? 'Достигнуто' : 'Не достигнуто'],
    ['Количество просмотров публикаций', 'ед.', PLAN.views, actualViews, actualViews / PLAN.views, actualViews - PLAN.views, 'Скриншоты с видимым числом просмотров', actualViews >= PLAN.views ? 'Достигнуто' : 'Не достигнуто'],
  ];
  add(wb, sheet(
    'Приложение 1 — количественные показатели',
    'Количество официальных мероприятий считается по 12 строкам календарного плана. Рабочие активности внутри этапов не увеличивают этот показатель.',
    ['Показатель', 'Ед.', 'План', 'Факт', 'Выполнение', 'Отклонение', 'Подтверждение', 'Контроль'],
    indicatorRows,
    [48, 9, 14, 14, 14, 14, 52, 18],
  ), '01_Показатели');

  const eventRows = d.events.map(e => [
    e.code, e.task_name || '', e.name, e.location || '', fmtDate(e.due_date), e.description || '',
    n(e.plan_unique_participants), n(e.plan_repeat_participants), n(e.plan_publications), n(e.plan_views),
    lab(e.status), fmtDate(e.actual_date), n(e.actual_unique_participants), n(e.actual_repeat_participants),
    n(e.actual_publications), n(e.actual_views), e.result_summary || '', e.problems || '',
    e.unplanned_results || '', e.development_prospects || e.success_assessment || '',
  ]);
  add(wb, sheet(
    'Приложение 3 — календарный план и результаты',
    'Плановые итоги по 12 официальным строкам: 1000 уникальных участников, 220 повторных участий, 57 публикаций и 52 000 просмотров.',
    ['Код', 'Задача', 'Мероприятие', 'Место', 'Срок', 'Плановое описание', 'План уник.', 'План повтор.', 'План публикаций', 'План просмотров', 'Статус', 'Фактическая дата', 'Факт уник.', 'Факт повтор.', 'Факт публикаций', 'Факт просмотров', 'Достигнутый результат', 'Проблемы', 'Незапланированные результаты', 'Перспективы / оценка'],
    eventRows,
    [11, 42, 46, 25, 14, 58, 12, 12, 14, 14, 14, 15, 12, 12, 14, 14, 45, 38, 38, 42],
  ), '02_Календарный_план');

  const activityRows = d.acts.map((a, index) => [
    index + 1,
    a.event_code || d.events.find(e => e.id === a.event_id)?.code || '',
    a.activity_code || '', fmtDate(a.activity_date), fmtDate(a.end_date), a.title || '',
    a.location || '', a.lead_name || '', a.support_names || '', n(a.plan_unique_participants),
    n(a.plan_repeat_participants), n(a.plan_publications), n(a.plan_views), lab(a.status || 'planned'),
  ]);
  add(wb, sheet(
    'Рабочие активности внутри этапов',
    'Рабочие активности используются для управления проектом, но не увеличивают официальный показатель «12 мероприятий».',
    ['№', 'Код этапа', 'Код активности', 'Дата', 'Окончание', 'Название', 'Место', 'Ответственный', 'Соисполнители', 'План уник.', 'План повтор.', 'Публикации', 'Просмотры', 'Статус'],
    activityRows,
    [7, 12, 16, 13, 14, 48, 24, 28, 32, 12, 12, 12, 13, 14],
  ), '03_Активности');

  const attendanceMap = new Map();
  d.attendance.forEach(item => {
    if (!attendanceMap.has(item.participant_id)) attendanceMap.set(item.participant_id, []);
    attendanceMap.get(item.participant_id).push(item);
  });
  const participantRows = d.people.map((p, index) => {
    const visits = attendanceMap.get(p.id) || [];
    const codes = [...new Set(visits.map(v => d.events.find(e => e.id === v.event_id)?.code).filter(Boolean))];
    return [index + 1, p.full_name || '', fmtDate(p.birth_date), p.contact_type || '', p.contact_value || '', p.organization || '', p.municipality || '', yn(p.consent_personal_data), yn(p.consent_media), visits.length, codes.join(', '), visits.length > 1 ? 'Да' : 'Нет', p.notes || ''];
  });
  add(wb, sheet(
    'Реестр участников',
    'Для подтверждения показателя необходимы ФИО и один идентифицирующий контакт. Лист содержит персональные данные и предназначен для внутреннего отчёта.',
    ['№', 'ФИО', 'Дата рождения', 'Тип контакта', 'Контакт', 'Организация', 'Муниципалитет', 'Согласие ПД', 'Согласие фото/видео', 'Посещений', 'Коды мероприятий', 'Повторный', 'Примечание'],
    participantRows,
    [7, 36, 14, 15, 26, 30, 24, 13, 17, 11, 28, 14, 30],
  ), '04_Участники');

  const publicationRows = d.pubs.map((p, index) => [
    index + 1, fmtDate(p.published_at), p.platform || p.media_name || '', p.media_characteristic || '',
    p.title || '', p.url || '', n(p.views), yn(p.hashtags_present), yn(p.hashtags_grants_present ?? p.hashtags_present),
    yn(p.grant_mention), p.screenshot_path || '', p.event_code || d.events.find(e => e.id === p.event_id)?.code || '', p.notes || '',
  ]);
  const publicationSheet = sheet(
    'Реестр публикаций и просмотров',
    'Для каждой публикации нужны активная ссылка и скриншот с датой, просмотрами и обязательной маркировкой.',
    ['№', 'Дата', 'Площадка / СМИ', 'Характеристика СМИ', 'Заголовок', 'Ссылка', 'Просмотры', '#Росмолодёжь', '#РосмолодёжьГранты', 'Упоминание поддержки', 'Скриншот', 'Код мероприятия', 'Примечание'],
    publicationRows,
    [7, 13, 25, 42, 44, 48, 13, 15, 20, 21, 34, 15, 32],
  );
  publicationRows.forEach((row, index) => link(publicationSheet, `F${index + 5}`, row[5]));
  add(wb, publicationSheet, '05_Публикации');

  return wb;
}
