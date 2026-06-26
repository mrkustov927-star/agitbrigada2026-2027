import './app-v5.js';
import './team-access.js';
import './page-heading-fix.css';

const snapshotContext = window.AGIT;

function snapshotToast(text, type = 'success') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = text;
  stack.append(item);
  setTimeout(() => item.remove(), 4500);
}

function formatPublishedAt(value) {
  if (!value) return 'Открытая часть ещё не опубликована';
  return `Опубликовано ${new Date(value).toLocaleString('ru-RU')}`;
}

async function installSnapshotPublisher() {
  if (!snapshotContext || !['owner', 'manager'].includes(snapshotContext.role)) return;

  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.getElementById('publishPublicSnapshot')) return;

  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '9px';
  wrap.style.flexWrap = 'wrap';

  const state = document.createElement('span');
  state.style.fontSize = '10px';
  state.style.color = '#7b6a64';
  state.textContent = 'Публичная версия не проверена';

  const button = document.createElement('button');
  button.id = 'publishPublicSnapshot';
  button.type = 'button';
  button.className = 'btn btn-secondary';
  button.textContent = 'Опубликовать на сайте';
  button.style.borderColor = '#c69742';
  button.style.background = '#f1dfba';
  button.style.color = '#5a3528';
  button.style.fontWeight = '900';

  wrap.append(state, button);
  const quickAdd = actions.querySelector('[data-action="quick-add"]');
  actions.insertBefore(wrap, quickAdd || null);

  try {
    const current = await snapshotContext.supabase.rpc('get_public_project_snapshot', {
      p_project_code: snapshotContext.projectCode,
    });
    if (!current.error && current.data?.published_at) {
      state.textContent = formatPublishedAt(current.data.published_at);
    }
  } catch (error) {
    console.warn('[public-snapshot-status]', error);
  }

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Публикуем…';
    state.textContent = 'Формируем безопасную открытую версию…';

    try {
      const result = await snapshotContext.supabase.rpc('publish_project_snapshot', {
        p_project_id: snapshotContext.projectId,
      });
      if (result.error) throw result.error;
      state.textContent = formatPublishedAt(result.data?.published_at || new Date().toISOString());
      snapshotToast('Открытая часть сайта обновлена.');
    } catch (error) {
      const text = String(error.message || 'Не удалось опубликовать открытую часть');
      state.textContent = text.includes('function') || text.includes('schema cache')
        ? 'Сначала выполните файл supabase_public_snapshot.sql'
        : 'Ошибка публикации';
      snapshotToast(text, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Опубликовать на сайте';
    }
  });
}

setTimeout(installSnapshotPublisher, 250);
