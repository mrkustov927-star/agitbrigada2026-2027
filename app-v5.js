import './app-v4.js';
import './closed-timeline.js';
import './timeline-contrast-fix.css';

const accountContext = window.AGIT;

function installAccountPasswordButton() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || !accountContext?.supabase) return false;
  if (document.getElementById('accountPasswordButton')) return true;

  const button = document.createElement('button');
  button.id = 'accountPasswordButton';
  button.type = 'button';
  button.className = 'btn btn-secondary';
  button.textContent = 'Сменить пароль';
  button.style.whiteSpace = 'nowrap';

  const syncState = actions.querySelector('.sync-state');
  if (syncState) actions.insertBefore(button, syncState);
  else actions.prepend(button);

  button.addEventListener('click', () => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true" style="width:min(520px,100%)">
        <div class="modal-head">
          <div><div class="eyebrow">Безопасность аккаунта</div><h2>Сменить пароль</h2></div>
          <button class="icon-button" type="button" data-close-password>×</button>
        </div>
        <div class="modal-body">
          <form id="inlinePasswordForm" class="form-grid" style="grid-template-columns:1fr">
            <div class="form-group full"><label>Текущий пароль</label><input name="current_password" type="password" minlength="8" required autocomplete="current-password"></div>
            <div class="form-group full"><label>Новый пароль</label><input name="new_password" type="password" minlength="8" required autocomplete="new-password"></div>
            <div class="form-group full"><label>Повторите новый пароль</label><input name="confirm_password" type="password" minlength="8" required autocomplete="new-password"></div>
          </form>
          <div id="inlinePasswordMessage" class="auth-message" style="margin-top:12px"></div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary" type="button" data-close-password>Отмена</button>
          <button class="btn btn-primary" type="submit" form="inlinePasswordForm" id="inlinePasswordSubmit">Сохранить новый пароль</button>
        </div>
      </section>`;
    document.body.append(backdrop);

    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close-password]').forEach(el => el.addEventListener('click', close));
    backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });

    const form = backdrop.querySelector('#inlinePasswordForm');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const fd = new FormData(form);
      const currentPassword = String(fd.get('current_password') || '');
      const newPassword = String(fd.get('new_password') || '');
      const confirmPassword = String(fd.get('confirm_password') || '');
      const message = backdrop.querySelector('#inlinePasswordMessage');
      const submit = backdrop.querySelector('#inlinePasswordSubmit');
      const setMessage = (text, type = '') => {
        message.textContent = text;
        message.className = `auth-message ${type}`.trim();
      };

      if (newPassword.length < 8) return setMessage('Новый пароль должен содержать не менее 8 символов.', 'error');
      if (newPassword !== confirmPassword) return setMessage('Новые пароли не совпадают.', 'error');
      if (currentPassword === newPassword) return setMessage('Новый пароль должен отличаться от текущего.', 'error');

      submit.disabled = true;
      setMessage('Проверяем текущий пароль…');

      try {
        const { data: sessionData, error: sessionError } = await accountContext.supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const email = sessionData?.session?.user?.email || accountContext?.session?.user?.email;
        if (!email) throw new Error('Не удалось определить e-mail текущего пользователя.');

        const verify = await accountContext.supabase.auth.signInWithPassword({ email, password: currentPassword });
        if (verify.error) throw new Error('Текущий пароль указан неверно.');

        setMessage('Сохраняем новый пароль…');
        const update = await accountContext.supabase.auth.updateUser({ password: newPassword });
        if (update.error) throw update.error;

        setMessage('Пароль успешно изменён.', 'success');
        setTimeout(close, 1200);
      } catch (error) {
        setMessage(String(error.message || 'Не удалось изменить пароль.'), 'error');
      } finally {
        submit.disabled = false;
      }
    });
  });

  return true;
}

let passwordButtonAttempts = 0;
const passwordButtonTimer = setInterval(() => {
  passwordButtonAttempts += 1;
  if (installAccountPasswordButton() || passwordButtonAttempts >= 40) clearInterval(passwordButtonTimer);
}, 250);
installAccountPasswordButton();
