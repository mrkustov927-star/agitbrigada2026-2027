import './app-v5.js';
import './team-access.js';
import './page-heading-fix.css';
import './report-export.js';
import './dashboard-assistant.js';

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

function installMobileNavigation() {
  const sidebar = document.getElementById('sidebar');
  const menuButton = document.getElementById('menuButton');
  const nav = document.getElementById('nav');
  const shell = document.querySelector('.app-shell');
  if (!sidebar || !menuButton || !nav || !shell) return;

  const mobileQuery = window.matchMedia('(max-width: 820px)');

  let closeButton = sidebar.querySelector('.mobile-menu-close');
  if (!closeButton) {
    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'mobile-menu-close';
    closeButton.setAttribute('aria-label', 'Закрыть меню');
    closeButton.textContent = '×';
    sidebar.prepend(closeButton);
  }

  let backdrop = document.getElementById('mobileSidebarBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.id = 'mobileSidebarBackdrop';
    backdrop.className = 'mobile-sidebar-backdrop';
    backdrop.setAttribute('aria-label', 'Закрыть меню');
    shell.append(backdrop);
  }

  menuButton.setAttribute('aria-controls', 'sidebar');
  menuButton.setAttribute('aria-expanded', 'false');

  const setMenuOpen = open => {
    const shouldOpen = Boolean(open && mobileQuery.matches);
    sidebar.classList.toggle('open', shouldOpen);
    backdrop.classList.toggle('visible', shouldOpen);
    document.body.classList.toggle('mobile-menu-open', shouldOpen);
    menuButton.setAttribute('aria-expanded', String(shouldOpen));
    menuButton.setAttribute('aria-label', shouldOpen ? 'Закрыть меню' : 'Открыть меню');
  };

  menuButton.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(!sidebar.classList.contains('open'));
  };

  closeButton.onclick = () => setMenuOpen(false);
  backdrop.onclick = () => setMenuOpen(false);

  nav.addEventListener('click', event => {
    if (event.target.closest('[data-page]')) setMenuOpen(false);
  });

  window.addEventListener('hashchange', () => setMenuOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMenuOpen(false);
  });

  const handleViewportChange = event => {
    if (!event.matches) setMenuOpen(false);
  };

  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', handleViewportChange);
  } else {
    mobileQuery.addListener(handleViewportChange);
  }
}

function createPasswordModal() {
  let backdrop = document.getElementById('changePasswordBackdrop');
  if (backdrop) return backdrop;

  backdrop = document.createElement('div');
  backdrop.id = 'changePasswordBackdrop';
  backdrop.className = 'modal-backdrop hidden';
  backdrop.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="changePasswordTitle" style="width:min(520px,100%)">
      <div class="modal-head">
        <div>
          <div class="eyebrow">Безопасность аккаунта</div>
          <h2 id="changePasswordTitle">Сменить пароль</h2>
        </div>
        <button class="icon-button" type="button" data-password-close aria-label="Закрыть">×</button>
      </div>
      <div class="modal-body">
        <form id="changePasswordForm" class="form-grid" style="grid-template-columns:1fr">
          <div class="form-group full">
            <label>Текущий пароль</label>
            <input name="current_password" type="password" autocomplete="current-password" minlength="8" required>
          </div>
          <div class="form-group full">
            <label>Новый пароль</label>
            <input name="new_password" type="password" autocomplete="new-password" minlength="8" required>
          </div>
          <div class="form-group full">
            <label>Повторите новый пароль</label>
            <input name="confirm_password" type="password" autocomplete="new-password" minlength="8" required>
          </div>
        </form>
        <div id="changePasswordMessage" class="auth-message" style="margin-top:12px"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" type="button" data-password-close>Отмена</button>
        <button class="btn btn-primary" type="submit" form="changePasswordForm" id="changePasswordSubmit">Сохранить новый пароль</button>
      </div>
    </section>`;
  document.body.append(backdrop);

  const close = () => {
    backdrop.classList.add('hidden');
    backdrop.querySelector('#changePasswordForm')?.reset();
    const message = backdrop.querySelector('#changePasswordMessage');
    if (message) {
      message.textContent = '';
      message.className = 'auth-message';
    }
  };

  backdrop.querySelectorAll('[data-password-close]').forEach(button => button.addEventListener('click', close));
  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close();
  });

  backdrop.querySelector('#changePasswordForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const currentPassword = String(fd.get('current_password') || '');
    const newPassword = String(fd.get('new_password') || '');
    const confirmPassword = String(fd.get('confirm_password') || '');
    const message = backdrop.querySelector('#changePasswordMessage');
    const submitButton = backdrop.querySelector('#changePasswordSubmit');

    const setMessage = (text, type = '') => {
      message.textContent = text;
      message.className = `auth-message ${type}`.trim();
    };

    if (newPassword.length < 8) {
      setMessage('Новый пароль должен содержать не менее 8 символов.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Новые пароли не совпадают.', 'error');
      return;
    }
    if (currentPassword === newPassword) {
      setMessage('Новый пароль должен отличаться от текущего.', 'error');
      return;
    }

    submitButton.disabled = true;
    setMessage('Проверяем текущий пароль…');

    try {
      const email = snapshotContext?.session?.user?.email;
      if (!email) throw new Error('Не удалось определить e-mail текущего пользователя.');

      const verify = await snapshotContext.supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verify.error) throw new Error('Текущий пароль указан неверно.');

      setMessage('Сохраняем новый пароль…');
      const update = await snapshotContext.supabase.auth.updateUser({ password: newPassword });
      if (update.error) throw update.error;

      setMessage('Пароль успешно изменён.', 'success');
      snapshotToast('Пароль аккаунта успешно изменён.');
      form.reset();
      setTimeout(close, 1200);
    } catch (error) {
      const text = String(error.message || 'Не удалось изменить пароль.');
      setMessage(text, 'error');
    } finally {
      submitButton.disabled = false;
    }
  });

  return backdrop;
}

function installPasswordChange() {
  if (!snapshotContext?.supabase || !snapshotContext?.session) return;
  const userMenu = document.querySelector('.user-menu');
  if (!userMenu || document.getElementById('changePasswordButton')) return;

  const signOut = userMenu.querySelector('#signOut');
  const button = document.createElement('button');
  button.id = 'changePasswordButton';
  button.type = 'button';
  button.className = 'btn btn-secondary';
  button.textContent = 'Сменить пароль';
  button.addEventListener('click', () => {
    const backdrop = createPasswordModal();
    backdrop.classList.remove('hidden');
    setTimeout(() => backdrop.querySelector('input[name="current_password"]')?.focus(), 0);
  });

  if (signOut) userMenu.insertBefore(button, signOut);
  else userMenu.append(button);
}

setTimeout(installSnapshotPublisher, 250);
setTimeout(installMobileNavigation, 260);
setTimeout(installPasswordChange, 320);
