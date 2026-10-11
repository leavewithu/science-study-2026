'use strict';
(function(root){
 const day=(time=Date.now())=>{const d=new Date(time);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const add=(date,n)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+n);return day(d.getTime());};
 const empty=()=>({version:1,drafts:{},attempts:[],reads:{},legacy:{},reviewDraft:null});
 const normalize=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[\s.,!?·()]/g,'');
 const answered=(q,a)=>q.type==='mc'?Number.isInteger(a?.value):Boolean(a?.value?.trim());
 const correct=(q,a)=>answered(q,a)&&(q.type==='mc'?a.value===q.correct:q.accepted.some(x=>normalize(x)===normalize(a.value)));
 const results=(attempt,D)=>attempt.ids.map(id=>{const q=D.examQuestions.find(q=>q.id===id),a=attempt.answers[id];return {id,conceptId:q.conceptId,correct:correct(q,a),uncertain:!!a?.uncertain,answered:answered(q,a)};});
 const round=(D,id)=>D.exams.find(r=>r.id===id)||(D.legacyExams||[]).find(r=>r.id===id);
 function migrate(exam,legacyQuiz,D){
  for(const c of D.concepts){const dates=c.refs.filter(ref=>legacyQuiz[ref]?.wrong).map(ref=>legacyQuiz[ref].updatedAt);if(dates.length)exam.legacy[c.id]=Math.max(exam.legacy[c.id]||0,...dates);}
  return exam;
 }
 function reviews(exam,D,today=day()){
  const out={};
  const reset=(id,qid,date,time,reason)=>{out[id]={id,status:'pending',streak:0,due:add(date,1),lastDate:null,lastQuestion:qid,sourceQuestion:qid,failedAt:time,reason};};
  for(const [id,time] of Object.entries(exam.legacy))reset(id,null,day(time),time,'이전 연습 오답');
  for(const a of [...exam.attempts].sort((a,b)=>a.submittedAt-b.submittedAt||a.id.localeCompare(b.id))){
   for(const r of results(a,D)){
    if(exam.legacy[r.conceptId]>a.submittedAt)continue;
    if(!r.correct||r.uncertain){reset(r.conceptId,r.id,a.date,a.submittedAt,!r.correct?'오답':'헷갈림·찍음');continue;}
    const v=out[r.conceptId];
    if(a.kind!=='review'||!a.eligible?.includes(r.conceptId)||!v||v.status==='mastered'||a.date<v.due||a.date===v.lastDate||r.id===v.lastQuestion)continue;
    v.streak++;v.lastDate=a.date;v.lastQuestion=r.id;
    if(v.streak>=2){v.status='mastered';v.due=null;}else v.due=add(a.date,3);
   }
  }
  for(const v of Object.values(out)){
   const read=exam.reads[v.id];
   if(v.status==='pending'&&read&&add(day(read),1)>v.due)v.due=add(day(read),1);
   v.ready=v.status==='pending'&&v.due<=today;
  }
  return out;
 }
 function create(kind,round,ids,now=Date.now()){
  return {id:root.crypto?.randomUUID?.()||`${now}-${Math.random().toString(36).slice(2)}`,kind,round,ids:[...ids],answers:{},index:0,startedAt:now,updatedAt:now};
 }
 function startExam(exam,roundId,D,now=Date.now()){
  if(exam.drafts[roundId])return exam.drafts[roundId];
  const r=D.exams.find(r=>r.id===roundId);if(!r)throw Error('회차를 찾지 못했습니다.');
  return exam.drafts[roundId]=create('exam',roundId,r.ids,now);
 }
 function startReview(exam,D,today=day(),now=Date.now(),allowed=null){
  if(exam.reviewDraft)return exam.reviewDraft;
  const due=Object.values(reviews(exam,D,today)).filter(r=>r.ready&&(!allowed||allowed.includes(r.id))).sort((a,b)=>a.due.localeCompare(b.due)||a.failedAt-b.failedAt).slice(0,10);
  if(!due.length)return null;
  const seen=new Set(exam.attempts.flatMap(a=>a.ids));
  const ids=due.map(r=>{const c=D.concepts.find(c=>c.id===r.id);const candidates=c.questionIds.filter(id=>id!==r.lastQuestion);return candidates.find(id=>!seen.has(id))||candidates[0];});
  return exam.reviewDraft=create('review',null,ids,now);
 }
 function setAnswer(draft,id,value,uncertain,now=Date.now()){
  if(!draft.ids.includes(id))throw Error('문항 불일치');
  draft.answers[id]={value,uncertain:!!uncertain};draft.updatedAt=now;
 }
 function submit(exam,draft,D,now=Date.now()){
  const existing=exam.attempts.find(a=>a.id===draft.id);if(existing)return existing;
  if(exam.attempts.length>=1000)throw Error('저장 가능한 시험 기록 수를 넘었습니다. 기록을 내보내 주세요.');
  const active=draft.kind==='exam'?exam.drafts[draft.round]:exam.reviewDraft;
  if(active?.id!==draft.id)throw Error('진행 중인 시험이 아닙니다.');
  const a={...JSON.parse(JSON.stringify(draft)),submittedAt:now,date:day(now),bankVersion:draft.kind==='exam'?(round(D,draft.round).bankVersion||D.examVersion):D.examVersion};
  // Snapshot eligibility before submission so later reading cannot rewrite past recall.
  if(a.kind==='review'){
   const scheduled=reviews(exam,D,a.date);
   a.eligible=a.ids.map(id=>({q:D.examQuestions.find(q=>q.id===id),id})).filter(({q,id})=>{const r=scheduled[q.conceptId];return r?.ready&&r.lastQuestion!==id&&r.lastDate!==a.date;}).map(({q})=>q.conceptId);
  }
  exam.attempts.push(a);
  if(draft.kind==='exam')delete exam.drafts[draft.round];else exam.reviewDraft=null;
  return a;
 }
 function validate(raw,D){
  if(raw===undefined)return empty();
  const bad=()=>{throw Error('과학 시험 기록이 손상되어 불러오지 않았습니다.');};
  const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),num=x=>Number.isSafeInteger(x)&&x>=0;
  const timestamp=x=>num(x)&&x<=253402214399999;
  if(!obj(raw)||raw.version!==1||!obj(raw.drafts)||!Array.isArray(raw.attempts)||raw.attempts.length>1000||!obj(raw.reads)||!obj(raw.legacy))bad();
  const qmap=new Map(D.examQuestions.map(q=>[q.id,q])),cids=new Set(D.concepts.map(c=>c.id));
  function record(a,finished){
   if(!obj(a)||typeof a.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(a.id)||!['exam','review'].includes(a.kind)||!Array.isArray(a.ids)||!a.ids.length||new Set(a.ids).size!==a.ids.length||a.ids.some(id=>!qmap.has(id))||!obj(a.answers)||!num(a.index)||a.index>=a.ids.length||!timestamp(a.startedAt)||!timestamp(a.updatedAt))bad();
   if(a.kind==='exam'){const r=round(D,a.round);if(!r||JSON.stringify(a.ids)!==JSON.stringify(r.ids))bad();}
   else if(a.round!==null||a.ids.length>10||new Set(a.ids.map(id=>qmap.get(id).conceptId)).size!==a.ids.length)bad();
   const clean={id:a.id,kind:a.kind,round:a.round,ids:[...a.ids],answers:{},index:a.index,startedAt:a.startedAt,updatedAt:a.updatedAt};
   for(const [id,v]of Object.entries(a.answers)){
    if(!a.ids.includes(id)||!obj(v)||typeof v.uncertain!=='boolean')bad();
    const q=qmap.get(id);
    if(q.type==='mc'?(v.value!==null&&(!Number.isInteger(v.value)||v.value<0||v.value>4)):(typeof v.value!=='string'||v.value.length>200))bad();
    clean.answers[id]={value:v.value,uncertain:v.uncertain};
   }
   if(finished){const versions=a.kind==='exam'?[round(D,a.round).bankVersion||D.examVersion]:[1,D.examVersion];if(!timestamp(a.submittedAt)||a.submittedAt<a.startedAt||!/^\d{4}-\d{2}-\d{2}$/.test(a.date)||!Number.isFinite(Date.parse(a.date))||new Date(a.date).toISOString().slice(0,10)!==a.date||!versions.includes(a.bankVersion))bad();Object.assign(clean,{submittedAt:a.submittedAt,date:a.date,bankVersion:a.bankVersion});
    if(a.kind==='review'){if(!Array.isArray(a.eligible)||new Set(a.eligible).size!==a.eligible.length||a.eligible.some(id=>!a.ids.some(qid=>qmap.get(qid).conceptId===id)))bad();clean.eligible=[...a.eligible];}
   }
   return clean;
  }
  const out=empty();
  for(const [id,d]of Object.entries(raw.drafts)){const clean=record(d,false);if(clean.kind!=='exam'||clean.round!==id)bad();out.drafts[id]=clean;}
  out.attempts=raw.attempts.map(a=>record(a,true));
  if(new Set(out.attempts.map(a=>a.id)).size!==out.attempts.length)bad();
  if(raw.reviewDraft!==null&&raw.reviewDraft!==undefined){out.reviewDraft=record(raw.reviewDraft,false);if(out.reviewDraft.kind!=='review')bad();}
  for(const key of ['reads','legacy'])for(const [id,time]of Object.entries(raw[key])){if(!cids.has(id)||!timestamp(time))bad();out[key][id]=time;}
  const completed=new Set(out.attempts.map(a=>a.id));
  for(const [id,d]of Object.entries(out.drafts))if(completed.has(d.id))delete out.drafts[id];
  if(completed.has(out.reviewDraft?.id))out.reviewDraft=null;
  return out;
 }
 function merge(a,b,D){
  const out=JSON.parse(JSON.stringify(a)),ids=new Set(out.attempts.map(x=>x.id));
  for(const attempt of b.attempts)if(!ids.has(attempt.id)){out.attempts.push(attempt);ids.add(attempt.id);}
  for(const [id,d]of Object.entries(b.drafts))if(!out.drafts[id]||d.updatedAt>out.drafts[id].updatedAt)out.drafts[id]=d;
  if(!out.reviewDraft)out.reviewDraft=b.reviewDraft;
  for(const key of ['reads','legacy'])for(const [id,time]of Object.entries(b[key]))out[key][id]=Math.max(out[key][id]||0,time);
  return validate(out,D);
 }
 root.ExamCore={day,add,empty,normalize,answered,correct,results,round,migrate,reviews,startExam,startReview,setAnswer,submit,validate,merge};
 if(typeof module!=='undefined')module.exports=root.ExamCore;
})(typeof window==='undefined'?globalThis:window);
