import * as XLSX from 'xlsx-js-style';
import { PLAN, fmtDate, n, sum, lab, sheet, link } from './report-export-core.js';

const add = (wb, ws, name) => XLSX.utils.book_append_sheet(wb, ws, name);

export function appendFinalSheets(wb, d) {
  const budgetRows = d.budget.map(item => [
    item.code,
    item.category || '',
    item.name || '',
    item.description || '',
    n(item.quantity),
    n(item.unit_price || item.price),
    n(item.planned_amount),
    n(item.actual_amount),
    n(item.actual_amount) - n(item.planned_amount),
    lab(item.status),
    item.supplier || '',
    item.contract_number || '',
    item.invoice_number || '',
    item.act_number || '',
    item.payment_document || '',
    item.receipt_document || '',
    item.document_folder || item.external_url || '',
    item.notes || '',
  ]);
  const budgetSheet = sheet(
    'Приложение 2 — финансовый реестр',
    'Плановые статьи должны соответствовать проектной заявке и в сумме составлять 920 005 рублей. По каждой статье необходимо проверить комплект документов.',
    ['Код', 'Категория', 'Статья', 'Описание', 'Количество', 'Цена', 'План', 'Факт', 'Отклонение', 'Статус', 'Поставщик', 'Договор', 'Счёт', 'Акт / УПД', 'Платёжный документ', 'Чек', 'Папка / ссылка', 'Комментарий'],
    budgetRows,
    [11, 31, 44, 55, 12, 14, 15, 15, 15, 14, 28, 19, 18, 18, 22, 16, 34, 32],
  );
  budgetRows.forEach((row, index) => {
    if (/^https?:/i.test(row[16])) link(budgetSheet, `Q${index + 5}`, row[16]);
  });
  add(wb, budgetSheet, '06_Бюджет');

  const documentRows = d.docs.map((item, index) => [
    index + 1,
    item.category || '',
    item.event_code || d.events.find(event => event.id === item.event_id)?.code || '',
    fmtDate(item.document_date || item.created_at),
    item.title || '',
    item.description || '',
    lab(item.status),
    item.external_url || item.file_path || '',
    item.report_appendix || '',
    item.notes || '',
  ]);
  const documentSheet = sheet(
    'Реестр подтверждающих документов',
    'Письма, списки участников, программы, фотоархивы, анкеты, договоры, акты, платёжные документы и иные доказательства реализации проекта.',
    ['№', 'Категория', 'Код мероприятия', 'Дата', 'Название', 'Описание', 'Статус', 'Файл / ссылка', 'Для приложения', 'Комментарий'],
    documentRows,
    [7, 25, 15, 14, 40, 44, 15, 48, 16, 34],
  );
  documentRows.forEach((row, index) => {
    if (/^https?:/i.test(row[7])) link(documentSheet, `H${index + 5}`, row[7]);
  });
  add(wb, documentSheet, '07_Документы');

  const sectionMap = new Map(d.sections.map(item => [item.section_key, item]));
  const sectionDefinitions = [
    ['unplanned_results', 'Наличие и характер незапланированных результатов', 'Заполняется только при наличии результатов сверх календарного плана.'],
    ['problems', 'Проблемы, возникшие в ходе реализации проекта', 'Описываются фактические трудности, их влияние на проект и принятые решения.'],
    ['success_assessment', 'Оценка успешности проекта', 'Оценить достижение 12 мероприятий, 1000 участников, 57 публикаций, 52 000 просмотров и качественный социальный эффект.'],
    ['development_prospects', 'Перспективы дальнейшего развития проекта', 'Создание поэтапного организационного плана для других небольших городов; распространение материалов через партнёров; участие в конкурсах ПФКИ, ФПГ и Фонда грантов Главы Республики Карелия.'],
  ];
  const sectionRows = sectionDefinitions.map(([key, title, basis]) => {
    const item = sectionMap.get(key) || d.sections.find(row => row.title === title) || {};
    return [title, basis, item.content || '', lab(item.status || 'draft'), item.responsible_name || '', item.notes || ''];
  });
  add(wb, sheet(
    'Текстовые разделы Приложения 3',
    'Рабочие формулировки для последующего переноса в личный кабинет Росмолодёжь.Гранты.',
    ['Раздел', 'Плановая основа', 'Фактический текст', 'Статус', 'Ответственный', 'Примечание'],
    sectionRows,
    [36, 62, 72, 16, 25, 32],
  ), '08_Приложение_3');

  const completedEvents = d.events.filter(item => item.status === 'completed' || item.actual_date).length;
  const actualParticipants = d.people.length || sum(d.events, 'actual_unique_participants');
  const actualPublications = d.pubs.length;
  const actualViews = sum(d.pubs, 'views');
  const planUnique = sum(d.events, 'plan_unique_participants');
  const planRepeat = sum(d.events, 'plan_repeat_participants');
  const planPublications = sum(d.events, 'plan_publications');
  const planViews = sum(d.events, 'plan_views');
  const planBudget = sum(d.budget, 'planned_amount');

  const controlRows = [
    [1, 'Приложение 1: мероприятия', '12 официальных строк календарного плана; письмо руководителя и фотоархив', completedEvents >= PLAN.events ? 'Готово' : 'В работе', '', '', PLAN.end, ''],
    [2, 'Приложение 1: участники', 'Не менее 1000 уникальных участников; реестр с ФИО и контактом либо письма организаций', actualParticipants >= PLAN.participants && d.people.length ? 'Готово' : 'В работе', '', '', PLAN.end, ''],
    [3, 'Приложение 1: публикации', 'Не менее 57 публикаций; активные ссылки и скриншоты', actualPublications >= PLAN.pubs ? 'Готово' : 'В работе', '', '', PLAN.end, ''],
    [4, 'Приложение 1: просмотры', 'Не менее 52 000 просмотров; скриншоты с видимым числом просмотров', actualViews >= PLAN.views ? 'Готово' : 'В работе', '', '', PLAN.end, ''],
    [5, 'Маркировка публикаций', '#Росмолодёжь, #РосмолодёжьГранты, дата и просмотры; для СМИ — упоминание поддержки', 'Проверить', '', '', '', ''],
    [6, 'Приложение 2', 'Финансовый архив: договор, счёт, акт / УПД, платёжный документ, чек при необходимости', 'В работе', '', '', PLAN.end, ''],
    [7, 'Приложение 3', 'Фактические результаты по 12 мероприятиям и четыре текстовых раздела', 'В работе', '', '', PLAN.end, ''],
    [8, 'Приложение 4', 'Не заполнять, если изменения по суммам и соглашению отсутствуют', 'Не требуется', '', '', '', ''],
    ['', 'Контроль календарного плана', `В базе: ${d.events.length} строк; плановые итоги: ${planUnique} уникальных, ${planRepeat} повторных, ${planPublications} публикаций, ${planViews} просмотров. Должно быть 12 / 1000 / 220 / 57 / 52000.`, d.events.length === 12 && planUnique === 1000 && planRepeat === 220 && planPublications === 57 && planViews === 52000 ? 'Соответствует' : 'Проверить', '', '', '', ''],
    ['', 'Контроль бюджета', `Плановая сумма в базе: ${planBudget.toLocaleString('ru-RU')} рублей. Должно быть 920 005 рублей.`, planBudget === PLAN.budget ? 'Соответствует' : 'Проверить', '', '', '', ''],
    ['', 'Расхождение в заявке', 'Медиаплан содержит 55 публикаций и 54 000 просмотров, а раздел «Результаты» и календарный план — 57 публикаций и 52 000 просмотров. Для итогового отчёта использовать 57 и 52 000.', 'Важно', '', '', '', ''],
    ['', 'Дата главной площадки', 'В одном описании встречается 9 мая 2026 года, но срок этапа и период проекта указывают на 09.05.2027. В рабочем календаре использовать 09.05.2027.', 'Важно', '', '', '', ''],
  ];
  add(wb, sheet(
    'Контроль перед сдачей отчёта',
    'Проверка соответствия проектной заявке и требованиям итоговой отчётности.',
    ['№', 'Контрольный пункт', 'Требование', 'Статус', 'Файл / ссылка', 'Ответственный', 'Срок', 'Комментарий'],
    controlRows,
    [7, 35, 68, 18, 42, 25, 14, 38],
  ), '09_Контроль');

  return wb;
}
