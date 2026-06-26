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

const stageNumber = code => Number(String(code || '').replace(/\D/g, '')) || 0;
const stageLabel = code => `Этап ${stageNumber(code)}`;

function statusClass(status) {
  if (status === 'completed') return 'completed';
  if (status === 'preparing') return 'preparing';
  if (status === 'in_progress') return 'in_progress';
  return '';
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

function sum(events, field) {
  return events.reduce((total, item) => total + Number(item[field] || 0), 0);
}

async function loadPublicData() {
  const result = await supabase.rpc('get_public_project_timeline', {
    p_project_code: projectCode,
  });
  if (result.error) throw result.error;
  if (!result.data?.project) throw new Error('Публичный календарь проекта не найден');
  return result.data;
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
    const progress = STATUS_PROGRESS[status] ?? 0;
    const children = (event.activities || []).map(activity => `
      <div class="timeline-row child" data-public-child="${event.id}" hidden>
        <div class="timeline-cell task"><span>${esc(activity.title)}</span></div>
        <div class="timeline-cell timeline-owner">${esc(activity.lead_name || 'Не назначен')}</div>
        <div class="timeline-cell timeline-status"><span class="timeline-status-badge ${statusClass(activity.status)}">${esc(STATUS_LABELS[activity.status] || activity.status || 'План')}</span></div>
        <div class="timeline-cell timeline-progress">${STATUS_PROGRESS[activity.status] ?? 0}%</div>
        <div class="timeline-cell timeline-metric">${Number(activity.plan_unique_participants || 0)} чел. · ${Number(activity.plan_publications || 0)} пуб.</div>
        <div class="timeline-track"><span class="timeline-milestone" style="left:${datePos(activity.activity_date)}%"></span></div>
      </div>`).join('');

    return `
      <div class="timeline-row group">
        <div class="timeline-cell task"><button class="timeline-toggle" data-public-toggle="${event.id}">⌄</button><span class="timeline-code">${stageLabel(event.code)}</span><span>${esc(event.name)}</span></div>
        <div class="timeline-cell timeline-owner">${esc(uniqueOwners(event))}</div>
        <div class="timeline-cell timeline-status"><span class="timeline-status-badge ${statusClass(status)}">${esc(STATUS_LABELS[status] || status)}</span></div>
        <div class="timeline-cell timeline-progress">${progress}%</div>
        <div class="timeline-cell timeline-metric">${Number(event.plan_unique_participants || 0)} чел. · ${Number(event.plan_publications || 0)} пуб.</div>
        <div class="timeline-track"><span class="timeline-bar ${statusClass(status)}" style="left:${datePos(dates.start)}%;width:${dateWidth(dates.start, dates.end)}%"><span class="timeline-bar-label">${formatDate(dates.start)} — ${formatDate(dates.end)}</span></span></div>
      </div>${children}`;
  }).join('');
}

function createStageCards(events) {
  return events.map(event => {
    const dates = stageDates(event);
    const owners = uniqueOwners(event);
    return `<article class="public-calendar-card">
      <div class="public-calendar-deadline">
        <span class="public-calendar-number">${stageNumber(event.code)}</span>
        <strong>${formatDate(event.due_date)}</strong>
        <span>крайний срок</span>
      </div>
      <div class="public-calendar-content">
        <h3>${esc(event.name)}</h3>
        <p>${esc(event.description || '')}</p>
        <div class="public-calendar-tags">
          <span class="public-calendar-tag public-calendar-tag-accent">${esc(STATUS_LABELS[event.status] || event.status || 'План')}</span>
          <span class="public-calendar-tag">${Number(event.plan_unique_participants || 0)} уникальных</span>
          <span class="public-calendar-tag">${Number(event.plan_repeat_participants || 0)} повторных</span>
          <span class="public-calendar-tag">${Number(event.plan_publications || 0)} публикаций</span>
          <span class="public-calendar-tag">${Number(event.plan_views || 0).toLocaleString('ru-RU')} просмотров</span>
        </div>
        ${(event.activities || []).length ? `<div class="public-subevents">${event.activities.map(activity => `<div class="public-subevent"><strong>${formatDate(activity.activity_date)}</strong><span>${esc(activity.title)}</span></div>`).join('')}</div>` : ''}
        <div class="public-responsible"><strong>Ответственные:</strong> ${esc(owners)}</div>
        <div class="public-responsible"><strong>Период этапа:</strong> ${formatDate(dates.start)} — ${formatDate(dates.end)}</div>
      </div>
    </article>`;
  }).join('');
}

function createListRows(events) {
  return events.map(event => {
    const dates = stageDates(event);
    return `<tr>
      <td><strong>${stageLabel(event.code)}</strong><br>${esc(event.name)}</td>
      <td>${formatDate(dates.start)} — ${formatDate(dates.end)}</td>
      <td>${esc(uniqueOwners(event))}</td>
      <td>${esc(STATUS_LABELS[event.status] || event.status || 'План')}</td>
      <td>${Number(event.plan_unique_participants || 0)}</td>
      <td>${Number(event.plan_repeat_participants || 0)}</td>
      <td>${Number(event.plan_publications || 0)}</td>
      <td>${Number(event.plan_views || 0).toLocaleString('ru-RU')}</td>
    </tr>`;
  }).join('');
}

function renderPublicTimeline(payload) {
  const project = payload.project;
  const events = payload.events || [];
  const activityCount = events.reduce((total, event) => total + (event.activities || []).length, 0);
  const startDate = new Date(`${project.start_date}T00:00:00`);
  const endDate = new Date(`${project.end_date}T23:59:59`);
  const months = ['Авг', 'Сен', 'Окт', 'Ноя', 'Дек', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];

  document.getElementById('publicTimelineHub')?.remove();
  if (legacyCards) legacyCards.style.display = 'none';

  const hub = document.createElement('div');
  hub.id = 'publicTimelineHub';
  hub.className = 'timeline-shell';
  hub.innerHTML = `
    <div class="timeline-toolbar">
      <div class="timeline-tabs">
        <button class="timeline-tab active" data-public-view="timeline">Таймлайн</button>
        <button class="timeline-tab" data-public-view="stages">Этапы</button>
        <button class="timeline-tab" data-public-view="list">Список</button>
      </div>
      <div class="timeline-actions"><span class="timeline-public-note" style="border:0;padding:8px 10px">Данные из рабочего штаба · только просмотр</span></div>
    </div>
    <div class="timeline-summary">
      <div class="timeline-summary-item"><strong>${events.length}</strong><span>официальных этапов</span></div>
      <div class="timeline-summary-item"><strong>${activityCount}</strong><span>рабочих активностей</span></div>
      <div class="timeline-summary-item"><strong>${Number(project.plan_unique_participants || sum(events, 'plan_unique_participants')).toLocaleString('ru-RU')}</strong><span>уникальных участников</span></div>
      <div class="timeline-summary-item"><strong>${sum(events, 'plan_repeat_participants').toLocaleString('ru-RU')}</strong><span>повторных участий</span></div>
      <div class="timeline-summary-item"><strong>${Number(project.plan_publications || sum(events, 'plan_publications')).toLocaleString('ru-RU')}</strong><span>публикаций</span></div>
      <div class="timeline-summary-item"><strong>${Number(project.plan_views || sum(events, 'plan_views')).toLocaleString('ru-RU')}</strong><span>просмотров</span></div>
    </div>
    <div data-public-panel="timeline">
      <div class="timeline-viewport"><div class="timeline-board">
        <div class="timeline-head"><div>Этап / задача</div><div>Ответственный</div><div>Статус</div><div>Прогресс</div><div>Показатели</div><div class="timeline-months">${months.map(month => `<span>${month}</span>`).join('')}</div></div>
        <div class="timeline-rows">${createTimelineRows(events, startDate, endDate)}</div>
      </div></div>
      <div class="timeline-public-note">Открытая часть автоматически получает безопасные данные из общей базы. После изменения в штабе достаточно обновить страницу.</div>
    </div>
    <div class="timeline-list-view" data-public-panel="stages"><div class="public-calendar-list">${createStageCards(events)}</div></div>
    <div class="timeline-list-view" data-public-panel="list"><table class="timeline-list-table"><thead><tr><th>Этап</th><th>Период</th><th>Ответственные</th><th>Статус</th><th>Уникальные</th><th>Повторные</th><th>Публикации</th><th>Просмотры</th></tr></thead><tbody>${createListRows(events)}</tbody></table></div>`;

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
    renderPublicTimeline(payload);
  } catch (error) {
    console.error('[public-timeline-live]', error);
    await import('./public-timeline.js');
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
setInterval(() => {
  if (document.visibilityState === 'visible') scheduleRefresh();
}, 60000);
