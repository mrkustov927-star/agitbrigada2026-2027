import './dashboard-assistant.css';

const context = window.AGIT;
const app = document.getElementById('app');
const modal = document.getElementById('modalBackdrop');
const modalBody = document.getElementById('modalBody');
const modalFoot = document.getElementById('modalFoot');
const modalTitle = document.getElementById('modalTitle');

const canAddPublication = ['owner', 'manager', 'media'].includes(context?.role);

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  return Promise.resolve();
}

function toast(text, type = 'success') {
  const host = document.getElementById('toastStack');
  if (!host) return;
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = text;
  host.append(item);
  setTimeout(() => item.remove(), 4200);
}

function closeAssistant() {
  modal?.classList.add('hidden');
  if (modalBody) modalBody.innerHTML = '';
  if (modalFoot) modalFoot.innerHTML = '';
}

function checklistText(solution) {
  return [
    solution.title,
    '',
    'Сделать сейчас:',
    ...solution.quick.map((item, index) => `${index + 1}. ${item}`),
    '',
    'Рабочий план:',
    ...solution.plan.map((item, index) => `${index + 1}. ${item}`),
    '',
    'Подтверждения для отчёта:',
    ...solution.evidence.map(item => `• ${item}`),
  ].join('\n');
}

function openSection(page, focusTitle = '', autoAction = '') {
  if (focusTitle) sessionStorage.setItem('agit-assistant-focus', focusTitle);
  if (autoAction) sessionStorage.setItem('agit-assistant-action', autoAction);
  closeAssistant();
  location.hash = page;
  setTimeout(restoreFocusAction, 220);
}

function openAssistant(solution) {
  if (!modal || !modalBody || !modalFoot || !modalTitle) return;

  modalTitle.textContent = 'Помощник по проекту';
  modalBody.innerHTML = `
    <div class="assistant-modal-intro">
      <div class="assistant-modal-kicker">${esc(solution.kicker)}</div>
      <h3>${esc(solution.title)}</h3>
      <p>${esc(solution.summary)}</p>
    </div>
    <div class="assistant-solution-grid">
      <section class="assistant-solution-card">
        <h4><span>1</span> Сделать сейчас</h4>
        <ol>${solution.quick.map(item => `<li>${esc(item)}</li>`).join('')}</ol>
      </section>
      <section class="assistant-solution-card">
        <h4><span>2</span> Рабочий план</h4>
        <ol>${solution.plan.map(item => `<li>${esc(item)}</li>`).join('')}</ol>
      </section>
      <section class="assistant-solution-card">
        <h4><span>3</span> Подтверждения</h4>
        <ul>${solution.evidence.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
      </section>
    </div>
    <div class="assistant-copy-note">План можно скопировать и отправить ответственному сотруднику или использовать как чек-лист подготовки.</div>`;

  modalFoot.innerHTML = `
    <button class="btn btn-secondary" data-assistant-close>Закрыть</button>
    <button class="btn btn-secondary" data-assistant-copy>Скопировать план</button>
    <button class="btn btn-primary" data-assistant-open>${esc(solution.primaryLabel)}</button>`;

  modal.classList.remove('hidden');
  modalFoot.querySelector('[data-assistant-close]').onclick = closeAssistant;
  modalFoot.querySelector('[data-assistant-copy]').onclick = async () => {
    try {
      await copyText(checklistText(solution));
      toast('План действий скопирован.');
    } catch {
      toast('Не удалось скопировать план.', 'error');
    }
  };
  modalFoot.querySelector('[data-assistant-open]').onclick = () => {
    openSection(solution.targetPage, solution.focusTitle || '', solution.autoAction || '');
  };
}

function mediaSolution(detail) {
  return {
    kicker: 'Контрольный сигнал · медиаплан',
    title: 'Закрыть отставание по публикациям',
    summary: detail || 'План публикаций пока не достигнут. Важно не просто добавить записи, а сохранить ссылки и доказательства просмотров.',
    quick: [
      'Выберите ближайший этап проекта и подготовьте один материал, привязанный к его содержанию.',
      'Определите площадку публикации и ответственного за размещение.',
      'Сразу подготовьте изображение, активную ссылку и обязательную маркировку.',
    ],
    plan: [
      'Сверить остаток публикаций и просмотров с планом проекта.',
      'Распределить недостающие материалы по ближайшим этапам календаря.',
      'Для каждой публикации указать дату, площадку, заголовок, ссылку и просмотры.',
      'Добавить скриншот с датой и количеством просмотров.',
      'После внесения данных обновить публичную часть сайта.',
    ],
    evidence: [
      'активная ссылка на публикацию',
      'скриншот с датой и просмотрами',
      'маркировка #Росмолодёжь и #РосмолодёжьГранты',
      'упоминание поддержки проекта — для партнёрских СМИ',
    ],
    targetPage: 'media',
    primaryLabel: canAddPublication ? 'Добавить публикацию' : 'Открыть публикации',
    autoAction: canAddPublication ? 'add-publication' : '',
  };
}

function deadlineSignalSolution(title, detail) {
  const eventName = String(detail || '').split(':')[0].trim();
  const overdue = /просроч/i.test(title);
  return {
    kicker: overdue ? 'Контрольный сигнал · просрочка' : 'Контрольный сигнал · срок',
    title: overdue ? 'Вернуть этап в управляемый график' : 'Подготовить этап до наступления срока',
    summary: detail || 'Срок этапа требует внимания команды.',
    quick: overdue
      ? ['Назначьте фактический статус этапа и ответственного за закрытие.', 'Зафиксируйте новую внутреннюю дату завершения и причины задержки.', 'Определите, какие доказательства реализации уже собраны.']
      : ['Подтвердите площадку, дату и ответственного.', 'Проверьте готовность программы, материалов и участников.', 'Назначьте внутренний контрольный срок на 3–5 дней раньше официального.'],
    plan: overdue
      ? ['Разбить незавершённый этап на конкретные задачи.', 'Назначить владельца и срок каждой задачи.', 'Внести фактические показатели или отметить объективную причину отсутствия результата.', 'Собрать списки участников, фото, публикации и иные подтверждения.', 'После завершения изменить статус этапа и опубликовать обновления.']
      : ['Сверить содержание этапа с проектной заявкой.', 'Подтвердить команду, площадку и материально-техническое обеспечение.', 'Подготовить регистрацию и учёт участников.', 'Запланировать публикации до и после мероприятия.', 'Создать папку подтверждающих документов и назначить ответственного за её заполнение.'],
    evidence: ['карточка этапа с актуальным статусом', 'список участников или письмо организации', 'фото- и видеоматериалы', 'ссылки на публикации', 'итоговый результат в формулировке проектной заявки'],
    targetPage: 'calendar',
    primaryLabel: 'Открыть этап в календаре',
    focusTitle: eventName,
  };
}

function neutralSolution(detail) {
  return {
    kicker: 'Контрольный сигнал · проверка данных',
    title: 'Поддерживать проект в готовности к отчёту',
    summary: detail || 'Критических отклонений не выявлено, но данные нужно обновлять регулярно.',
    quick: ['Проверьте ближайший этап календаря.', 'Убедитесь, что публикации и просмотры внесены.', 'Проверьте наличие подтверждающих документов.'],
    plan: ['Еженедельно актуализировать статусы этапов.', 'После каждого мероприятия вносить фактические показатели.', 'Сохранять списки участников, фото и ссылки.', 'Ежемесячно сверять плановые и фактические KPI.', 'Периодически выгружать Excel-файл отчётности.'],
    evidence: ['актуальный календарь', 'реестр участников', 'реестр публикаций', 'финансовые документы', 'резервная копия и Excel-выгрузка'],
    targetPage: 'report',
    primaryLabel: 'Открыть отчётность',
  };
}

function signalSolution(title, detail) {
  if (/медиаплан|публикац/i.test(title)) return mediaSolution(detail);
  if (/срок|просроч/i.test(title)) return deadlineSignalSolution(title, detail);
  return neutralSolution(detail);
}

function stageSolution(title, meta = {}) {
  const text = String(title || '').toLowerCase();
  let quick = ['Подтвердить ответственного и актуальную дату.', 'Сверить содержание этапа с проектной заявкой.', 'Создать папку подтверждающих материалов.'];
  let plan = ['Разбить этап на рабочие задачи.', 'Назначить сроки и ответственных.', 'Подготовить участников и площадку.', 'Запланировать информационное сопровождение.', 'После проведения внести фактические показатели.'];
  let evidence = ['карточка этапа', 'список участников', 'фотоархив', 'публикации и просмотры', 'итоговый результат'];

  if (/визуаль|дизайн|фирмен/i.test(text)) {
    quick = ['Утвердить основной логотип и правила его использования.', 'Согласовать цветовую палитру и шаблоны публикаций.', 'Назначить лицо, которое принимает итоговые макеты.'];
    plan = ['Подготовить логотип в горизонтальном, вертикальном и компактном вариантах.', 'Собрать шаблоны для публикаций, презентаций и афиш.', 'Подготовить макеты сувенирной и печатной продукции.', 'Проверить читаемость макетов на мобильных устройствах и печати.', 'Сохранить исходники и утверждённые версии в общей папке.'];
    evidence = ['утверждённый логотип', 'исходники макетов', 'шаблоны публикаций', 'протокол или отметка согласования'];
  } else if (/пресс-релиз|информационн|публикац/i.test(text)) {
    quick = ['Определить пять ближайших информационных поводов.', 'Назначить авторов текстов и площадки размещения.', 'Подготовить единый набор фото и справку о проекте.'];
    plan = ['Составить медиаплан по датам и этапам.', 'Подготовить анонсы и пост-релизы.', 'Согласовать список партнёрских СМИ и сообществ.', 'Проверять маркировку и активные ссылки.', 'Сохранять скриншоты и просмотры сразу после публикации.'];
    evidence = ['тексты пресс-релизов', 'активные ссылки', 'скриншоты публикаций', 'статистика просмотров'];
  } else if (/организац|закупк|договор/i.test(text)) {
    quick = ['Провести рабочее совещание и зафиксировать решения.', 'Сверить закупки и договоры со сметой.', 'Назначить ответственных за каждое направление.'];
    plan = ['Утвердить календарь совещаний.', 'Сформировать перечень закупок и услуг.', 'Подготовить договоры и технические задания.', 'Создать реестр документов и сроков оплаты.', 'Проверить готовность площадок и оборудования.'];
    evidence = ['протоколы совещаний', 'договоры и счета', 'акты или УПД', 'фото приобретённого оборудования', 'реестр закупок'];
  } else if (/мастер-класс|реконструкц/i.test(text)) {
    quick = ['Подтвердить экспертов, даты и площадки.', 'Утвердить программу каждого мастер-класса.', 'Проверить реквизит, безопасность и расходные материалы.'];
    plan = ['Согласовать четыре темы и сценарии занятий.', 'Подготовить регистрацию участников.', 'Назначить ведущих, помощников и фотографа.', 'Провести техническую репетицию.', 'После каждого занятия внести участников и публикации.'];
    evidence = ['программы мастер-классов', 'списки участников', 'фотографии', 'отзывы или анкеты', 'ссылки на публикации'];
  } else if (/урок|мужеств/i.test(text)) {
    quick = ['Согласовать график со школами.', 'Утвердить содержание уроков и спикеров.', 'Подготовить учёт участников по каждому занятию.'];
    plan = ['Закрепить даты и классы.', 'Подготовить презентации и раздаточные материалы.', 'Назначить ведущих и ответственных от школ.', 'Провести занятия по утверждённым темам.', 'Собрать письма школ, списки и фото.'];
    evidence = ['график уроков', 'письма или подтверждения школ', 'списки участников', 'фото и методические материалы'];
  } else if (/квест|игр|судьбы времён/i.test(text)) {
    quick = ['Утвердить сценарий и механику подсчёта.', 'Закрепить станции, судей и волонтёров.', 'Провести тестовый прогон маршрута.'];
    plan = ['Разработать задания и маршрутные листы.', 'Подготовить реквизит и площадки.', 'Провести инструктаж команды.', 'Организовать регистрацию и безопасность.', 'Собрать результаты, фото и обратную связь.'];
    evidence = ['сценарий игры', 'маршрутные листы', 'протоколы результатов', 'списки участников', 'фотоархив'];
  } else if (/истории моей семьи|конкурс|семейн/i.test(text)) {
    quick = ['Утвердить положение и сроки конкурса.', 'Открыть приём работ и назначить жюри.', 'Согласовать формат итоговой выставки.'];
    plan = ['Подготовить информационную кампанию.', 'Организовать сбор согласий и конкурсных материалов.', 'Провести экспертную оценку.', 'Оформить выставку семейных реликвий.', 'Подвести итоги и сохранить реестр участников.'];
    evidence = ['положение конкурса', 'реестр работ', 'протокол жюри', 'фото выставки', 'публикации'];
  } else if (/главная площадка|9 мая/i.test(text)) {
    quick = ['Утвердить схему площадки и программу дня.', 'Согласовать безопасность, электропитание и охрану.', 'Закрепить руководителей всех зон.'];
    plan = ['Разработать подробный тайминг.', 'Провести инвентаризацию оборудования и реквизита.', 'Сформировать команды волонтёров и ведущих.', 'Организовать регистрацию и подсчёт участников.', 'Подготовить фото-, видео- и информационное сопровождение.'];
    evidence = ['схема площадки', 'программа и тайминг', 'инструктажи', 'списки участников', 'фото и публикации'];
  } else if (/выставк/i.test(text)) {
    quick = ['Отобрать материалы и проверить права на использование.', 'Утвердить структуру выставки и подписи.', 'Назначить даты экскурсий и ответственных.'];
    plan = ['Подготовить фото, видео и текстовые материалы.', 'Разработать дизайн и навигацию выставки.', 'Смонтировать и протестировать оборудование.', 'Организовать экскурсии и учёт посетителей.', 'Собрать отзывы и итоговые публикации.'];
    evidence = ['экспозиционный план', 'фото выставки', 'списки посетителей', 'отзывы', 'публикации'];
  } else if (/итогов.*собрани|рабочей группы|партнёр/i.test(text)) {
    quick = ['Подготовить сводку KPI и бюджета.', 'Собрать обратную связь команды и партнёров.', 'Сформировать проект решений итогового собрания.'];
    plan = ['Разослать повестку.', 'Подготовить презентацию результатов.', 'Обсудить проблемы и незапланированные результаты.', 'Зафиксировать перспективы продолжения проекта.', 'Оформить протокол и список участников.'];
    evidence = ['повестка', 'презентация', 'лист регистрации', 'протокол', 'фото встречи'];
  } else if (/итогов.*материал|информационн.*кампан/i.test(text)) {
    quick = ['Собрать итоговые цифры и лучшие истории проекта.', 'Подготовить единый итоговый пресс-релиз.', 'Определить не менее десяти площадок размещения.'];
    plan = ['Сформировать пакет итоговых фото и видео.', 'Подготовить версии текста для разных площадок.', 'Согласовать публикации с партнёрами.', 'Внести все ссылки и просмотры в базу.', 'Сохранить скриншоты для отчёта.'];
    evidence = ['итоговый пресс-релиз', 'активные ссылки', 'скриншоты', 'статистика просмотров'];
  } else if (/отчёт|финансов/i.test(text)) {
    quick = ['Выгрузить Excel-файл из раздела отчётности.', 'Сверить фактические показатели с заявкой.', 'Проверить комплект финансовых документов.'];
    plan = ['Проверить 12 официальных мероприятий.', 'Сверить реестр участников и повторных участий.', 'Проверить 57 публикаций и 52 000 просмотров.', 'Собрать договоры, счета, акты и платёжные документы.', 'Заполнить текстовые разделы и провести финальную проверку.'];
    evidence = ['Excel-выгрузка', 'реестр участников', 'публикации и скриншоты', 'финансовый архив', 'содержательный отчёт'];
  }

  return {
    kicker: `Следующий этап${meta.date ? ` · ${meta.date}` : ''}`,
    title: title || 'Подготовка этапа',
    summary: meta.status ? `Текущий статус: ${meta.status}. ${meta.days || ''}`.trim() : 'Предлагаемый порядок подготовки этапа.',
    quick,
    plan,
    evidence,
    targetPage: 'calendar',
    primaryLabel: 'Открыть этап в календаре',
    focusTitle: title,
  };
}

function makeTrigger(element, type) {
  if (!element || element.dataset.assistantReady === 'true') return;
  element.dataset.assistantReady = 'true';
  element.classList.add('assistant-trigger', type === 'signal' ? 'assistant-signal' : 'assistant-deadline');
  element.setAttribute('role', 'button');
  element.tabIndex = 0;
  const chevron = document.createElement('span');
  chevron.className = 'assistant-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '›';
  element.append(chevron);

  const activate = () => {
    if (type === 'signal') {
      const title = element.querySelector('strong')?.textContent?.trim() || 'Контрольный сигнал';
      const detail = element.querySelector('p')?.textContent?.trim() || '';
      openAssistant(signalSolution(title, detail));
      return;
    }
    const title = element.querySelector('strong')?.textContent?.trim() || 'Следующий этап';
    const date = element.querySelector('time')?.textContent?.trim() || '';
    const spans = [...element.querySelectorAll('span')].filter(item => !item.classList.contains('assistant-chevron'));
    const status = spans.find(item => !item.classList.contains('v3-days'))?.textContent?.trim() || '';
    const days = element.querySelector('.v3-days')?.textContent?.trim() || '';
    openAssistant(stageSolution(title, { date, status, days }));
  };

  element.addEventListener('click', activate);
  element.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });
}

function enhanceDashboard() {
  if ((location.hash.slice(1) || 'dashboard') !== 'dashboard') return;
  const cards = [...app?.querySelectorAll('.v3-card') || []];
  const signals = cards.find(card => card.querySelector('.v3-card-head h3')?.textContent?.trim() === 'Контрольные сигналы');
  const deadlines = cards.find(card => card.querySelector('.v3-card-head h3')?.textContent?.trim() === 'Следующие этапы');
  signals?.querySelectorAll('.v3-alert').forEach(item => makeTrigger(item, 'signal'));
  deadlines?.querySelectorAll('.v3-deadline-item').forEach(item => makeTrigger(item, 'deadline'));
}

function restoreFocusAction() {
  const page = location.hash.slice(1) || 'dashboard';
  const action = sessionStorage.getItem('agit-assistant-action');
  const focus = sessionStorage.getItem('agit-assistant-focus');

  if (page === 'media' && action === 'add-publication') {
    const button = app?.querySelector('[data-add-publication]');
    if (button) {
      sessionStorage.removeItem('agit-assistant-action');
      button.click();
    }
  }

  if (page === 'calendar' && focus) {
    const card = [...app?.querySelectorAll('.v3-event') || []]
      .find(item => item.querySelector('h3')?.textContent?.trim() === focus);
    if (card) {
      sessionStorage.removeItem('agit-assistant-focus');
      card.classList.add('assistant-focus');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => card.classList.remove('assistant-focus'), 2600);
    }
  }
}

if (app) {
  new MutationObserver(() => {
    enhanceDashboard();
    restoreFocusAction();
  }).observe(app, { childList: true, subtree: true });
}

window.addEventListener('hashchange', () => setTimeout(() => {
  enhanceDashboard();
  restoreFocusAction();
}, 120));

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeAssistant();
});

setTimeout(() => {
  enhanceDashboard();
  restoreFocusAction();
}, 350);
