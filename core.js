'use strict';
(function(root){
  const SCHEMA='science-recall-v1', intervals=[1,3,7,14,30];
  const day=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const addDays=(value,n)=>{const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+n);return day(d);};
  const empty=()=>({schema:SCHEMA,studyPriority:'essential',memory:{},quiz:{},activity:{},session:null,quizSession:null,preferences:{topic:'all',filter:'due',size:20},quizPreferences:{topic:'all',scope:'all',size:10},learning:{current:1,marks:{}},updatedAt:0});
  const due=(entry,today=day())=>!entry||!entry.due||entry.due<=today;
  const isWrong=card=>card.refs.some(r=>r.startsWith('오답'));
  const matchesTopic=(item,topic)=>topic==='all'||topic==='animal'&&item.topic!=='plant'||item.topic===topic;
  const matchesPriority=(item,priority)=>priority==='all'||item.priority===priority;
  function pick(cards,state,{topic='all',filter='due',size=20,priority='all'}={},today=day()){
    const eligible=cards.filter(c=>matchesTopic(c,topic)&&matchesPriority(c,priority)).filter(c=>filter==='all'||filter==='wrong'&&isWrong(c)||filter==='hard'&&['hard','again'].includes(state.memory[c.id]?.rating)||filter==='done'&&state.memory[c.id]?.completed===today||filter==='due'&&due(state.memory[c.id],today))
      .sort((a,b)=>Number(['hard','again'].includes(state.memory[b.id]?.rating))-Number(['hard','again'].includes(state.memory[a.id]?.rating))||(state.memory[a.id]?.seen||0)-(state.memory[b.id]?.seen||0)||(a.lesson||0)-(b.lesson||0));
    const n=Math.min(size||eligible.length,eligible.length);
    if(topic!=='all')return eligible.slice(0,n).map(c=>c.id);
    const plant=eligible.filter(c=>c.topic==='plant'),animal=eligible.filter(c=>c.topic!=='plant');
    let p=Math.min(Math.round(n*0.4),plant.length),a=Math.min(n-p,animal.length);
    p=Math.min(n-a,plant.length);
    const selected=[plant.slice(0,p),animal.slice(0,a)],out=[],pattern=[0,1,1,0,1];
    while(out.length<n){const group=pattern[out.length%5],queue=selected[group].length?selected[group]:selected[1-group];out.push(queue.shift().id);}
    return out;
  }
  function start(ids,today=day()){
    return {date:today,ids:[...ids],queue:[...ids],index:0,round:1,streak:{},done:[],reviews:0,undo:null};
  }
  const current=session=>session?.queue[session.index]||null;
  function rate(state,rating,today=day()){
    if(!['known','hard','again'].includes(rating))throw Error('올바르지 않은 평가');
    const s=state.session,id=current(s);if(!id||s.date!==today)throw Error('진행 중인 카드가 없음');
    const previous=state.memory[id];
    s.undo={session:JSON.parse(JSON.stringify({...s,undo:null})),memory:previous?{...previous}:null,activity:state.activity[today]?{...state.activity[today]}:null,id};
    s.streak[id]=rating==='known'?(s.streak[id]||0)+1:0;
    const completed=s.streak[id]>=2;
    let level=previous?.level||0;
    if(rating!=='known')level=0;
    const keep=rating==='known'&&previous?.completed&&(previous.due>today||previous.completed===today);
    if(completed&&!keep)level=Math.min(5,level+1);
    state.memory[id]={rating,level,due:completed?(keep?previous.due:addDays(today,intervals[Math.max(0,level-1)])):keep?previous.due:today,
      completed:completed?today:keep?previous.completed:null,seen:(previous?.seen||0)+1,updatedAt:Date.now()};
    if(completed&&!s.done.includes(id))s.done.push(id);
    s.index++;s.reviews++;
    const a=state.activity[today]||{reviews:0,known:0,hard:0,again:0,quiz:0,correct:0};a.reviews++;a[rating]++;state.activity[today]=a;
    state.updatedAt=Date.now();
    return {id,completed,roundEnd:s.index>=s.queue.length,finished:s.done.length===s.ids.length};
  }
  function nextRound(state){
    const s=state.session;if(!s||current(s))throw Error('현재 회차가 끝나지 않음');
    const next=s.ids.filter(id=>!s.done.includes(id));
    if(next.length>1&&next[0]===s.queue.at(-1))next.push(next.shift());
    s.queue=next;s.index=0;s.round++;s.undo=null;return s;
  }
  function undo(state){const u=state.session?.undo;if(!u)return false;
    if(u.memory)state.memory[u.id]=u.memory;else delete state.memory[u.id];
    if(u.activity)state.activity[state.session.date]=u.activity;else delete state.activity[state.session.date];
    state.session=u.session;state.updatedAt=Date.now();return true;
  }
  function quizRate(state,id,correct,answer,today=day()){
    if(!state.quizSession||state.quizSession.ids[state.quizSession.index]!==id)throw Error('문항 불일치');
    const old=state.quiz[id];state.quiz[id]={wrong:!correct,correct,answer:String(answer).slice(0,2000),attempts:(old?.attempts||0)+1,updatedAt:Date.now()};
    state.quizSession.results.push({id,correct});state.quizSession.index++;state.quizSession.draft='';
    const a=state.activity[today]||{reviews:0,known:0,hard:0,again:0,quiz:0,correct:0};a.quiz++;a.correct+=Number(correct);state.activity[today]=a;state.updatedAt=Date.now();
  }
  // Validate imported/local state before using any identifiers or counters.
  function validate(raw,cards,questions){
    const bad=()=>{throw Error('과학 학습 기록 파일이 아니거나 내용이 손상되었습니다.');};
    const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
    const num=x=>Number.isSafeInteger(x)&&x>=0;
    const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x));
    const cardIds=new Set(cards.map(c=>c.id)),qIds=new Set(questions.map(q=>q.id));
    const ids=(x,set)=>Array.isArray(x)&&x.length<=set.size&&new Set(x).size===x.length&&x.every(v=>typeof v==='string'&&set.has(v));
    if(!obj(raw)||raw.schema!==SCHEMA||!obj(raw.memory)||!obj(raw.quiz)||!obj(raw.activity))bad();
    const out=empty();
    out.studyPriority=raw.studyPriority==='extra'?'extra':'essential';
    for(const [id,m] of Object.entries(raw.memory)){
      if(!cardIds.has(id)||!obj(m)||!['known','hard','again'].includes(m.rating)||!num(m.level)||m.level>5||!date(m.due)||(m.completed!==null&&!date(m.completed))||!num(m.seen)||!num(m.updatedAt))bad();
      out.memory[id]={rating:m.rating,level:m.level,due:m.due,completed:m.completed,seen:m.seen,updatedAt:m.updatedAt};
    }
    for(const [id,q] of Object.entries(raw.quiz)){
      if(!qIds.has(id)||!obj(q)||typeof q.wrong!=='boolean'||typeof q.correct!=='boolean'||q.wrong===q.correct||typeof q.answer!=='string'||q.answer.length>2000||!num(q.attempts)||!num(q.updatedAt))bad();
      out.quiz[id]={wrong:q.wrong,correct:q.correct,answer:q.answer,attempts:q.attempts,updatedAt:q.updatedAt};
    }
    if(Object.keys(raw.activity).length>5000)bad();
    for(const [d,a] of Object.entries(raw.activity)){
      if(!date(d)||!obj(a)||!['reviews','known','hard','again','quiz','correct'].every(k=>num(a[k])))bad();
      out.activity[d]=Object.fromEntries(['reviews','known','hard','again','quiz','correct'].map(k=>[k,a[k]]));
    }
    const s=raw.session;
    if(s!==null&&s!==undefined){
      if(!obj(s)||!date(s.date)||!ids(s.ids,cardIds)||!ids(s.queue,cardIds)||!ids(s.done,cardIds)||!s.queue.every(id=>s.ids.includes(id))||!s.done.every(id=>s.ids.includes(id))||!num(s.index)||s.index>s.queue.length||!num(s.round)||s.round<1||!num(s.reviews)||!obj(s.streak))bad();
      if(Object.entries(s.streak).some(([id,n])=>!s.ids.includes(id)||!num(n)||n>2))bad();
      out.session={date:s.date,ids:[...s.ids],queue:[...s.queue],index:s.index,round:s.round,streak:{...s.streak},done:[...s.done],reviews:s.reviews,undo:null};
    }
    const q=raw.quizSession;
    if(q!==null&&q!==undefined){
      if(!obj(q)||!ids(q.ids,qIds)||!num(q.index)||q.index>q.ids.length||!Array.isArray(q.results)||q.results.length!==q.index||!q.results.every((r,i)=>obj(r)&&r.id===q.ids[i]&&typeof r.correct==='boolean')||typeof q.draft!=='string'||q.draft.length>2000)bad();
      out.quizSession={ids:[...q.ids],index:q.index,results:q.results.map(r=>({id:r.id,correct:r.correct})),draft:q.draft};
    }
    if(obj(raw.preferences))out.preferences={topic:raw.preferences.topic==='animal'||cards.some(c=>c.topic===raw.preferences.topic)?raw.preferences.topic:'all',filter:['due','all','wrong','hard','done'].includes(raw.preferences.filter)?raw.preferences.filter:'due',size:[0,10,20,40].includes(raw.preferences.size)?raw.preferences.size:20};
    if(obj(raw.quizPreferences))out.quizPreferences={topic:cards.some(c=>c.topic===raw.quizPreferences.topic)?raw.quizPreferences.topic:'all',scope:['all','basic','wrong','extra','retry'].includes(raw.quizPreferences.scope)?raw.quizPreferences.scope:'all',size:[0,10,20].includes(raw.quizPreferences.size)?raw.quizPreferences.size:10};
    if(raw.learning!==undefined){
      const l=raw.learning;
      if(!obj(l)||!num(l.current)||l.current<1||l.current>12||!obj(l.marks))bad();
      out.learning.current=l.current;
      for(const [id,m] of Object.entries(l.marks)){
        if(!/^(?:[1-9]|1[0-2])$/.test(id)||!obj(m)||!['known','again'].includes(m.status)||!num(m.updatedAt))bad();
        out.learning.marks[id]={status:m.status,updatedAt:m.updatedAt};
      }
    }
    out.updatedAt=num(raw.updatedAt)?raw.updatedAt:0;return out;
  }
  root.ScienceCore={SCHEMA,day,addDays,empty,due,isWrong,matchesTopic,matchesPriority,pick,start,current,rate,nextRound,undo,quizRate,validate};
  if(typeof module!=='undefined')module.exports=root.ScienceCore;
})(typeof window==='undefined'?globalThis:window);
