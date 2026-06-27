import * as XLSX from 'xlsx-js-style';

export const A=window.AGIT;
export const PLAN={name:'Фронтовая агитбригада',recipient:'Брунов Иван Дмитриевич',region:'Республика Карелия',geo:'Кемский муниципальный район',start:'01.08.2026',end:'30.06.2027',events:12,participants:1000,repeat:220,pubs:57,views:52000,budget:920005};
const L={planned:'План',preparing:'Подготовка',in_progress:'В работе',completed:'Завершено',cancelled:'Отменено',contracting:'Договоры',ordered:'Заказано',paid:'Оплачено',closed:'Закрыто',draft:'Черновик',uploaded:'Загружено',verified:'Проверено',rejected:'Отклонено'};
export const fmtDate=v=>{if(!v)return'';const[y,m,d]=String(v).slice(0,10).split('-');return y&&m&&d?`${d}.${m}.${y}`:String(v)};
export const n=v=>Number(v||0);
export const sum=(a,k)=>a.reduce((s,x)=>s+n(x?.[k]),0);
export const yn=v=>v?'Да':'Нет';
export const lab=v=>L[v]||v||'';
const colors={b:'741B28',g:'C69742',p:'FFFDF9',i:'332224',l:'DFD2C5',w:'FFFFFF',c:'F7EFE5',m:'7A6963'};
const bd={top:{style:'thin',color:{rgb:colors.l}},bottom:{style:'thin',color:{rgb:colors.l}},left:{style:'thin',color:{rgb:colors.l}},right:{style:'thin',color:{rgb:colors.l}}};
function st(ws,ref,s){const q=XLSX.utils.decode_range(ref);for(let r=q.s.r;r<=q.e.r;r++)for(let c=q.s.c;c<=q.e.c;c++){const a=XLSX.utils.encode_cell({r,c});if(!ws[a])ws[a]={t:'s',v:''};ws[a].s=JSON.parse(JSON.stringify(s));}}
export function sheet(title,note,heads,rows,widths){const end=XLSX.utils.encode_col(heads.length-1),ws=XLSX.utils.aoa_to_sheet([[title],[note],[],heads,...rows]);ws['!merges']=[XLSX.utils.decode_range(`A1:${end}1`),XLSX.utils.decode_range(`A2:${end}2`)];ws['!cols']=widths.map(wch=>({wch}));ws['!autofilter']={ref:`A4:${end}${rows.length+4}`};ws['!freeze']={xSplit:0,ySplit:4,topLeftCell:'A5',activePane:'bottomLeft',state:'frozen'};st(ws,`A1:${end}1`,{fill:{fgColor:{rgb:colors.b}},font:{bold:true,color:{rgb:colors.w},sz:17},alignment:{vertical:'center'}});st(ws,`A2:${end}2`,{fill:{fgColor:{rgb:colors.c}},font:{italic:true,color:{rgb:colors.m}},alignment:{wrapText:true}});st(ws,`A4:${end}4`,{fill:{fgColor:{rgb:colors.g}},font:{bold:true,color:{rgb:colors.i}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:bd});if(rows.length)st(ws,`A5:${end}${rows.length+4}`,{fill:{fgColor:{rgb:colors.p}},font:{color:{rgb:colors.i}},alignment:{vertical:'top',wrapText:true},border:bd});return ws;}
export function link(ws,cell,url){if(url&&ws[cell]){ws[cell].l={Target:url};ws[cell].s={...(ws[cell].s||{}),font:{color:{rgb:'0563C1'},underline:true}};}}
async function q(t,o,a=true){try{let r=A.supabase.from(t).select('*').eq('project_id',A.projectId);if(o)r=r.order(o,{ascending:a});const x=await r;if(x.error)throw x.error;return x.data||[]}catch(e){console.warn(`[export:${t}]`,e);return[]}}
export async function loadData(){const p=await A.supabase.from('projects').select('*').eq('id',A.projectId).single();if(p.error)throw p.error;const x=await Promise.all([q('events','sort_order'),q('event_activities','activity_date'),q('participants','full_name'),q('participant_attendance','created_at'),q('publications','published_at',false),q('budget_items','code'),q('project_documents','created_at',false),q('report_sections','section_key')]);return{project:p.data,events:x[0],acts:x[1],people:x[2],attendance:x[3],pubs:x[4],budget:x[5],docs:x[6],sections:x[7]};}
