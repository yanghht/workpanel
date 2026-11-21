'use strict';
const HOURS_RATES=[1,1.25,1.5,1.75,2];
const HOURS_MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const hoursCurrentYear=()=>Number(today().slice(0,4))-(Number(today().slice(5,7))<9?1:0);
state.hoursYear=Number.isInteger(savedView?.state?.hoursYear)&&savedView.state.hoursYear>=2000&&savedView.state.hoursYear<=2100?savedView.state.hoursYear:hoursCurrentYear();
function hoursDate(year,month,day){return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
function hoursInYear(date,year){return date>=`${year}-09-01`&&date<`${year+1}-09-01`;}
function hoursDayCount(date){return Object.values(data.hours?.days?.[date]||{}).filter(Boolean).length;}
function hoursTotals(year){
  let total=0,worked=0;
  for(const date of Object.keys(data.hours?.days||{}))if(hoursInYear(date,year)){const hours=hoursDayCount(date)*2;total+=hours;if(date<=today())worked+=hours;}
  const rate=data.hours?.rates?.[year]||1,target=rate*720;
  return {total,worked,rate,target,remaining:Math.max(0,target-worked),planned:total-worked};
}
function renderHours(){
  const year=state.hoursYear,t=hoursTotals(year),now=today();
  const months=Array.from({length:12},(_,i)=>{
    const month=(i+8)%12,y=year+(month<8?1:0),count=new Date(Date.UTC(y,month+1,0)).getUTCDate(),offset=(new Date(Date.UTC(y,month,1)).getUTCDay()+6)%7;
    let cells='<span aria-hidden="true"></span>'.repeat(offset);
    for(let day=1;day<=count;day++){
      const date=hoursDate(y,month,day),n=hoursDayCount(date),weekend=(offset+day-1)%7>=5;
      cells+=`<button type="button" data-hours-date="${date}" class="hours-day ${date===now?'is-today':''} ${n?'has-hours':''} ${weekend?'is-weekend':''}" aria-label="${day} ${HOURS_MONTHS[month]} ${y}, ${n} пар, ${n*2} часов" ${date===now?'aria-current="date"':''}><span>${day}</span><small>${n?n*2+' ч':'·'}</small></button>`;
    }
    return `<section class="hours-month"><h2>${HOURS_MONTHS[month]} <small>${y}</small></h2><div class="hours-weekdays" aria-hidden="true">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>`<span>${d}</span>`).join('')}</div><div class="hours-days">${cells}</div></section>`;
  }).join('');
  return `<div class="hours-toolbar"><label>Учебный год<select id="hours-year">${Array.from(new Set([year,...Array.from({length:9},(_,i)=>hoursCurrentYear()-4+i)])).sort((a,b)=>a-b).map(y=>`<option value="${y}" ${y===year?'selected':''}>${y} / ${y+1}</option>`).join('')}</select></label><p class="muted">Сентябрь — август · 1 пара = 2 академических часа.<br>Нажмите на день, чтобы отметить проведённые или запланированные пары.</p></div><div class="hours-calendar">${months}</div><section class="hours-summary" aria-label="Итоги часов"><div><span>Всего часов</span><strong>${t.total}</strong><small>Все отмеченные пары за учебный год</small></div><div><span>Отработано</span><strong>${t.worked} <small>из ${t.target} ч</small></strong><progress max="${t.target}" value="${Math.min(t.worked,t.target)}" aria-label="Выполнение нагрузки"></progress><small>По сегодняшний день включительно · осталось ${t.remaining} ч${t.worked>t.target?' · сверх нормы '+(t.worked-t.target)+' ч':''}</small></div><label>Ставка<select id="hours-rate">${HOURS_RATES.map(r=>`<option value="${r}" ${r===t.rate?'selected':''}>${String(r).replace('.',',')}× — ${r*720} часов</option>`).join('')}</select><small>Запланировано на будущие даты: ${t.planned} ч</small></label></section>`;
}
document.body.insertAdjacentHTML('beforeend',`<dialog id="hours-dialog" class="modal hours-modal"><form id="hours-form"><h2 id="hours-dialog-title">Пары за день</h2><p class="muted">Отметьте нужные пары. Каждая пара добавляет 2 академических часа.</p><div id="hours-pairs" class="hours-pairs"></div><p id="hours-day-total" role="status"></p><p class="muted">После применения нажмите «Сохранить». Для переноса на другие устройства нажмите синхронизацию.</p><div class="actions"><button type="submit" class="primary">Применить</button><button type="button" data-hours-close>Отмена</button></div></form></dialog>`);
let hoursEditing='';
function openHoursDay(date){
  if(!isDate(date)||!hoursInYear(date,state.hoursYear))return false;
  hoursEditing=date;
  $('#hours-dialog-title').textContent=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
  $('#hours-pairs').innerHTML=TIMES.map((time,i)=>`<label class="hours-pair"><span><strong>${i+1} пара</strong><small>${time}</small></span><input type="checkbox" data-hours-pair="${i+1}" aria-label="${i+1} пара, ${time}" ${data.hours?.days?.[date]?.[i+1]?'checked':''}></label>`).join('');
  $('#hours-day-total').textContent='За день: '+hoursDayCount(date)*2+' ч';$('#hours-dialog').showModal();return true;
}
function applyHoursDay(date,pairs){
  if(!isDate(date)||!hoursInYear(date,state.hoursYear)||!Array.isArray(pairs)||pairs.some(p=>!Number.isInteger(p)||p<1||p>7))return false;
  const values=Object.fromEntries(TIMES.map((_,i)=>[String(i+1),pairs.includes(i+1)]));
  if(JSON.stringify(values)===JSON.stringify(data.hours?.days?.[date]||Object.fromEntries(TIMES.map((_,i)=>[String(i+1),false]))))return true;
  data.hours ||= {days:{},rates:{}};data.hours.days[date]=values;changed();return true;
}
function setHoursRate(rate){if(!HOURS_RATES.includes(rate))return false;if((data.hours?.rates?.[state.hoursYear]||1)===rate)return true;data.hours ||= {days:{},rates:{}};data.hours.rates[state.hoursYear]=rate;changed();return true;}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.hoursDate)openHoursDay(b.dataset.hoursDate);if(b.hasAttribute('data-hours-close'))$('#hours-dialog').close();});
document.addEventListener('change',e=>{
  if(e.target.id==='hours-year'){const year=Number(e.target.value);if(Number.isInteger(year)&&year>=2000&&year<=2100){state.hoursYear=year;render();}}
  if(e.target.id==='hours-rate'&&setHoursRate(Number(e.target.value)))render();
  if(e.target.hasAttribute('data-hours-pair'))$('#hours-day-total').textContent='За день: '+document.querySelectorAll('[data-hours-pair]:checked').length*2+' ч';
});
$('#hours-form').addEventListener('submit',e=>{e.preventDefault();const pairs=[...document.querySelectorAll('[data-hours-pair]:checked')].map(el=>Number(el.dataset.hoursPair));if(applyHoursDay(hoursEditing,pairs)){$('#hours-dialog').close();render();}});
render();
