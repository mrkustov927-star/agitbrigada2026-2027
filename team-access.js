import './team-access.css';

const { supabase, projectId, role, session } = window.AGIT;
const appHost = document.getElementById('app');
const canManage = role === 'owner';
const canInspect = ['owner', 'manager'].includes(role);
let enhanceBusy = false;

const ROLE_META = {
  owner: {
    title: 'Руководитель',
    short: 'Полный доступ',
    description: 'Управление проектом, ролями, календарём, публикациями, бюджетом и отчётностью.',
  },
  manager: {
    title: 'Координатор',
    short: 'Координация',
    description: 'Редактирование календаря, мероприятий, публикаций и содержательной отчётности.',
  },
  organizer: {
    title: 'Организатор',
    short: 'Мероприятия',
    description: 'Редактирование календаря, рабочих активностей, статусов и фактических показателей.',
  },
  media: {
    title: 'Медиа',
    short: 'Публикации',
    description: 'Добавление публикаций, ссылок, просмотров и медиаподтверждений.',
  },
  finance: {
    title: 'Финансы',
    short: 'Бюджет',
    description: 'Работа со сметой, фактическими расходами и финансовыми документами.',
  },
  viewer: {
    title: 'Просмотр',
    short: 'Только чтение',
    description: 'Доступ к закрытой части без возможности изменять данные.',
  },
  mentor: {
    title: 'Наставник',
    short: 'Только чтение',
    description: 'Сейчас имеет режим просмотра без отдельных прав редактирования.',
  },
};

const ASSIGNABLE_ROLES = ['manager', 'organizer', 'media', 'finance', 'viewer'];
const EDITABLE_ROLES = ['manager', 'organizer', 'media', 'finance', 'viewer', 'mentor'];

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const initials = value => String(value || '')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0]?.toUpperCase() || '')
  .join('');

const formatDate = value => value
  ? new Date(value).toLocaleDateString('ru-RU')
  : '—';

function roleOptions(currentRole, allowOwner = false) {
  const values = allowOwner ? ['owner', ...EDITABLE_ROLES] : EDITABLE_ROLES;
  return values.map(value => {
    const meta = ROLE_META[value] || { title: value };
    return `<option value="${value}" ${value === currentRole ? 'selected' : ''}>${esc(meta.title)}</option>`;
  }).join('');
}

async function loadMembers() {
  const membersResult = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at');

  if (membersResult.error) throw membersResult.error;
  const members = membersResult.data || [];
  const userIds = members.map(item => item.user_id).filter(Boolean);
  let profileMap = new Map();

  if (userIds.length) {
    const profilesResult = await supabase
      .from('profiles')
      .select('id,full_name,email')
      .in('id', userIds);

    if (!profilesResult.error) {
      profileMap = new Map((profilesResult.data || []).map(profile => [profile.id, profile]));
    }
  }

  return members.map(member => ({
    ...member,
    profile: profileMap.get(member.user_id) || null,
  }));
}

function showMessage(host, text, type = 'info') {
  const box = host.querySelector('[data-access-message]');
  if (!box) return;
  box.className = `team-access-message show ${type}`;
  box.textContent = text;
}

function clearMessage(host) {
  const box = host.querySelector('[data-access-message]');
  if (!box) return;
  box.className = 'team-access-message';
  box.textContent = '';
}

function roleGuideHtml() {
  const order = ['owner', 'manager', 'organizer', 'media', 'finance', 'viewer'];
  return order.map(value => {
    const meta = ROLE_META[value];
    return `<article class="team-role-card ${value === 'owner' ? 'owner' : ''}">
      <strong>${esc(meta.title)}</strong>
      <span>${esc(meta.description)}</span>
      <em>${esc(meta.short)}</em>
    </article>`;
  }).join('');
}

function memberCard(member) {
  const profile = member.profile || {};
  const email = profile.email || member.invited_email || 'E-mail не указан';
  const name = profile.full_name || email;
  const isOwner = member.role === 'owner';
  const isSelf = member.user_id === session.user.id;
  const blocked = member.status === 'blocked';
  const meta = ROLE_META[member.role] || { title: member.role, description: '' };
  const locked = isOwner || isSelf || !canManage;

  return `<article class="team-member-access-card ${blocked ? 'blocked' : ''}" data-member-card="${member.id}">
    <div class="team-member-identity">
      <div class="team-member-mini-avatar">${esc(initials(name))}</div>
      <div style="min-width:0">
        <strong>${esc(name)}</strong>
        <span>${esc(email)}</span>
        <div class="team-member-meta">
          <span class="team-member-pill ${blocked ? 'blocked' : 'active'}">${blocked ? 'Доступ заблокирован' : 'Активный доступ'}</span>
          ${isSelf ? '<span class="team-member-pill">Вы</span>' : ''}
          <span class="team-member-pill">Добавлен: ${formatDate(member.created_at)}</span>
        </div>
      </div>
    </div>
    <div class="team-member-role-box">
      <label>Роль в системе</label>
      ${canManage && !locked
        ? `<select class="team-member-role-select" data-role-select="${member.id}">${roleOptions(member.role)}</select>`
        : `<div class="team-member-role-text">${esc(meta.title)}</div>`}
      <div class="team-member-role-help">${esc(meta.description)}</div>
    </div>
    <div class="team-member-actions">
      ${canManage && !locked ? `<button class="team-member-action primary" type="button" data-save-role="${member.id}">Сохранить роль</button>` : ''}
      ${canManage && !locked && !blocked ? `<button class="team-member-action danger" type="button" data-block-member="${member.id}">Заблокировать</button>` : ''}
      ${canManage && !locked && blocked ? `<button class="team-member-action restore" type="button" data-restore-member="${member.id}">Восстановить</button>` : ''}
      ${isOwner ? '<span class="team-member-pill">Основной руководитель</span>' : ''}
    </div>
  </article>`;
}

function inviteFormHtml() {
  if (!canManage) return '';
  return `<form class="team-access-invite" data-invite-form>
    <div class="team-access-field">
      <label>Электронная почта пользователя</label>
      <input name="email" type="email" autocomplete="email" placeholder="name@example.ru" required>
    </div>
    <div class="team-access-field">
      <label>Назначить роль</label>
      <select name="role">${ASSIGNABLE_ROLES.map(value => `<option value="${value}">${esc(ROLE_META[value].title)} — ${esc(ROLE_META[value].short)}</option>`).join('')}</select>
    </div>
    <button class="team-access-submit" type="submit">Назначить доступ</button>
    <p class="team-access-hint">Сначала человек должен зарегистрироваться на сайте и подтвердить e-mail. После назначения роли он сможет войти в закрытую часть.</p>
  </form>`;
}

function renderPanel(host, members) {
  const activeCount = members.filter(item => item.status === 'active').length;
  host.className = 'v3-access team-access-manager';
  host.id = 'teamAccessManager';
  host.innerHTML = `
    <div class="team-access-header">
      <div>
        <h3>Доступы и роли</h3>
        <p>Здесь руководитель назначает права после регистрации пользователя, меняет роль и при необходимости блокирует доступ к закрытой части.</p>
      </div>
      <span class="team-access-count">${activeCount} активных пользователей</span>
    </div>
    <div class="team-access-guide">${roleGuideHtml()}</div>
    ${!canManage ? '<div class="team-access-readonly">Вы видите распределение доступов в режиме просмотра. Назначать и изменять роли может только руководитель проекта.</div>' : ''}
    <div class="team-access-message" data-access-message></div>
    ${inviteFormHtml()}
    <div class="team-member-access-list">
      ${members.length ? members.map(memberCard).join('') : '<div class="team-access-empty">Пользователи проекта пока не добавлены.</div>'}
    </div>`;

  bindPanel(host, members);
}

async function reloadPanel(host) {
  const members = await loadMembers();
  renderPanel(host, members);
}

function bindPanel(host, members) {
  const byId = new Map(members.map(member => [member.id, member]));
  const inviteForm = host.querySelector('[data-invite-form]');

  if (inviteForm) {
    inviteForm.addEventListener('submit', async event => {
      event.preventDefault();
      clearMessage(host);
      const button = inviteForm.querySelector('button[type="submit"]');
      const formData = new FormData(inviteForm);
      const email = String(formData.get('email') || '').trim();
      const selectedRole = String(formData.get('role') || 'viewer');

      button.disabled = true;
      button.textContent = 'Назначаем…';
      try {
        const result = await supabase.rpc('add_existing_project_member', {
          p_project_id: projectId,
          p_email: email,
          p_role: selectedRole,
        });
        if (result.error) throw result.error;
        showMessage(host, `Доступ назначен: ${ROLE_META[selectedRole]?.title || selectedRole}.`, 'success');
        await reloadPanel(host);
      } catch (error) {
        const message = String(error.message || 'Не удалось назначить доступ');
        showMessage(host, message.includes('ещё не зарегистрирован')
          ? 'Пользователь с таким e-mail ещё не зарегистрировался или не подтвердил почту.'
          : message, 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Назначить доступ';
      }
    });
  }

  host.querySelectorAll('[data-save-role]').forEach(button => {
    button.addEventListener('click', async () => {
      const memberId = button.dataset.saveRole;
      const member = byId.get(memberId);
      const select = host.querySelector(`[data-role-select="${memberId}"]`);
      if (!member || !select) return;

      button.disabled = true;
      clearMessage(host);
      try {
        const result = await supabase
          .from('project_members')
          .update({ role: select.value })
          .eq('id', memberId)
          .eq('project_id', projectId);
        if (result.error) throw result.error;
        showMessage(host, `Роль пользователя изменена на «${ROLE_META[select.value]?.title || select.value}».`, 'success');
        await reloadPanel(host);
      } catch (error) {
        showMessage(host, error.message || 'Не удалось изменить роль.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  });

  host.querySelectorAll('[data-block-member]').forEach(button => {
    button.addEventListener('click', async () => {
      const memberId = button.dataset.blockMember;
      const member = byId.get(memberId);
      if (!member) return;
      const name = member.profile?.full_name || member.profile?.email || member.invited_email || 'пользователя';
      if (!window.confirm(`Заблокировать доступ для ${name}?`)) return;

      button.disabled = true;
      clearMessage(host);
      try {
        const result = await supabase
          .from('project_members')
          .update({ status: 'blocked' })
          .eq('id', memberId)
          .eq('project_id', projectId);
        if (result.error) throw result.error;
        showMessage(host, 'Доступ пользователя заблокирован.', 'success');
        await reloadPanel(host);
      } catch (error) {
        showMessage(host, error.message || 'Не удалось заблокировать доступ.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  });

  host.querySelectorAll('[data-restore-member]').forEach(button => {
    button.addEventListener('click', async () => {
      const memberId = button.dataset.restoreMember;
      button.disabled = true;
      clearMessage(host);
      try {
        const result = await supabase
          .from('project_members')
          .update({ status: 'active' })
          .eq('id', memberId)
          .eq('project_id', projectId);
        if (result.error) throw result.error;
        showMessage(host, 'Доступ пользователя восстановлен.', 'success');
        await reloadPanel(host);
      } catch (error) {
        showMessage(host, error.message || 'Не удалось восстановить доступ.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  });
}

function replaceHeaderButton() {
  const oldButton = appHost.querySelector('[data-add-member]');
  if (!oldButton || oldButton.dataset.accessEnhanced === 'true') return;
  const button = oldButton.cloneNode(true);
  button.dataset.accessEnhanced = 'true';
  button.textContent = '+ Назначить доступ';
  oldButton.replaceWith(button);
  button.addEventListener('click', () => {
    const form = document.querySelector('[data-invite-form]');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => form.querySelector('input[name="email"]')?.focus(), 350);
    }
  });
}

async function enhanceTeamPage() {
  if (location.hash.slice(1) !== 'team' || !canInspect || enhanceBusy) return;
  const originalAccess = appHost.querySelector('.v3-access');
  if (!originalAccess || originalAccess.id === 'teamAccessManager') return;

  enhanceBusy = true;
  try {
    const members = await loadMembers();
    renderPanel(originalAccess, members);
    replaceHeaderButton();
  } catch (error) {
    console.error('[team-access]', error);
    originalAccess.innerHTML = `<h3>Доступы и роли</h3><div class="team-access-message show error">Не удалось загрузить пользователей: ${esc(error.message || error)}</div>`;
  } finally {
    enhanceBusy = false;
  }
}

const observer = new MutationObserver(() => setTimeout(enhanceTeamPage, 70));
observer.observe(appHost, { childList: true, subtree: false });
window.addEventListener('hashchange', () => setTimeout(enhanceTeamPage, 90));
setTimeout(enhanceTeamPage, 140);
