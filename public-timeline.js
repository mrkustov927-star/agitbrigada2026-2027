import './timeline-shared.css';

const publicCalendar = document.getElementById('calendar');
const publicCards = publicCalendar?.querySelector('.public-calendar-list');

if (publicCalendar && publicCards && !document.getElementById('publicTimelineHub')) {
  const projectStart = new Date('2026-08-01T00:00:00');
  const projectEnd = new Date('2027-06-30T23:59:59');
  const totalMs = projectEnd - projectStart;
  const months = ['Авг','Сен','Окт','Ноя','Дек','Янв','Фев','Мар','Апр','Май','Июн'];

  const stages = [
    {n:1,title:'Визуальное оформление проекта',owner:'Иван Брунов, Анастасия Таран',status:'planned',start:'2026-08-03',end:'2026-08-20',u:0,r:0,p:1,v:500,items:[
      ['2026-08-03','Установочное обсуждение визуальной концепции','Иван Брунов, Анастасия Таран'],
      ['2026-08-17','Согласование и утверждение фирменного стиля','Иван Брунов, Анастасия Таран'],
    ]},
    {n:2,title:'Стартовая информационная кампания',owner:'Иван Брунов, Евгений Кустов, Анастасия Таран',status:'planned',start:'2026-08-21',end:'2026-08-31',u:0,r:0,p:5,v:4000,items:[['2026-08-21','Пять стартовых материалов проекта','Рабочая группа']]},
    {n:3,title:'Организационная подготовка',owner:'Иван Брунов, Евгений Кустов, Виктор Антонов, Виктория Панкратова',status:'planned',start:'2026-08-04',end:'2026-09-30',u:0,r:0,p:1,v:500,items:[
      ['2026-08-04','Первое собрание рабочей группы','Иван Брунов'],['2026-08-18','Второе собрание рабочей группы','Иван Брунов'],['2026-09-08','Согласование школ и площадок','Евгений Кустов'],['2026-09-25','Контрольное собрание по готовности','Иван Брунов']
    ]},
    {n:4,title:'Мастер-классы по исторической реконструкции',owner:'Егор Дыкуль, Валерия Синявина',status:'planned',start:'2026-09-03',end:'2026-10-23',u:100,r:0,p:5,v:3000,items:[
      ['2026-09-03','Окончание Второй мировой войны','Егор Дыкуль, Валерия Синявина'],['2026-09-10','Исторический источник','Егор Дыкуль, Валерия Синявина'],['2026-10-09','Полевой быт, связь и медицинская помощь','Егор Дыкуль'],['2026-10-23','Архивный поиск','Егор Дыкуль, Валерия Синявина']
    ]},
    {n:5,title:'Интерактивные уроки и уроки мужества',owner:'Валерия Синявина, Евгений Кустов',status:'planned',start:'2026-11-06',end:'2026-12-22',u:200,r:0,p:5,v:3000,items:[
      ['2026-11-06','Карельский фронт: история рядом с нами','Валерия Синявина'],['2026-11-13','Фронтовая агитбригада: слово, музыка и поддержка бойцов','Валерия Синявина'],['2026-11-20','Один день полевого штаба','Валерия Синявина, Егор Дыкуль'],['2026-11-27','Фронтовой корреспондент и военная газета','Валерия Синявина'],['2026-12-03','Вернуть имя','Валерия Синявина'],['2026-12-04','Волонтёры исторической памяти','Евгений Кустов, Валерия Синявина'],['2026-12-09','Герои Отечества и жители Кемского округа','Валерия Синявина, Евгений Кустов'],['2026-12-11','Письмо с фронта как исторический источник','Валерия Синявина'],['2026-12-17','История одного предмета','Валерия Синявина, Егор Дыкуль'],['2026-12-22','Итоговый интерактивный урок-квиз','Валерия Синявина, Евгений Кустов']
    ]},
    {n:6,title:'Исторические квесты и интеллектуальные игры',owner:'Егор Дыкуль; «Судьбы времён» — Анастасия Таран',status:'planned',start:'2027-01-27',end:'2027-02-23',u:100,r:200,p:13,v:16000,items:[
      ['2027-01-27','Квест «Блокадный маршрут»','Егор Дыкуль'],['2027-02-02','Интеллектуальная игра «Перелом»','Егор Дыкуль'],['2027-02-15','Служение Отечеству: связь поколений','Егор Дыкуль'],['2027-02-18','Исторический квест «Разведка»','Егор Дыкуль'],['2027-02-23','Комплекс активностей «Судьбы времён»','Анастасия Таран']
    ]},
    {n:7,title:'Конкурс «Истории моей семьи»',owner:'Валерия Синявина, Евгений Кустов, Виктория Панкратова',status:'planned',start:'2027-03-01',end:'2027-03-31',u:100,r:0,p:5,v:4000,items:[['2027-03-01','Приём конкурсных работ','Валерия Синявина'],['2027-03-27','Финал и выставка семейных реликвий','Валерия Синявина']]},
    {n:8,title:'Главная площадка «Фронтовая агитбригада»',owner:'Иван Брунов и рабочая группа',status:'planned',start:'2027-04-19',end:'2027-05-09',u:400,r:0,p:5,v:4000,items:[['2027-04-19','Подготовительный модуль «Без срока давности»','Валерия Синявина, Егор Дыкуль'],['2027-05-09','Главная интерактивная площадка','Иван Брунов']]},
    {n:9,title:'Финальная выставка «Агитбригада в лицах и событиях»',owner:'Валерия Синявина, Евгений Кустов',status:'planned',start:'2027-05-19',end:'2027-05-31',u:100,r:0,p:5,v:4000,items:[['2027-05-19','Открытие выставки','Валерия Синявина'],['2027-05-21','Первая организованная экскурсия','Валерия Синявина'],['2027-05-25','Вторая организованная экскурсия','Валерия Синявина'],['2027-05-28','Третья организованная экскурсия','Валерия Синявина']]},
    {n:10,title:'Итоговое собрание рабочей группы и партнёров',owner:'Иван Брунов, Евгений Кустов',status:'planned',start:'2027-06-10',end:'2027-06-10',u:0,r:20,p:1,v:500,items:[['2027-06-10','Итоговое собрание','Иван Брунов, Евгений Кустов']]},
    {n:11,title:'Публикация итоговых материалов',owner:'Иван Брунов и рабочая группа',status:'planned',start:'2027-06-10',end:'2027-06-20',u:0,r:0,p:10,v:12000,items:[['2027-06-10','Итоговая информационная кампания','Рабочая группа']]},
    {n:12,title:'Итоговая содержательная и финансовая отчётность',owner:'Иван Брунов',status:'planned',start:'2027-06-21',end:'2027-06-30',u:0,r:0,p:1,v:500,items:[['2027-06-21','Подготовка итогового отчёта','Иван Брунов']]},
  ];

  const datePos = value => Math.max(0, Math.min(100, ((new Date(`${value}T00:00:00`) - projectStart) / totalMs) * 100));
  const dateWidth = (start, end) => Math.max(1.2, datePos(end) - datePos(start));
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const formatDate = value => new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU');

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
      <div class="timeline-actions"><span class="timeline-public-note" style="border:0;padding:8px 10px">Публичный режим · только просмотр</span></div>
    </div>
    <div class="timeline-summary">
      <div class="timeline-summary-item"><strong>12</strong><span>официальных этапов</span></div>
      <div class="timeline-summary-item"><strong>36</strong><span>рабочих активностей</span></div>
      <div class="timeline-summary-item"><strong>1 000</strong><span>уникальных участников</span></div>
      <div class="timeline-summary-item"><strong>220</strong><span>повторных участий</span></div>
      <div class="timeline-summary-item"><strong>57</strong><span>публикаций</span></div>
      <div class="timeline-summary-item"><strong>52 000</strong><span>просмотров</span></div>
    </div>
    <div class="timeline-public-view" data-view-panel="timeline">
      <div class="timeline-viewport"><div class="timeline-board">
        <div class="timeline-head"><div>Этап / задача</div><div>Ответственный</div><div>Статус</div><div>Прогресс</div><div>Показатели</div><div class="timeline-months">${months.map(m=>`<span>${m}</span>`).join('')}</div></div>
        <div class="timeline-rows"></div>
      </div></div>
      <div class="timeline-public-note">Нажмите на стрелку у этапа, чтобы раскрыть вложенные активности. Даты и показатели соответствуют утверждённому рабочему плану.</div>
    </div>
    <div class="timeline-public-view timeline-list-view" data-view-panel="list"><table class="timeline-list-table"><thead><tr><th>Этап</th><th>Срок</th><th>Ответственный</th><th>Уникальные</th><th>Повторные</th><th>Публикации</th><th>Просмотры</th></tr></thead><tbody>${stages.map(s=>`<tr><td><strong>Этап ${s.n}</strong><br>${esc(s.title)}</td><td>${formatDate(s.start)} — ${formatDate(s.end)}</td><td>${esc(s.owner)}</td><td>${s.u}</td><td>${s.r}</td><td>${s.p}</td><td>${s.v.toLocaleString('ru-RU')}</td></tr>`).join('')}</tbody></table></div>`;

  const rows = hub.querySelector('.timeline-rows');
  stages.forEach(stage => {
    const row = document.createElement('div');
    row.className = 'timeline-row group';
    row.innerHTML = `<div class="timeline-cell task"><button class="timeline-toggle" data-stage-toggle="${stage.n}">⌄</button><span class="timeline-code">Этап ${stage.n}</span><span>${esc(stage.title)}</span></div><div class="timeline-cell timeline-owner">${esc(stage.owner)}</div><div class="timeline-cell timeline-status"><span class="timeline-status-badge">План</span></div><div class="timeline-cell timeline-progress">0%</div><div class="timeline-cell timeline-metric">${stage.u} / ${stage.p} пуб.</div><div class="timeline-track"><span class="timeline-bar preparing" style="left:${datePos(stage.start)}%;width:${dateWidth(stage.start,stage.end)}%"><span class="timeline-bar-label">${formatDate(stage.start)} — ${formatDate(stage.end)}</span></span></div>`;
    rows.append(row);
    stage.items.forEach((item, index) => {
      const child = document.createElement('div');
      child.className = 'timeline-row child';
      child.dataset.parentStage = String(stage.n);
      child.hidden = ![4,5,6].includes(stage.n);
      const date = item[0];
      child.innerHTML = `<div class="timeline-cell task"><span>${esc(item[1])}</span></div><div class="timeline-cell timeline-owner">${esc(item[2])}</div><div class="timeline-cell timeline-status"><span class="timeline-status-badge">План</span></div><div class="timeline-cell timeline-progress">0%</div><div class="timeline-cell timeline-metric">${index + 1}</div><div class="timeline-track"><span class="timeline-milestone" style="left:${datePos(date)}%"></span></div>`;
      rows.append(child);
    });
  });

  publicCards.parentNode.insertBefore(hub, publicCards);
  publicCards.style.display = 'none';

  hub.querySelectorAll('[data-stage-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const stage = button.dataset.stageToggle;
      const children = [...hub.querySelectorAll(`[data-parent-stage="${stage}"]`)];
      const show = children.some(item => item.hidden);
      children.forEach(item => { item.hidden = !show; });
      button.textContent = show ? '⌃' : '⌄';
    });
  });

  hub.querySelectorAll('[data-public-view]').forEach(button => {
    button.addEventListener('click', () => {
      hub.querySelectorAll('[data-public-view]').forEach(item => item.classList.toggle('active', item === button));
      const view = button.dataset.publicView;
      hub.querySelector('[data-view-panel="timeline"]').style.display = view === 'timeline' ? '' : 'none';
      hub.querySelector('[data-view-panel="list"]').style.display = view === 'list' ? 'block' : 'none';
      publicCards.style.display = view === 'stages' ? '' : 'none';
      hub.style.borderRadius = view === 'stages' ? '24px 24px 0 0' : '';
    });
  });
}
