import './timeline-shared.css';

const { supabase, projectCode } = window.PUBLIC_AGIT || {};
const publicCalendar = document.getElementById('calendar');
const legacyCards = publicCalendar?.querySelector('.public-calendar-list');

const STATUS_LABELS = {
  planned: 'План',
  preparing: 'Подготовка',
  in_progress: 'В работе',
  completed: 'Завершено',
  cancelled: 'Отменено',
};

const STATUS_PROGRESS = {
  planned: 0,
  preparing: 35,
  in_progress: 65,
  completed: 100,
  cancelled: 0,
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const formatDate = value => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('ru-RU')
  : '—';

const number = value => Number(value || 0).toLocaleString('ru-RU');
const percent = (actual, plan) => Number(plan) > 0
  ? Math.min(100, Math.round(Number(actual || 0) / Number(plan) * 100))
  : 0;
const stageNumber = code => Number(String(code || '').replace(/\D/g, '')) || 0;
const stageLabel = code => `Этап ${stageNumber(code)}`;

function statusClass(status) {
  return ['completed', 'preparing', 'in_progress'].includes(status) ? status : '';
}

function uniqueOwners(event) {
  const owners = (event.activities || [])
    .map(item => item.lead_name)
    .filter(Boolean)
    .flatMap(value => String(value).split(','))
    .map(value => value.trim())
    .filter(Boolean);
  return [...new Set(owners)].join(', ') || 'По карточке этапа';
}

function stageDates(event) {
  const activities = event.activities || [];
  const starts = activities.map(item => item.activity_date).filter(Boolean).sort();
  const ends = activities.map(item => item.end_date || item.activity_date).filter(Boolean).sort();
  return {
    start: starts[0] || event.due_date,
    end: ends.at(-1) || event.due_date,
  };
}

function installStyles() {
  if (document.getElementById('publicSnapshotStyles')) return;
  const style = document.createElement('style');
  style.id = 'publicSnapshotStyles';
  style.textContent = `
    .public-progress-section{background:linear-gradient(180deg,#f7efe5,#fffaf4)}
    .public-progress-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:20px}
    .public-progress-head h2{margin:5px 0 0;color:#321f21;font-family:Georgia,"Times New Roman",serif;font-size:34px}
    .public-progress-head p{margin:8px 0 0;color:#796862;line-height:1.55}
    .public-progress-stamp{padding:9px 12px;border:1px solid #dbc9b7;border-radius:999px;background:#fffaf4;color:#745f58;font-size:10px;font-weight:850}
    .public-progress-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:13px}
    .public-progress-card{padding:19px;border:1px solid #dfd1c2;border-radius:19px;background:#fffdf9;box-shadow:0 8px 24px rgba(60,38,33,.05)}
    .public-progress-card strong{display:block;color:#342123;font-family:Georgia,"Times New Roman",serif;font-size:29px}
    .public-progress-card span{display:block;margin-top:4px;color:#76645f;font-size:10px;line-height:1.4}
    .public-progress-bar{height:7px;margin-top:13px;border-radius:999px;background:#eadfd3;overflow:hidden}
    .public-progress-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#741b28,#b03a48)}
    .public-progress-overall{display:grid;grid-template-columns:auto minmax(180px,1fr) auto;gap:12px;align-items:center;margin-top:14px;padding:15px 17px;border:1px solid #dfd0c0;border-radius:16px;background:#fffdf9}
    .public-progress-overall strong{color:#3b2829;font-size:12px}
    .public-progress-overall span{color:#741b28;font-family:Georgia,"Times New Roman",serif;font-size:23px;font-weight:700}
    .public-progress-overall .public-progress-bar{margin:0}
    @media(max-width:1100px){.public-progress-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:760px){.public-progress-head{align-items:flex-start;flex-direction:column}.public-progress-grid{grid-template-columns:1fr 1fr}.public-progress-overall{grid-template-columns:1fr}}
    @media(max-width:480px){.public-progress-grid{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

async function loadPublicData() {
  const result = await supabase.rpc('get_public_project_snapshot', {
    p_project_code: projectCode,
  });
  if (result.error) throw result.error;
  return result.data || null;
}

function renderProgress(payload) {
  const kpis = payload.kpis || {};
  const target = document.querySelector('.public-section-alt[aria-label="Плановые показатели проекта"]');
  if (!target) return;

  document.getElementById('publicProgressSnapshot')?.remove();

  const values = [
    ['Мероприятия', kpis.actual_events, kpis.plan_events],
    ['Участники 14–35', kpis.actual_unique_participants, kpis.plan_unique_participants],
    ['Повторные участия', kpis.actual_repeat_participants, kpis.plan_repeat_participants],
    ['Публикации', kpis.actual_publications, kpis.plan_publications],
    ['Просмотры', kpis.actual_views, kpis.plan_views],
  ];
  const overall = Math.round(values.reduce((sum, item) => sum + percent(item[1], item[2]), 0) / values.length);

  const section = document.createElement('section');
  section.id = 'publicProgressSnapshot';
  section.className = 'public-section public-progress-section';
  section.innerHTML = `
    <div class="public-container">
      <div class="public-progress-head">
        <div><div class="eyebrow">Ход реализации</div><h2>Актуальные результаты проекта</h2><p>Показатели опубликованы из закрытого командного штаба.</p></div>
        <div class="public-progress-stamp">Обновлено: ${new Date(payload.published_at).toLocaleString('ru-RU')}</div>
      </div>
      <div class="public-progress-grid">
        ${values.map(item => `<article class="public-progress-card"><strong>${number(item[1])} / ${number(item[2])}</strong><span>${esc(item[0])}</span><div class="public-progress-bar"><i style="width:${percent(item[1], item[2])}%"></i></div></article>`).join('')}
      </div>
      <div class="public-progress-overall"><strong>Общий ориентировочный прогресс</strong><div class="public-progress-bar"><i style="width:${overall}%"></i></div><span>${overall}%</span></div>
    </div>`;
  target.insertAdjacentElement('afterend', section);
}

function createTimelineRows(events, startDate, endDate) {
  const totalMs = endDate - startDate || 1;
  const datePos = value => Math.max(0, Math.min(100,
    ((new Date(`${String(value).slice(0, 10)}T00:00:00`) - startDate) / totalMs) * 100,
  ));
  const dateWidth = (start, end) => Math.max(1.2, datePos(end) - datePos(start));

  return events.map(event => {
    const dates = stageDates(event);
    const status = event.status || 'planned';
    const children = (event.activities || []).map(activity => `
      <div class="timeline-row child" data-public-child="${event.id}" hidden>
        <div class="timeline-cell task"><span>${esc(activity.title)}</span></div>
        <div class="timeline-cell timeline-owner">${esc(activity.lead_name || 'Не назначен')}</div>
        <div class="timeline-cell timeline-status"><span class="timeline-status-badge ${statusClass(activity.status)}">${esc(STATUS_LABELS[activity.status] || activity.status || 'План')}</span></div>
        <div class="timeline-cell timeline-progress">${STATUS_PROGRESS[activity.status] ?? 0}%</div>
        <div class="timeline-cell timeline-metric">${number(activity.plan_unique_participants)} чел. · ${number(activity.plan_publications)} пуб.</div>
        <div class="timeline-track"><span class="timeline-milestone" style="left:${datePos(activity.activity_date)}%"></span></div>
      </div>`).join('');

    return `
      <div class="timeline-row group">
        <div class="timeline-cell task"><button class="timeline-toggle" data-public-toggle="${event.id}">⌄</button><span class="timeline-code">${stageLabel(event.code)}</span><span>${esc(event.name)}</span></div>
        <div class="timeline-cell timeline-owner">${esc(uniqueOwners(event))}</div>
        <div class="timeline-cell timeline-status"><span class="timeline-status-badge ${statusClass(status)}">${esc(STATUS_LABELS[status] || status)}</span></div>
        <div class="timeline-cell timeline-progress">${STATUS_PROGRESS[status] ?? 0}%</div>
        <div class="timeline-cell timeline-metric">${number(event.actual_unique_participants)}/${number(event.plan_unique_participants)} чел. · ${number(event.actual_publications)}/${number(event.plan_publications)} пуб.</div>
        <div class="timeline-track"><span class="timeline-bar ${statusClass(status)}" style="left:${datePos(dates.start)}%;width:${dateWidth(dates.start, dates.end)}%"><span class="timeline-bar-label">${formatDate(dates.start)} — ${formatDate(dates.end)}</span></span></div>
      </div>${children}`;
  }).join('');
}

function createStageCards(events) {
  return events.map(event => {
    const dates = stageDates(event);
    return `<article class="public-calendar-card">
      <div class="public-calendar-deadline"><span class="public-calendar-number">${stageNumber(event.code)}</span><strong>${formatDate(event.due_date)}</strong><span>крайний срок</span></div>
      <div class="public-calendar-content"><h3>${esc(event.name)}</h3><p>${esc(event.description || '')}</p>
        <div class="public-calendar-tags"><span class="public-calendar-tag public-calendar-tag-accent">${esc(STATUS_LABELS[event.status] || event.status || 'План')}</span><span class="public-calendar-tag">${number(event.actual_unique_participants)} / ${number(event.plan_unique_participants)} уникальных</span><span class="public-calendar-tag">${number(event.actual_repeat_participants)} / ${number(event.plan_repeat_participants)} повторных</span><span class="public-calendar-tag">${number(event.actual_publications)} / ${number(event.plan_publications)} публикаций</span><span class="public-calendar-tag">${number(event.actual_views)} / ${number(event.plan_views)} просмотров</span></div>
        ${(event.activities || []).length ? `<div class="public-subevents">${event.activities.map(activity => `<div class="public-subevent"><strong>${formatDate(activity.activity_date)}</strong><span>${esc(activity.title)}</span></div>`).join('')}</div>` : ''}
        <div class="public-responsible"><strong>Ответственные:</strong> ${esc(uniqueOwners(event))}</div><div class="public-responsible"><strong>Период этапа:</strong> ${formatDate(dates.start)} — ${formatDate(dates.end)}</div>
      </div>
    </article>`;
  }).join('');
}

function createListRows(events) {
  return events.map(event => {
    const dates = stageDates(event);
    return `<tr><td><strong>${stageLabel(event.code)}</strong><br>${esc(event.name)}</td><td>${formatDate(dates.start)} — ${formatDate(dates.end)}</td><td>${esc(uniqueOwners(event))}</td><td>${esc(STATUS_LABELS[event.status] || event.status || 'План')}</td><td>${number(event.actual_unique_participants)} / ${number(event.plan_unique_participants)}</td><td>${number(event.actual_publications)} / ${number(event.plan_publications)}</td><td>${number(event.actual_views)} / ${number(event.plan_views)}</td></tr>`;
  }).join('');
}

function renderPublicTimeline(payload) {
  const project = payload.project || {};
  const events = payload.events || [];
  const kpis = payload.kpis || {};
  if (!events.length) return;

  const activityCount = events.reduce((total, event) => total + (event.activities || []).length, 0);
  const startDate = new Date(`${project.start_date || '2026-08-01'}T00:00:00`);
  const endDate = new Date(`${project.end_date || '2027-06-30'}T23:59:59`);
  const months = ['Авг', 'Сен', 'Окт', 'Ноя', 'Дек', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];

  document.getElementById('publicTimelineHub')?.remove();
  if (legacyCards) legacyCards.style.display = 'none';

  const hub = document.createElement('div');
  hub.id = 'publicTimelineHub';
  hub.className = 'timeline-shell';
  hub.innerHTML = `
    <div class="timeline-toolbar"><div class="timeline-tabs"><button class="timeline-tab active" data-public-view="timeline">Таймлайн</button><button class="timeline-tab" data-public-view="stages">Этапы</button><button class="timeline-tab" data-public-view="list">Список</button></div><div class="timeline-actions"><span class="timeline-public-note" style="border:0;padding:8px 10px">Опубликованные данные · только просмотр</span></div></div>
    <div class="timeline-summary"><div class="timeline-summary-item"><strong>${events.length}</strong><span>официальных этапов</span></div><div class="timeline-summary-item"><strong>${activityCount}</strong><span>рабочих активностей</span></div><div class="timeline-summary-item"><strong>${number(kpis.actual_unique_participants)} / ${number(kpis.plan_unique_participants)}</strong><span>уникальных участников</span></div><div class="timeline-summary-item"><strong>${number(kpis.actual_repeat_participants)} / ${number(kpis.plan_repeat_participants)}</strong><span>повторных участий</span></div><div class="timeline-summary-item"><strong>${number(kpis.actual_publications)} / ${number(kpis.plan_publications)}</strong><span>публикаций</span></div><div class="timeline-summary-item"><strong>${number(kpis.actual_views)} / ${number(kpis.plan_views)}</strong><span>просмотров</span></div></div>
    <div data-public-panel="timeline"><div class="timeline-viewport"><div class="timeline-board"><div class="timeline-head"><div>Этап / задача</div><div>Ответственный</div><div>Статус</div><div>Прогресс</div><div>Показатели</div><div class="timeline-months">${months.map(month => `<span>${month}</span>`).join('')}</div></div><div class="timeline-rows">${createTimelineRows(events, startDate, endDate)}</div></div></div><div class="timeline-public-note">Снимок открытой части сформирован ${new Date(payload.published_at).toLocaleString('ru-RU')}.</div></div>
    <div class="timeline-list-view" data-public-panel="stages"><div class="public-calendar-list">${createStageCards(events)}</div></div>
    <div class="timeline-list-view" data-public-panel="list"><table class="timeline-list-table"><thead><tr><th>Этап</th><th>Период</th><th>Ответственные</th><th>Статус</th><th>Участники</th><th>Публикации</th><th>Просмотры</th></tr></thead><tbody>${createListRows(events)}</tbody></table></div>`;

  legacyCards?.parentNode.insertBefore(hub, legacyCards);

  hub.querySelectorAll('[data-public-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const rows = [...hub.querySelectorAll(`[data-public-child="${button.dataset.publicToggle}"]`)];
      const show = rows.some(row => row.hidden);
      rows.forEach(row => { row.hidden = !show; });
      button.textContent = show ? '⌃' : '⌄';
    });
  });

  hub.querySelectorAll('[data-public-view]').forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.publicView;
      hub.querySelectorAll('[data-public-view]').forEach(item => item.classList.toggle('active', item === button));
      hub.querySelectorAll('[data-public-panel]').forEach(panel => {
        panel.style.display = panel.dataset.publicPanel === view ? (view === 'timeline' ? '' : 'block') : 'none';
      });
    });
  });
}

async function start() {
  if (!supabase || !projectCode || !publicCalendar || !legacyCards) return;
  try {
    const payload = await loadPublicData();
    if (!payload?.project) return;
    installStyles();
    renderProgress(payload);
    renderPublicTimeline(payload);
  } catch (error) {
    console.warn('[public-snapshot]', error);
  }
}

await start();

let refreshTimer = null;
const scheduleRefresh = () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(start, 350);
};

window.addEventListener('focus', scheduleRefresh);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') scheduleRefresh();
});
