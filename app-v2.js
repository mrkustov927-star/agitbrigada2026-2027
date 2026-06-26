const { supabase, session, projectId, role } = window.AGIT;

const app = document.getElementById('app');
const navHost = document.getElementById('nav');
const modal = document.getElementById('modalBackdrop');
const modalBody = document.getElementById('modalBody');
const modalFoot = document.getElementById('modalFoot');

const ROLE_LABELS = {
  owner: 'Руководитель',
  manager: 'Координатор',
  finance: 'Финансы',
  media: 'Медиа',
  organizer: 'Организатор',
  mentor: 'Наставник',
  viewer: 'Просмотр',
};

const STATUS_LABELS = {
  planned: 'Запланировано',
  preparing: 'Подготовка',
  in_progress: 'В работе',
  completed: 'Завершено',
  cancelled: 'Отменено',
  contracting: 'Договоры',
  ordered: 'Заказано',
  paid: 'Оплачено',
  closed: 'Закрыто',
  missing: 'Нет документа',
  draft: 'Черновик',
  uploaded: 'Загружено',
  verified: 'Проверено',
  rejected: 'Отклонено',
  active: 'Активен',
};

const RIGHTS = {
  event: ['owner', 'manager', 'organizer'].includes(role),
  participant: ['owner', 'manager', 'organizer'].includes(role),
  media: ['owner', 'manager', 'media'].includes(role),
  finance: ['owner', 'finance'].includes(role),
  documents: ['owner', 'manager', 'finance', 'media', 'organizer'].includes(role),
  quality: ['owner', 'manager', 'organizer'].includes(role),
  management: ['owner', 'manager'].includes(role),
  owner: role === 'owner',
};

const PAGES = [
  ['dashboard', '⌂', 'Панель'],
  ['calendar', '▣', 'Календарь'],
  ['participants', '♟', 'Участники'],
  ['media', '◉', 'Публикации'],
  ['budget', '₽', 'Бюджет'],
  ['documents', '▤', 'Документы'],
  ['quality', '◇', 'Качество'],
  ['partners', '◎', 'Партнёры'],
  ['team', '♣', 'Команда'],
  ['report', '✓', 'Отчётность'],
];

let currentPage = location.hash.slice(1) || 'dashboard';
let project = null;
let data = emptyData();
let loadErrors = [];

function emptyData() {
  return {
    events: [], publications: [], budget: [], documents: [], quality: [],
    partners: [], risks: [], requirements: [], sections: [], participants: [],
    attendance: [], members: [], kpis: {},
  };
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const money = value => new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
}).format(Number(value || 0));
const formatDate = value => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('ru-RU') : '—';
const percent = (actual, plan) => Number(plan) > 0 ? Math.min(100, Math.round(Number(actual || 0) / Number(plan) * 100)) : 0;
const today = () => new Date().toISOString().slice(0, 10);
const label = value => STATUS_LABELS[value] || value || '—';

function setSync(text, status = 'ok') {
  const box = document.querySelector('.sync-state');
  if (!box) return;
  box.dataset.status = status;
  const textNode = box.querySelector('span:last-child');
  if (textNode) textNode.textContent = text;
}

function toast(text, type = 'success') {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = text;
  document.getElementById('toastStack').append(node);
  setTimeout(() => node.remove(), 4500);
}

function statusClass(value = '') {
  if (['completed', 'closed', 'verified', 'active'].includes(value)) return 'status-green';
  if (['preparing', 'in_progress', 'contracting', 'ordered', 'uploaded'].includes(value)) return 'status-blue';
  if (['paid'].includes(value)) return 'status-burgundy';
  if (['rejected', 'cancelled'].includes(value)) return 'status-red';
  if (['missing'].includes(value)) return 'status-amber';
  return 'status-gray';
}

async function safeLoad(name, loader, fallback = []) {
  try {
    return await loader();
  } catch (error) {
    console.error(`[${name}]`, error);
    loadErrors.push(`${name}: ${error.message || 'неизвестная ошибка'}`);
    return fallback;
  }
}

async function tableRows(table, { order, ascending = true, select = '*' } = {}) {
  let request = supabase.from(table).select(select).eq('project_id', projectId);
  if (order) request = request.order(order, { ascending });
  const { data: rows, error } = await request;
  if (error) throw error;
  return rows || [];
}

async function loadMembers() {
  if (!RIGHTS.management) return [];
  const members = await tableRows('project_members', { order: 'created_at' });
  const userIds = members.map(item => item.user_id).filter(Boolean);
  if (!userIds.length) return members;

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .in('id', userIds);
  if (error) throw error;

  const byId = new Map((profiles || []).map(profile => [profile.id, profile]));
  return members.map(member => ({ ...member, profile: byId.get(member.user_id) || null }));
}

async function loadData() {
  setSync('Загружаем данные…', 'busy');
  loadErrors = [];

  const loaders = [
    safeLoad('Мероприятия', () => tableRows('events', { order: 'sort_order' })),
    safeLoad('Публикации', () => tableRows('publications', { order: 'published_at', ascending: false })),
    safeLoad('Бюджет', () => tableRows('budget_items', { order: 'code' })),
    safeLoad('Документы', () => tableRows('project_documents', { order: 'created_at', ascending: false })),
    safeLoad('Качественные показатели', () => tableRows('quality_metrics', { order: 'code' })),
    safeLoad('Партнёры', () => tableRows('partners', { order: 'name' })),
    safeLoad('Риски', () => tableRows('risks', { order: 'created_at' })),
    safeLoad('Требования отчёта', () => tableRows('report_requirements', { order: 'appendix_number' })),
    safeLoad('Разделы отчёта', () => tableRows('report_sections', { order: 'section_key' })),
    RIGHTS.participant ? safeLoad('Участники', () => tableRows('participants', { order: 'full_name' })) : Promise.resolve([]),
    RIGHTS.participant ? safeLoad('Посещения', () => tableRows('participant_attendance', { order: 'created_at' })) : Promise.resolve([]),
    safeLoad('Команда', loadMembers),
  ];

  [
    data.events, data.publications, data.budget, data.documents, data.quality,
    data.partners, data.risks, data.requirements, data.sections, data.participants,
    data.attendance, data.members,
  ] = await Promise.all(loaders);

  data.kpis = await safeLoad('Показатели', async () => {
    const { data: result, error } = await supabase.rpc('get_project_kpis', { p_project_id: projectId });
    if (error) throw error;
    return result?.[0] || {};
  }, {});

  setSync(loadErrors.length ? `Загружено с предупреждениями: ${loadErrors.length}` : 'Общая база подключена', loadErrors.length ? 'error' : 'ok');
}

async function loadProject() {
  const { data: row, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (error) throw error;
  project = row;
  document.getElementById('projectDates').innerHTML = `<strong>${esc(project.name)}</strong>${formatDate(project.start_date)} — ${formatDate(project.end_date)}`;
}

function renderNav() {
  navHost.innerHTML = PAGES.map(([id, icon, title]) => `
    <button data-page="${id}" class="${currentPage === id ? 'active' : ''}">
      <span class="nav-icon">${icon}</span><span class="nav-label">${title}</span>
    </button>`).join('');
  navHost.onclick = event => {
    const button = event.target.closest('[data-page]');
    if (button) location.hash = button.dataset.page;
  };
}

function pageHead(title, subtitle, actions = '') {
  document.getElementById('pageTitle').textContent = title;
  return `<div class="page-intro"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><div class="page-actions">${actions}</div></div>${renderLoadErrors()}`;
}

function renderLoadErrors() {
  if (!loadErrors.length) return '';
  return `<div class="alert alert-warning" style="margin-bottom:16px"><span class="alert-icon">!</span><div><strong>Часть данных временно не загрузилась</strong><p>${loadErrors.map(esc).join('<br>')}</p></div><button class="alert-action" data-retry>Повторить</button></div>`;
}

function kpiCard(title, actual, plan, icon, css = '') {
  return `<div class="card kpi-card"><div class="kpi-top"><span class="kpi-label">${title}</span><span class="kpi-icon">${icon}</span></div><div class="kpi-number">${Number(actual || 0).toLocaleString('ru-RU')}</div><div class="kpi-plan">план: ${Number(plan || 0).toLocaleString('ru-RU')}</div><div class="progress ${css}"><span style="width:${percent(actual, plan)}%"></span></div></div>`;
}

function smartAlerts() {
  const alerts = [];
  const now = new Date();
  for (const event of data.events) {
    if (['completed', 'cancelled'].includes(event.status)) continue;
    const days = Math.ceil((new Date(`${event.due_date}T23:59:59`) - now) / 86400000);
    if (days < 0) alerts.push(['critical', `Просрочено: ${event.name}`, `Срок был ${formatDate(event.due_date)}. Зафиксируйте результат или причину переноса.`]);
    else if (days <= 30) alerts.push(['warning', `До срока ${days} дней: ${event.name}`, 'Проверьте программу, списки, фото, публикации и итоговую справку.']);
  }
  if (data.publications.length < project.plan_publications) {
    alerts.push(['info', 'Медиаплан требует внимания', `Осталось подготовить ${project.plan_publications - data.publications.length} публикаций.`]);
  }
  return alerts.slice(0, 8);
}

function renderDashboard() {
  const k = data.kpis || {};
  const alerts = smartAlerts();
  const nextEvents = data.events.filter(item => !['completed', 'cancelled'].includes(item.status)).slice(0, 5);
  app.innerHTML = pageHead('Панель управления', 'Свод план–факт, ближайшие сроки и подсказки для команды.') + `
    <div class="grid grid-4">
      ${kpiCard('Мероприятия', k.actual_events, project.plan_events, '▣')}
      ${kpiCard('Участники 14–35', k.actual_unique_participants, project.plan_unique_participants, '♟', 'green')}
      ${kpiCard('Публикации', k.actual_publications, project.plan_publications, '◉', 'gold')}
      ${kpiCard('Просмотры', k.actual_views, project.plan_views, '◎', 'blue')}
    </div>
    <div class="grid grid-main" style="margin-top:16px">
      <section class="card"><div class="card-head"><div><h3>Умные подсказки</h3><p>Контроль сроков и договорных показателей.</p></div></div><div class="card-body alert-list">
        ${alerts.length ? alerts.map(item => `<div class="alert alert-${item[0]}"><span class="alert-icon">${item[0] === 'critical' ? '!' : item[0] === 'warning' ? '⌛' : 'i'}</span><div><strong>${esc(item[1])}</strong><p>${esc(item[2])}</p></div></div>`).join('') : '<div class="alert alert-good"><span class="alert-icon">✓</span><div><strong>Критических сигналов нет</strong><p>Продолжайте своевременно заполнять фактические данные и доказательства.</p></div></div>'}
      </div></section>
      <section class="card"><div class="card-head"><div><h3>Ближайшие этапы</h3><p>Следующие сроки календарного плана.</p></div></div><div class="card-body timeline">
        ${nextEvents.map(item => `<div class="timeline-item"><div class="timeline-date">${formatDate(item.due_date)}</div><div class="timeline-title">${esc(item.name)}</div><div class="timeline-meta">${esc(item.location || '')} · ${esc(label(item.status))}</div></div>`).join('') || '<div class="empty">Все этапы завершены</div>'}
      </div></section>
    </div>
    <div class="grid grid-3" style="margin-top:16px">
      <div class="card card-pad"><div class="stat-pair"><strong>${money(k.actual_budget)}</strong><span>из ${money(project.plan_budget)}</span></div><div class="progress"><span style="width:${percent(k.actual_budget, project.plan_budget)}%"></span></div><p class="subtle">Фактически освоено по смете</p></div>
      <div class="card card-pad"><div class="stat-pair"><strong>${Number(k.overdue_events || 0)}</strong><span>просроченных этапов</span></div><p class="subtle">Незавершённые мероприятия с истёкшим сроком</p></div>
      <div class="card card-pad"><div class="stat-pair"><strong>${data.requirements.filter(item => item.status === 'verified').length}</strong><span>из ${data.requirements.length}</span></div><p class="subtle">Требований итогового отчёта проверено</p></div>
    </div>`;
}

function renderCalendar() {
  app.innerHTML = pageHead('Календарный план', '12 утверждённых строк календаря проекта.', RIGHTS.event ? '<button class="btn btn-primary" data-new-event>+ Мероприятие</button>' : '') + `
    <div class="event-grid">${data.events.map(item => `<article class="card event-card">
      <div class="event-code">${esc(item.code)}</div><div class="event-title">${esc(item.name)}</div>
      <div class="event-meta"><span>Срок<br><strong>${formatDate(item.due_date)}</strong></span><span>Место<br><strong>${esc(item.location || '—')}</strong></span><span>Участники<br><strong>${item.actual_unique_participants || 0}/${item.plan_unique_participants || 0}</strong></span><span>Медиа<br><strong>${item.actual_publications || 0}/${item.plan_publications || 0}</strong></span></div>
      <div class="event-footer"><span class="status ${statusClass(item.status)}">${esc(label(item.status))}</span>${RIGHTS.event ? `<button class="mini-btn" data-edit-event="${item.id}">Открыть</button>` : ''}</div>
    </article>`).join('')}</div>`;
  app.querySelector('[data-new-event]')?.addEventListener('click', () => editEvent());
  app.querySelectorAll('[data-edit-event]').forEach(button => button.onclick = () => editEvent(data.events.find(item => item.id === button.dataset.editEvent)));
}

function renderParticipants() {
  if (!RIGHTS.participant) {
    app.innerHTML = pageHead('Участники', 'Персональные данные доступны руководителю, координатору и организаторам.') + '<div class="callout"><strong>Ограничение роли</strong><p>На главной панели доступен только агрегированный показатель.</p></div>';
    return;
  }
  app.innerHTML = pageHead('Участники', `В реестре ${data.participants.length} человек.`, '<button class="btn btn-primary" data-add-participant>+ Участник</button>') + `
    <div class="table-wrap"><table><thead><tr><th>ФИО</th><th>Дата рождения</th><th>Организация</th><th>Муниципалитет</th><th>Контакт</th><th>Согласия</th></tr></thead><tbody>
      ${data.participants.map(item => `<tr><td><strong>${esc(item.full_name)}</strong></td><td>${formatDate(item.birth_date)}</td><td>${esc(item.organization || '')}</td><td>${esc(item.municipality || '')}</td><td>${esc(item.contact_value || '')}</td><td>${item.consent_personal_data ? 'ПД ✓' : 'ПД —'} · ${item.consent_media ? 'Фото ✓' : 'Фото —'}</td></tr>`).join('')}
    </tbody></table></div>`;
  app.querySelector('[data-add-participant]')?.addEventListener('click', editParticipant);
}

function renderMedia() {
  const views = data.publications.reduce((sum, item) => sum + Number(item.views || 0), 0);
  app.innerHTML = pageHead('Публикации', `${data.publications.length}/${project.plan_publications} публикаций; ${views.toLocaleString('ru-RU')}/${Number(project.plan_views).toLocaleString('ru-RU')} просмотров.`, RIGHTS.media ? '<button class="btn btn-primary" data-add-publication>+ Публикация</button>' : '') + `
    <div class="table-wrap"><table><thead><tr><th>Дата</th><th>Площадка</th><th>Заголовок</th><th>Просмотры</th><th>Подтверждения</th><th>Ссылка</th></tr></thead><tbody>
      ${data.publications.map(item => `<tr><td>${formatDate(item.published_at)}</td><td>${esc(item.platform || item.media_name || '')}</td><td><strong>${esc(item.title || 'Без названия')}</strong></td><td class="number">${Number(item.views || 0).toLocaleString('ru-RU')}</td><td>${item.screenshot_path ? 'Скрин ✓' : 'Скрин —'} · ${item.hashtags_present || item.grant_mention ? 'Маркировка ✓' : 'Маркировка —'}</td><td><a class="link" href="${esc(item.url)}" target="_blank" rel="noopener">Открыть</a></td></tr>`).join('')}
    </tbody></table></div>`;
  app.querySelector('[data-add-publication]')?.addEventListener('click', editPublication);
}

function renderBudget() {
  const actual = data.budget.reduce((sum, item) => sum + Number(item.actual_amount || 0), 0);
  app.innerHTML = pageHead('Бюджет', `${money(actual)} освоено из ${money(project.plan_budget)}. Плановые суммы защищены.`, '') + `
    <div class="table-wrap"><table><thead><tr><th>Код</th><th>Статья</th><th>План</th><th>Факт</th><th>Статус</th><th>Поставщик</th><th></th></tr></thead><tbody>
      ${data.budget.map(item => `<tr><td>${esc(item.code)}</td><td><strong>${esc(item.name)}</strong><br><span class="subtle">${esc(item.category)}</span></td><td class="number">${money(item.planned_amount)}</td><td class="number">${money(item.actual_amount)}</td><td><span class="status ${statusClass(item.status)}">${esc(label(item.status))}</span></td><td>${esc(item.supplier || '')}</td><td>${RIGHTS.finance ? `<button class="mini-btn" data-edit-budget="${item.id}">Внести факт</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>`;
  app.querySelectorAll('[data-edit-budget]').forEach(button => button.onclick = () => editBudget(data.budget.find(item => item.id === button.dataset.editBudget)));
}

function renderDocuments() {
  app.innerHTML = pageHead('Подтверждающие документы', 'Письма, списки участников, программы, фотоархивы, анкеты и итоговые справки.', RIGHTS.documents ? '<button class="btn btn-primary" data-add-document>+ Документ</button>' : '') + `
    <div class="table-wrap"><table><thead><tr><th>Дата</th><th>Категория</th><th>Название</th><th>Статус</th><th>Файл или ссылка</th></tr></thead><tbody>
      ${data.documents.map(item => `<tr><td>${formatDate(item.document_date)}</td><td>${esc(item.category)}</td><td><strong>${esc(item.title)}</strong><br><span class="subtle">${esc(item.description || '')}</span></td><td><span class="status ${statusClass(item.status)}">${esc(label(item.status))}</span></td><td>${item.file_path ? `<button class="mini-btn" data-download="${esc(item.file_path)}">Скачать</button>` : item.external_url ? `<a class="link" href="${esc(item.external_url)}" target="_blank" rel="noopener">Открыть</a>` : '—'}</td></tr>`).join('')}
    </tbody></table></div>`;
  app.querySelector('[data-add-document]')?.addEventListener('click', addDocument);
  app.querySelectorAll('[data-download]').forEach(button => button.onclick = () => downloadFile(button.dataset.download));
}

function renderQuality() {
  app.innerHTML = pageHead('Качественные результаты', 'Плановые методики и фактический социальный эффект.') + `<div class="grid grid-2">
    ${data.quality.map(item => `<div class="card card-pad"><div class="eyebrow">${esc(item.code)}</div><h3>${esc(item.name)}</h3><p class="subtle">${esc(item.description || '')}</p><div class="stat-pair"><strong>${item.actual_value ?? '—'} ${esc(item.unit)}</strong><span>план ${item.planned_value ?? '—'}</span></div></div>`).join('')}
  </div>`;
}

function renderPartners() {
  app.innerHTML = pageHead('Партнёры и риски', 'Поддержка партнёров и управленческие риски проекта.') + `<div class="grid grid-2">
    <section class="card"><div class="card-head"><h3>Партнёры</h3></div><div class="card-body">${data.partners.map(item => `<div class="metric-row"><strong>${esc(item.name)}</strong><span>${esc(item.support_type || '')}</span><span>${money(item.actual_amount || item.planned_amount || 0)}</span><span class="metric-note">${esc(item.support_description || '')}</span></div>`).join('')}</div></section>
    <section class="card"><div class="card-head"><h3>Риски</h3></div><div class="card-body alert-list">${data.risks.length ? data.risks.map(item => `<div class="alert alert-${item.impact === 'critical' ? 'critical' : item.impact === 'high' ? 'warning' : 'info'}"><span class="alert-icon">!</span><div><strong>${esc(item.title)}</strong><p>${esc(item.mitigation || item.description || 'Мера реагирования не определена')}</p></div></div>`).join('') : '<div class="empty">Риски ещё не внесены</div>'}</div></section>
  </div>`;
}

function renderTeam() {
  app.innerHTML = pageHead('Команда', `Ваша роль: ${ROLE_LABELS[role] || role}.`, RIGHTS.owner ? '<button class="btn btn-primary" data-add-member>+ Добавить пользователя</button>' : '') + `<div class="grid grid-3">
    ${data.members.map(item => `<div class="card card-pad"><div class="eyebrow">${esc(ROLE_LABELS[item.role] || item.role)}</div><h3>${esc(item.profile?.full_name || item.invited_email || 'Участник команды')}</h3><p class="subtle">${esc(item.profile?.email || item.invited_email || '')}</p><span class="status ${statusClass(item.status)}">${esc(label(item.status))}</span></div>`).join('') || '<div class="callout"><strong>Команда</strong><p>Список пока пуст или недоступен для текущей роли.</p></div>'}
  </div>`;
  app.querySelector('[data-add-member]')?.addEventListener('click', addMember);
}

function renderReport() {
  const verified = data.requirements.filter(item => item.status === 'verified').length;
  app.innerHTML = pageHead('Итоговая отчётность', `Проверено ${verified} из ${data.requirements.length} контрольных требований.`) + `<div class="grid grid-main">
    <section class="card"><div class="card-head"><div><h3>Приложения и доказательства</h3><p>Плановые показатели в отчёте не уменьшаются.</p></div></div><div>${data.requirements.map(item => `<div class="report-step"><div class="step-num">${item.appendix_number || '✓'}</div><div><h4>${esc(item.title)}</h4><p>${esc(item.description || '')}</p></div><div><span class="status ${statusClass(item.status)}">${esc(label(item.status))}</span></div></div>`).join('')}</div></section>
    <section class="card"><div class="card-head"><h3>Черновики Приложения 3</h3></div><div class="card-body">${data.sections.map(item => `<div style="margin-bottom:14px"><strong>${esc(item.title)}</strong><p class="subtle">${esc((item.content || 'Не заполнено').slice(0, 180))}</p></div>`).join('')}</div></section>
  </div>`;
}

const renderers = {
  dashboard: renderDashboard,
  calendar: renderCalendar,
  participants: renderParticipants,
  media: renderMedia,
  budget: renderBudget,
  documents: renderDocuments,
  quality: renderQuality,
  partners: renderPartners,
  team: renderTeam,
  report: renderReport,
};

async function renderPage() {
  await loadData();
  renderNav();
  (renderers[currentPage] || renderDashboard)();
  app.querySelector('[data-retry]')?.addEventListener('click', () => renderPage().catch(showFatal));
}

function openModal(title, fields, onSave) {
  document.getElementById('modalTitle').textContent = title;
  modalBody.innerHTML = `<form id="modalForm" class="form-grid">${fields}</form>`;
  modalFoot.innerHTML = '<button class="btn btn-secondary" data-cancel>Отмена</button><button class="btn btn-primary" data-save>Сохранить</button>';
  modal.classList.remove('hidden');
  modal.querySelector('[data-cancel]').onclick = closeModal;
  modal.querySelector('[data-save]').onclick = async () => {
    const button = modal.querySelector('[data-save]');
    button.disabled = true;
    try {
      await onSave(new FormData(document.getElementById('modalForm')));
      closeModal();
      await renderPage();
      toast('Сохранено');
    } catch (error) {
      console.error(error);
      toast(error.message || 'Не удалось сохранить', 'error');
    } finally {
      button.disabled = false;
    }
  };
}

function closeModal() {
  modal.classList.add('hidden');
  modalBody.innerHTML = '';
  modalFoot.innerHTML = '';
}

function input(name, title, value = '', type = 'text', extra = '') {
  return `<div class="form-group"><label>${esc(title)}</label><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
}
function textArea(name, title, value = '') {
  return `<div class="form-group full"><label>${esc(title)}</label><textarea name="${name}">${esc(value)}</textarea></div>`;
}

function editEvent(item = {}) {
  openModal(item.id ? 'Карточка мероприятия' : 'Новое мероприятие',
    input('code', 'Код', item.code || '') + input('name', 'Название', item.name || '') +
    input('due_date', 'Крайний срок', item.due_date || '', 'date') + input('actual_date', 'Фактическая дата', item.actual_date || '', 'date') +
    input('location', 'Место', item.location || '') + `<div class="form-group"><label>Статус</label><select name="status">${['planned','preparing','in_progress','completed','cancelled'].map(status => `<option value="${status}" ${status === item.status ? 'selected' : ''}>${label(status)}</option>`).join('')}</select></div>` +
    input('actual_unique_participants', 'Уникальные участники', item.actual_unique_participants || 0, 'number') + input('actual_repeat_participants', 'Повторные участия', item.actual_repeat_participants || 0, 'number') +
    input('actual_publications', 'Публикации', item.actual_publications || 0, 'number') + input('actual_views', 'Просмотры', item.actual_views || 0, 'number') + textArea('result_summary', 'Фактический результат', item.result_summary || ''),
    async formData => {
      const row = Object.fromEntries(formData);
      ['actual_unique_participants','actual_repeat_participants','actual_publications','actual_views'].forEach(key => row[key] = Number(row[key] || 0));
      row.project_id = projectId;
      if (!row.actual_date) row.actual_date = null;
      const response = item.id ? await supabase.from('events').update(row).eq('id', item.id) : await supabase.from('events').insert({ ...row, sort_order: data.events.length + 1 });
      if (response.error) throw response.error;
    });
}

function editParticipant() {
  openModal('Новый участник',
    input('full_name', 'ФИО') + input('birth_date', 'Дата рождения', '', 'date') + input('organization', 'Организация') + input('municipality', 'Муниципалитет', 'Кемский муниципальный округ') + input('contact_value', 'Телефон / e-mail') +
    '<div class="form-group"><label><input style="width:auto" type="checkbox" name="consent_personal_data"> Согласие на обработку ПД</label></div><div class="form-group"><label><input style="width:auto" type="checkbox" name="consent_media"> Согласие на фото/видео</label></div>',
    async formData => {
      const row = Object.fromEntries(formData);
      row.project_id = projectId;
      row.consent_personal_data = formData.has('consent_personal_data');
      row.consent_media = formData.has('consent_media');
      const { error } = await supabase.from('participants').insert(row);
      if (error) throw error;
    });
}

function editPublication() {
  openModal('Новая публикация',
    input('title', 'Заголовок') + input('platform', 'Площадка', 'ВКонтакте') + input('published_at', 'Дата', today(), 'date') + input('views', 'Просмотры', 0, 'number') + input('url', 'Активная ссылка', '', 'url', 'required') +
    '<div class="form-group"><label><input style="width:auto" type="checkbox" name="hashtags_present"> Хештеги видны</label></div><div class="form-group"><label><input style="width:auto" type="checkbox" name="grant_mention"> Поддержка указана</label></div>',
    async formData => {
      const row = Object.fromEntries(formData);
      row.project_id = projectId;
      row.views = Number(row.views || 0);
      row.hashtags_present = formData.has('hashtags_present');
      row.grant_mention = formData.has('grant_mention');
      row.published_at = new Date(row.published_at).toISOString();
      const { error } = await supabase.from('publications').insert(row);
      if (error) throw error;
    });
}

function editBudget(item) {
  openModal(`Факт по ${item.code}`,
    input('actual_amount', 'Фактическая сумма', item.actual_amount || 0, 'number', 'step="0.01"') +
    `<div class="form-group"><label>Статус</label><select name="status">${['planned','contracting','ordered','paid','closed'].map(status => `<option value="${status}" ${status === item.status ? 'selected' : ''}>${label(status)}</option>`).join('')}</select></div>` +
    input('supplier', 'Поставщик', item.supplier || '') + input('contract_number', 'Номер договора', item.contract_number || '') + input('contract_date', 'Дата договора', item.contract_date || '', 'date') + input('payment_date', 'Дата оплаты', item.payment_date || '', 'date'),
    async formData => {
      const row = Object.fromEntries(formData);
      row.actual_amount = Number(row.actual_amount || 0);
      if (!row.contract_date) row.contract_date = null;
      if (!row.payment_date) row.payment_date = null;
      const { error } = await supabase.from('budget_items').update(row).eq('id', item.id);
      if (error) throw error;
    });
}

function addDocument() {
  openModal('Добавить документ',
    input('category', 'Категория', 'event') + input('title', 'Название') + input('document_date', 'Дата', today(), 'date') + input('external_url', 'Внешняя ссылка', '', 'url') +
    `<div class="form-group full"><label>Файл<input name="file" type="file"></label></div>` + textArea('description', 'Описание'),
    async formData => {
      const file = formData.get('file');
      const row = {
        project_id: projectId,
        category: formData.get('category'),
        title: formData.get('title'),
        document_date: formData.get('document_date'),
        external_url: formData.get('external_url') || null,
        description: formData.get('description'),
        status: 'uploaded',
        uploaded_by: session.user.id,
      };
      if (file && file.size) {
        const safeName = file.name.replace(/[^\wа-яё.()-]+/gi, '_');
        const path = `${projectId}/general/${Date.now()}-${safeName}`;
        const upload = await supabase.storage.from('project-documents').upload(path, file);
        if (upload.error) throw upload.error;
        row.file_path = path;
      }
      const { error } = await supabase.from('project_documents').insert(row);
      if (error) throw error;
    });
}

async function downloadFile(path) {
  const { data: blob, error } = await supabase.storage.from('project-documents').download(path);
  if (error) return toast(error.message, 'error');
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = path.split('/').pop();
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}

function addMember() {
  openModal('Добавить пользователя в команду',
    input('email', 'E-mail зарегистрированного пользователя', '', 'email', 'required') +
    `<div class="form-group"><label>Роль</label><select name="role">${['manager','finance','media','organizer','mentor','viewer'].map(item => `<option value="${item}">${ROLE_LABELS[item]}</option>`).join('')}</select></div>`,
    async formData => {
      const { error } = await supabase.rpc('add_existing_project_member', {
        p_project_id: projectId,
        p_email: formData.get('email'),
        p_role: formData.get('role'),
      });
      if (error) throw error;
    });
}

function showFatal(error) {
  console.error(error);
  setSync('Ошибка загрузки', 'error');
  renderNav();
  app.innerHTML = `<div class="callout"><strong>Не удалось загрузить панель</strong><p>${esc(error.message || error)}</p><button class="btn btn-primary" data-reload style="margin-top:12px">Повторить загрузку</button></div>`;
  app.querySelector('[data-reload]').onclick = () => location.reload();
}

function renderUserMenu() {
  const host = document.querySelector('.topbar-actions');
  const box = document.createElement('div');
  box.className = 'user-menu';
  box.innerHTML = `<div><strong>${esc(session.user.user_metadata?.full_name || session.user.email)}</strong><span>${esc(ROLE_LABELS[role] || role)}</span></div><button class="btn btn-secondary" data-signout>Выйти</button>`;
  host.prepend(box);
  box.querySelector('[data-signout]').onclick = () => supabase.auth.signOut();
}

modal.addEventListener('click', event => {
  if (event.target === modal || event.target.closest('[data-action="close-modal"]')) closeModal();
});
document.getElementById('menuButton').onclick = () => document.getElementById('sidebar').classList.toggle('open');
document.querySelector('[data-action="backup"]').onclick = async () => {
  await loadData();
  const blob = new Blob([JSON.stringify({ project, data, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `agitbrigada-backup-${today()}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
};
document.querySelector('[data-action="quick-add"]').onclick = () => {
  location.hash = RIGHTS.event ? 'calendar' : RIGHTS.media ? 'media' : 'documents';
};
window.addEventListener('hashchange', () => {
  currentPage = location.hash.slice(1) || 'dashboard';
  renderPage().catch(showFatal);
});

try {
  renderNav();
  await loadProject();
  renderUserMenu();
  await renderPage();
} catch (error) {
  showFatal(error);
}

const channel = supabase.channel(`agitbrigada-${projectId}`)
  .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
    const changedProjectId = payload.new?.project_id || payload.old?.project_id;
    if (changedProjectId === projectId) {
      clearTimeout(window.__agitReloadTimer);
      window.__agitReloadTimer = setTimeout(() => renderPage().catch(showFatal), 700);
    }
  })
  .subscribe();

window.addEventListener('beforeunload', () => supabase.removeChannel(channel));
