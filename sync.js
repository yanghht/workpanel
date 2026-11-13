'use strict';
(()=>{
  const cfg=globalThis.JOURNAL_CLOUD_CONFIG, M=globalThis.JournalMerge;
  const AUTH='teacher-cloud-session-v1', BIND='teacher-cloud-owner-v1', META='teacher-cloud-base-v1-';
  const dialog=document.querySelector('#cloud-dialog'), area=document.querySelector('#cloud-content'), label=document.querySelector('#cloud-status');
  const copy=x=>JSON.parse(JSON.stringify(x));
  const read=key=>{const value=localStorage.getItem(key);return value?JSON.parse(value):null;};
  let session=null, running=false, conflicts=null, applying=false, refreshPromise, generation=0;
  let message='Синхронизация не подключена';
  try{session=read(AUTH);}catch{}
  const account=()=>session?.user?.id;
  function setMessage(text){message=text;label.textContent=text;}
  function defaultData(){const d=seed();normalizeCalendar(d);return d;}
  function meta(){return read(META+account())||{base:defaultData(),revision:0};}
  function storeSession(value){
    if(!value?.user?.id||!value.access_token||!value.refresh_token)throw Error('Сервер не вернул данные входа.');
    value.expires_at=value.expires_at||Math.floor(Date.now()/1000)+(value.expires_in||3600);
    localStorage.setItem(AUTH,JSON.stringify(value));session=value;generation++;
  }
  async function request(path,{method='GET',body,token}={}){
    const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(cfg.url+path,{method,headers:{apikey:cfg.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal,cache:'no-store'});
      const text=await response.text();let value;try{value=text?JSON.parse(text):null;}catch{throw Error('Неожиданный ответ сервера.');}
      if(!response.ok){const error=Error(response.status===401?'Сеанс истёк. Войдите снова.':value?.error_code==='invalid_credentials'?'Неверная почта или пароль.':value?.error_code==='email_not_confirmed'?'Подтвердите почту по ссылке из письма.':response.status===429?'Слишком много попыток. Подождите немного.':'Не удалось выполнить запрос. '+(value?.msg||value?.message||''));error.status=response.status;error.code=value?.code;throw error;}
      return value;
    }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('Нет связи с базой. Записи остаются на устройстве.');throw error;}
    finally{clearTimeout(timeout);}
  }
  async function token(){
    if(!session)throw Error('Сначала войдите в аккаунт.');
    if(session.expires_at*1000>Date.now()+60000)return session.access_token;
    if(!refreshPromise){
      const original=session.refresh_token;
      refreshPromise=(async()=>{
        // Web Locks prevents parallel refreshes by tabs sharing this browser storage.
        const work=async()=>{
          const latest=read(AUTH);
          if(latest?.refresh_token!==original){if(!latest)throw Error('Сеанс завершён.');session=latest;return latest.access_token;}
          const v=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:original}});
          if(session?.refresh_token!==original)throw Error('Аккаунт изменён. Повторите вход.');
          storeSession(v);return v.access_token;
        };
        return navigator.locks?navigator.locks.request('teacher-cloud-refresh',work):work();
      })().finally(()=>{refreshPromise=null;});
    }return refreshPromise;
  }
  function typing(){return /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)||document.querySelector('#slot-dialog')?.open;}
  function changed(){if(applying)return;conflicts=null;if(account())setMessage('Есть изменения на устройстве · нажмите «Синхронизировать сейчас»');}
  function describe(c){
    const labels={groups:'Группы',students:'Студенты',schedule:'Расписание',lessons:'Занятия',marks:'Отметки',grade:'Оценка',attendance:'Посещаемость',note:'Комментарий',name:'Название / ФИО',topic:'Тема',homework:'Домашнее задание',tasks:'Дела',text:'Текст',done:'Выполнение',room:'Аудитория',subject:'Предмет',type:'Вид занятия',exams:'Аттестация',results:'Результаты',date:'Дата',settings:'Настройки',anchor:'Начало первой недели'};
    return c.path.map(part=>labels[part]||data.groups.find(g=>g.id===part)?.name||data.groups.flatMap(g=>g.students).find(s=>s.id===part)?.name||part).join(' → ');
  }
  const preview=v=>v===undefined?'Удалено':typeof v==='string'?v:JSON.stringify(v,null,2);
  function renderPanel(){
    const bound=localStorage.getItem(BIND), id=account();
    area.innerHTML=`<p class="muted">${escapeHTML(message)}</p>${id?`<p>Аккаунт: <b>${escapeHTML(session.user.email||'')}</b></p>${bound&&bound!==id?'<div class="error">На устройстве журнал другого аккаунта. Войдите в прежний аккаунт, чтобы не смешать данные.</div>':`<p>Общий журнал синхронизируется под одной почтой на всех устройствах. При первом подключении текущие записи будут объединены с базой.</p><button type="button" class="primary" data-cloud="connect" ${running?'disabled':''}>${bound?'Синхронизировать сейчас':'Подключить этот журнал'}</button>`}<button type="button" data-cloud="logout">Выйти из аккаунта</button>`:`<form id="cloud-login"><label>Почта<input name="email" type="email" autocomplete="username" required></label><label>Пароль<input name="password" type="password" autocomplete="current-password" minlength="8" required></label><div class="actions"><button class="primary" type="submit">Войти</button><button type="button" data-cloud="signup">Создать аккаунт</button></div></form><p class="muted">Для первого входа нужен интернет. Офлайн-записи сохраняются на этом устройстве.</p>`}
      ${conflicts?`<section><h3>Выберите правильные значения</h3><p>Слева — это устройство, справа — общая база. Пока выбор не сделан, данные не заменяются.</p><form id="cloud-conflicts">${conflicts.items.map((c,i)=>`<fieldset class="sync-conflict"><legend>${escapeHTML(describe(c))}</legend>${['local','remote'].map(side=>`<label><input type="radio" name="c${i}" value="${side}" required><span>${side==='local'?'Это устройство':'Общая база'}<pre>${escapeHTML(preview(c[side]).slice(0,1800))}</pre></span></label>`).join('')}</fieldset>`).join('')}<button type="submit" class="primary">Применить выбранные значения</button></form></section>`:''}
      <p class="muted">Без сети изменения ждут отправки. Одинаковые поля с разными значениями требуют выбора. Резервные копии доступны внизу журнала.</p>`;
  }
  function show(){renderPanel();if(!dialog.open)dialog.showModal();}
  async function sync(choices=null){
    const id=account();
    if(!id||running||localStorage.getItem(BIND)!==id)return;
    if(!navigator.onLine){setMessage('Без сети · изменения ждут отправки');return;}
    if(dirty||loadError){setMessage('Автосохранение не завершено. Скачайте резервную копию и проверьте журнал.');return;}
    if(typing()&&!choices){setMessage('Синхронизация отложена: завершите ввод и нажмите кнопку синхронизации.');return;}
    if(conflicts&&!choices){setMessage('Нужно выбрать правильные значения · откройте синхронизацию');return;}
    running=true;setMessage('Синхронизируем…');
    try{
      const access=await token(), epoch=generation;
      const ensure=()=>{if(account()!==id||generation!==epoch)throw Error('Аккаунт изменился. Повторите синхронизацию.');if(localStorage.getItem(STORAGE_KEY)!==lastStored)throw Error('Журнал изменён в другой вкладке. Обновите страницу после сохранения копии.');};
      for(let attempt=0;attempt<3;attempt++){
        ensure();const start=copy(data), baseline=meta();
        const rows=await request('/rest/v1/teacher_journals?select=revision,payload&user_id=eq.'+encodeURIComponent(id),{token:access});ensure();
        const row=rows?.[0], revision=row?.revision||0, remote=row?.payload||defaultData();
        if(row&&!validData(remote))throw Error('Формат журнала в базе не поддерживается. Локальные записи сохранены.');
        if(choices&&(!conflicts||conflicts.revision!==revision||!M.equal(start,conflicts.local))){conflicts=null;choices=null;setMessage('Данные успели измениться. Проверяем конфликты заново.');}
        const result=M.merge(baseline.base,start,remote,choices||{});
        if(result.conflicts.length){conflicts={items:result.conflicts,revision,local:start};setMessage('Нужно проверить '+result.conflicts.length+' спорных значений');show();return;}
        const merged=result.value;
        if(!validData(merged))throw Error('Объединённые записи не прошли проверку. Скачайте копию и проверьте журнал.');
        let committed=merged, committedRevision=revision;
        if(!row||!M.equal(merged,remote)){
          try{const response=await request('/rest/v1/rpc/sync_teacher_journal',{method:'POST',token:access,body:{expected_revision:revision,new_payload:merged}});ensure();if(!response?.[0]?.payload||!validData(response[0].payload))throw Error('База не подтвердила сохранение журнала.');committed=response[0].payload;committedRevision=response[0].revision;}
          catch(error){if(error.code==='40001'){choices=null;conflicts=null;continue;}throw error;}
        }
        ensure();
        // Never replace an edit made while the request was in flight.
        if(!M.equal(data,start)){setMessage('Новые изменения ожидают отправки · нажмите кнопку синхронизации');return;}
        if(!M.equal(data,committed)){
          localStorage.setItem('teacher-cloud-before-merge-'+id,JSON.stringify(data));
          applying=true;const previous=data;data=committed;
          if(!save(true)){data=previous;throw Error('Не удалось сохранить объединённый журнал на устройстве.');}
          applying=false;if(!data.groups.some(g=>g.id===state.group))state.group=data.groups[0]?.id||'';
          if(!typing())render();else document.querySelector('#app').dataset.cloudRefresh='pending';
        }
        // Baseline is stored only after the local journal is durable.
        localStorage.setItem(META+id,JSON.stringify({base:committed,revision:committedRevision,at:Date.now()}));
        conflicts=null;setMessage('Всё синхронизировано · '+new Date().toLocaleTimeString('ru-RU'));return;
      }
      setMessage('База меняется на другом устройстве. Повторите синхронизацию.');
    }catch(error){setMessage(error.message||'Синхронизация не завершена. Записи сохранены на устройстве.');}
    finally{applying=false;running=false;if(dialog.open&&!document.querySelector('#cloud-login'))renderPanel();}
  }
  async function authenticate(signup=false){
    const form=document.querySelector('#cloud-login');if(!form.reportValidity())return;
    if(!navigator.onLine){setMessage('Для входа подключитесь к интернету.');show();return;}
    const fields=new FormData(form), email=String(fields.get('email')).trim(),password=String(fields.get('password'));
    for(const b of form.querySelectorAll('button'))b.disabled=true;
    try{
      const path=signup?'/auth/v1/signup?redirect_to='+encodeURIComponent('https://yanghht.github.io/workpanel/'):'/auth/v1/token?grant_type=password';
      const result=await request(path,{method:'POST',body:{email,password}});
      if(result.access_token){storeSession(result);setMessage('Вход выполнен. Подключите журнал для синхронизации.');show();}
      else{setMessage('Проверьте почту: подтвердите аккаунт по ссылке из письма, затем войдите здесь.');show();}
    }catch(error){setMessage(error.message);show();}
  }
  async function logout(){const old=session;session=null;generation++;localStorage.removeItem(AUTH);conflicts=null;setMessage('Вы вышли · журнал остался на этом устройстве');show();if(old&&navigator.onLine)request('/auth/v1/logout',{method:'POST',token:old.access_token}).catch(()=>{});}
  document.addEventListener('click',e=>{
    const action=e.target.closest('[data-cloud]')?.dataset.cloud;
    if(action==='open')show();
    if(action==='close')dialog.close();
    if(action==='signup')authenticate(true);
    if(action==='logout')logout();
    if(action==='connect'){
      if(!account())return;
      const bound=localStorage.getItem(BIND);if(bound&&bound!==account())return;
      localStorage.setItem(BIND,account());dialog.close();sync();
    }
  });
  document.addEventListener('submit',e=>{
    if(e.target.id==='cloud-login'){e.preventDefault();authenticate();}
    if(e.target.id==='cloud-conflicts'){
      e.preventDefault();const fields=new FormData(e.target), choices=Object.create(null);
      conflicts.items.forEach((c,i)=>choices[c.id]=fields.get('c'+i));dialog.close();sync(choices);
    }
  });
  document.addEventListener('focusout',()=>{
    setTimeout(()=>{if(document.querySelector('#app').dataset.cloudRefresh==='pending'&&!typing()){delete document.querySelector('#app').dataset.cloudRefresh;render();} },0);
  });
  window.addEventListener('online',()=>{if(account())setMessage('Интернет доступен · для обмена записями нажмите кнопку синхронизации');});
  window.addEventListener('offline',()=>{if(account())setMessage('Без сети · изменения ждут отправки');});
  window.addEventListener('storage',e=>{if(e.key===AUTH){try{session=read(AUTH);generation++;conflicts=null;setMessage(account()?'Аккаунт изменился · синхронизация по кнопке':'Вы вышли · журнал остался на этом устройстве');}catch{}}});
  globalThis.JournalCloud={changed,sync,show};
  setMessage(account()?'Аккаунт сохранён · синхронизация по кнопке':'Синхронизация не подключена');
  // Email-confirmation links may carry a session. Strip tokens from the address immediately.
  globalThis.JournalCloud.ready=(async()=>{
    const fragment=new URLSearchParams(location.hash.slice(1));
    if(fragment.has('access_token')){
      history.replaceState(null,'',location.pathname+location.search);
      try{const access=fragment.get('access_token'),user=await request('/auth/v1/user',{token:access});storeSession({access_token:access,refresh_token:fragment.get('refresh_token'),expires_in:Number(fragment.get('expires_in'))||3600,user});setMessage('Почта подтверждена. Подключите журнал.');show();}catch(error){setMessage(error.message);}
    }
  })();
})();
