'use strict';
(async()=>{
  const label=document.querySelector('#offline-status'), button=document.querySelector('#offline-update');
  let ready=false, registration, refreshing=false;
  const renderStatus=()=>{
    label.textContent=ready
      ? (navigator.onLine?'Готово к работе без интернета · данные на этом устройстве':'Без интернета · журнал работает на этом устройстве')
      : (navigator.onLine?'Сохраняем приложение для работы без интернета…':'Офлайн-режим ещё не подготовлен. Подключитесь к интернету.');
  };
  if(location.protocol==='file:'){
    label.textContent='Локальная версия · работает без сети на компьютере. Для установки на iPhone откройте сайт по HTTPS.';return;
  }
  if(!('serviceWorker' in navigator)||!window.isSecureContext){
    label.textContent='Офлайн-установка недоступна. Откройте сайт по HTTPS в обычном браузере.';return;
  }
  async function checkReady(){
    const worker=navigator.serviceWorker.controller;
    if(!worker){ready=false;renderStatus();return;}
    const channel=new MessageChannel();
    const result=await new Promise(resolve=>{
      const timeout=setTimeout(()=>resolve(false),5000);
      channel.port1.onmessage=e=>{clearTimeout(timeout);resolve(e.data?.ready===true);};
      worker.postMessage({type:'CHECK_READY'},[channel.port2]);
    });
    channel.port1.close();ready=result;renderStatus();button.hidden=!registration?.waiting;
  }
  const offerUpdate=()=>{button.hidden=!registration?.waiting;};
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(refreshing){location.reload();return;}
    checkReady();
  });
  button.addEventListener('click',()=>{
    if(typeof dirty!=='undefined'&&dirty){
      alert('Есть несохранённые изменения. Сохраните журнал или скачайте резервную копию перед обновлением.');return;
    }
    if(!registration?.waiting)return;
    refreshing=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  });
  window.addEventListener('offline',renderStatus);
  window.addEventListener('online',()=>{checkReady();registration?.update().catch(()=>{});});
  try{
    registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    offerUpdate();
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      worker?.addEventListener('statechange',()=>{
        if(worker.state==='installed'){offerUpdate();checkReady();}
        if(worker.state==='redundant'&&!ready)label.textContent='Не удалось сохранить офлайн-копию. Проверьте интернет и обновите страницу.';
      });
    });
    await navigator.serviceWorker.ready;
    await checkReady();
    if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
  }catch{
    label.textContent='Не удалось подготовить офлайн-режим. Проверьте загрузку всех файлов сайта и обновите страницу.';
  }
})();
