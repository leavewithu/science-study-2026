'use strict';
window.createExamUI=function(ctx){
 const {D,getState,save,render,navigate,figure,esc,icon,confirmAction,toast,topicOptions}=ctx,E=window.ExamCore,$=s=>document.querySelector(s);
 const main=$('#main'),qmap=Object.fromEntries(D.examQuestions.map(q=>[q.id,q])),cmap=Object.fromEntries(D.concepts.map(c=>[c.id,c]));
 let active=null,resultId=null,reviewFilter='pending',reviewTopic='all',resultFilter='review',returnTarget=null;
 const state=()=>getState().assessment;
 const score=a=>Math.round(E.results(a,D).filter(r=>r.correct).length/a.ids.length*100);
 const dateLabel=d=>d?`${Number(d.slice(5,7))}월 ${Number(d.slice(8,10))}일`:'';
 const atLabel=t=>new Date(t).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
 const heading=(title,sub)=>`<div class="page-heading"><div><h2>${title}</h2><p class="muted">${sub}</p></div></div>`;
 function openResult(id){active=null;resultId=id;resultFilter='review';const a=state().attempts.find(a=>a.id===id);for(const r of E.results(a,D))if(!r.correct||r.uncertain)state().reads[r.conceptId]=Date.now();save();render();main.focus();}
 function openDraft(d){if(!d){toast('오늘 복습할 오답이 없어요.');return;}active=d.id;resultId=null;save();render();main.focus();}
 function findDraft(){return [...Object.values(state().drafts),state().reviewDraft].find(x=>x?.id===active);}
 function examHome(){
  const x=state(),count=x.attempts.filter(a=>a.kind==='exam').length;
  const roundList=rounds=>`<div class="round-list">${rounds.map(r=>{
   const attempts=x.attempts.filter(a=>a.round===r.id).sort((a,b)=>a.submittedAt-b.submittedAt),draft=x.drafts[r.id];
   const done=draft?draft.ids.filter(id=>E.answered(qmap[id],draft.answers[id])).length:0;
   return `<article class="round-item"><div class="round-name"><h3>${r.title}</h3><span class="muted">${r.ids.length}문항${r.kind==='legacy'?'':` · 5과 ${r.plantCount} / 6과 ${r.animalCount}`}</span></div><div class="round-scores">${attempts.length?`<span>첫 시험 <strong>${score(attempts[0])}점</strong></span><span>최근 <strong>${score(attempts.at(-1))}점</strong></span>`:'<span class="muted">아직 응시하지 않음</span>'}${draft?`<span class="tag">${done}/${r.ids.length} 답안 저장</span>`:''}</div><div class="actions">${r.kind!=='legacy'||draft?`<button data-start-round="${r.id}" class="${draft||!attempts.length?'primary':''}">${icon(draft?'play':'pencil')}${draft?'이어 풀기':attempts.length?'새로 응시':'시험 시작'}</button>`:''}${attempts.length?`<button data-result="${attempts.at(-1).id}">${icon('clipboard-check')}결과</button>`:''}</div></article>`;
  }).join('')}</div>`;
  const legacy=(D.legacyExams||[]).filter(r=>x.drafts[r.id]||x.attempts.some(a=>a.round===r.id));
  main.innerHTML=heading('회차별 시험','공통 6회 + 6과 추가 2회 · 회당 20문항 · 5지선다 15 + 단답형 5')+
   `<section class="exam-section" aria-label="공통 시험"><h3>공통 시험 <span class="tag">5과 40% · 6과 60%</span></h3>${roundList(D.exams.filter(r=>r.kind==='common'))}</section>`+
   `<section class="exam-section" aria-label="6과 추가 시험"><h3>6과 추가 시험 <span class="tag">6과 20문항</span></h3>${roundList(D.exams.filter(r=>r.kind==='extra'))}</section>`+
   (legacy.length?`<details class="exam-history"><summary>이전 구성의 시험 기록 · ${legacy.length}회차</summary>${roundList(legacy)}</details>`:'')+
   (count?history('exam'):'')+coverage();
  document.querySelectorAll('[data-start-round]').forEach(b=>b.onclick=()=>openDraft(E.startExam(x,b.dataset.startRound,D)));
  bindResults();
 }
 function coverage(){return `<div class="exam-coverage"><details><summary>원자료 오답 · 시험과 카드 ${D.sourceCoverage.length} / 53</summary><p class="muted">오답 표시 52묶음 + 잘린 문항 보완 1묶음. 모든 묶음이 공통 시험과 암기카드에 연결되어 있습니다.</p><div class="table-wrap"><table><thead><tr><th>원자료</th><th>공통 시험</th><th>추가 시험</th><th>암기카드</th></tr></thead><tbody>${D.sourceCoverage.map(row=>`<tr><td><strong>${row.id}${row.id==='오답13'?' · 보완':''}</strong><br>${esc(row.unit)}<br><span class="muted">${esc(row.source)}</span></td><td>${row.common.map(id=>E.round(D,id).title).join(' · ')}</td><td>${row.extra.map(id=>E.round(D,id).title).join(' · ')||'—'}</td><td>${row.cards.join(' · ')}</td></tr>`).join('')}</tbody></table></div></details></div>`;}
 function history(kind){const list=state().attempts.filter(a=>a.kind===kind).sort((a,b)=>b.submittedAt-a.submittedAt);return `<details class="exam-history"><summary>${kind==='exam'?'시험':'복습'} 응시 기록 ${list.length}회</summary><div class="table-wrap"><table><thead><tr><th>응시</th><th>제출 시각</th><th>정답</th><th>결과</th></tr></thead><tbody>${list.map(a=>`<tr><td>${a.round?esc(E.round(D,a.round).title):'오답 복습'}</td><td>${atLabel(a.submittedAt)}</td><td>${E.results(a,D).filter(r=>r.correct).length}/${a.ids.length}</td><td><button data-result="${a.id}" class="icon-button" title="결과 보기" aria-label="${atLabel(a.submittedAt)} 결과 보기">${icon('clipboard-list')}</button></td></tr>`).join('')}</tbody></table></div></details>`;}
 function bindResults(){document.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>openResult(b.dataset.result));}
 function reviewHome(){
  const all=Object.values(E.reviews(state(),D)),due=all.filter(r=>r.ready&&(window.ScienceCore.matchesTopic(cmap[r.id],reviewTopic))),pending=all.filter(r=>r.status==='pending'),mastered=all.filter(r=>r.status==='mastered');
  const selected=all.filter(r=>reviewFilter==='all'||reviewFilter==='due'&&r.ready||reviewFilter===r.status).filter(r=>window.ScienceCore.matchesTopic(cmap[r.id],reviewTopic)).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
  main.innerHTML=heading('오답 복습','오답·헷갈림을 개념별로 모아 다시 확인')+`<div class="metrics"><div class="metric"><strong>${all.filter(r=>r.ready).length}</strong><span>오늘 복습</span></div><div class="metric"><strong>${pending.filter(r=>!r.ready).length}</strong><span>복습 대기</span></div><div class="metric"><strong>${mastered.length}</strong><span>기억 확인 완료</span></div><div class="metric"><strong>${all.length}</strong><span>모인 개념</span></div></div><div class="review-toolbar"><button id="start-review" class="primary" ${!due.length&&!state().reviewDraft?'disabled':''}>${icon('play')}${state().reviewDraft?'저장한 복습 이어 풀기':`오늘 복습 시작${due.length?' · '+Math.min(due.length,10)+'문항':''}`}</button><span class="muted">기억 확인: 서로 다른 날·다른 문항 2회</span></div><div class="filterbar"><select id="review-filter" aria-label="복습 상태">${[['pending','남은 개념'],['due','오늘 복습'],['mastered','기억 확인 완료'],['all','전체']].map(([v,t])=>`<option value="${v}" ${v===reviewFilter?'selected':''}>${t}</option>`).join('')}</select><select id="review-topic" aria-label="복습 단원"><option value="all">전체 단원</option>${D.topics.map(t=>`<option value="${t.id}" ${t.id===reviewTopic?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div><section class="review-list" aria-label="오답 개념 목록">${selected.map(r=>`<article class="review-row"><div><h3>${esc(cmap[r.id].title)}</h3><span class="muted">${esc(r.reason)} · ${esc(cmap[r.id].refs.join(' · '))}</span></div><div><strong>${r.status==='mastered'?'기억 확인 완료':r.ready?'오늘 복습':dateLabel(r.due)+' 복습'}</strong><span class="muted">${r.streak} / 2회</span></div><button data-concept="${r.id}">${icon('book-open')}개념 보기</button></article>`).join('')||`<div class="empty"><h3>${all.length?'이 범위에 해당하는 개념이 없어요':'아직 모인 오답이 없어요'}</h3></div>`}</section>${history('review')}`;
  $('#review-topic').innerHTML=topicOptions(reviewTopic);
  $('#start-review').onclick=()=>openDraft(E.startReview(state(),D,E.day(),Date.now(),due.map(r=>r.id)));
  $('#review-filter').onchange=e=>{reviewFilter=e.target.value;render();};$('#review-topic').onchange=e=>{reviewTopic=e.target.value;render();};
  bindConcepts('review');bindResults();
 }
 function questionScreen(d){
  const q=qmap[d.ids[d.index]],a=d.answers[q.id],n=d.ids.length;
  const done=d.ids.filter(id=>E.answered(qmap[id],d.answers[id])).length;
  main.innerHTML=`<div class="page-heading"><div><h2>${d.kind==='review'?'오답 복습':esc(E.round(D,d.round).title)+' 시험'}</h2><p class="muted"><span id="answer-count">${done}</span> / ${n} 답안 작성</p></div><button id="leave-exam">${icon('list')}목록</button></div><div class="exam-layout"><aside class="question-index" aria-label="문항 이동"><div class="question-grid">${d.ids.map((id,i)=>`<button class="question-dot ${E.answered(qmap[id],d.answers[id])?'answered':''} ${d.answers[id]?.uncertain?'uncertain':''}" data-question-index="${i}" ${i===d.index?'aria-current="step"':''} aria-label="${i+1}번${E.answered(qmap[id],d.answers[id])?' 답안 있음':' 미응답'}${d.answers[id]?.uncertain?' 헷갈림':''}">${i+1}</button>`).join('')}</div><button id="submit-exam" class="primary">${icon('clipboard-check')}제출 · 채점</button></aside><section class="exam-question" aria-labelledby="exam-question-title"><div class="card-meta"><span>${d.index+1} / ${n}</span><span>${q.type==='mc'?'5지선다':'단답형'}</span><span>${esc(D.topics.find(t=>t.id===q.topic).name)}</span></div><h3 id="exam-question-title" tabindex="-1">${esc(q.prompt)}</h3>${figure(q.figure)}${q.type==='mc'?`<fieldset class="answer-options"><legend class="sr-only">답 선택</legend>${q.options.map((o,i)=>`<label class="answer-option"><input type="radio" name="exam-answer" value="${i}" ${a?.value===i?'checked':''}><span class="option-number">${i+1}</span><span>${esc(o)}</span></label>`).join('')}</fieldset>`:`<label class="draft-label" for="short-answer">내 답</label><input id="short-answer" type="text" maxlength="200" autocomplete="off" value="${esc(a?.value||'')}">`}<div class="answer-meta"><label><input type="checkbox" id="uncertain-answer" ${a?.uncertain?'checked':''}>헷갈림 · 찍음</label><button id="clear-answer" class="icon-button" title="이 답 지우기" aria-label="이 답 지우기">${icon('eraser')}</button></div><div class="exam-pager"><button id="prev-question" class="icon-button" title="이전 문제" aria-label="이전 문제" ${d.index===0?'disabled':''}>${icon('arrow-left')}</button><span>${d.index+1} / ${n}</span><button id="next-question" ${d.index===n-1?'class="primary"':'class="icon-button"'} title="${d.index===n-1?'답안 제출':'다음 문제'}" aria-label="${d.index===n-1?'답안 제출':'다음 문제'}">${icon(d.index===n-1?'clipboard-check':'arrow-right')}${d.index===n-1?'제출 · 채점':''}</button></div></section></div>`;
  const sync=()=>{save();const count=d.ids.filter(id=>E.answered(qmap[id],d.answers[id])).length;$('#answer-count').textContent=count;document.querySelectorAll('[data-question-index]').forEach(b=>{const id=d.ids[Number(b.dataset.questionIndex)],yes=E.answered(qmap[id],d.answers[id]),flag=d.answers[id]?.uncertain;b.classList.toggle('answered',yes);b.classList.toggle('uncertain',!!flag);b.setAttribute('aria-label',`${Number(b.dataset.questionIndex)+1}번 ${yes?'답안 있음':'미응답'}${flag?' 헷갈림':''}`);});};
  const update=value=>{E.setAnswer(d,q.id,value,$('#uncertain-answer').checked);sync();};
  document.querySelectorAll('[name=exam-answer]').forEach(b=>b.onchange=e=>update(Number(e.target.value)));
  if($('#short-answer'))$('#short-answer').oninput=e=>update(e.target.value);
  $('#uncertain-answer').onchange=()=>update(d.answers[q.id]?.value??(q.type==='mc'?null:''));
  $('#clear-answer').onclick=()=>{E.setAnswer(d,q.id,q.type==='mc'?null:'',!!d.answers[q.id]?.uncertain);save();render();};
  const move=i=>{d.index=i;d.updatedAt=Date.now();save();render();$('#exam-question-title').focus({preventScroll:true});$('.exam-question').scrollIntoView({block:'start'});};
  document.querySelectorAll('[data-question-index]').forEach(b=>b.onclick=()=>move(Number(b.dataset.questionIndex)));
  $('#prev-question').onclick=()=>move(d.index-1);
  function finish(){const blank=d.ids.filter(id=>!E.answered(qmap[id],d.answers[id])).length;confirmAction('답안을 제출할까요?',blank?`미응답 ${blank}문항은 오답으로 채점합니다. 제출 후에는 답을 바꿀 수 없습니다.`:`${n}문항을 한꺼번에 채점합니다. 제출 후에는 답을 바꿀 수 없습니다.`,()=>{try{const a=E.submit(state(),d,D);save();openResult(a.id);}catch(error){toast(error.message);}});}
  $('#submit-exam').onclick=finish;$('#next-question').onclick=()=>d.index===n-1?finish():move(d.index+1);
  $('#leave-exam').onclick=()=>{active=null;save();render();};
 }
 function userAnswer(q,a){if(!E.answered(q,a))return '미응답';return q.type==='mc'?`${a.value+1}. ${q.options[a.value]}`:a.value;}
 function resultScreen(a){
  const rs=E.results(a,D),wrong=rs.filter(r=>!r.correct).length,unsure=rs.filter(r=>r.correct&&r.uncertain).length,revs=E.reviews(state(),D);
  const list=rs.filter(r=>resultFilter==='all'||!r.correct||r.uncertain);
  main.innerHTML=heading(`${a.round?E.round(D,a.round).title+' 시험':'오답 복습'} 결과`,`${atLabel(a.submittedAt)} 제출`)+`<div class="metrics"><div class="metric"><strong>${score(a)}점</strong><span>이번 응시 점수</span></div><div class="metric"><strong>${rs.length-wrong}/${rs.length}</strong><span>정답</span></div><div class="metric"><strong>${wrong}</strong><span>오답 · 미응답</span></div><div class="metric"><strong>${unsure}</strong><span>맞혔지만 헷갈림</span></div></div><div class="result-actions"><button id="result-home">${icon('list')}목록</button><button id="review-overview">${icon('calendar-days')}복습 일정</button><select id="result-filter" aria-label="결과 문항 범위"><option value="review" ${resultFilter==='review'?'selected':''}>오답·헷갈림</option><option value="all" ${resultFilter==='all'?'selected':''}>전체 문항</option></select></div><section class="result-list" aria-label="채점과 해설">${list.map(r=>{
   const q=qmap[r.id],c=cmap[q.conceptId],v=revs[c.id],needs=!r.correct||r.uncertain;
   return `<article class="result-question"><header><h3>${a.ids.indexOf(q.id)+1}번 · ${!r.correct?'오답':r.uncertain?'정답 · 헷갈림':'정답'}</h3><span class="result-status ${r.correct?'correct':'incorrect'}">${icon(r.correct?'check':'x')}</span></header><p class="result-prompt">${esc(q.prompt)}</p><dl class="result-answers"><div><dt>내 답</dt><dd>${esc(userAnswer(q,a.answers[q.id]))}</dd></div><div><dt>정답</dt><dd>${q.type==='mc'?q.correct+1+'. ':''}${esc(q.answer)}</dd></div></dl><details data-explanation="${c.id}" ${needs?'open':''}><summary>해설 · 핵심 개념</summary>${figure(q.figure)}<p>${esc(q.explanation)}</p><p class="concept-cue">${esc(c.cue)}</p>${q.type==='short'?`<p class="muted">인정 답: ${q.accepted.map(esc).join(' · ')}</p>`:''}</details><footer><button data-concept="${c.id}">${icon('book-open')}처음 공부 ${q.lesson}단원</button>${v?`<span>${v.status==='mastered'?'기억 확인 완료':dateLabel(v.due)+' 복습'} · ${v.streak}/2회</span>`:''}</footer></article>`;
  }).join('')||'<div class="empty"><h3>오답과 헷갈린 답이 없어요</h3><p class="muted">이번 응시 기록은 그대로 보관했어요.</p></div>'}</section>`;
  $('#result-filter').onchange=e=>{resultFilter=e.target.value;render();};$('#result-home').onclick=()=>{resultId=null;render();};
  $('#review-overview').onclick=()=>{resultId=null;active=null;navigate('review');};bindConcepts(a.kind==='exam'?'quiz':'review');
  document.querySelectorAll('[data-explanation]').forEach(detail=>detail.ontoggle=()=>{if(detail.open){const id=detail.dataset.explanation;state().reads[id]=Date.now();save();const v=E.reviews(state(),D)[id],label=detail.parentElement.querySelector('footer span');if(v&&label)label.textContent=`${v.status==='mastered'?'기억 확인 완료':dateLabel(v.due)+' 복습'} · ${v.streak}/2회`;}});
 }
 function bindConcepts(from){document.querySelectorAll('[data-concept]').forEach(b=>b.onclick=()=>{
  const c=cmap[b.dataset.concept];returnTarget={view:from,resultId};state().reads[c.id]=Date.now();getState().learning.current=c.lesson;save();navigate('learn');
 });}
 function backButton(){if(!returnTarget)return;const b=document.createElement('button');b.className='lesson-return';b.innerHTML=icon('arrow-left')+'복습·결과로 돌아가기';b.onclick=()=>{const target=returnTarget;returnTarget=null;resultId=target.resultId;navigate(target.view);};main.prepend(b);}
 function show(view){
  const d=findDraft(),a=state().attempts.find(a=>a.id===resultId);
  if(d&&((view==='quiz'&&d.kind==='exam')||(view==='review'&&d.kind==='review')))questionScreen(d);
  else if(a&&((view==='quiz'&&a.kind==='exam')||(view==='review'&&a.kind==='review')))resultScreen(a);
  else view==='quiz'?examHome():reviewHome();
 }
 return {show,backButton,reset(){active=null;resultId=null;returnTarget=null;}};
};
