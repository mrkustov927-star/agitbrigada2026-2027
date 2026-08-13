import { createClient } from '@supabase/supabase-js';
import './public-timeline.js';
import './timeline-contrast-fix.css';

const PROJECT_CODE = import.meta.env.VITE_PROJECT_CODE || 'AGITBRIGADA-2026-2027';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uqzclxuziytjmkscagey.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_LqEQm1N_I7KhXe3SnsvGRw_TA3z4jxJ';
const AUTH_REDIRECT_URL = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}`;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

window.PUBLIC_AGIT = {
  supabase,
  projectCode: PROJECT_CODE,
};
await import('./public-timeline-live.js');

const publicHome = document.getElementById('publicHome');
const authScreen = document.getElementById('authScreen');
const appShell = document.querySelector('.app-shell');
const form = document.getElementById('authForm');
const msg = document.getElementById('authMessage');
const submit = document.getElementById('authSubmit');
const toggle = document.getElementById('authModeButton');
const authBackButton = document.getElementById('authBackButton');
const emailInput = form.querySelector('input[name="email"]');
const passwordInput = form.querySelector('input[name="password"]');
const emailLabel = emailInput.closest('label');
const passwordLabel = passwordInput.closest('label');
const fullNameLabel = document.getElementById('authFullName');

const forgotButton = document.createElement('button');
forgotButton.type = 'button';
forgotButton.id = 'authForgotButton';
forgotButton.className = 'btn btn-ghost btn-block';
forgotButton.textContent = 'Забыли пароль?';
toggle.parentNode.insertBefore(forgotButton, toggle);

const confirmLabel = document.createElement('label');
confirmLabel.id = 'authPasswordConfirm';
confirmLabel.className = 'hidden';
confirmLabel.innerHTML = 'Повторите новый пароль<input name="password_confirm" type="password" autocomplete="new-password" minlength="8" placeholder="Повторите пароль">';
form.insertBefore(confirmLabel, submit);
const confirmInput = confirmLabel.querySelector('input');

let mode = 'signin';
let appOpened = false;
let activeSession = null;
let recoverySession = null;

function message(text = '', type = '') {
  msg.textContent = text;
  msg.className = `auth-message ${type}`.trim();
}

function setMode(next) {
  mode = next;
  const signup = mode === 'signup';
  const forgot = mode === 'forgot';
  const recovery = mode === 'recovery';

  fullNameLabel.classList.toggle('hidden', !signup);
  emailLabel.classList.toggle('hidden', recovery);
  passwordLabel.classList.toggle('hidden', forgot);
  confirmLabel.classList.toggle('hidden', !recovery);

  emailInput.required = !recovery;
  passwordInput.required = !forgot;
  confirmInput.required = recovery;
  passwordInput.autocomplete = recovery ? 'new-password' : 'current-password';

  if (signup) {
    document.getElementById('authTitle').textContent = 'Регистрация участника команды';
    document.getElementById('authSubtitle').textContent = 'Создайте учётную запись. Доступ к данным появится после добавления пользователя руководителем проекта.';
    submit.textContent = 'Зарегистрироваться';
    toggle.textContent = 'У меня уже есть аккаунт';
  } else if (forgot) {
    document.getElementById('authTitle').textContent = 'Восстановить пароль';
    document.getElementById('authSubtitle').textContent = 'Укажите электронную почту. Мы отправим ссылку для создания нового пароля.';
    submit.textContent = 'Отправить ссылку';
    toggle.textContent = 'Вернуться ко входу';
  } else if (recovery) {
    document.getElementById('authTitle').textContent = 'Создать новый пароль';
    document.getElementById('authSubtitle').textContent = 'Ссылка восстановления подтверждена. Введите новый пароль для вашей учётной записи.';
    submit.textContent = 'Сохранить новый пароль';
    toggle.textContent = 'Вернуться ко входу';
  } else {
    document.getElementById('authTitle').textContent = 'Войти в штаб проекта';
    document.getElementById('authSubtitle').textContent = 'Используйте рабочую электронную почту и пароль.';
    submit.textContent = 'Войти';
    toggle.textContent = 'Регистрация участника команды';
  }

  forgotButton.classList.toggle('hidden', mode !== 'signin');
  toggle.classList.toggle('hidden', recovery);

  if (!recovery) {
    confirmInput.value = '';
  }
  message();
}

function updatePublicButtons() {
  document.querySelectorAll('[data-open-login]').forEach(button => {
    if (activeSession && button.classList.contains('public-login-button')) {
      button.textContent = 'Открыть штаб';
    }
  });
}

function showPublic() {
  appShell.classList.add('hidden');
  authScreen.classList.add('hidden');
  publicHome.classList.remove('hidden');
  document.body.style.overflow = '';
  updatePublicButtons();
}

function showAuth() {
  appShell.classList.add('hidden');
  publicHome.classList.add('hidden');
  authScreen.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function showApp() {
  publicHome.classList.add('hidden');
  authScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  document.body.style.overflow = '';
}

function openLogin() {
  if (mode === 'recovery') {
    showAuth();
    return;
  }
  if (activeSession) {
    openApp(activeSession).catch(error => {
      appOpened = false;
      showAuth();
      message(error.message || 'Не удалось открыть проект.', 'error');
    });
    return;
  }
  setMode('signin');
  showAuth();
}

document.querySelectorAll('[data-open-login]').forEach(button => {
  button.addEventListener('click', openLogin);
});

authBackButton?.addEventListener('click', () => {
  if (mode === 'recovery') return;
  setMode('signin');
  showPublic();
});

forgotButton.addEventListener('click', () => {
  setMode('forgot');
  showAuth();
  emailInput.focus();
});

async function resolveMembership(user) {
  let { data, error } = await supabase.from('project_members')
    .select('project_id,role,status,projects!inner(id,code,name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('projects.code', PROJECT_CODE)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const claim = await supabase.rpc('claim_project_owner', { p_project_code: PROJECT_CODE });
    if (!claim.error) {
      ({ data, error } = await supabase.from('project_members')
        .select('project_id,role,status,projects!inner(id,code,name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('projects.code', PROJECT_CODE)
        .maybeSingle());
      if (error) throw error;
    }
  }

  return data;
}

async function openApp(session) {
  if (mode === 'recovery') {
    showAuth();
    return;
  }

  if (appOpened) {
    showApp();
    return;
  }

  activeSession = session;
  showAuth();
  message('Проверяем доступ к проекту…');
  const membership = await resolveMembership(session.user);

  if (!membership) {
    appOpened = false;
    showAuth();
    message('Учётная запись создана, но доступ к проекту ещё не назначен. Передайте e-mail руководителю проекта.', 'warning');
    return;
  }

  appOpened = true;
  window.AGIT = {
    supabase,
    session,
    membership,
    projectId: membership.project_id,
    role: membership.role,
    projectCode: PROJECT_CODE,
  };
  showApp();
  await import('./app-v6.js');
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const fd = new FormData(form);
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');
  const passwordConfirm = String(fd.get('password_confirm') || '');
  const fullName = String(fd.get('full_name') || '').trim();

  if (mode === 'forgot') {
    if (!email) return message('Укажите электронную почту.', 'error');
  } else if (mode === 'recovery') {
    if (password.length < 8) return message('Новый пароль должен содержать не менее 8 символов.', 'error');
    if (password !== passwordConfirm) return message('Пароли не совпадают.', 'error');
  } else if (!email || password.length < 8) {
    return message('Укажите e-mail и пароль не короче 8 символов.', 'error');
  }

  submit.disabled = true;

  try {
    if (mode === 'forgot') {
      message('Отправляем письмо для восстановления…');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: AUTH_REDIRECT_URL,
      });
      if (error) throw error;
      message('Ссылка отправлена. Откройте письмо и нажмите Reset password. После перехода сайт предложит создать новый пароль.', 'success');
      return;
    }

    if (mode === 'recovery') {
      message('Сохраняем новый пароль…');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      recoverySession = null;
      activeSession = null;
      appOpened = false;
      await supabase.auth.signOut();
      window.history.replaceState({}, document.title, AUTH_REDIRECT_URL);
      setMode('signin');
      showAuth();
      emailInput.value = '';
      passwordInput.value = '';
      message('Пароль успешно изменён. Теперь войдите с новым паролем.', 'success');
      return;
    }

    message(mode === 'signup' ? 'Создаём аккаунт…' : 'Выполняем вход…');

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || email },
          emailRedirectTo: AUTH_REDIRECT_URL,
        },
      });
      if (error) throw error;

      if (!data.session) {
        setMode('signin');
        message('Регистрация выполнена. Подтвердите e-mail по ссылке из письма, затем войдите.', 'success');
      } else {
        activeSession = data.session;
        await openApp(data.session);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      activeSession = data.session;
      await openApp(data.session);
    }
  } catch (error) {
    message(error.message || 'Не удалось выполнить операцию.', 'error');
  } finally {
    submit.disabled = false;
  }
});

toggle.addEventListener('click', () => {
  if (mode === 'forgot') setMode('signin');
  else setMode(mode === 'signin' ? 'signup' : 'signin');
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session) {
    recoverySession = session;
    activeSession = session;
    appOpened = false;
    setMode('recovery');
    showAuth();
    setTimeout(() => passwordInput.focus(), 0);
    return;
  }

  if (event === 'SIGNED_OUT') {
    activeSession = null;
    appOpened = false;
    if (mode !== 'recovery') updatePublicButtons();
    return;
  }

  if (event === 'SIGNED_IN' && session) {
    activeSession = session;
    updatePublicButtons();
  }
});

setMode('signin');
const { data: { session } } = await supabase.auth.getSession();
activeSession = session || null;

const recoveryInUrl = /(?:[?#&])type=recovery(?:[&#]|$)/i.test(window.location.href);
if (recoveryInUrl && session) {
  recoverySession = session;
  setMode('recovery');
  showAuth();
} else {
  showPublic();
}
