import './timeline-shared.css';

const { supabase, projectId, role } = window.AGIT;
const canEdit = ['owner','manager','organizer'].includes(role);
const projectStart = new Date('2026-08-01T00:00:00');
const projectEnd = new Date('2027-06-30T23:59:59');
const totalMs = projectEnd - projectStart;
const months = ['Авг','Сен','Окт','Ноя','Дек','Янв','Фев','Мар','Апр','Май','Июн'];
const statusLabels = {planned:'План',preparing:'Подготовка',in_progress:'В работе',completed:'Завершено',cancelled:'Отменено'};
let enhancementBusy = false;
let drawer = null;

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const formatDate = value => value ? new Date(`${String(value).slice(0,10)}T00:00:00`).toLocaleDateString('ru-RU') : '—';
const datePos = value => Math.max(0,Math.min(100,((new Date(`${String(value).slice(0,10)}T00:00:00`)-projectStart)/totalMs)*100));
const dateWidth = (start,end) => Math.max(1.2,datePos(end||start)-datePos(start));
const stageNumber = code => Number(String(code||'').replace(/\D/g,'')) || 0;
const stageLabel = code => `Этап ${stageNumber(code)}`;
const progressFromStatus = status => ({planned:0,preparing:35,in_progress:65,completed:100,cancelled:0}[status] ?? 0);

function ensureDrawer(){
  if(drawer)return drawer;
  drawer=document.createElement('div');
  drawer.className='timeline-drawer hidden';
  drawer.innerHTML='<aside class="timeline-drawer-panel"><div class="timeline-drawer-head"><div><h3>Рабочая активность</h3><p>Изменения сохраняются в общей базе проекта.</p></div><button class="timeline-drawer-close" type="button">×</button></div><div class="timeline-drawer-body"></div><div class="timeline-drawer-foot"><button class="timeline-cancel" type="button">Отмена</button><button class="timeline-save" type="button">Сохранить</button></div></aside>';
  document.body.append(drawer);
  drawer.querySelector('.timeline-drawer-close').onclick=closeDrawer;
  drawer.querySelector('.timeline-cancel').onclick=closeDrawer;
  drawer.addEventListener('click',event=>{if(event.target===drawer)closeDrawer();});
  return drawer;
}
function closeDrawer(){drawer?.classList.add('hidden');}
function formField(name,label,value='',type='text',full=false){return `<div class="timeline-form-group ${full?'full':''}"><label>${esc(label)}</label><input name="${name}" type="${type}" value="${esc(value)}"></div>`;}

async function editActivity(activity,refresh){
  if(!canEdit)return;
  if(!activity.id){alert('Эта активность пока отображается из резервного плана. Обновите страницу после выполнения SQL-актуализации.');return;}
  const panel=ensureDrawer();
  panel.querySelector('.timeline-drawer-head h3').textContent=activity.title||'Рабочая активность';
  panel.querySelector('.timeline-drawer-body').innerHTML=`<form class="timeline-form-grid">
    ${formField('title','Название',activity.title||'','text',true)}
    ${formField('activity_date','Дата начала',String(activity.activity_date||'').slice(0,10),'date')}
    ${formField('end_date','Дата окончания',String(activity.end_date||activity.activity_date||'').slice(0,10),'date')}
    ${formField('lead_name','Ответственный',activity.lead_name||'','text',true)}
    ${formField('support_names','Поддержка команды',activity.support_names||'','text',true)}
    ${formField('location','Площадка',activity.location||'','text',true)}
    <div class="timeline-form-group"><label>Статус</label><select name="status">${['planned','preparing','in_progress','completed','cancelled'].map(status=>`<option value="${status}" ${status===activity.status?'selected':''}>${statusLabels[status]}</option>`).join('')}</select></div>
    ${formField('plan_unique_participants','План: уникальные',activity.plan_unique_participants||0,'number')}
    ${formField('plan_repeat_participants','План: повторные',activity.plan_repeat_participants||0,'number')}
    ${formField('plan_publications','План: публикации',activity.plan_publications||0,'number')}
    ${formField('plan_views','План: просмотры',activity.plan_views||0,'number')}
    <div class="timeline-form-group full"><label>Примечание</label><textarea name="notes">${esc(activity.notes||'')}</textarea></div>
  </form>`;
  panel.classList.remove('hidden');
  panel.querySelector('.timeline-save').onclick=async()=>{
    const button=panel.querySelector('.timeline-save');button.disabled=true;
    try{
      const fd=new FormData(panel.querySelector('form'));
      const row=Object.fromEntries(fd);
      ['plan_unique_participants','plan_repeat_participants','plan_publications','plan_views'].forEach(key=>row[key]=Number(row[key]||0));
      if(!row.end_date)row.end_date=null;
      const result=await supabase.from('event_activities').update(row).eq('id',activity.id);
      if(result.error)throw result.error;
      closeDrawer();
      await refresh();
    }catch(error){alert(`Не удалось сохранить: ${error.message}`);}finally{button.disabled=false;}
  };
}

async function fetchTimelineData(){
  const [eventsResult,activitiesResult]=await Promise.all([
    supabase.from('events').select('*').eq('project_id',projectId).order('sort_order'),
    supabase.from('event_activities').select('*').eq('project_id',projectId).order('activity_date').order('sort_order'),
  ]);
  if(eventsResult.error)throw eventsResult.error;
  if(activitiesResult.error)throw activitiesResult.error;
  return {events:eventsResult.data||[],activities:activitiesResult.data||[]};
}

function activityRows(stage,activities){
  return activities.filter(activity=>activity.event_id===stage.id).sort((a,b)=>String(a.activity_date||'').localeCompare(String(b.activity_date||''))||Number(a.sort_order||0)-Number(b.sort_order||0));
}

function makeRow({stage,activity,child=false}){
  const item=activity||stage;
  const status=item.status||stage.status||'planned';
  const start=activity?.activity_date||stage.start_date||stage.due_date;
  const end=activity?.end_date||activity?.activity_date||stage.due_date;
  const title=activity?.title||stage.name;
  const owner=activity?.lead_name||'По карточке этапа';
  const progress=progressFromStatus(status);
  const metrics=activity?`${Number(activity.plan_unique_participants||0)} чел. · ${Number(activity.plan_publications||0)} пуб.`:`${Number(stage.plan_unique_participants||0)} чел. · ${Number(stage.plan_publications||0)} пуб.`;
  return `<div class="timeline-row ${child?'child':'group'}" data-status="${esc(status)}" data-owner="${esc(owner.toLowerCase())}" ${activity?.id?`data-edit-activity="${activity.id}"`:''}>
    <div class="timeline-cell task">${child?'':`<button class="timeline-toggle" data-closed-toggle="${stage.id}">⌄</button><span class="timeline-code">${stageLabel(stage.code)}</span>`}<span>${esc(title)}</span></div>
    <div class="timeline-cell timeline-owner">${esc(owner)}</div>
    <div class="timeline-cell timeline-status"><span class="timeline-status-badge ${esc(status)}">${esc(statusLabels[status]||status)}</span></div>
    <div class="timeline-cell timeline-progress">${progress}%</div>
    <div class="timeline-cell timeline-metric">${esc(metrics)}</div>
    <div class="timeline-track">${child?`<span class="timeline-milestone" style="left:${datePos(start)}%"></span>`:`<span class="timeline-bar ${esc(status)}" style="left:${datePos(start)}%;width:${dateWidth(start,end)}%"><span class="timeline-bar-label">${formatDate(start)} — ${formatDate(end)}</span></span>`}</div>
  </div>`;
}

async function enhanceCalendar(){
  if(location.hash.slice(1)!=='calendar')return;
  const app=document.getElementById('app');
  const toolbar=app?.querySelector('.v3-calendar-toolbar');
  const cards=app?.querySelector('.v3-event-grid');
  if(!app||!toolbar||!cards||document.getElementById('closedTimelineHub')||enhancementBusy)return;
  enhancementBusy=true;
  try{
    const state={...(await fetchTimelineData())};
    const hub=document.createElement('section');
    hub.id='closedTimelineHub';
    hub.className='timeline-shell';
    const owners=[...new Set(state.activities.map(item=>item.lead_name).filter(Boolean))].sort();
    const uniquePlan=state.events.reduce((sum,item)=>sum+Number(item.plan_unique_participants||0),0);
    const repeatPlan=state.events.reduce((sum,item)=>sum+Number(item.plan_repeat_participants||0),0);
    const publicationPlan=state.events.reduce((sum,item)=>sum+Number(item.plan_publications||0),0);
    const viewsPlan=state.events.reduce((sum,item)=>sum+Number(item.plan_views||0),0);
    hub.innerHTML=`
      <div class="timeline-toolbar">
        <div class="timeline-tabs"><button class="timeline-tab active" data-closed-view="timeline">Таймлайн</button><button class="timeline-tab" data-closed-view="stages">Этапы</button><button class="timeline-tab" data-closed-view="list">Список</button></div>
        <div class="timeline-actions"><select class="timeline-filter" data-filter-status><option value="">Все статусы</option>${Object.entries(statusLabels).map(([value,title])=>`<option value="${value}">${title}</option>`).join('')}</select><select class="timeline-filter" data-filter-owner><option value="">Все ответственные</option>${owners.map(owner=>`<option value="${esc(owner.toLowerCase())}">${esc(owner)}</option>`).join('')}</select><div class="timeline-scale"><button class="active" data-scale="months">Месяцы</button><button data-scale="weeks">Недели</button><button data-scale="days">Дни</button></div></div>
      </div>
      <div class="timeline-summary"><div class="timeline-summary-item"><strong>${state.events.length}</strong><span>официальных этапов</span></div><div class="timeline-summary-item"><strong>${state.activities.length}</strong><span>рабочих активностей</span></div><div class="timeline-summary-item"><strong>${uniquePlan.toLocaleString('ru-RU')}</strong><span>уникальных участников</span></div><div class="timeline-summary-item"><strong>${repeatPlan.toLocaleString('ru-RU')}</strong><span>повторных участий</span></div><div class="timeline-summary-item"><strong>${publicationPlan}</strong><span>публикаций</span></div><div class="timeline-summary-item"><strong>${viewsPlan.toLocaleString('ru-RU')}</strong><span>просмотров</span></div></div>
      <div data-closed-panel="timeline"><div class="timeline-viewport"><div class="timeline-board"><div class="timeline-head"><div>Этап / задача</div><div>Ответственный</div><div>Статус</div><div>Прогресс</div><div>Показатели</div><div class="timeline-months">${months.map(month=>`<span>${month}</span>`).join('')}</div></div><div class="timeline-rows">${state.events.map(stage=>makeRow({stage})+activityRows(stage,state.activities).map(activity=>makeRow({stage,activity,child:true})).join('')).join('')}</div></div></div></div>
      <div class="timeline-list-view" data-closed-panel="list"><table class="timeline-list-table"><thead><tr><th>Дата</th><th>Активность</th><th>Этап</th><th>Ответственный</th><th>Статус</th><th>План</th></tr></thead><tbody>${state.activities.map(activity=>{const stage=state.events.find(event=>event.id===activity.event_id);return `<tr ${canEdit?`data-edit-activity="${activity.id}" style="cursor:pointer"`:''}><td>${formatDate(activity.activity_date)}</td><td><strong>${esc(activity.title)}</strong></td><td>${esc(stageLabel(stage?.code))}</td><td>${esc(activity.lead_name||'—')}</td><td>${esc(statusLabels[activity.status]||activity.status)}</td><td>${Number(activity.plan_unique_participants||0)} чел. · ${Number(activity.plan_publications||0)} пуб.</td></tr>`;}).join('')}</tbody></table></div>`;
    toolbar.parentNode.insertBefore(hub,toolbar);
    toolbar.style.display='none';cards.style.display='none';

    const refresh=async()=>{hub.remove();toolbar.style.display='';cards.style.display='';setTimeout(enhanceCalendar,80);};
    hub.querySelectorAll('[data-closed-toggle]').forEach(button=>button.onclick=()=>{const stageId=button.dataset.closedToggle;const stage=state.events.find(item=>item.id===stageId);const children=[...hub.querySelectorAll('.timeline-row.child')].filter(row=>{const activityId=row.dataset.editActivity;return state.activities.find(item=>item.id===activityId)?.event_id===stageId;});const show=children.some(row=>row.hidden);children.forEach(row=>row.hidden=!show);button.textContent=show?'⌃':'⌄';});
    hub.querySelectorAll('.timeline-row.child').forEach(row=>{row.hidden=false;});
    hub.querySelectorAll('[data-edit-activity]').forEach(node=>node.onclick=()=>{const activity=state.activities.find(item=>item.id===node.dataset.editActivity);if(activity)editActivity(activity,refresh);});
    hub.querySelectorAll('[data-closed-view]').forEach(button=>button.onclick=()=>{hub.querySelectorAll('[data-closed-view]').forEach(item=>item.classList.toggle('active',item===button));const view=button.dataset.closedView;hub.querySelector('[data-closed-panel="timeline"]').style.display=view==='timeline'?'':'none';hub.querySelector('[data-closed-panel="list"]').style.display=view==='list'?'block':'none';toolbar.style.display=view==='stages'?'':'none';cards.style.display=view==='stages'?'grid':'none';});
    const applyFilters=()=>{const status=hub.querySelector('[data-filter-status]').value;const owner=hub.querySelector('[data-filter-owner]').value;hub.querySelectorAll('.timeline-row').forEach(row=>{row.style.display=(!status||row.dataset.status===status)&&(!owner||String(row.dataset.owner||'').includes(owner))?'':'none';});};
    hub.querySelector('[data-filter-status]').onchange=applyFilters;hub.querySelector('[data-filter-owner]').onchange=applyFilters;
    hub.querySelectorAll('[data-scale]').forEach(button=>button.onclick=()=>{hub.querySelectorAll('[data-scale]').forEach(item=>item.classList.toggle('active',item===button));const board=hub.querySelector('.timeline-board');board.style.minWidth=button.dataset.scale==='months'?'1220px':button.dataset.scale==='weeks'?'2200px':'3600px';});
  }catch(error){console.error('[closed-timeline]',error);}finally{enhancementBusy=false;}
}

const observer=new MutationObserver(()=>setTimeout(enhanceCalendar,60));
observer.observe(document.getElementById('app'),{childList:true,subtree:false});
window.addEventListener('hashchange',()=>setTimeout(enhanceCalendar,80));
setTimeout(enhanceCalendar,120);
