import './app-v3.css';

const { supabase, session, projectId, role } = window.AGIT;
const app = document.getElementById('app');
const navHost = document.getElementById('nav');
const modal = document.getElementById('modalBackdrop');
const modalBody = document.getElementById('modalBody');
const modalFoot = document.getElementById('modalFoot');

const ROLE_LABELS = {
  owner: 'Руководитель', manager: 'Координатор', finance: 'Финансы',
  media: 'Медиа', organizer: 'Организатор', mentor: 'Наставник', viewer: 'Просмотр',
};
const STATUS_LABELS = {
  planned: 'Запланировано', preparing: 'Подготовка', in_progress: 'В работе',
  completed: 'Завершено', cancelled: 'Отменено', contracting: 'Договоры',
  ordered: 'Заказано', paid: 'Оплачено', closed: 'Закрыто', draft: 'Черновик',
  uploaded: 'Загружено', verified: 'Проверено', rejected: 'Отклонено', active: 'Активен',
};
const RIGHTS = {
  event: ['owner', 'manager', 'organizer'].includes(role),
  media: ['owner', 'manager', 'media'].includes(role),
  finance: ['owner', 'finance'].includes(role),
  management: ['owner', 'manager'].includes(role),
  owner: role === 'owner',
};
const PAGES = [
  ['dashboard', '⌂', 'Панель'],
  ['calendar', '▣', 'Календарь'],
  ['media', '◉', 'Публикации'],
  ['budget', '₽', 'Бюджет'],
  ['team', '♣', 'Команда'],
  ['report', '✓', 'Отчётность'],
];

const FALLBACK_TEAM = [
  ['Иван Брунов','Руководитель проекта','Общее руководство, договорная работа, закупки, партнёры, контроль реализации и итоговая отчётность.','Руководство проектом'],
  ['Евгений Кустов','Координатор взаимодействия со школами','Взаимодействие со школами и Движением Первых, формирование групп, согласование площадок и календаря.','Школы и Движение Первых'],
  ['Валерия Синявина','Координатор образовательного содержания','Образовательные программы, интерактивные уроки, методические материалы и конкурс «Истории моей семьи».','Содержание и методика'],
  ['Егор Дыкуль','Координатор исторических активностей','Историческая реконструкция, мастер-классы, квесты и интеллектуальные игры.','Исторические активности'],
  ['Анастасия Таран','Координатор комплекса «Судьбы времён»','Разработка сценария, станций и заданий, подготовка и проведение комплекса активностей «Судьбы времён».','Судьбы времён'],
  ['Виктор Антонов','Технический координатор','Оборудование, реквизит, монтаж площадок, техническое обеспечение, хранение имущества и безопасность.','Техническое направление'],
  ['Виктория Панкратова','Координатор учёта участников','Регистрация участников, контроль уникальности и повторных посещений, согласия и подтверждающие документы.','Учёт участников'],
].map((row, index) => ({ full_name: row[0], role_title: row[1], responsibility: row[2], focus: row[3], sort_order: index + 1 }));

const FALLBACK_ACTIVITIES = [
  ['EVT-01','2026-08-03','Установочное обсуждение визуальной концепции','Иван Брунов, Анастасия Таран',0,0,0,0],
  ['EVT-01','2026-08-17','Согласование и утверждение фирменного стиля','Иван Брунов, Анастасия Таран',0,0,1,500],
  ['EVT-02','2026-08-21','Стартовая информационная кампания: пять материалов','Иван Брунов, Евгений Кустов, Анастасия Таран',0,0,5,4000],
  ['EVT-03','2026-08-04','Первое собрание рабочей группы','Иван Брунов',0,0,0,0],
  ['EVT-03','2026-08-18','Второе собрание рабочей группы','Иван Брунов',0,0,0,0],
  ['EVT-03','2026-09-08','Согласование школ, площадок и графика выездов','Евгений Кустов',0,0,0,0],
  ['EVT-03','2026-09-25','Контрольное собрание по готовности','Иван Брунов',0,0,1,500],
  ['EVT-04','2026-09-03','Окончание Второй мировой войны: карта, хроника, исторические предметы','Егор Дыкуль, Валерия Синявина',25,0,0,0],
  ['EVT-04','2026-09-10','Исторический источник: письмо, фотография, семейный документ','Егор Дыкуль, Валерия Синявина',25,0,0,0],
  ['EVT-04','2026-10-09','Полевой быт, связь и медицинская помощь','Егор Дыкуль',25,0,0,0],
  ['EVT-04','2026-10-23','Архивный поиск: как восстановить судьбу человека','Егор Дыкуль, Валерия Синявина',25,0,5,3000],
  ['EVT-05','2026-11-06','Карельский фронт: история рядом с нами','Валерия Синявина',20,0,0,0],
  ['EVT-05','2026-11-13','Фронтовая агитбригада: слово, музыка и поддержка бойцов','Валерия Синявина',20,0,0,0],
  ['EVT-05','2026-11-20','Один день полевого штаба','Валерия Синявина, Егор Дыкуль',20,0,0,0],
  ['EVT-05','2026-11-27','Фронтовой корреспондент и военная газета','Валерия Синявина',20,0,0,0],
  ['EVT-05','2026-12-03','Вернуть имя: День Неизвестного Солдата','Валерия Синявина',20,0,0,0],
  ['EVT-05','2026-12-04','Волонтёры исторической памяти','Евгений Кустов, Валерия Синявина',20,0,0,0],
  ['EVT-05','2026-12-09','Герои Отечества и жители Кемского округа','Валерия Синявина, Евгений Кустов',20,0,0,0],
  ['EVT-05','2026-12-11','Письмо с фронта как исторический источник','Валерия Синявина',20,0,0,0],
  ['EVT-05','2026-12-17','История одного предмета','Валерия Синявина, Егор Дыкуль',20,0,0,0],
  ['EVT-05','2026-12-22','Итоговый интерактивный урок-квиз','Валерия Синявина, Евгений Кустов',20,0,5,3000],
  ['EVT-06','2027-01-27','Исторический квест «Блокадный маршрут»','Егор Дыкуль',60,0,2,2500],
  ['EVT-06','2027-02-02','Интеллектуальная игра «Перелом»','Егор Дыкуль',40,20,2,2500],
  ['EVT-06','2027-02-15','Игра «Служение Отечеству: связь поколений»','Егор Дыкуль',0,60,2,2500],
  ['EVT-06','2027-02-18','Исторический квест «Разведка»','Егор Дыкуль',0,60,2,2500],
  ['EVT-06','2027-02-23','Комплекс активностей «Судьбы времён»','Анастасия Таран',0,60,5,6000],
  ['EVT-07','2027-03-01','Приём работ конкурса «Истории моей семьи»','Валерия Синявина',80,0,2,1500],
  ['EVT-07','2027-03-27','Финал «Письма, которые заговорили» и выставка реликвий','Валерия Синявина',20,0,3,2500],
  ['EVT-08','2027-04-19','Без срока давности: документ, свидетельство, память','Валерия Синявина, Егор Дыкуль',0,0,0,0],
  ['EVT-08','2027-05-09','Главная площадка «Фронтовая агитбригада»','Иван Брунов',400,0,5,4000],
  ['EVT-09','2027-05-19','Открытие выставки «Агитбригада в лицах и событиях»','Валерия Синявина',40,0,2,1500],
  ['EVT-09','2027-05-21','Первая организованная экскурсия','Валерия Синявина',20,0,1,800],
  ['EVT-09','2027-05-25','Вторая организованная экскурсия','Валерия Синявина',20,0,1,800],
  ['EVT-09','2027-05-28','Третья организованная экскурсия','Валерия Синявина',20,0,1,900],
  ['EVT-10','2027-06-10','Итоговое собрание рабочей группы и партнёров','Иван Брунов, Евгений Кустов',0,20,1,500],
  ['EVT-11','2027-06-10','Итоговая информационная кампания','Иван Брунов',0,0,10,12000],
  ['EVT-12','2027-06-21','Подготовка итоговой содержательной и финансовой отчётности','Иван Брунов',0,0,1,500],
].map((row, index) => ({ event_code: row[0], activity_date: row[1], title: row[2], lead_name: row[3], plan_unique_participants: row[4], plan_repeat_participants: row[5], plan_publications: row[6], plan_views: row[7], sort_order: index + 1 }));

let currentPage = location.hash.slice(1) || 'dashboard';
if (!PAGES.some(([id]) => id === currentPage)) currentPage = 'dashboard';
let project = null;
let data = { events: [], publications: [], budget: [], requirements: [], sections: [], members: [], team: [], activities: [], kpis: {} };
let loadErrors = [];

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
const formatDate = value => value ? new Date(`${String(value).slice(0,10)}T00:00:00`).toLocaleDateString('ru-RU') : '—';
const money = value => new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number(value||0));
const percent = (actual, plan) => Number(plan) > 0 ? Math.min(100, Math.round(Number(actual||0) / Number(plan) * 100)) : 0;
const today = () => new Date().toISOString().slice(0,10);
const label = value => STATUS_LABELS[value] || value || '—';
const initials = name => String(name||'').split(/\s+/).filter(Boolean).slice(0,2).map(v=>v[0]).join('').toUpperCase();

function setSync(text,status='ok') { const box=document.querySelector('.sync-state'); if(!box)return; box.dataset.status=status; const t=box.querySelector('span:last-child'); if(t)t.textContent=text; }
function toast(text,type='success'){ const n=document.createElement('div'); n.className=`toast ${type}`; n.textContent=text; document.getElementById('toastStack').append(n); setTimeout(()=>n.remove(),4200); }
async function safeLoad(name,loader,fallback=[]){ try{return await loader();}catch(error){console.error(`[${name}]`,error);loadErrors.push(`${name}: ${error.message||'ошибка'}`);return fallback;} }
async function rows(table,{order,ascending=true}={}){let q=supabase.from(table).select('*').eq('project_id',projectId);if(order)q=q.order(order,{ascending});const r=await q;if(r.error)throw r.error;return r.data||[];}

async function loadMembers(){
  if(!RIGHTS.management)return [];
  const members=await rows('project_members',{order:'created_at'});
  const ids=members.map(m=>m.user_id).filter(Boolean);
  if(!ids.length)return members;
  const r=await supabase.from('profiles').select('id,full_name,email').in('id',ids);
  if(r.error)throw r.error;
  const map=new Map((r.data||[]).map(p=>[p.id,p]));
  return members.map(m=>({...m,profile:map.get(m.user_id)||null}));
}

async function loadData(){
  setSync('Загружаем данные…','busy'); loadErrors=[];
  [data.events,data.publications,data.budget,data.requirements,data.sections,data.members,data.team,data.activities]=await Promise.all([
    safeLoad('Календарь',()=>rows('events',{order:'sort_order'})),
    safeLoad('Публикации',()=>rows('publications',{order:'published_at',ascending:false})),
    safeLoad('Бюджет',()=>rows('budget_items',{order:'code'})),
    safeLoad('Требования отчёта',()=>rows('report_requirements',{order:'appendix_number'})),
    safeLoad('Разделы отчёта',()=>rows('report_sections',{order:'section_key'})),
    safeLoad('Доступы',loadMembers),
    safeLoad('Рабочая группа',()=>rows('working_group_members',{order:'sort_order'}),FALLBACK_TEAM),
    safeLoad('Рабочие активности',()=>rows('event_activities',{order:'activity_date'}),FALLBACK_ACTIVITIES),
  ]);
  if(!data.team.length)data.team=FALLBACK_TEAM;
  if(!data.activities.length)data.activities=FALLBACK_ACTIVITIES;
  data.kpis=await safeLoad('Показатели',async()=>{const r=await supabase.rpc('get_project_kpis',{p_project_id:projectId});if(r.error)throw r.error;return r.data?.[0]||{};},{});
  setSync(loadErrors.length?`Загружено с предупреждениями: ${loadErrors.length}`:'Общая база подключена',loadErrors.length?'error':'ok');
}

async function loadProject(){const r=await supabase.from('projects').select('*').eq('id',projectId).single();if(r.error)throw r.error;project=r.data;document.getElementById('projectDates').innerHTML=`<strong>${esc(project.name)}</strong>${formatDate(project.start_date)} — ${formatDate(project.end_date)}`;}
function renderNav(){navHost.innerHTML=PAGES.map(([id,icon,title])=>`<button data-page="${id}" class="${currentPage===id?'active':''}"><span class="nav-icon">${icon}</span><span class="nav-label">${title}</span></button>`).join('');navHost.onclick=e=>{const b=e.target.closest('[data-page]');if(b)location.hash=b.dataset.page;};}
function pageHead(title,subtitle,actions=''){document.getElementById('pageTitle').textContent=title;return `<div class="page-intro"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><div class="page-actions">${actions}</div></div>${renderErrors()}`;}
function renderErrors(){if(!loadErrors.length)return '';return `<div class="alert alert-warning" style="margin-bottom:16px"><span class="alert-icon">!</span><div><strong>Некоторые дополнительные данные пока недоступны</strong><p>${loadErrors.map(esc).join('<br>')}</p></div></div>`;}
function daysText(date){const d=Math.ceil((new Date(`${date}T23:59:59`)-new Date())/86400000);if(d<0)return `просрочено ${Math.abs(d)} дн.`;if(d===0)return 'сегодня';return `${d} дн.`;}
function nextOpenEvent(){return data.events.find(e=>!['completed','cancelled'].includes(e.status))||null;}
function kpi(title,actual,plan,icon){return `<article class="v3-kpi"><div class="v3-kpi-head"><span>${esc(title)}</span><span class="v3-kpi-icon">${icon}</span></div><div class="v3-kpi-value">${Number(actual||0).toLocaleString('ru-RU')}</div><div class="v3-kpi-plan">план: ${Number(plan||0).toLocaleString('ru-RU')}</div><div class="v3-progress"><span style="width:${percent(actual,plan)}%"></span></div></article>`;}

function dashboardAlerts(){
  const out=[]; const now=new Date();
  data.events.forEach(e=>{if(['completed','cancelled'].includes(e.status))return;const d=Math.ceil((new Date(`${e.due_date}T23:59:59`)-now)/86400000);if(d<0)out.push(['!','Просрочен этап',`${e.name}: срок ${formatDate(e.due_date)}`]);else if(d<=45)out.push(['⌛','Приближается срок',`${e.name}: осталось ${d} дней`]);});
  if(data.publications.length<Number(project.plan_publications||57))out.push(['i','Медиаплан',`Осталось внести ${Number(project.plan_publications||57)-data.publications.length} публикаций`]);
  return out.slice(0,5);
}

function renderDashboard(){
  const k=data.kpis||{}; const next=nextOpenEvent(); const alerts=dashboardAlerts();
  const actualRepeat=data.events.reduce((s,e)=>s+Number(e.actual_repeat_participants||0),0);
  const planRepeat=data.events.reduce((s,e)=>s+Number(e.plan_repeat_participants||0),0)||220;
  app.innerHTML=pageHead('Панель управления','Главные показатели, сроки и текущие задачи проекта.')+`
    <div class="v3-dashboard-hero">
      <section class="v3-project-card"><h3>${esc(project.name)}</h3><p>${esc(project.description||'Интерактивная историческая площадка и комплекс мероприятий по сохранению исторической памяти.')}</p><div class="v3-project-meta"><span>${formatDate(project.start_date)} — ${formatDate(project.end_date)}</span><span>${esc(project.municipality||'Кемский муниципальный округ')}</span><span>Рабочая группа: ${data.team.length} человек</span><span>Повторные участия: ${actualRepeat}/${planRepeat}</span></div></section>
      <aside class="v3-next-card"><h3>Ближайший срок</h3>${next?`<span class="v3-next-date">${formatDate(next.due_date)} · ${daysText(next.due_date)}</span><strong>${esc(next.name)}</strong><p>${esc(next.description||'Проверьте готовность команды и подтверждающих материалов.')}</p>`:'<p>Все этапы завершены.</p>'}</aside>
    </div>
    <div class="v3-kpi-grid">${kpi('Мероприятия',k.actual_events,project.plan_events,'▣')}${kpi('Участники 14–35',k.actual_unique_participants,project.plan_unique_participants,'♟')}${kpi('Публикации',k.actual_publications,project.plan_publications,'◉')}${kpi('Просмотры',k.actual_views,project.plan_views,'◎')}</div>
    <div class="v3-grid-main">
      <section class="v3-card"><div class="v3-card-head"><h3>Контрольные сигналы</h3><p>На что обратить внимание в первую очередь.</p></div><div class="v3-card-body">${alerts.length?alerts.map(a=>`<div class="v3-alert"><span class="v3-alert-icon">${a[0]}</span><div><strong>${esc(a[1])}</strong><p>${esc(a[2])}</p></div></div>`).join(''):'<div class="v3-alert"><span class="v3-alert-icon">✓</span><div><strong>Критических сигналов нет</strong><p>Продолжайте заполнять фактические показатели.</p></div></div>'}</div></section>
      <section class="v3-card"><div class="v3-card-head"><h3>Следующие этапы</h3><p>Ближайшие сроки календарного плана.</p></div><div class="v3-card-body v3-deadline-list">${data.events.filter(e=>!['completed','cancelled'].includes(e.status)).slice(0,6).map(e=>`<div class="v3-deadline-item"><time>${formatDate(e.due_date)}</time><div><strong>${esc(e.name)}</strong><span>${esc(label(e.status))}</span></div><span class="v3-days">${daysText(e.due_date)}</span></div>`).join('')||'<div class="v3-empty">Все этапы завершены</div>'}</div></section>
    </div>`;
}

function activityForEvent(event){return data.activities.filter(a=>(a.event_code||data.events.find(e=>e.id===a.event_id)?.code)===event.code).sort((a,b)=>String(a.activity_date||'').localeCompare(String(b.activity_date||''))||Number(a.sort_order||0)-Number(b.sort_order||0));}
function eventCard(event){const acts=activityForEvent(event);return `<article class="v3-event"><div class="v3-event-top"><div class="v3-event-code">${esc(event.code)}</div><div><h3>${esc(event.name)}</h3><p class="v3-event-desc">${esc(event.description||'')}</p></div><div class="v3-event-date"><small>крайний срок</small>${formatDate(event.due_date)}<br><span>${daysText(event.due_date)}</span></div></div><div class="v3-event-stats"><div class="v3-stat"><strong>${Number(event.actual_unique_participants||0)}/${Number(event.plan_unique_participants||0)}</strong><span>уникальные</span></div><div class="v3-stat"><strong>${Number(event.actual_repeat_participants||0)}/${Number(event.plan_repeat_participants||0)}</strong><span>повторные</span></div><div class="v3-stat"><strong>${Number(event.actual_publications||0)}/${Number(event.plan_publications||0)}</strong><span>публикации</span></div><div class="v3-stat"><strong>${Number(event.actual_views||0).toLocaleString('ru-RU')}/${Number(event.plan_views||0).toLocaleString('ru-RU')}</strong><span>просмотры</span></div></div><div class="v3-event-footer"><span class="v3-status ${esc(event.status)}">${esc(label(event.status))}</span><div class="v3-event-actions"><button class="v3-btn-small" data-activities="${event.id}">${acts.length} активностей</button>${RIGHTS.event?`<button class="v3-btn-small primary" data-edit-event="${event.id}">Внести факт</button>`:''}</div></div></article>`;}
function renderCalendar(){
  const next=nextOpenEvent(); const repeat=data.events.reduce((s,e)=>s+Number(e.plan_repeat_participants||0),0)||220;
  app.innerHTML=pageHead('Календарь проекта','Дашборд сроков, показателей и рабочих активностей.',RIGHTS.event?'<button class="btn btn-primary" data-new-event>+ Добавить этап</button>':'')+`
    <div class="v3-calendar-toolbar"><div class="v3-calendar-summary"><strong>${data.events.length}</strong><span>официальных этапов</span></div><div class="v3-calendar-summary"><strong>${next?formatDate(next.due_date):'—'}</strong><span>ближайший крайний срок</span></div><div class="v3-calendar-summary"><strong>1 000 + ${repeat}</strong><span>уникальные и повторные участия</span></div><div class="v3-calendar-summary"><strong>57 / 52 000</strong><span>публикации и просмотры</span></div></div>
    <div class="v3-event-grid">${data.events.map(eventCard).join('')}</div>`;
  app.querySelector('[data-new-event]')?.addEventListener('click',()=>editEvent());
  app.querySelectorAll('[data-activities]').forEach(b=>b.onclick=()=>showActivities(data.events.find(e=>e.id===b.dataset.activities)));
  app.querySelectorAll('[data-edit-event]').forEach(b=>b.onclick=()=>editEvent(data.events.find(e=>e.id===b.dataset.editEvent)));
}

function openModal(title,html,onSave=null){document.getElementById('modalTitle').textContent=title;modalBody.innerHTML=html;modalFoot.innerHTML=onSave?'<button class="btn btn-secondary" data-cancel>Отмена</button><button class="btn btn-primary" data-save>Сохранить</button>':'<button class="btn btn-secondary" data-cancel>Закрыть</button>';modal.classList.remove('hidden');modal.querySelector('[data-cancel]').onclick=closeModal;if(onSave)modal.querySelector('[data-save]').onclick=async()=>{const btn=modal.querySelector('[data-save]');btn.disabled=true;try{await onSave(new FormData(modalBody.querySelector('form')));closeModal();await renderPage();toast('Сохранено');}catch(e){toast(e.message||'Не удалось сохранить','error');}finally{btn.disabled=false;}};}
function closeModal(){modal.classList.add('hidden');modalBody.innerHTML='';modalFoot.innerHTML='';}
function showActivities(event){const acts=activityForEvent(event);openModal(event.name,`<div class="v3-modal-activities">${acts.length?acts.map(a=>`<article class="v3-activity"><div class="v3-activity-date">${formatDate(a.activity_date)}</div><div><strong>${esc(a.title)}</strong><p>${Number(a.plan_unique_participants||0)} уник. · ${Number(a.plan_repeat_participants||0)} повтор. · ${Number(a.plan_publications||0)} публикаций · ${Number(a.plan_views||0).toLocaleString('ru-RU')} просмотров</p></div><div class="v3-activity-owner"><strong>Ответственный</strong><br>${esc(a.lead_name||'не назначен')}</div></article>`).join(''):'<div class="v3-empty">Рабочие активности пока не добавлены.</div>'}</div>`);}
function field(name,title,value='',type='text',extra=''){return `<div class="form-group"><label>${esc(title)}</label><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;}
function editEvent(item={}){openModal(item.id?'Фактические данные этапа':'Новый этап',`<form class="form-grid">${field('code','Код',item.code||'')}${field('name','Название',item.name||'')}${field('due_date','Крайний срок',item.due_date||'','date')}<div class="form-group"><label>Статус</label><select name="status">${['planned','preparing','in_progress','completed','cancelled'].map(s=>`<option value="${s}" ${s===item.status?'selected':''}>${label(s)}</option>`).join('')}</select></div>${field('actual_unique_participants','Факт: уникальные',item.actual_unique_participants||0,'number')}${field('actual_repeat_participants','Факт: повторные',item.actual_repeat_participants||0,'number')}${field('actual_publications','Факт: публикации',item.actual_publications||0,'number')}${field('actual_views','Факт: просмотры',item.actual_views||0,'number')}</form>`,async fd=>{const row=Object.fromEntries(fd);['actual_unique_participants','actual_repeat_participants','actual_publications','actual_views'].forEach(k=>row[k]=Number(row[k]||0));row.project_id=projectId;const r=item.id?await supabase.from('events').update(row).eq('id',item.id):await supabase.from('events').insert({...row,sort_order:data.events.length+1});if(r.error)throw r.error;});}

function renderMedia(){const views=data.publications.reduce((s,p)=>s+Number(p.views||0),0);app.innerHTML=pageHead('Публикации',`${data.publications.length}/${project.plan_publications} публикаций · ${views.toLocaleString('ru-RU')}/${Number(project.plan_views).toLocaleString('ru-RU')} просмотров.`,RIGHTS.media?'<button class="btn btn-primary" data-add-publication>+ Публикация</button>':'')+`<div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>Дата</th><th>Площадка</th><th>Материал</th><th>Просмотры</th><th>Ссылка</th></tr></thead><tbody>${data.publications.map(p=>`<tr><td>${formatDate(p.published_at)}</td><td>${esc(p.platform||p.media_name||'')}</td><td><strong>${esc(p.title||'Без названия')}</strong></td><td>${Number(p.views||0).toLocaleString('ru-RU')}</td><td>${p.url?`<a class="link" href="${esc(p.url)}" target="_blank" rel="noopener">Открыть</a>`:'—'}</td></tr>`).join('')||'<tr><td colspan="5"><div class="v3-empty">Публикаций пока нет</div></td></tr>'}</tbody></table></div>`;app.querySelector('[data-add-publication]')?.addEventListener('click',editPublication);}
function editPublication(){openModal('Новая публикация',`<form class="form-grid">${field('title','Заголовок')}${field('platform','Площадка','ВКонтакте')}${field('published_at','Дата',today(),'date')}${field('views','Просмотры',0,'number')}${field('url','Активная ссылка','','url','required')}</form>`,async fd=>{const row=Object.fromEntries(fd);row.project_id=projectId;row.views=Number(row.views||0);row.published_at=new Date(row.published_at).toISOString();const r=await supabase.from('publications').insert(row);if(r.error)throw r.error;});}
function renderBudget(){const actual=data.budget.reduce((s,b)=>s+Number(b.actual_amount||0),0);app.innerHTML=pageHead('Бюджет',`${money(actual)} освоено из ${money(project.plan_budget)}.`)+`<div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>Код</th><th>Статья</th><th>План</th><th>Факт</th><th>Статус</th><th></th></tr></thead><tbody>${data.budget.map(b=>`<tr><td>${esc(b.code)}</td><td><strong>${esc(b.name)}</strong><br><span class="subtle">${esc(b.category||'')}</span></td><td>${money(b.planned_amount)}</td><td>${money(b.actual_amount)}</td><td>${esc(label(b.status))}</td><td>${RIGHTS.finance?`<button class="v3-btn-small" data-budget="${b.id}">Внести факт</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;app.querySelectorAll('[data-budget]').forEach(btn=>btn.onclick=()=>editBudget(data.budget.find(b=>b.id===btn.dataset.budget)));}
function editBudget(item){openModal(`Факт по ${item.code}`,`<form class="form-grid">${field('actual_amount','Фактическая сумма',item.actual_amount||0,'number','step="0.01"')}<div class="form-group"><label>Статус</label><select name="status">${['planned','contracting','ordered','paid','closed'].map(s=>`<option value="${s}" ${s===item.status?'selected':''}>${label(s)}</option>`).join('')}</select></div>${field('supplier','Поставщик',item.supplier||'')}</form>`,async fd=>{const row=Object.fromEntries(fd);row.actual_amount=Number(row.actual_amount||0);const r=await supabase.from('budget_items').update(row).eq('id',item.id);if(r.error)throw r.error;});}

function renderTeam(){const [lead,...others]=data.team;app.innerHTML=pageHead('Команда проекта','Рабочая структура и зоны ответственности.',RIGHTS.owner?'<button class="btn btn-primary" data-add-member>+ Доступ пользователю</button>':'')+`${lead?`<section class="v3-team-lead"><div class="v3-avatar">${esc(initials(lead.full_name))}</div><div><h3>${esc(lead.full_name)}</h3><div class="v3-team-role">${esc(lead.role_title||'')}</div></div><p>${esc(lead.responsibility||'')}</p><span class="v3-focus">${esc(lead.focus||'')}</span></section>`:''}<div class="v3-team-grid">${others.map(m=>`<article class="v3-team-member ${m.full_name==='Анастасия Таран'?'highlight':''}"><div class="v3-avatar">${esc(initials(m.full_name))}</div><h3>${esc(m.full_name)}</h3><div class="v3-team-role">${esc(m.role_title||'')}</div><p>${esc(m.responsibility||'')}</p><span class="v3-team-tag">${esc(m.focus||'')}</span></article>`).join('')}</div>${RIGHTS.management?`<section class="v3-access"><h3>Учётные записи и права доступа</h3><div class="v3-access-grid">${data.members.map(m=>`<div class="v3-access-card"><strong>${esc(m.profile?.full_name||m.invited_email||'Пользователь')}</strong><span>${esc(m.profile?.email||m.invited_email||'')} · ${esc(ROLE_LABELS[m.role]||m.role)}</span></div>`).join('')||'<div class="v3-empty">Дополнительных пользователей пока нет</div>'}</div></section>`:''}`;app.querySelector('[data-add-member]')?.addEventListener('click',addMember);}
function addMember(){openModal('Добавить пользователя',`<form class="form-grid">${field('email','E-mail зарегистрированного пользователя','','email','required')}<div class="form-group"><label>Роль</label><select name="role">${['manager','finance','media','organizer','mentor','viewer'].map(r=>`<option value="${r}">${ROLE_LABELS[r]}</option>`).join('')}</select></div></form>`,async fd=>{const r=await supabase.rpc('add_existing_project_member',{p_project_id:projectId,p_email:fd.get('email'),p_role:fd.get('role')});if(r.error)throw r.error;});}
function renderReport(){const verified=data.requirements.filter(r=>r.status==='verified').length;app.innerHTML=pageHead('Итоговая отчётность',`Проверено ${verified} из ${data.requirements.length} требований.`)+`<div class="v3-grid-main"><section class="v3-card"><div class="v3-card-head"><h3>Контрольные требования</h3><p>Приложения и доказательства.</p></div><div class="v3-card-body">${data.requirements.map(r=>`<div class="v3-alert"><span class="v3-alert-icon">${r.appendix_number||'✓'}</span><div><strong>${esc(r.title)}</strong><p>${esc(r.description||'')}</p></div></div>`).join('')||'<div class="v3-empty">Требования пока не загружены</div>'}</div></section><section class="v3-card"><div class="v3-card-head"><h3>Черновики разделов</h3><p>Содержательная часть отчёта.</p></div><div class="v3-card-body">${data.sections.map(s=>`<div class="v3-alert"><span class="v3-alert-icon">§</span><div><strong>${esc(s.title)}</strong><p>${esc((s.content||'Не заполнено').slice(0,170))}</p></div></div>`).join('')||'<div class="v3-empty">Разделы пока не созданы</div>'}</div></section></div>`;}

const renderers={dashboard:renderDashboard,calendar:renderCalendar,media:renderMedia,budget:renderBudget,team:renderTeam,report:renderReport};
async function renderPage(){await loadData();renderNav();(renderers[currentPage]||renderDashboard)();}
function renderUserMenu(){const host=document.querySelector('.topbar-actions');const box=document.createElement('div');box.className='user-menu';box.innerHTML=`<div><strong>${esc(session.user.user_metadata?.full_name||session.user.email)}</strong><span>${esc(ROLE_LABELS[role]||role)}</span></div><button class="btn btn-secondary" data-signout>Выйти</button>`;host.prepend(box);box.querySelector('[data-signout]').onclick=()=>supabase.auth.signOut();}
function fatal(error){console.error(error);setSync('Ошибка загрузки','error');app.innerHTML=`<div class="callout"><strong>Не удалось загрузить панель</strong><p>${esc(error.message||error)}</p><button class="btn btn-primary" data-reload>Повторить</button></div>`;app.querySelector('[data-reload]').onclick=()=>location.reload();}
modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-action="close-modal"]'))closeModal();});
document.getElementById('menuButton').onclick=()=>document.getElementById('sidebar').classList.toggle('open');
document.querySelector('[data-action="backup"]').onclick=async()=>{await loadData();const blob=new Blob([JSON.stringify({project,data,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`agitbrigada-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
document.querySelector('[data-action="quick-add"]').onclick=()=>{location.hash=RIGHTS.event?'calendar':RIGHTS.media?'media':'dashboard';};
window.addEventListener('hashchange',()=>{currentPage=location.hash.slice(1)||'dashboard';if(!PAGES.some(([id])=>id===currentPage)){location.hash='dashboard';return;}renderPage().catch(fatal);});

try{renderNav();await loadProject();renderUserMenu();await renderPage();}catch(error){fatal(error);}
const channel=supabase.channel(`agitbrigada-v3-${projectId}`).on('postgres_changes',{event:'*',schema:'public'},payload=>{const changed=payload.new?.project_id||payload.old?.project_id;if(changed===projectId){clearTimeout(window.__agitV3Timer);window.__agitV3Timer=setTimeout(()=>renderPage().catch(fatal),700);}}).subscribe();
window.addEventListener('beforeunload',()=>supabase.removeChannel(channel));
