'use strict';
// Three-way merge; no device clock decides which value wins.
globalThis.JournalMerge=(()=>{
  const equal=(a,b)=>stable(a)===stable(b);
  function stable(v){if(v===undefined)return 'undefined';if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v);}
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  function merge(base,local,remote,choices={}){
    const conflicts=[];
    function walk(b,l,r,path){
      // Forms create empty fields even when only one field was edited. For a
      // newly-created lesson, those untouched defaults are a shared baseline.
      if(b===undefined&&path[0]==='lessons'&&object(l)&&object(r)){
        if(path.length===2&&['group','date','subject','pair'].every(k=>equal(l[k],r[k])))
          b={group:l.group,date:l.date,subject:l.subject,pair:l.pair,topic:'',homework:'',marks:{}};
        if(path.length===4&&path[2]==='marks')b={attendance:'',grade:'',note:''};
      }
      if(equal(l,r))return l;
      if(equal(l,b))return r;
      if(equal(r,b))return l;
      if(object(l)&&object(r)&&(b===undefined||object(b))){
        const result=Object.create(null);
        for(const k of new Set([...Object.keys(b||{}),...Object.keys(l),...Object.keys(r)])){
          const value=walk(b?.[k],l[k],r[k],[...path,k]);if(value!==undefined)result[k]=value;
        }return result;
      }
      const records=v=>Array.isArray(v)&&v.every(x=>object(x)&&typeof x.id==='string');
      if(records(l)&&records(r)&&(b===undefined||records(b))){
        const key=x=>path.length===1&&path[0]==='schedule'?`${x.week}|${x.day}|${x.pair}`:x.id;
        const map=v=>new Map((v||[]).map(x=>[key(x),x]));
        const bm=map(b),lm=map(l),rm=map(r),result=[];
        for(const id of new Set([...rm.keys(),...lm.keys(),...bm.keys()])){
          const value=walk(bm.get(id),lm.get(id),rm.get(id),[...path,id]);if(value!==undefined)result.push(value);
        }return result;
      }
      const id=JSON.stringify(path);
      if(choices[id]==='remote')return r;
      if(choices[id]==='local')return l;
      conflicts.push({id,path,local:l,remote:r});return l;
    }
    return {value:walk(base,local,remote,[]),conflicts};
  }
  return {merge,equal,stable};
})();
