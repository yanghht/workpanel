'use strict';

// Локальная версия: без сервера, внешних библиотек и сетевых запросов.
const STORAGE_KEY = 'teacher-diary-local-v1';
const SUBJECTS = ['Теория вероятностей и математическая статистика', 'Дискретная математика с элементами математической логики', 'Элементы высшей математики', 'Математические методы решения прикладных профессиональных задач'];
const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const TIMES = ['08:00–09:30', '09:40–11:10', '11:30–13:00', '13:10–14:40', '14:50–16:20', '16:30–18:00', '18:10–19:40'];
const ATTENDANCE = ['', 'Присутствует', 'Отсутствует', 'Опоздал', 'Уважительная причина'];
const GRADES = ['', '2', '3', '4', '5', 'Зачёт', 'Незачёт'];
const RESULTS = ['', 'Допущен', 'Не допущен', '2', '3', '4', '5', 'Зачёт', 'Незачёт', 'Неявка', 'Пересдача'];
const $ = s => document.querySelector(s);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const uid = () => typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
const today = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Moscow'}).format(new Date());
function normalizeCalendar(d) {
  d.tasks ||= [];
  d.settings ||= {anchor:'2026-11-09'};
  if (!d.settings.calendarVersion && d.settings.anchor==='2026-09-07') d.settings.anchor='2026-11-09';
  d.settings.calendarVersion=2;
  return importPhotoSchedule(d);
}
function weekOf(date) {
  const n = Math.floor((Date.parse(date + 'T12:00:00Z') - Date.parse((data?.settings?.anchor || '2026-11-09') + 'T12:00:00Z')) / 604800000);
  return ((n % 2) + 2) % 2 + 1;
}

// Данные из i.webp: верхняя половина ячейки — неделя 1, нижняя — 2.
// Обрезанные номера групп намеренно не восстановлены догадками.
function photoSchedule() {
  const rows=[];
  const add=(weeks,day,pair,subject,type,groups,room,partial=false)=>{
    for(const week of weeks) rows.push({id:week-1+'-'+(pair-1)+'-'+day,week,day,pair,subject,type,groups,group:groups[0]||'',room,sourceNote:partial?'На изображении обрезана часть названий групп. Список неполный.':''});
  };
  const g=(year,kind,...numbers)=>numbers.map(n=>year+'-СПО-'+kind+'-'+String(n));
  const is=(year,...n)=>g(year,'ИСиП',...n),sis=(year,...n)=>g(year,'СиСА',...n),zu=(year,...n)=>g(year,'ЗУ',...n);
  const both=[1,2];
  add(both,0,1,0,'Практика',is(24,2),'1-236');
  add(both,0,2,0,'Практика',is(24,7),'1-103',true);
  add(both,0,3,0,'Практика',is(24,8),'1-104');
  add([1],0,4,1,'Практика',sis(25,3),'1-227',true);
  add([2],0,4,1,'Практика',sis(25,2),'1-227');
  add(both,0,5,0,'Практика',is(24,5),'1-236');
  add(both,0,6,0,'Практика',is(24,4),'1-236');
  add(both,0,7,3,'Практика',zu(25,2),'4-8');
  add([1],1,1,0,'Лекция',is(24,7),'1-308',true);
  add([2],1,1,0,'Лекция',is(24,1),'1-303',true);
  add(both,1,2,0,'Практика',is(24,1),'4-15');
  add([1],1,3,0,'Практика',is(24,3),'1-227');
  add([2],1,4,3,'Практика',zu(25,1),'4-10');
  add([1],1,5,1,'Лекция',[...sis(26,3),...sis(25,1,2,3,4)],'1-301');
  add([2],1,5,1,'Практика',is(25,8),'2-401');
  add([1],1,6,3,'Лекция',[...zu(26,4),...zu(25,1,2,3)],'1-101');
  add([1],1,7,3,'Практика',zu(25,1),'4-2');
  add([1],3,3,2,'Практика',is(25,3),'1-232');
  add([2],3,3,2,'Практика',is(25,1),'1-227');
  add([1],3,4,1,'Практика',is(25,8),'1-212');
  add([2],3,4,2,'Практика',is(25,6),'2-412');
  add(both,3,5,3,'Практика',[...zu(26,4),...zu(25,3)],'4-4');
  add([1],3,6,1,'Практика',[...sis(26,3),...sis(25,1)],'1-236');
  add([2],3,6,0,'Лекция',is(24,4,5,6),'1-303');
  add(both,3,7,0,'Практика',is(24,6),'1-236');
  add([2],4,2,0,'Практика',is(24,3),'1-102');
  add([1],4,4,2,'Лекция',is(25,1),'1-302',true);
  add([2],4,4,1,'Лекция',is(25,7),'1-225');
  add([1],4,5,2,'Практика',is(25,2),'1-131');
  add([2],4,5,2,'Практика',is(25,4),'1-225');
  add(both,4,6,2,'Практика',is(25,5),'2-408');
  add([1],5,5,2,'Лекция',is(25,4,5,6),'1-202');
  add([2],5,5,1,'Лекция',is(25,7),'1-101',true);
  add([1],5,6,1,'Практика',is(25,7),'2-410');
  return rows;
}
function importPhotoSchedule(d) {
  if(d.settings.photoImportVersion===1)return false;
  const normalize=name=>name.toLocaleLowerCase('ru-RU').replaceAll('сиса','сиса').replace(/-(0+)([1-9])/g,'-$2');
  for(const source of photoSchedule()) {
    const groups=source.groups.map(name=>{
      let group=d.groups.find(g=>normalize(g.name)===normalize(name));
      if(!group){group={id:name,name:name.replace(/-(\d+)$/,(_,n)=>'-'+n.padStart(2,'0')),students:[]};d.groups.push(group);}
      return group.id;
    });
    const existing=d.schedule.find(s=>s.week===source.week&&s.day===source.day&&s.pair===source.pair);
    if(!existing){d.schedule.push({...source,groups,group:groups[0]||''});continue;}
    const unassigned=!(existing.groups?.length||existing.group);
    if(unassigned){existing.groups=groups;existing.group=groups[0]||'';existing.sourceNote=source.sourceNote;if(!existing.room){existing.subject=source.subject;existing.type=source.type;}}
    if(!existing.room)existing.room=source.room;
  }
  d.settings.photoImportVersion=1;
  return true;
}

function seed() {
  const groups = [];
  for (const [prefix, count] of [['25-СПО-ИСиП',8], ['24-СПО-ИСиП',8], ['25-СПО-СиСА',4], ['25-СПО-ЗУ',4]]) {
    for (let i=1; i<=count; i++) groups.push({id:prefix+'-'+i, name:prefix+'-'+String(i).padStart(2,'0'), students:[]});
  }
  const patterns = [
    [['0п','0л','','','',''],['0п','0п','','','',''],['0п','0п','','2п','',''],['1п','','','1п','2л',''],['0п','1л','','3п','2п','2л'],['0п','3л','','1л','2п','1п'],['3п','3п','','0п','','']],
    [['0п','0л','','','',''],['0п','0п','','','0п',''],['0п','','','2п','',''],['1п','3п','','2п','1п',''],['0п','1п','','3п','2п','1л'],['0п','','','0л','',''],['3п','','','0п','','']]
  ];
  const schedule = patterns.flatMap((week,w) => week.flatMap((row,p) => row.flatMap((x,d) => x ? [{id:`${w}-${p}-${d}`, week:w+1, day:d, pair:p+1, subject:Number(x[0]), type:x[1]==='л'?'Лекция':'Практика', group:'', room:''}] : [])));
  return {groups, schedule, lessons:{}, exams:[], tasks:[], settings:{anchor:'2026-11-09'}};
}
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const isString = x => typeof x === 'string';
const isDate = x => isString(x) && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
function validData(d) {
  const subject = x => Number.isInteger(x) && x>=0 && x<4;
  const pair = x => Number.isInteger(x) && x>=1 && x<=7;
  return isObject(d) && (d.settings===undefined || (isObject(d.settings) && isDate(d.settings.anchor) && new Date(d.settings.anchor+'T12:00:00Z').getUTCDay()===1)) && (d.tasks===undefined || (Array.isArray(d.tasks) && d.tasks.every(t=>isObject(t)&&isString(t.id)&&isString(t.text)&&isDate(t.date)&&typeof t.done==='boolean'))) && Array.isArray(d.groups) && d.groups.every(g => isObject(g) && isString(g.id) && isString(g.name) && Array.isArray(g.students) && g.students.every(s => isObject(s) && isString(s.id) && isString(s.name)))
    && Array.isArray(d.schedule) && d.schedule.every(s => isObject(s) && isString(s.id) && [1,2].includes(s.week) && Number.isInteger(s.day) && s.day>=0 && s.day<=5 && pair(s.pair) && subject(s.subject) && isString(s.type) && isString(s.group) && (s.groups===undefined || (Array.isArray(s.groups)&&s.groups.every(isString))) && isString(s.room))
    && isObject(d.lessons) && Object.values(d.lessons).every(l => isObject(l) && isString(l.group) && isDate(l.date) && pair(l.pair) && subject(l.subject) && isString(l.topic) && isString(l.homework) && isObject(l.marks) && Object.values(l.marks).every(m => isObject(m) && ATTENDANCE.includes(m.attendance) && GRADES.includes(m.grade) && isString(m.note)))
    && Array.isArray(d.exams) && d.exams.every(e => isObject(e) && isString(e.id) && isString(e.group) && subject(e.subject) && isDate(e.date) && isString(e.type) && isObject(e.results) && Object.values(e.results).every(x => RESULTS.includes(x)));
}

let data = seed(), dirty = false, status = 'Автосохранение включено · хранение в этом браузере', loadError = '';
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (!validData(parsed)) throw new Error('Сохранённые данные имеют неизвестный формат');
    data = parsed;
    status = 'Журнал загружен из этого браузера';
  }
} catch (e) { loadError = 'Не удалось прочитать локальный журнал: '+e.message+'. Перед сохранением сделайте резервную копию.'; }
const importedPhoto=normalizeCalendar(data);
const state = {from:today().slice(0,7)+'-01', to:today(), tab:'Сегодня', date:today(), week:weekOf(today()), group:data.groups[0]?.id || '', subject:0, pair:1, examId:''};
let editSlot = null;
function activeGroup() { return data.groups.find(g => g.id===state.group); }
function lessonKey() { return `${state.group}|${state.date}|${state.subject}|${state.pair}`; }
function lesson(create=false) {
  const key = lessonKey();
  const l = data.lessons[key] || {group:state.group, date:state.date, subject:state.subject, pair:state.pair, topic:'', homework:'', marks:{}};
  if (create) data.lessons[key] = l;
  return l;
}
function changed() {
  dirty=true;
  save(true);
}
function updateStatus() { $('#save-status').textContent=status; $('#save-button').disabled=!dirty; }
function save(automatic=false) {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (lastStored !== current) {
      if (automatic) {
        status='Не сохранено: журнал изменён в другой вкладке. Скачайте копию и обновите страницу либо нажмите «Сохранить».';
        updateStatus();
        return false;
      }
      if (!confirm('Журнал изменён в другой вкладке. Заменить его текущей версией? Сначала можно отменить и сделать резервную копию.')) return false;
    }
    if (loadError) {
      if (automatic) {
        status='Автосохранение остановлено: прежние данные не удалось прочитать. Сделайте резервную копию и нажмите «Сохранить».';
        updateStatus();
        return false;
      }
      if (!confirm('Чтение прежнего журнала завершилось ошибкой. Сохранение заменит локальные данные. Продолжить?')) return false;
    }
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized); lastStored=serialized;
    dirty=false; loadError='';
    status='Автоматически сохранено · '+new Date().toLocaleTimeString('ru-RU');
    updateStatus();
    return true;
  } catch(e) {
    status='Не удалось сохранить: '+e.message+'. Скачайте резервную копию.';
    updateStatus();
    if (!automatic) alert(status);
    return false;
  }
}
let lastStored=null;
try { lastStored=localStorage.getItem(STORAGE_KEY); } catch {}
window.addEventListener('beforeunload', e => { if(dirty) { e.preventDefault(); e.returnValue=''; } });
window.addEventListener('pagehide', () => { if(dirty) save(true); });
document.addEventListener('visibilitychange', () => { if(document.visibilityState==='hidden' && dirty) save(true); });
window.addEventListener('storage', e => {
  if(e.key===STORAGE_KEY) { status='Журнал изменён в другой вкладке. Сделайте копию перед обновлением страницы.'; updateStatus(); }
});
function options(values, selected, empty='—') { return values.map(x => `<option value="${escapeHTML(x)}" ${String(x)===String(selected)?'selected':''}>${escapeHTML(x || empty)}</option>`).join(''); }
function selectField(label, name, values, selected) {
  return `<label>${label}<select data-filter="${name}">${values.map(([value,text])=>`<option value="${escapeHTML(value)}" ${String(value)===String(selected)?'selected':''}>${escapeHTML(text)}</option>`).join('')}</select></label>`;
}
function groupSelect() { return selectField('Группа','group',data.groups.map(g=>[g.id,g.name]),state.group); }
function subjectSelect() { return selectField('Предмет','subject',SUBJECTS.map((x,i)=>[i,x]),state.subject); }
function download(name, content, type='application/json;charset=utf-8') {
  const url=URL.createObjectURL(new Blob(['\uFEFF'+content], {type}));
  const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function slotGroups(slot) { return [...new Set(slot.groups ?? (slot.group ? [slot.group] : []))]; }
function slotGroupNames(slot) { return slotGroups(slot).map(groupName).join(', ') || 'Группы не назначены'; }
function slotGroupLinks(slot) { return slotGroups(slot).map(id=>`<button class="group-journal" data-open="${escapeHTML(slot.id)}" data-open-group="${escapeHTML(id)}">${escapeHTML(groupName(id))} →</button>`).join(''); }
let scheduleDay=today();
function syncScheduleDay() { if(scheduleDay!==today()){scheduleDay=today();state.week=weekOf(scheduleDay);return true;}return false; }
window.addEventListener('focus',()=>{if(syncScheduleDay())render();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&syncScheduleDay())render();});
if(typeof setInterval==='function')setInterval(()=>{if(syncScheduleDay())render();},60000);
function groupName(id) { return data.groups.find(g=>g.id===id)?.name || 'Группа не назначена'; }
function render() {
  syncScheduleDay();
  const titles={'Сегодня':'Ваш учебный день','Расписание':'Расписание занятий','Журнал':'Электронный журнал','Группы':'Учебные группы','Аттестация':'Зачёты и экзамены','Сводка':'Успеваемость и посещаемость','Дела':'Подготовка к занятиям'};
  const subtitles={'Сегодня':'Пары, студенты и важные дела — в одном месте.','Расписание':'Две недели из вашего расписания. Нажмите на пару для перехода в журнал.','Журнал':'Посещаемость, оценки и содержание каждого занятия.','Группы':'Добавляйте студентов списком, по одному ФИО на строку.','Аттестация':'Отдельные ведомости и результаты студентов.','Сводка':'Оценки и пропуски по группе, предмету и периоду.','Дела':'Темы, материалы и небольшие задачи к следующей паре.'};
  $('#app').innerHTML=`<div class="shell"><aside><div class="brand"><span>▤</span><div>Мой журнал<small>Кабинет преподавателя</small></div></div><nav>${['Сегодня','Расписание','Журнал','Группы','Аттестация','Сводка','Дела'].map((t,i)=>`<button data-tab="${t}" class="${state.tab===t?'selected':''}"><span aria-hidden="true">${['◷','▦','▤','♙','✓','▥','☑'][i]}</span>${t}</button>`).join('')}</nav><div class="sidebar-bottom"><span class="avatar">ЯГ</span><div>Гаркушин Я.В.<small>Локальная версия</small></div></div></aside><main><header><div class="crumb">Кабинет преподавателя <span>/ ${state.tab}</span></div><span>Хранение в этом браузере</span></header><div class="page"><div class="heading"><div><p class="eyebrow">2026 / 2027 УЧЕБНЫЙ ГОД</p><h1>${titles[state.tab]}</h1><p class="muted">${subtitles[state.tab]}</p></div><div class="actions"><button data-action="print">Печать</button><button id="save-button" class="primary" data-action="save">Сохранить</button></div></div><div id="save-status" class="save-status" role="status"></div>${loadError?`<div class="error" role="alert">${escapeHTML(loadError)}</div>`:''}<div class="workspace">${renderContent()}</div><footer><span>Данные хранятся только в этом браузере. Для переноса используйте резервную копию.</span><div class="actions"><button data-action="backup">↓ Резервная копия</button><button data-action="restore">↑ Восстановить</button></div></footer></div></main></div>`;
  updateStatus();
}
function renderContent() {
  if(state.tab==='Сводка') return renderSummary();
  if(state.tab==='Дела') return renderTasks();
  if(state.tab==='Сегодня') return renderToday();
  if(state.tab==='Расписание') return renderSchedule();
  if(state.tab==='Группы') return renderGroups();
  if(state.tab==='Аттестация') return renderExams();
  return renderJournal();
}
function renderToday() {
  const day=(new Date(state.date+'T12:00:00Z').getUTCDay()+6)%7;
  const slots=data.schedule.filter(s=>s.week===weekOf(state.date)&&s.day===day).sort((a,b)=>a.pair-b.pair);
  return `<div class="stats"><div><small>Пары на выбранный день</small><strong>${slots.length}<span>пар</span></strong></div><div><small>Ваши группы</small><strong>${data.groups.length}<span>групп</span></strong></div><div><small>Студенты в журнале</small><strong>${data.groups.reduce((n,g)=>n+g.students.length,0)}<span>человек</span></strong></div></div><div class="section-head"><div><h2>Расписание на день</h2><p class="muted">${new Date(state.date+'T12:00:00Z').toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})} · ${weekOf(state.date)} неделя</p></div><input aria-label="Дата" type="date" data-filter="date" value="${state.date}"></div><div class="today-layout"><section class="lesson-list">${slots.length?slots.map(s=>`<article class="lesson-card"><div class="time"><b>${TIMES[s.pair-1].split('–')[0]}</b><span>${TIMES[s.pair-1].split('–')[1]}</span><small>${s.pair} пара</small></div><div class="lesson-info"><span class="tag color${s.subject}">${escapeHTML(s.type)}</span><h3>${SUBJECTS[s.subject]}</h3><p>${escapeHTML(slotGroupNames(s))}${s.room?' · ауд. '+escapeHTML(s.room):''}</p></div>${s.sourceNote?`<small class="source-warning">⚠ ${escapeHTML(s.sourceNote)}</small>`:''}<div class="group-links">${slotGroupLinks(s)}${slotGroups(s).length?'':`<button data-edit-slot="${escapeHTML(s.id)}">Назначить группы</button>`}</div></article>`).join(''):'<div class="empty"><h3>На этот день пар нет</h3><p>Можно заполнить журнал или подготовить ведомости.</p></div>'}</section><section class="panel"><p class="eyebrow">БЫСТРЫЙ СТАРТ</p><h2>Всё готово к занятиям</h2><p class="muted">Добавьте студентов и назначьте группы парам.</p><button class="wide" data-tab="Группы">Добавить студентов →</button><button class="wide" data-tab="Расписание">Настроить пары →</button><div class="note">Текущая неделя определяется автоматически по сегодняшней дате.</div></section></div>`;
}
function renderSchedule() {
  return `<div class="toolbar"><div class="segmented">${[1,2].map(w=>`<button data-week="${w}" class="${state.week===w?'active':''}">${w} неделя</button>`).join('')}</div><button data-new-slot="0,1">+ Добавить пару</button></div><div class="schedule-scroll"><div class="schedule-grid"><div class="day-title">Пара / время</div>${DAYS.map(d=>`<div class="day-title">${d}</div>`).join('')}${TIMES.map((time,p)=>`<div class="schedule-row"><div class="period"><b>${p+1} пара</b><small>${time}</small></div>${DAYS.map((_,day)=>{const s=data.schedule.find(x=>x.week===state.week&&x.day===day&&x.pair===p+1);return `<div class="slot">${s?`<div class="slot-card color${s.subject}"><button class="slot-main" data-open="${escapeHTML(s.id)}"><small>${escapeHTML(s.type)}</small><b>${SUBJECTS[s.subject]}</b><span>${escapeHTML(slotGroupNames(s))}</span>${s.room?`<span>ауд. ${escapeHTML(s.room)}</span>`:''}${s.sourceNote?`<small class="source-warning">⚠ ${escapeHTML(s.sourceNote)}</small>`:''}</button><div class="group-links">${slotGroupLinks(s)}</div><button class="edit-slot" aria-label="Изменить пару" data-edit-slot="${escapeHTML(s.id)}">⚙</button></div>`:`<button class="add-slot" aria-label="Добавить ${p+1} пару: ${DAYS[day]}" data-new-slot="${day},${p+1}">+</button>`}</div>`}).join('')}</div>`).join('')}</div></div><p class="muted">${data.schedule.filter(s=>s.week===state.week).length} пар · ${data.schedule.filter(s=>s.week===state.week).length*2} академических часов. Нажмите ⚙, чтобы назначить группу и аудиторию.</p>`;
}
function renderGroups() {
  const g=activeGroup();
  return `<div class="filters">${groupSelect()}<label>Новая группа<input id="new-group" placeholder="Название группы"></label><button type="button" data-action="add-group">+ Создать группу</button></div><p id="group-message" role="status" aria-live="polite"></p><div class="two-columns"><section class="panel"><h2>Список студентов</h2><p class="muted">По одному ФИО на строку. Новые имена добавятся к текущему списку.</p><textarea id="roster" rows="9" placeholder="Иванов Иван Иванович&#10;Петрова Анна Сергеевна" aria-label="Список студентов"></textarea><button class="primary" data-action="add-students" ${g?'':'disabled'}>+ Добавить в группу</button></section><section class="panel"><h2>${escapeHTML(g?.name||'Нет групп')} <span class="count">${g?.students.length||0}</span></h2>${g?.students.length?`<ol class="roster">${g.students.map(s=>`<li><span>${escapeHTML(s.name)}</span><button data-rename-student="${escapeHTML(s.id)}">Изменить</button></li>`).join('')}</ol>`:'<p class="muted">Список пока не добавлен.</p>'}</section></div>`;
}
function renderJournal() {
  const g=activeGroup(), l=lesson(), students=g?.students||[];
  const history=Object.entries(data.lessons).filter(([,x])=>x.group===state.group&&x.subject===state.subject).sort(([,a],[,b])=>b.date.localeCompare(a.date));
  return `<div class="filters">${groupSelect()}${subjectSelect()}<label>Дата<input type="date" data-filter="date" value="${state.date}"></label>${selectField('Пара','pair',TIMES.map((t,i)=>[i+1,`${i+1} · ${t}`]),state.pair)}</div><div class="panel lesson-details"><label>Тема занятия<input data-lesson="topic" value="${escapeHTML(l.topic)}" placeholder="Введите тему"></label><label>Домашнее задание<input data-lesson="homework" value="${escapeHTML(l.homework)}" placeholder="Задание или комментарий"></label></div><div class="section-head"><h2>${escapeHTML(g?.name||'Выберите группу')} <span class="count">${students.length}</span></h2><div class="actions"><button data-action="all-present" ${students.length?'':'disabled'}>Все присутствуют</button><button data-action="export-csv" ${students.length?'':'disabled'}>↓ CSV для Excel</button></div></div>${students.length?`<div class="table-wrap"><table><thead><tr><th>№</th><th>Студент</th><th>Посещаемость</th><th>Оценка</th><th>Комментарий</th></tr></thead><tbody>${students.map((s,i)=>{const m=l.marks[s.id]||{};return `<tr><td>${i+1}</td><td class="student-name">${escapeHTML(s.name)}</td><td><select data-student="${escapeHTML(s.id)}" data-mark="attendance" aria-label="Посещаемость ${escapeHTML(s.name)}">${options(ATTENDANCE,m.attendance,'Не отмечено')}</select></td><td><select data-student="${escapeHTML(s.id)}" data-mark="grade" aria-label="Оценка ${escapeHTML(s.name)}">${options(GRADES,m.grade)}</select></td><td><input data-student="${escapeHTML(s.id)}" data-mark="note" value="${escapeHTML(m.note||'')}" aria-label="Комментарий ${escapeHTML(s.name)}"></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty"><h3>В группе пока нет студентов</h3><button data-tab="Группы">Добавить студентов</button></div>'}<section class="history"><h2>История занятий</h2>${history.length?history.map(([k,l])=>`<button class="history-row" data-history="${escapeHTML(k)}"><span>${l.date} · ${l.pair} пара</span><span>${escapeHTML(l.topic||'Без темы')}</span><span>→</span></button>`).join(''):'<p class="muted">Здесь появятся заполненные занятия по выбранному предмету.</p>'}</section>`;
}
function renderExams() {
  const exam=data.exams.find(e=>e.id===state.examId);
  return `<section class="panel"><h2>Новая ведомость</h2><div class="filters">${groupSelect()}${subjectSelect()}<label>Форма<select id="exam-type">${options(['Экзамен','Дифференцированный зачёт','Зачёт'],'Экзамен')}</select></label><label>Дата<input id="exam-date" type="date" value="${state.date}"></label><button class="primary" data-action="add-exam" ${state.group?'':'disabled'}>+ Создать</button></div></section><div class="filters">${selectField('Ведомость','examId',[['','Выберите ведомость'],...data.exams.map(e=>[e.id,`${e.date} · ${groupName(e.group)} · ${SUBJECTS[e.subject]} · ${e.type}`])],state.examId)}</div>${exam?`<div class="section-head"><div><h2>${escapeHTML(exam.type)}: ${SUBJECTS[exam.subject]}</h2><p class="muted">${exam.date} · ${escapeHTML(groupName(exam.group))}</p></div><button data-action="export-exam">↓ CSV для Excel</button></div><div class="table-wrap"><table><thead><tr><th>Студент</th><th>Результат</th></tr></thead><tbody>${(data.groups.find(g=>g.id===exam.group)?.students||[]).map(s=>`<tr><td>${escapeHTML(s.name)}</td><td><select data-result="${escapeHTML(s.id)}" aria-label="Результат ${escapeHTML(s.name)}">${options(RESULTS,exam.results[s.id],'Не выставлен')}</select></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><h3>Ведомости под вашим контролем</h3><p>Создайте экзамен или зачёт, чтобы отмечать допуск и результаты.</p></div>'}`;
}
function openSlot(slot, requestedGroup) {
  const groups=slotGroups(slot);
  if(!groups.length) return showSlot(slot);
  const group=groups.includes(requestedGroup)?requestedGroup:groups[0];
  const dt=new Date(state.date+'T12:00:00Z'), day=(dt.getUTCDay()+6)%7;
  dt.setUTCDate(dt.getUTCDate()-day+slot.day+(weekOf(state.date)===slot.week?0:7));
  Object.assign(state,{date:dt.toISOString().slice(0,10),group,subject:slot.subject,pair:slot.pair,tab:'Журнал'}); render();
}
function showSlot(slot) {
  editSlot={...slot};
  const field=(label,name,values,selected)=>`<label>${label}<select name="${name}">${values.map(([v,t])=>`<option value="${escapeHTML(v)}" ${String(v)===String(selected)?'selected':''}>${escapeHTML(t)}</option>`).join('')}</select></label>`;
  $('#slot-fields').innerHTML=field('Неделя','week',[[1,'1 неделя'],[2,'2 неделя']],slot.week)+field('День','day',DAYS.map((d,i)=>[i,d]),slot.day)+field('Пара','pair',TIMES.map((t,i)=>[i+1,`${i+1} · ${t}`]),slot.pair)+field('Предмет','subject',SUBJECTS.map((s,i)=>[i,s]),slot.subject)+`<fieldset class="slot-groups"><legend>Группы на паре</legend>${data.groups.map(g=>`<label><input type="checkbox" name="groups" value="${escapeHTML(g.id)}" ${slotGroups(slot).includes(g.id)?'checked':''}>${escapeHTML(g.name)}</label>`).join('')}<small>Можно выбрать несколько групп.</small></fieldset>`+field('Вид занятия','type',[['Практика','Практика'],['Лекция','Лекция']],slot.type)+`<label>Аудитория<input name="room" value="${escapeHTML(slot.room)}"></label>`;
  $('#slot-error').textContent=slot.sourceNote||''; $('[data-action="delete-slot"]').hidden=!data.schedule.some(s=>s.id===slot.id); $('#slot-dialog').showModal();
}
$('#slot-form').addEventListener('submit',e=>{
  e.preventDefault(); const f=new FormData(e.currentTarget); const s={id:editSlot.id,week:Number(f.get('week')),day:Number(f.get('day')),pair:Number(f.get('pair')),subject:Number(f.get('subject')),groups:[...new Set(f.getAll('groups'))],group:f.getAll('groups')[0]||'',type:f.get('type'),room:f.get('room').trim()};
  if(data.schedule.some(x=>x.id!==s.id&&x.week===s.week&&x.day===s.day&&x.pair===s.pair)) { $('#slot-error').textContent='В это время уже есть пара.'; return; }
  data.schedule=data.schedule.filter(x=>x.id!==s.id); data.schedule.push(s); changed(); $('#slot-dialog').close(); render();
});
function csv(name, rows) {
  // Префикс защищает от исполнения формул при открытии введённого текста в Excel.
  const cell=x=>{let s=String(x??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  download(name,rows.map(r=>r.map(cell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
}
const actions={
  save,
  print:()=>window.print(),
  'add-task':()=>{const text=$('#task-text').value.trim(), date=$('#task-date').value;if(!text)return alert('Введите задачу');if(!isDate(date))return alert('Выберите срок');data.tasks.push({id:uid(),text,date,done:false});changed();render();},
  'summary-csv':()=>{if(state.from>state.to)return alert('Начало периода должно быть раньше окончания');csv('Сводка.csv',[['Студент','Средний балл','Присутствовал','Пропуски','Уважительные','Опоздания','Не отмечено'],...summaryRows().map(r=>[r.name,r.avg,r.present,r.absent,r.excused,r.late,r.unknown])]);},
  backup:()=>download('Резервная-копия-журнала.json',JSON.stringify(data,null,2)),
  restore:()=>$('#backup-file').click(),
  'add-group':()=>{
    const input=$('#new-group'), message=$('#group-message'), name=input.value.trim();
    if(!name){message.textContent='Введите название новой группы в поле «Новая группа».';input.focus();return;}
    if(data.groups.some(g=>g.name.toLocaleLowerCase('ru-RU')===name.toLocaleLowerCase('ru-RU'))){message.textContent='Такая группа уже есть. Выберите её в списке слева.';input.focus();return;}
    const g={id:uid(),name,students:[]};data.groups.push(g);state.group=g.id;changed();render();
    $('#group-message').textContent='Группа «'+name+'» создана. Теперь добавьте студентов.';
  },
  'add-students':()=>{const g=activeGroup();if(!g)return;const names=[...new Set($('#roster').value.split('\n').map(s=>s.trim()).filter(Boolean))];if(!names.length)return;for(const name of names)if(!g.students.some(s=>s.name===name))g.students.push({id:uid(),name});changed();render();},
  'all-present':()=>{const l=lesson(true);for(const s of activeGroup()?.students||[])l.marks[s.id]={...(l.marks[s.id]||{grade:'',note:''}),attendance:'Присутствует'};changed();render();},
  'export-csv':()=>{const l=lesson();csv('Журнал.csv',[['Студент','Дата','Предмет','Пара','Посещаемость','Оценка','Комментарий'],...(activeGroup()?.students||[]).map(s=>[s.name,state.date,SUBJECTS[state.subject],state.pair,l.marks[s.id]?.attendance||'',l.marks[s.id]?.grade||'',l.marks[s.id]?.note||''])]);},
  'add-exam':()=>{const date=$('#exam-date').value;if(!state.group||!isDate(date))return alert('Выберите группу и дату');const e={id:uid(),group:state.group,subject:state.subject,date,type:$('#exam-type').value,results:{}};data.exams.push(e);state.examId=e.id;changed();render();},
  'export-exam':()=>{const e=data.exams.find(e=>e.id===state.examId);if(!e)return;csv('Ведомость.csv',[['Студент','Группа','Предмет','Дата','Форма','Результат'],...(data.groups.find(g=>g.id===e.group)?.students||[]).map(s=>[s.name,groupName(e.group),SUBJECTS[e.subject],e.date,e.type,e.results[s.id]||''])]);},
  'close-slot':()=>$('#slot-dialog').close(),
  'delete-slot':()=>{if(confirm('Удалить эту пару? Записи журнала сохранятся.')){data.schedule=data.schedule.filter(s=>s.id!==editSlot.id);changed();$('#slot-dialog').close();render();}}
};
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.taskToggle){const t=data.tasks.find(t=>t.id===b.dataset.taskToggle);if(t){t.done=!t.done;changed();render();}return;}
  if(b.dataset.taskDelete){if(confirm('Удалить задачу?')){data.tasks=data.tasks.filter(t=>t.id!==b.dataset.taskDelete);changed();render();}return;}
  if(b.dataset.action) return actions[b.dataset.action]?.();
  if(b.dataset.tab) {state.tab=b.dataset.tab;if(state.tab==='Расписание')state.week=weekOf(today());render();}
  if(b.dataset.week) {state.week=Number(b.dataset.week);render();}
  if(b.dataset.open) {const slot=data.schedule.find(s=>s.id===b.dataset.open);if(slot)openSlot(slot,b.dataset.openGroup);}
  if(b.dataset.editSlot) {const slot=data.schedule.find(s=>s.id===b.dataset.editSlot);if(slot)showSlot(slot);}
  if(b.dataset.newSlot) {const [day,pair]=b.dataset.newSlot.split(',').map(Number);showSlot({id:uid(),week:state.week,day,pair,subject:0,type:'Практика',group:'',room:''});}
  if(b.dataset.renameStudent) {const s=activeGroup()?.students.find(x=>x.id===b.dataset.renameStudent);if(!s)return;const name=prompt('ФИО студента',s.name)?.trim();if(name){s.name=name;changed();render();}}
  if(b.dataset.history) {const l=data.lessons[b.dataset.history];if(l){state.date=l.date;state.pair=l.pair;render();}}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='new-group'){e.preventDefault();actions['add-group']();}});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset.filter){const f=el.dataset.filter;if(['date','from','to'].includes(f)&&!isDate(el.value))return;state[f]=['subject','pair'].includes(f)?Number(el.value):el.value;render();}
  if(el.dataset.mark&&el.tagName==='SELECT') updateMark(el);
  if(el.dataset.result){const exam=data.exams.find(x=>x.id===state.examId);if(exam){exam.results[el.dataset.result]=el.value;changed();}}
});
function updateMark(el) { const l=lesson(true);const id=el.dataset.student;l.marks[id]={...(l.marks[id]||{attendance:'',grade:'',note:''}),[el.dataset.mark]:el.value};changed(); }
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset.lesson){lesson(true)[el.dataset.lesson]=el.value;changed();}
  if(el.dataset.mark&&el.tagName==='INPUT')updateMark(el);
});
$('#backup-file').addEventListener('change',async e=>{
  try {const file=e.target.files[0];if(!file)return;if(file.size>10000000)throw Error('Файл больше 10 МБ');const d=JSON.parse((await file.text()).replace(/^\uFEFF/,''));if(!validData(d))throw Error('Неверный формат резервной копии');if(!confirm('Заменить текущий журнал данными из копии? Для отмены сначала скачайте текущую резервную копию.'))return;data=d;normalizeCalendar(data);state.group=d.groups[0]?.id||'';state.examId='';state.week=weekOf(today());changed();render();}catch(err){alert('Не удалось восстановить журнал: '+err.message);}finally{e.target.value='';}
});

function summaryRows() {
  const lessons=Object.values(data.lessons).filter(l=>l.group===state.group&&l.subject===state.subject&&l.date>=state.from&&l.date<=state.to);
  return (activeGroup()?.students||[]).map(student=>{
    const marks=lessons.map(l=>l.marks[student.id]||{}), grades=marks.map(m=>Number(m.grade)).filter(n=>n>=2&&n<=5);
    const count=value=>marks.filter(m=>m.attendance===value).length;
    return {name:student.name,avg:grades.length?(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(2):'—',present:count('Присутствует'),absent:count('Отсутствует'),excused:count('Уважительная причина'),late:count('Опоздал'),unknown:marks.filter(m=>!m.attendance).length};
  });
}
function renderSummary() {
  const rows=summaryRows();
  return `<div class="filters">${groupSelect()}${subjectSelect()}<label>С даты<input type="date" data-filter="from" value="${state.from}"></label><label>По дату<input type="date" data-filter="to" value="${state.to}"></label></div>${state.from>state.to?'<div class="error">Начало периода должно быть раньше окончания.</div>':`<div class="stats"><div><small>Студентов</small><strong>${rows.length}</strong></div><div><small>Пропусков без причины · пар</small><strong>${rows.reduce((n,r)=>n+r.absent,0)}</strong></div><div><small>Незаполненных отметок</small><strong>${rows.reduce((n,r)=>n+r.unknown,0)}</strong></div></div><div class="section-head"><h2>${escapeHTML(groupName(state.group))}</h2><button data-action="summary-csv">↓ CSV для Excel</button></div><div class="table-wrap"><table><thead><tr><th>Студент</th><th>Средний балл</th><th>Присутствовал</th><th>Пропуски</th><th>Уважительные</th><th>Опоздания</th><th>Не отмечено</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="student-name">${escapeHTML(r.name)}</td><td><span class="grade-pill">${r.avg}</span></td><td>${r.present}</td><td class="${r.absent?'absence':''}">${r.absent}</td><td>${r.excused}</td><td>${r.late}</td><td>${r.unknown}</td></tr>`).join('')||'<tr><td colspan="7">Добавьте студентов в разделе «Группы».</td></tr>'}</tbody></table></div><p class="muted">В расчёт входят только созданные записи журнала за период. Одна отметка — одна пара. Средний балл учитывает только оценки 2–5.</p>`}`;
}
function renderTasks() {
  const tasks=[...data.tasks].sort((a,b)=>Number(a.done)-Number(b.done)||a.date.localeCompare(b.date));
  return `<section class="panel"><h2>Что подготовить?</h2><div class="filters"><label class="task-text">Задача<input id="task-text" maxlength="500" placeholder="Например: распечатать самостоятельную для ИСиП-01"></label><label>Срок<input id="task-date" type="date" value="${state.date}"></label><button class="primary" data-action="add-task">+ Добавить</button></div></section><div class="section-head"><h2>Список дел <span class="count">${tasks.filter(t=>!t.done).length} осталось</span></h2></div><div class="task-list">${tasks.map(t=>`<article class="task-card ${t.done?'completed':''}"><button data-task-toggle="${escapeHTML(t.id)}" aria-label="${t.done?'Вернуть в работу':'Выполнить задачу'}" aria-pressed="${t.done}">${t.done?'✓':'○'}</button><div><p>${escapeHTML(t.text)}</p><small class="${!t.done&&t.date<today()?'absence':''}">${t.date}${!t.done&&t.date<today()?' · срок прошёл':''}</small></div><button data-task-delete="${escapeHTML(t.id)}" aria-label="Удалить задачу">×</button></article>`).join('')||'<div class="empty"><h3>Пока всё спокойно</h3><p>Добавьте первое дело к следующему занятию.</p></div>'}</div>`;
}

render();
if(importedPhoto)changed();
