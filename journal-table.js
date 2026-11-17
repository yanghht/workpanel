'use strict';
// The table reads and edits the same lessons as the original single-lesson view.
const journalSingleView=renderJournal;
Object.assign(state,{
  journalMode:savedView?.state?.journalMode==='single'?'single':'table',
  journalSort:['name','grade-desc','grade-asc','absence-desc','absence-asc'].includes(savedView?.state?.journalSort)?savedView.state.journalSort:'name',
  journalPeriod:['all','month','semester','custom'].includes(savedView?.state?.journalPeriod)?savedView.state.journalPeriod:'all',
  journalMonth:/^\d{4}-\d{2}$/.test(savedView?.state?.journalMonth||'')?savedView.state.journalMonth:today().slice(0,7),
  journalSemester:savedView?.state?.journalSemester==='2'?'2':'1',
  journalFrom:isDate(savedView?.state?.journalFrom)?savedView.state.journalFrom:today().slice(0,4)+'-09-01',
  journalTo:isDate(savedView?.state?.journalTo)?savedView.state.journalTo:today()
});
function journalColumns(){
  const month=state.journalMonth;
  const academicYear=Number(today().slice(0,4))-(Number(today().slice(5,7))<9?1:0);
  return Object.entries(data.lessons).filter(([,l])=>{
    if(l.deleted||l.group!==state.group||l.subject!==state.subject)return false;
    if(state.journalPeriod==='month')return l.date.slice(0,7)===month;
    if(state.journalPeriod==='semester')return state.journalSemester==='1'?l.date>=academicYear+'-09-01'&&l.date<=(academicYear+1)+'-01-31':l.date>=(academicYear+1)+'-02-01'&&l.date<=(academicYear+1)+'-08-31';
    if(state.journalPeriod==='custom')return l.date>=state.journalFrom&&l.date<=state.journalTo;
    return true;
  }).sort(([,a],[,b])=>a.date.localeCompare(b.date)||a.pair-b.pair);
}
function journalStudentTotals(student,columns){
  const marks=columns.map(([,l])=>l.marks[student.id]||{});
  const grades=marks.map(m=>m.grade).filter(v=>['2','3','4','5'].includes(String(v))).map(Number);
  const absent=marks.filter(m=>m.attendance==='Отсутствует').length;
  const excused=marks.filter(m=>m.attendance==='Уважительная причина').length;
  return {numericAverage:grades.length?grades.reduce((a,b)=>a+b,0)/grades.length:null,average:grades.length?(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(2).replace('.',','):'—',absent,excused};
}
function journalCellText(mark={}){
  const attendance={'Присутствует':'·','Отсутствует':'Н','Опоздал':'ОП','Уважительная причина':'УП'}[mark.attendance]||'';
  return [mark.grade||'',attendance].filter(Boolean).join(' ')||(mark.note?'✎':'');
}
function journalViewButtons(){
  return `<div class="journal-view-toggle" role="group" aria-label="Вид журнала"><button type="button" data-journal-view="table" aria-pressed="${state.journalMode==='table'}">Таблица группы</button><button type="button" data-journal-view="single" aria-pressed="${state.journalMode==='single'}">Одно занятие</button></div>`;
}
function renderJournalTableContext(){
  return `<div class="journal-table-context">${journalAutoMessage&&journalCurrentGroupIds.length?`<span>${escapeHTML(journalAutoMessage)}</span>`:''}<button type="button" data-action="current-lesson">Текущее занятие</button></div>`;
}
renderJournal=function(){const toolbar='<div class="journal-view-toolbar">'+journalViewButtons()+journalSortControl()+'</div>';if(state.journalMode==='single'){const l=lesson(),key=lessonKey();return toolbar+(l.deleted?renderRemovedSingleLesson(key):journalSingleView()+(data.lessons[key]?'<div class="actions journal-single-tools"><button type="button" class="danger" data-journal-delete="'+escapeHTML(key)+'">Удалить занятие</button></div>':''))+renderDeletedJournalLessons();}return toolbar+renderJournalTable()+renderDeletedJournalLessons();};
function journalLessonType(l){
  if(['Практика','Лекция'].includes(l.type))return l.type;
  const day=(new Date(l.date+'T12:00:00Z').getUTCDay()+6)%7;
  const slot=data.schedule.find(s=>s.week===weekOf(l.date)&&s.day===day&&s.pair===l.pair&&s.subject===l.subject&&(s.groups?.length?s.groups:[s.group]).includes(l.group));
  return ['Практика','Лекция'].includes(slot?.type)?slot.type:/^\s*лекция(?:\s|[.:]|$)/iu.test(l.topic||'')?'Лекция':'Практика';
}
function renderJournalHeader(key,l){
  const kind=journalLessonType(l),safeKey=escapeHTML(key);
  return `<th scope="col" class="journal-date ${l.date===today()?'journal-today':''}" data-journal-date="${l.date}"><div class="journal-date-top"><button type="button" class="journal-date-open" data-journal-lesson="${safeKey}" title="${escapeHTML(l.topic||'Тема не заполнена')}" aria-label="Занятие ${l.date}, ${l.pair} пара"><strong>${l.date.slice(8,10)}.${l.date.slice(5,7)}</strong></button><label class="journal-date-picker" title="Изменить дату занятия"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5M17 3v5M3 11h18M7 15h3M14 15h3"/></svg><input type="date" data-journal-date-change="${safeKey}" value="${l.date}" aria-label="Изменить дату занятия ${l.date}, ${l.pair} пара"></label></div><span class="journal-header-pair">${l.pair} пара</span><select class="journal-type" data-journal-type="${safeKey}" aria-label="Вид занятия ${l.date}, ${l.pair} пара" title="П — практика, Л — лекция"><option value="Практика" ${kind==='Практика'?'selected':''}>П</option><option value="Лекция" ${kind==='Лекция'?'selected':''}>Л</option></select></th>`;
}
function renderJournalTable(){
  const columns=journalColumns(),students=journalSortedStudents(columns);
  let range='';
  if(state.journalPeriod==='month')range=`<label>Месяц<input type="month" data-journal-filter="journalMonth" value="${escapeHTML(state.journalMonth)}"></label>`;
  if(state.journalPeriod==='semester')range=`<label>Полугодие<select data-journal-filter="journalSemester"><option value="1" ${state.journalSemester==='1'?'selected':''}>Первое · сентябрь — январь</option><option value="2" ${state.journalSemester==='2'?'selected':''}>Второе · февраль — август</option></select></label>`;
  if(state.journalPeriod==='custom')range=`<label>С даты<input type="date" data-journal-filter="journalFrom" value="${state.journalFrom}"></label><label>По дату<input type="date" data-journal-filter="journalTo" value="${state.journalTo}"></label>`;
  const invalidRange=state.journalPeriod==='custom'&&state.journalFrom>state.journalTo;
  const headers=columns.map(([key,l])=>renderJournalHeader(key,l)).join('');
  const rows=students.map((s,i)=>{
    const totals=journalStudentTotals(s,columns);
    const cells=columns.map(([key,l])=>{
      const m=l.marks[s.id]||{},text=journalCellText(m);
      const kind=m.attendance==='Отсутствует'?'absent':m.attendance==='Уважительная причина'?'excused':m.attendance==='Опоздал'?'late':m.grade?'graded':m.attendance?'present':'blank';
      const label=[s.name,l.date,l.pair+' пара',m.attendance||'Посещаемость не отмечена',m.grade?'Оценка '+m.grade:'Без оценки',m.note||''].filter(Boolean).join(' · ');
      return `<td class="journal-mark ${l.date===today()?'journal-today':''}"><button type="button" class="journal-cell ${kind}" data-journal-cell="${escapeHTML(key)}" data-journal-student="${escapeHTML(s.id)}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">${escapeHTML(text)}${m.note&&text!=='✎'?'<sup aria-hidden="true">✎</sup>':''}<span class="sr-only">${text?'':'Не отмечено'}</span></button></td>`;
    }).join('');
    return `<tr><th scope="row" class="journal-student"><span class="journal-row-number">${i+1}</span>${escapeHTML(s.name)}</th>${cells}<td class="journal-average">${totals.average}</td><td class="journal-absences" title="Без причины: ${totals.absent}; уважительная причина: ${totals.excused}">${totals.absent+totals.excused}${totals.excused?`<small>УП: ${totals.excused}</small>`:''}</td></tr>`;
  }).join('');
  return `${renderJournalTableContext()}<div class="filters journal-filters">${groupSelect()}${subjectSelect()}<label>Период<select data-journal-filter="journalPeriod">${[['all','Все занятия'],['month','Месяц'],['semester','Полугодие'],['custom','Выбрать даты']].map(([v,t])=>`<option value="${v}" ${state.journalPeriod===v?'selected':''}>${t}</option>`).join('')}</select></label>${range}</div>${invalidRange?'<p class="error" role="alert">Начало периода должно быть раньше окончания.</p>':''}<div class="section-head journal-table-tools"><div><h2>${escapeHTML(activeGroup()?.name||'Выберите группу')}</h2><p class="muted">${students.length} студентов · ${columns.length} занятий</p></div><div class="actions"><button type="button" data-journal-today>К сегодняшнему занятию</button><button type="button" class="primary" data-journal-add ${activeGroup()?'':'disabled'}>+ Занятие</button><button type="button" data-journal-csv ${columns.length&&students.length?'':'disabled'}>↓ CSV</button></div></div><p id="journal-table-message" role="status" class="muted"></p><div class="journal-legend"><span><b>·</b> присутствовал</span><span><b>Н</b> отсутствовал</span><span><b>УП</b> уважительная причина</span><span><b>ОП</b> опоздал</span><span>пусто — не отмечено</span></div>${students.length&&columns.length?`<div class="table-wrap journal-grid-scroll" role="region" aria-label="Таблица журнала группы" tabindex="0"><table class="journal-grid"><caption class="sr-only">${escapeHTML(groupName(state.group))} · ${escapeHTML(SUBJECTS[state.subject])}. Нажмите ячейку для изменения отметок, дату — для темы занятия.</caption><thead><tr><th scope="col" class="journal-student">Студент</th>${headers}<th scope="col" class="journal-average">Средний<br>балл</th><th scope="col" class="journal-absences">Пропуски<br><small>в парах</small></th></tr></thead><tbody>${rows}</tbody></table></div>`:!students.length?'<div class="empty"><h3>В группе пока нет студентов</h3><button data-tab="Группы">Добавить студентов</button></div>':'<div class="empty"><h3>За этот период занятий пока нет</h3><p>Выберите другой период или нажмите «+ Занятие». В таблице появятся занятия из журнала.</p></div>'}<p class="muted journal-grid-help">Нажмите отметку, чтобы изменить оценку и посещаемость. Нажмите дату, чтобы посмотреть тему. Средний балл и пропуски рассчитаны за выбранный период.</p>`;
}
document.body.insertAdjacentHTML('beforeend',`<dialog id="journal-cell-dialog" class="modal journal-edit-dialog"><form id="journal-cell-form"><h2 id="journal-cell-title"></h2><p id="journal-cell-context" class="muted"></p><div class="filters"><label>Посещаемость<select id="journal-cell-attendance">${options(ATTENDANCE,'','Не отмечено')}</select></label><label>Оценка<select id="journal-cell-grade">${options(GRADES,'')}</select></label></div><label>Комментарий<textarea id="journal-cell-note" rows="3"></textarea></label><p class="muted">Изменения запишутся на устройство после нажатия «Сохранить» в журнале.</p><div class="actions"><button type="submit" class="primary">Применить</button><button type="button" data-journal-close="journal-cell-dialog">Отмена</button></div></form></dialog><dialog id="journal-lesson-dialog" class="modal journal-edit-dialog"><form id="journal-lesson-form"><h2 id="journal-lesson-title">Занятие</h2><div class="filters"><label>Дата занятия<input id="journal-lesson-date" type="date" required></label><label>Номер пары<select id="journal-lesson-pair">${TIMES.map((t,i)=>`<option value="${i+1}">${i+1} · ${t}</option>`).join('')}</select></label></div><label>Тема занятия<textarea id="journal-lesson-topic" rows="3"></textarea></label><label>Домашнее задание<textarea id="journal-lesson-homework" rows="2"></textarea></label><div class="journal-bulk-attendance"><button type="button" data-journal-unmarked-absent>Неотмеченным — Н</button><p class="muted">Только эта пара. Уже выставленная посещаемость и оценки сохранятся.</p></div><p id="journal-lesson-error" role="alert" class="error" hidden></p><div class="actions"><button type="submit" class="primary">Применить</button><button type="button" data-journal-open-single>Одно занятие</button><button id="journal-lesson-delete" type="button" class="danger" data-journal-delete-current>Удалить занятие</button><button type="button" data-journal-close="journal-lesson-dialog">Отмена</button></div></form></dialog>`);
let journalEditingCell=null,journalEditingLesson=null,journalReturnFocus=null;
function journalAllowedLesson(key){const l=data.lessons[key];return l&&!l.deleted&&l.group===state.group&&l.subject===state.subject?l:null;}
function openJournalCell(key,id){
  const l=journalAllowedLesson(key),s=activeStudents().find(s=>s.id===id);if(!l||!s)return;
  journalEditingCell={key,id};const m=l.marks[id]||{};
  $('#journal-cell-title').textContent=s.name;
  $('#journal-cell-context').textContent=l.date+' · '+l.pair+' пара · '+(l.topic||'Тема не заполнена');
  $('#journal-cell-attendance').value=m.attendance||'';$('#journal-cell-grade').value=m.grade||'';$('#journal-cell-note').value=m.note||'';
  $('#journal-cell-dialog').showModal();
}
function applyJournalCell(attendance,grade,note){
  if(!journalEditingCell)return false;
  const {key,id}=journalEditingCell,l=journalAllowedLesson(key);
  if(!l||!activeStudents().some(s=>s.id===id)||!['',...ATTENDANCE].includes(attendance)||!['',...GRADES].includes(grade))return false;
  l.marks[id]={...(l.marks[id]||{}),attendance,grade,note};changed();return true;
}
function openJournalLesson(key){
  const l=key?journalAllowedLesson(key):null;if(key&&!l||!activeGroup())return;
  journalEditingLesson={key:key||'',group:state.group,subject:state.subject};
  $('#journal-lesson-title').textContent=(l?'Занятие · ':'Новое занятие · ')+groupName(state.group);
  $('#journal-lesson-date').value=l?.date||state.date;$('#journal-lesson-pair').value=l?.pair||state.pair;
  $('#journal-lesson-date').disabled=false;$('#journal-lesson-pair').disabled=!!l;
  $('#journal-lesson-topic').value=l?.topic||'';$('#journal-lesson-homework').value=l?.homework||'';
  $('#journal-lesson-error').hidden=true;$('#journal-lesson-delete').hidden=!l;$('#journal-lesson-dialog').showModal();
}
function applyJournalLesson(date,pair,topic,homework){
  const edit=journalEditingLesson;
  if(!edit||edit.group!==state.group||edit.subject!==state.subject||!isDate(date)||!Number.isInteger(pair)||pair<1||pair>TIMES.length)return false;
  const key=[edit.group,date,edit.subject,pair].join('|');
  const previous=edit.key?journalAllowedLesson(edit.key):undefined;
  if(edit.key&&!previous){$('#journal-lesson-error').textContent='Занятие удалено или изменилось. Закройте окно и откройте его заново.';$('#journal-lesson-error').hidden=false;return false;}
  if(edit.key&&key!==edit.key&&data.lessons[key]){ $('#journal-lesson-error').textContent='На эту дату уже есть такая пара'+(data.lessons[key].deleted?' в удалённых занятиях':'')+'. Выберите другую дату. Отметки не изменены.';$('#journal-lesson-error').hidden=false;return false;}
  if(!edit.key&&data.lessons[key]?.deleted){$('#journal-lesson-error').textContent='Эта пара удалена. Восстановите её в разделе «Удалённые занятия», чтобы вернуть отметки.';$('#journal-lesson-error').hidden=false;return false;}
  if(!edit.key&&data.lessons[key]){openJournalLesson(key);$('#journal-lesson-error').textContent='Это занятие уже есть. Открыта его существующая запись.';$('#journal-lesson-error').hidden=false;return false;}
  data.lessons[key]={...(previous||{group:edit.group,subject:edit.subject,marks:{}}),type:journalLessonType(previous||{group:edit.group,subject:edit.subject,date,pair,topic}),date,pair,topic,homework};
  if(edit.key&&key!==edit.key){
    delete data.lessons[edit.key];
    if(state.date===previous.date&&state.pair===previous.pair){state.date=date;state.pair=pair;}
  }
  edit.key=key;
  changed();return true;
}
function scrollJournalToToday(){
  const region=$('.journal-grid-scroll');if(!region)return;
  const headers=[...document.querySelectorAll('.journal-date')];
  const target=headers.find(el=>el.dataset.journalDate===today())||headers.find(el=>el.dataset.journalDate>today())||headers.at(-1);
  if(target){region.scrollLeft=Math.max(0,target.offsetLeft-region.querySelector('.journal-student').offsetWidth);region.focus({preventScroll:true});}
  if(!headers.some(el=>el.dataset.journalDate===today()))$('#journal-table-message').textContent='За сегодня записи нет. Показаны ближайшие занятия; новое можно добавить кнопкой «+ Занятие».';
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.journalView){state.journalMode=b.dataset.journalView;render();}
  if(b.hasAttribute('data-journal-cell')){journalReturnFocus=b;openJournalCell(b.dataset.journalCell,b.dataset.journalStudent);}
  if(b.hasAttribute('data-journal-lesson')){journalReturnFocus=b;openJournalLesson(b.dataset.journalLesson);}
  if(b.hasAttribute('data-journal-add')){journalReturnFocus=b;openJournalLesson();}
  if(b.dataset.journalClose)$('#'+b.dataset.journalClose).close();
  if(b.hasAttribute('data-journal-today'))scrollJournalToToday();
  if(b.hasAttribute('data-journal-open-single')){
    if(!applyJournalLesson($('#journal-lesson-date').value,Number($('#journal-lesson-pair').value),$('#journal-lesson-topic').value,$('#journal-lesson-homework').value))return;
    state.date=$('#journal-lesson-date').value;state.pair=Number($('#journal-lesson-pair').value);state.journalMode='single';$('#journal-lesson-dialog').close();render();
  }
  if(b.hasAttribute('data-journal-csv')){
    const columns=journalColumns();csv('Журнал-группы.csv',[['Студент',...columns.map(([,l])=>l.date+' · '+l.pair+' пара'),'Средний балл','Пропуски'],...journalSortedStudents(columns).map(s=>{const totals=journalStudentTotals(s,columns);return [s.name,...columns.map(([,l])=>{const m=l.marks[s.id]||{};return [m.grade||'',m.attendance||'',m.note||''].filter(Boolean).join(' · ');}),totals.average,totals.absent+totals.excused];})]);
  }
});
document.addEventListener('change',e=>{
  const key=e.target.dataset.journalFilter;if(!key)return;
  const value=e.target.value;
  if(['journalFrom','journalTo'].includes(key)&&!isDate(value))return;
  if(key==='journalMonth'&&!/^\d{4}-\d{2}$/.test(value))return;
  if(!['journalPeriod','journalMonth','journalSemester','journalFrom','journalTo','journalSort'].includes(key))return;
  if(key==='journalSort'&&!['name','grade-desc','grade-asc','absence-desc','absence-asc'].includes(value))return;
  state[key]=value;render();
});
$('#journal-cell-form').addEventListener('submit',e=>{
  e.preventDefault();if(applyJournalCell($('#journal-cell-attendance').value,$('#journal-cell-grade').value,$('#journal-cell-note').value)){$('#journal-cell-dialog').close();render();}
});
$('#journal-lesson-form').addEventListener('submit',e=>{
  e.preventDefault();if(applyJournalLesson($('#journal-lesson-date').value,Number($('#journal-lesson-pair').value),$('#journal-lesson-topic').value,$('#journal-lesson-homework').value)){$('#journal-lesson-dialog').close();render();}
});
for(const id of ['journal-cell-dialog','journal-lesson-dialog'])$('#'+id).addEventListener('close',()=>{if(journalReturnFocus?.isConnected)journalReturnFocus.focus({preventScroll:true});});
function journalSortedStudents(columns=journalColumns()){
  const students=activeStudents().slice();
  const totals=new Map(students.map(s=>[s.id,journalStudentTotals(s,columns)]));
  const names=(a,b)=>a.name.localeCompare(b.name,'ru',{numeric:true})||a.id.localeCompare(b.id);
  return students.sort((a,b)=>{
    const x=totals.get(a.id),y=totals.get(b.id);
    if(state.journalSort?.startsWith('grade-')){
      if(x.numericAverage===null||y.numericAverage===null)return x.numericAverage===y.numericAverage?names(a,b):x.numericAverage===null?1:-1;
      return (x.numericAverage-y.numericAverage)*(state.journalSort==='grade-desc'?-1:1)||names(a,b);
    }
    if(state.journalSort?.startsWith('absence-'))return (x.absent+x.excused-y.absent-y.excused)*(state.journalSort==='absence-desc'?-1:1)||names(a,b);
    return names(a,b);
  });
}
function journalSortControl(){
  return `<label class="journal-sort-control">Порядок студентов<select data-journal-filter="journalSort">${[['name','По ФИО'],['grade-desc','Средний балл: сначала высокий'],['grade-asc','Средний балл: сначала низкий'],['absence-desc','Пропуски: сначала больше'],['absence-asc','Пропуски: сначала меньше']].map(([v,t])=>`<option value="${v}" ${state.journalSort===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
}
function renderDeletedJournalLessons(){
  const removed=Object.entries(data.lessons).filter(([,l])=>l.deleted&&l.group===state.group&&l.subject===state.subject).sort(([,a],[,b])=>b.date.localeCompare(a.date)||b.pair-a.pair);
  if(!removed.length)return '';
  return `<details class="panel journal-deleted"><summary>Удалённые занятия · ${removed.length}</summary><p class="muted">Темы, оценки и посещаемость сохранены. После восстановления занятие вернётся в таблицу и расчёты.</p>${removed.map(([key,l])=>`<div class="deleted-group"><span><b>${l.date} · ${l.pair} пара</b><small>${escapeHTML(l.topic||'Без темы')}</small></span><button type="button" data-journal-restore="${escapeHTML(key)}">Восстановить занятие</button></div>`).join('')}</details>`;
}
function renderRemovedSingleLesson(key){
  return `<div class="filters">${groupSelect()}${subjectSelect()}<label>Дата<input type="date" data-filter="date" value="${state.date}"></label>${selectField('Пара','pair',TIMES.map((t,i)=>[i+1,`${i+1} · ${t}`]),state.pair)}</div><div class="panel"><h2>Это занятие удалено</h2><p>Оценки и посещаемость сохранены. Восстановите занятие, чтобы редактировать его.</p><button type="button" data-journal-restore="${escapeHTML(key)}">Восстановить занятие</button></div>`;
}
function deleteJournalLesson(key){
  const l=journalAllowedLesson(key);if(!l)return false;
  l.deleted=true;changed();return true;
}
function restoreJournalLesson(key){
  const l=data.lessons[key];if(!l?.deleted||l.group!==state.group||l.subject!==state.subject)return false;
  l.deleted=false;changed();return true;
}
document.body.insertAdjacentHTML('beforeend',`<dialog id="journal-delete-dialog" class="modal journal-edit-dialog"><form id="journal-delete-form"><h2>Удалить занятие?</h2><p id="journal-delete-context"></p><p>Занятие исчезнет из таблицы и расчётов. Его можно восстановить вместе со всеми оценками и посещаемостью в разделе «Удалённые занятия».</p><div class="actions"><button type="submit" class="danger">Удалить занятие</button><button type="button" data-journal-close="journal-delete-dialog">Отмена</button></div></form></dialog>`);
let journalDeletingKey='';
function askDeleteJournalLesson(key){
  const l=journalAllowedLesson(key);if(!l)return;
  journalDeletingKey=key;
  $('#journal-delete-context').textContent=groupName(l.group)+' · '+l.date+' · '+l.pair+' пара · '+(l.topic||'Тема не заполнена');
  if($('#journal-lesson-dialog').open)$('#journal-lesson-dialog').close();
  $('#journal-delete-dialog').showModal();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.journalDelete)askDeleteJournalLesson(b.dataset.journalDelete);
  if(b.hasAttribute('data-journal-delete-current')&&journalEditingLesson?.key)askDeleteJournalLesson(journalEditingLesson.key);
  if(b.hasAttribute('data-journal-unmarked-absent')){
    if(!applyJournalLesson($('#journal-lesson-date').value,Number($('#journal-lesson-pair').value),$('#journal-lesson-topic').value,$('#journal-lesson-homework').value))return;
    const edit=journalEditingLesson;
    markUnmarkedAbsent(edit.key||[edit.group,$('#journal-lesson-date').value,edit.subject,$('#journal-lesson-pair').value].join('|'));
    $('#journal-lesson-dialog').close();render();
  }
  if(b.dataset.journalRestore&&restoreJournalLesson(b.dataset.journalRestore))render();
});
$('#journal-delete-form').addEventListener('submit',e=>{e.preventDefault();if(deleteJournalLesson(journalDeletingKey)){$('#journal-delete-dialog').close();render();}});
function moveJournalLessonDate(key,date){
  const l=journalAllowedLesson(key);
  if(!l||!isDate(date))return {ok:false,message:'Не удалось изменить дату. Откройте журнал заново.'};
  const newKey=[l.group,date,l.subject,l.pair].join('|');
  if(newKey===key)return {ok:true,key};
  if(data.lessons[newKey])return {ok:false,message:'На эту дату уже есть такая пара'+(data.lessons[newKey].deleted?' в удалённых занятиях':'')+'. Выберите другую дату. Отметки не изменены.'};
  data.lessons[newKey]={...l,date,type:journalLessonType(l)};
  delete data.lessons[key];
  if(journalEditingLesson?.key===key)journalEditingLesson.key=newKey;
  if(state.date===l.date&&state.pair===l.pair)state.date=date;
  changed();return {ok:true,key:newKey};
}
function setJournalLessonType(key,type){
  const l=journalAllowedLesson(key);if(!l||!['Практика','Лекция'].includes(type)||l.type===type)return false;
  l.type=type;changed();return true;
}
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset.journalDateChange){
    const result=moveJournalLessonDate(el.dataset.journalDateChange,el.value);
    render();$('#journal-table-message').textContent=result.ok?'Дата занятия изменена. Нажмите «Сохранить».':result.message;
  }
  if(el.dataset.journalType&&setJournalLessonType(el.dataset.journalType,el.value))render();
});
render();
