'use strict';
// Completed topics are independent records; journal grades are never modified here.
Object.assign(state,{
  ktpSubject:Number.isInteger(savedView?.state?.ktpSubject)&&savedView.state.ktpSubject>=0&&savedView.state.ktpSubject<SUBJECTS.length?savedView.state.ktpSubject:state.subject,
  ktpGroup:typeof savedView?.state?.ktpGroup==='string'?savedView.state.ktpGroup:state.group
});
function ktpRecords(){return data.ktp||[];}
function ktpGroupSubject(g){
  if(Number.isInteger(g.ktpSubject)&&g.ktpSubject>=0&&g.ktpSubject<SUBJECTS.length)return g.ktpSubject;
  const assigned=subjectForGroup(g.id);if(assigned!==null)return assigned;
  // Disciplines for these cohorts were supplied by the teacher; some groups
  // have no slot in the photographed schedule, so they still belong in KTP.
  const name=g.name.replace(/[–—]/g,'-').replace(/\s+/g,'').toLocaleUpperCase('ru');
  if(/^24-СПО-ИСИП-\d+$/.test(name))return 0;
  if(/^25-СПО-СИСА-\d+$/.test(name))return 1;
  if(/^25-СПО-ЗУ-\d+$/.test(name))return 3;
  const isip=name.match(/^25-СПО-ИСИП-0?([1-8])$/);if(isip)return Number(isip[1])<=6?2:1;
  return null;
}
function ktpGroups(subject){return activeGroups().filter(g=>ktpGroupSubject(g)===subject);}
function ktpSelection(){
  const groups=ktpGroups(state.ktpSubject);
  if(!groups.some(g=>g.id===state.ktpGroup))state.ktpGroup=groups[0]?.id||'';
  return groups.find(g=>g.id===state.ktpGroup)||null;
}
function ktpCompleted(group,subject){return ktpRecords().filter(r=>!r.deleted&&r.group===group&&r.subject===subject).sort((a,b)=>b.date.localeCompare(a.date)||a.number.localeCompare(b.number,'ru',{numeric:true})||a.id.localeCompare(b.id));}
function ktpJournalTopics(group,subject){return Object.entries(data.lessons).filter(([,l])=>!l.deleted&&l.group===group&&l.subject===subject&&l.date<=today()&&l.topic.trim()).sort(([,a],[,b])=>b.date.localeCompare(a.date)||b.pair-a.pair);}
function ktpSourceRecord(key){return ktpRecords().find(r=>!r.deleted&&r.sourceLesson===key);}
function assignKtpGroup(group,subject){
  const g=activeGroups().find(g=>g.id===group);if(!g||!Number.isInteger(subject)||subject<0||subject>=SUBJECTS.length)return false;
  g.ktpSubject=subject;state.ktpSubject=subject;state.ktpGroup=group;changed();return true;
}
function renderKtp(){
  const group=ktpSelection(),records=group?ktpCompleted(group.id,state.ktpSubject):[];
  const cards=SUBJECTS.map((name,subject)=>{
    const groups=ktpGroups(subject),selected=subject===state.ktpSubject;
    return `<section class="ktp-subject ${selected?'is-selected':''}"><button type="button" class="ktp-subject-button" data-ktp-subject="${subject}" aria-expanded="${selected}"><span>${escapeHTML(name)}</span><small>Групп: ${groups.length}</small></button>${selected?`<div class="ktp-group-list">${groups.map(g=>{const completed=ktpCompleted(g.id,subject);return `<button type="button" data-ktp-group="${escapeHTML(g.id)}" class="${g.id===state.ktpGroup?'is-selected':''}" aria-pressed="${g.id===state.ktpGroup}"><span>${escapeHTML(g.name)}</span><small>${completed.length?completed.length+' пройдено':'Пока нет записей'}</small></button>`;}).join('')||'<p class="muted">Группы пока не назначены.</p>'}</div>`:''}</section>`;
  }).join('');
  const lectures=records.filter(r=>r.type==='Лекция').length,practices=records.filter(r=>r.type==='Практика').length;
  const rows=records.map(r=>`<tr><td class="ktp-record-date">${escapeHTML(r.date.split('-').reverse().join('.'))}</td><td><span class="ktp-kind ${r.type==='Лекция'?'lecture':'practice'}">${r.type==='Лекция'?'Лекция':'Практика'}${r.number?' № '+escapeHTML(r.number):''}</span></td><td><strong>${escapeHTML(r.topic)}</strong>${r.notes?`<p class="ktp-notes">${escapeHTML(r.notes)}</p>`:''}${r.sourceLesson?'<small class="ktp-source">Перенесено из журнала</small>':''}</td><td><div class="ktp-row-actions"><button type="button" data-ktp-edit="${escapeHTML(r.id)}">Изменить</button><button type="button" class="danger" data-ktp-delete="${escapeHTML(r.id)}">Удалить</button></div></td></tr>`).join('');
  const sources=group?ktpJournalTopics(group.id,state.ktpSubject):[];
  const sourceList=sources.map(([key,l])=>`<div class="ktp-source-row"><div><small>${l.date.split('-').reverse().join('.')} · ${l.pair} пара · ${journalLessonType(l)}</small><p>${escapeHTML(l.topic)}</p></div>${ktpSourceRecord(key)?'<span class="ktp-added">Уже в пройденных</span>':`<button type="button" data-ktp-import="${escapeHTML(key)}">Добавить в пройденные</button>`}</div>`).join('');
  const removed=group?ktpRecords().filter(r=>r.deleted&&r.group===group.id&&r.subject===state.ktpSubject):[];
  const unassigned=activeGroups().filter(g=>ktpGroupSubject(g)===null);
  const available=activeGroups().filter(g=>ktpGroupSubject(g)!==state.ktpSubject);
  return `<div class="ktp-layout"><div class="ktp-subjects" aria-label="Предметы и группы">${cards}</div><section id="ktp-detail" class="ktp-detail"><div class="ktp-detail-heading"><div><p class="ktp-subject-name">${escapeHTML(SUBJECTS[state.ktpSubject])}</p><h2>${escapeHTML(group?.name||'Выберите группу')}</h2></div><button type="button" class="primary" data-ktp-add ${group?'':'disabled'}>Записать пройденное</button></div>${group?`<div class="ktp-progress"><div><strong>${lectures}</strong><span>Пройденные лекции</span></div><div><strong>${practices}</strong><span>Пройденные практики</span></div><div class="ktp-last"><span>Последняя тема</span><strong>${escapeHTML(records[0]?.topic||'Пока не указана')}</strong><small>${records[0]?records[0].date.split('-').reverse().join('.'):'Добавьте первое занятие'}</small></div></div><h3>Пройденные темы</h3>${records.length?`<div class="table-wrap"><table class="ktp-table"><thead><tr><th>Дата</th><th>Занятие</th><th>Тема и заметки</th><th>Действия</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty ktp-empty"><h3>На чём остановилась группа?</h3><p>Запишите уже проведённую лекцию или практику: дату, номер и тему. Здесь будет история пройденного для этой группы.</p><button type="button" data-ktp-add>Записать первое занятие</button></div>'}${sources.length?`<details class="panel ktp-journal-topics"><summary>Темы из журнала · ${sources.length}</summary><p class="muted">Перенесите проведённые занятия в пройденные одним нажатием. Журнал останется без изменений.</p>${sourceList}</details>`:''}${removed.length?`<details class="panel ktp-removed"><summary>Удалённые записи · ${removed.length}</summary>${removed.map(r=>`<div class="deleted-group"><span>${r.date} · ${escapeHTML(r.type)} · ${escapeHTML(r.topic)}</span><button type="button" data-ktp-restore="${escapeHTML(r.id)}">Восстановить</button></div>`).join('')}</details>`:''}`:'<div class="empty"><p>Нажмите группу слева или назначьте её этому предмету ниже.</p></div>'}${available.length?`<details class="ktp-assign"><summary>Добавить группу к этому предмету</summary><p class="muted">Назначение действует в разделе КТП. Записи и расписание группы сохранятся.</p><div class="filters"><label>Группа для КТП<select id="ktp-assign-group">${available.map(g=>`<option value="${escapeHTML(g.id)}">${escapeHTML(g.name)}</option>`).join('')}</select></label><button type="button" data-ktp-assign>Назначить предмет</button></div></details>`:''}</section></div>${unassigned.length?`<details class="panel ktp-unassigned"><summary>Группы без предмета в КТП · ${unassigned.length}</summary><p>Выберите предмет слева и используйте «Добавить группу к этому предмету».</p><p>${unassigned.map(g=>escapeHTML(g.name)).join(', ')}</p></details>`:''}${data.tasks?.length?`<details class="panel ktp-legacy"><summary>Прежние записи из «Дел» · ${data.tasks.length}</summary>${data.tasks.map(t=>`<div class="ktp-source-row"><div><p>${escapeHTML(t.text)}</p><small>${escapeHTML(t.date)} · ${t.done?'Выполнено':'Не выполнено'}</small></div></div>`).join('')}</details>`:''}`;
}
document.body.insertAdjacentHTML('beforeend',`<dialog id="ktp-dialog" class="modal ktp-modal"><form id="ktp-form"><h2 id="ktp-form-title">Пройденное занятие</h2><p id="ktp-form-context" class="muted"></p><div class="filters"><label>Вид занятия<select id="ktp-type"><option value="Практика">Практика</option><option value="Лекция">Лекция</option></select></label><label>Номер занятия<input id="ktp-number" type="text" maxlength="30" placeholder="Например: 3"></label><label>Дата проведения<input id="ktp-date" type="date" required></label></div><label>Тема занятия<textarea id="ktp-topic" rows="3" maxlength="2000" required placeholder="Что уже прошла группа"></textarea></label><label>Заметки<textarea id="ktp-notes" rows="3" maxlength="4000" placeholder="Где остановились, что повторить, какую работу проверить"></textarea></label><p id="ktp-error" class="error" role="alert" hidden></p><p class="muted">После применения нажмите общую кнопку «Сохранить». Для других устройств используйте синхронизацию.</p><div class="actions"><button type="submit" class="primary">Применить</button><button type="button" data-ktp-close>Отмена</button></div></form></dialog>`);
let ktpEditing=null;
function openKtpRecord(id){
  const group=ktpSelection();if(!group)return;
  const record=id?ktpRecords().find(r=>r.id===id&&!r.deleted&&r.group===group.id&&r.subject===state.ktpSubject):null;if(id&&!record)return;
  ktpEditing={id:record?.id||'',group:group.id,subject:state.ktpSubject};
  $('#ktp-form-title').textContent=record?'Изменить пройденное занятие':'Записать пройденное';
  $('#ktp-form-context').textContent=group.name+' · '+SUBJECTS[state.ktpSubject];
  $('#ktp-type').value=record?.type||'Практика';$('#ktp-number').value=record?.number||'';$('#ktp-date').value=record?.date||today();
  $('#ktp-topic').value=record?.topic||'';$('#ktp-notes').value=record?.notes||'';$('#ktp-error').hidden=true;$('#ktp-dialog').showModal();
}
function applyKtpRecord(values){
  const edit=ktpEditing;
  if(!edit||edit.group!==state.ktpGroup||edit.subject!==state.ktpSubject||!activeGroups().some(g=>g.id===edit.group)||!isDate(values.date)||!['Лекция','Практика'].includes(values.type)||!values.topic.trim())return false;
  if(values.date>today()){$('#ktp-error').textContent='Для пройденного занятия выберите сегодняшнюю или прошедшую дату.';$('#ktp-error').hidden=false;return false;}
  const previous=edit.id?ktpRecords().find(r=>r.id===edit.id&&!r.deleted&&r.group===edit.group&&r.subject===edit.subject):null;if(edit.id&&!previous)return false;
  const record={...(previous||{id:uid(),group:edit.group,subject:edit.subject}),type:values.type,date:values.date,number:values.number.trim(),topic:values.topic.trim(),notes:values.notes.trim()};
  data.ktp ||= [];
  if(previous)data.ktp[data.ktp.findIndex(r=>r.id===previous.id)]=record;else data.ktp.push(record);
  changed();return true;
}
function importKtpTopic(key){
  const l=data.lessons[key];
  if(!l||l.deleted||l.group!==state.ktpGroup||l.subject!==state.ktpSubject||l.date>today()||!l.topic.trim()||ktpSourceRecord(key))return false;
  const previous=ktpRecords().find(r=>r.deleted&&r.sourceLesson===key&&r.group===l.group&&r.subject===l.subject);
  if(previous)previous.deleted=false;
  else{data.ktp ||= [];data.ktp.push({id:uid(),group:l.group,subject:l.subject,date:l.date,type:journalLessonType(l),number:'',topic:l.topic,notes:'',sourceLesson:key});}
  changed();return true;
}
function setKtpRecordDeleted(id,deleted){
  const record=ktpRecords().find(r=>r.id===id&&r.group===state.ktpGroup&&r.subject===state.ktpSubject);if(!record||!!record.deleted===deleted)return false;
  record.deleted=deleted;changed();return true;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-ktp-subject')){state.ktpSubject=Number(b.dataset.ktpSubject);state.ktpGroup='';render();}
  if(b.dataset.ktpGroup){state.ktpGroup=b.dataset.ktpGroup;render();if(window.matchMedia?.('(max-width:1050px)').matches)$('#ktp-detail').scrollIntoView({behavior:'smooth',block:'start'});}
  if(b.hasAttribute('data-ktp-add'))openKtpRecord();
  if(b.dataset.ktpEdit)openKtpRecord(b.dataset.ktpEdit);
  if(b.hasAttribute('data-ktp-close'))$('#ktp-dialog').close();
  if(b.dataset.ktpDelete&&setKtpRecordDeleted(b.dataset.ktpDelete,true))render();
  if(b.dataset.ktpRestore&&setKtpRecordDeleted(b.dataset.ktpRestore,false))render();
  if(b.dataset.ktpImport&&importKtpTopic(b.dataset.ktpImport))render();
  if(b.hasAttribute('data-ktp-assign')&&assignKtpGroup($('#ktp-assign-group').value,state.ktpSubject))render();
});
$('#ktp-form').addEventListener('submit',e=>{
  e.preventDefault();if(applyKtpRecord({type:$('#ktp-type').value,number:$('#ktp-number').value,date:$('#ktp-date').value,topic:$('#ktp-topic').value,notes:$('#ktp-notes').value})){$('#ktp-dialog').close();render();}
});
render();
