import { createClient } from '@supabase/supabase-js';

const PROJECT_CODE = import.meta.env.VITE_PROJECT_CODE || 'AGITBRIGADA-2026-2027';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uqzclxuziytjmkscagey.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_LqEQm1N_I7KhXe3SnsvGRw_TA3z4jxJ';
const AUTH_REDIRECT_URL = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}`;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const authScreen = document.getElementById('authScreen');
const appShell = document.querySelector('.app-shell');
const form = document.getElementById('authForm');
const msg = document.getElementById('authMessage');
const submit = document.getElementById('authSubmit');
const toggle = document.getElementById('authModeButton');
let mode = 'signin';

function message(text='', type='') { msg.textContent = text; msg.className = `auth-message ${type}`.trim(); }
function setMode(next) {
  mode = next;
  const signup = mode === 'signup';
  document.getElementById('authTitle').textContent = signup ? 'Создать учётную запись' : 'Войти в штаб проекта';
  document.getElementById('authSubtitle').textContent = signup ? 'Первый зарегистрированный пользователь станет руководителем проекта. Остальных добавляет руководитель.' : 'Используйте рабочую электронную почту и пароль.';
  document.getElementById('authFullName').classList.toggle('hidden', !signup);
  submit.textContent = signup ? 'Зарегистрироваться' : 'Войти';
  toggle.textContent = signup ? 'У меня уже есть аккаунт' : 'Создать аккаунт';
  message();
}
function showAuth() { appShell.classList.add('hidden'); authScreen.classList.remove('hidden'); }
function showApp() { authScreen.classList.add('hidden'); appShell.classList.remove('hidden'); }

async function resolveMembership(user) {
  let { data, error } = await supabase.from('project_members')
    .select('project_id,role,status,projects!inner(id,code,name)')
    .eq('user_id', user.id).eq('status','active').eq('projects.code', PROJECT_CODE).maybeSingle();
  if (error) throw error;
  if (!data) {
    const claim = await supabase.rpc('claim_project_owner', { p_project_code: PROJECT_CODE });
    if (!claim.error) {
      ({ data, error } = await supabase.from('project_members')
        .select('project_id,role,status,projects!inner(id,code,name)')
        .eq('user_id', user.id).eq('status','active').eq('projects.code', PROJECT_CODE).maybeSingle());
      if (error) throw error;
    }
  }
  return data;
}

async function openApp(session) {
  message('Проверяем доступ к проекту…');
  const membership = await resolveMembership(session.user);
  if (!membership) {
    showAuth();
    message('Аккаунт создан, но доступ к проекту ещё не назначен. Передайте e-mail руководителю проекта.', 'warning');
    return;
  }
  window.AGIT = { supabase, session, membership, projectId: membership.project_id, role: membership.role, projectCode: PROJECT_CODE };
  showApp();
  await import('./app-v2.js');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fd = new FormData(form);
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');
  const fullName = String(fd.get('full_name') || '').trim();
  if (!email || password.length < 8) return message('Укажите e-mail и пароль не короче 8 символов.', 'error');
  submit.disabled = true;
  message(mode === 'signup' ? 'Создаём аккаунт…' : 'Выполняем вход…');
  try {
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
      } else await openApp(data.session);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await openApp(data.session);
    }
  } catch (error) { message(error.message || 'Не удалось выполнить операцию.', 'error'); }
  finally { submit.disabled = false; }
});

toggle.addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));
supabase.auth.onAuthStateChange((event, session) => { if (event === 'SIGNED_OUT') location.reload(); if (event === 'SIGNED_IN' && session && !window.AGIT) openApp(session).catch(e => message(e.message,'error')); });

setMode('signin');
const { data: { session } } = await supabase.auth.getSession();
if (session) openApp(session).catch(e => { showAuth(); message(`Не удалось открыть проект: ${e.message}`, 'error'); }); else showAuth();
