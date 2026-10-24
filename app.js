const $ = s => document.querySelector(s), app = $('#app');
const KEY = 'mandarin-family-v1';
const DEF = {cur:0, profiles:[{name:'Rob',av:'🧔'},{name:'Ava',av:'👧'},{name:'Hannah',av:'👶'}], prog:{}};
let S; try { S = JSON.parse(localStorage.getItem(KEY)) || DEF; } catch(e){ S = DEF; }
S.profiles.forEach((p,i)=>{ S.prog[i] = S.prog[i] || {}; });
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
const P = () => S.prog[S.cur];
const shuffle = a => a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);

// ---- tones ----
const TONES = {1:'āēīōūǖĀĒĪŌŪ',2:'áéíóúǘÁÉÍÓÚ',3:'ǎěǐǒǔǚǍĚǏǑǓ',4:'àèìòùǜÀÈÌÒÙ'};
const tone = syl => { for (const t in TONES) if ([...syl].some(c=>TONES[t].includes(c))) return t; return 0; };
const pyHTML = py => py.split(' ').map(s=>`<b class="t${tone(s)}">${s}</b>`).join('');

// ---- speech ----
let zhVoice = null;
const pickVoice = () => { const v = speechSynthesis.getVoices();
  zhVoice = v.find(x=>/zh[-_]CN/i.test(x.lang)) || v.find(x=>/^zh/i.test(x.lang)) || null; };
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text, slow){ if(!('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text);
  u.lang='zh-CN'; if(zhVoice) u.voice=zhVoice; u.rate = slow?0.5:0.9; speechSynthesis.speak(u); }
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const NUMS = {'一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10'};
function listen(w, done){
  const r = new SR(); r.lang='zh-CN'; r.maxAlternatives=5; r.interimResults=false;
  r.onresult = e => { const alts=[...e.results[0]].map(a=>a.transcript.replace(/[\s。，！？.,!?]/g,''));
    done(alts.some(a=>a.includes(w.hz) || (NUMS[w.hz] && a.includes(NUMS[w.hz]))), alts[0]); };
  r.onerror = e => done(null, e.error); r.start(); }

// ---- progress / spaced repetition (Leitner boxes) ----
const GAP = [0, 1, 5, 30, 180, 1440, 4320]; // minutes per box
function mark(id, ok){ const p = P()[id] || {box:0,due:0,seen:1};
  p.box = ok ? Math.min(p.box+1, GAP.length-1) : 0; p.due = Date.now()+GAP[p.box]*60000; P()[id]=p; save(); }
function seen(id){ if(!P()[id]){ P()[id]={box:0,due:0,seen:1}; save(); } }
const stars = () => Object.values(P()).filter(p=>p.box>=3).length;

// ---- screens ----
function header(){ const p=S.profiles[S.cur]; $('#who').textContent = p.av+' ⭐'+stars(); }
function home(){ header();
  app.innerHTML = `<div class="row">${S.profiles.map((p,i)=>`<button class="prof ${i==S.cur?'on':''}" data-i="${i}">
    <span class="av">${p.av}</span><input value="${p.name}" data-i="${i}" aria-label="name"></button>`).join('')}</div>
   <div class="row"><button class="big c1" id="mLearn">📚 Learn</button><button class="big c2" id="mPrac">🎯 Practice</button>
   <button class="big c3" id="mPlay">👨‍👧‍👧 Play Together</button></div>`;
  app.querySelectorAll('.prof').forEach(b=>b.onclick=e=>{ if(e.target.tagName==='INPUT') return; S.cur=+b.dataset.i; save(); home(); });
  app.querySelectorAll('.prof input').forEach(inp=>inp.onchange=()=>{ S.profiles[inp.dataset.i].name=inp.value.trim()||'?'; save(); });
  $('#mLearn').onclick=()=>themes(learn); $('#mPrac').onclick=()=>themes(practice); $('#mPlay').onclick=()=>themes(playSetup); }
function themes(next){ header();
  app.innerHTML = `<div class="grid">${THEMES.map(t=>`<button class="theme" style="background:${t.color}" data-id="${t.id}">
   <span>${t.icon}</span>${t.name}</button>`).join('')}<button class="theme" style="background:#555" data-id="all"><span>🌈</span>All</button></div>`;
  app.querySelectorAll('.theme').forEach(b=>b.onclick=()=>next(b.dataset.id)); }
const wordsOf = id => id==='all' ? WORDS : WORDS.filter(w=>w.theme===id);

function learn(tid, i=0){ header(); const ws=wordsOf(tid), w=ws[(i+ws.length)%ws.length]; seen(w.id);
  app.innerHTML = `<div class="card"><div class="pic" id="pic">${w.img}</div><div class="py">${pyHTML(w.py)}</div>
   <div class="hz">${w.hz}</div><div class="en">${w.en}</div>
   <div class="row"><button class="big c1" id="n">🔊</button><button class="big c5" id="s">🐢</button>
   <button class="big c4" id="mic">🎤 Say it</button></div><div class="msg" id="msg"></div>
   <div class="row"><button class="big c2" id="prev">⬅️</button><button class="big c2" id="next">➡️</button></div></div>
   <p class="legend"><b class="t1">ˉ1</b> <b class="t2">ˊ2</b> <b class="t3">ˇ3</b> <b class="t4">ˋ4</b> <b class="t0">· neutral</b></p>`;
  const go = d => learn(tid, (i+d+ws.length)%ws.length);
  $('#n').onclick=$('#pic').onclick=()=>say(w.hz); $('#s').onclick=()=>say(w.hz,true);
  $('#prev').onclick=()=>go(-1); $('#next').onclick=()=>go(1);
  $('#mic').onclick=()=>{ const msg=$('#msg');
    const selfRate=()=>{ msg.innerHTML=`<button class="big c1" id="ok">👍 I said it!</button>`; $('#ok').onclick=()=>{mark(w.id,true); msg.textContent='🎉'; header();}; };
    if(!SR) return selfRate();
    msg.textContent='👂 ...'; listen(w,(ok,heard)=>{
      if(ok){ mark(w.id,true); msg.textContent='🎉 '+heard; header(); }
      else if(ok===false){ msg.textContent='🔁 '+(heard||''); say(w.hz,true); }
      else selfRate(); }); };
  say(w.hz); }

function pickQ(ws){ const now=Date.now(), P0=P();
  const due = ws.filter(w=>!P0[w.id] || P0[w.id].due<=now);
  const pool = due.length ? due : ws;
  pool.sort((a,b)=>((P0[a.id]||{box:0}).box)-((P0[b.id]||{box:0}).box));
  const w = pool[Math.floor(Math.random()*Math.min(4,pool.length))];
  const others = shuffle(WORDS.filter(x=>x.id!==w.id && x.img!==w.img && x.py!==w.py && (ws.length>=4 ? x.theme===w.theme : true))).slice(0,3);
  return {w, opts: shuffle([w,...others])}; }
function quiz(ws, onAnswer, extra=''){ const {w,opts}=pickQ(ws);
  app.innerHTML = `${extra}<div class="row"><button class="big c1" id="n">🔊</button><button class="big c5" id="s">🐢</button></div>
   <div class="grid">${opts.map(o=>`<button class="choice" data-id="${o.id}">${o.img}</button>`).join('')}</div>
   <div class="msg" id="msg"></div>`;
  $('#n').onclick=()=>say(w.hz); $('#s').onclick=()=>say(w.hz,true); say(w.hz);
  let done=false;
  app.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{ if(done) return; done=true; const ok=b.dataset.id===w.id;
    b.classList.add(ok?'right':'wrong'); app.querySelector(`[data-id="${w.id}"]`).classList.add('right');
    $('#msg').innerHTML = (ok?'🎉 ':'💪 ')+`${w.hz} ${pyHTML(w.py)}`; if(!ok) say(w.hz);
    setTimeout(()=>onAnswer(w,ok), ok?1200:2200); }); }
function practice(tid){ header(); quiz(wordsOf(tid), (w,ok)=>{ mark(w.id,ok); practice(tid); }); }

function playSetup(tid){ const sc=S.profiles.map(()=>0); playTurn(tid, sc, 0, 0); }
function playTurn(tid, sc, turn, round){ const n=S.profiles.length, ROUNDS=5;
  if(round>=ROUNDS*n){ const max=Math.max(...sc);
    app.innerHTML=`<div class="card"><div class="pic">🏆</div><div class="score">${S.profiles.map((p,i)=>`${p.av} ${p.name}: ${sc[i]} ${sc[i]===max?'👑':''}`).join('<br>')}</div>
     <div class="row"><button class="big c1" id="again">🔁</button><button class="big c2" id="h">🏠</button></div></div>`;
    $('#again').onclick=()=>playSetup(tid); $('#h').onclick=home; return; }
  const p=S.profiles[turn];
  const bar=`<div class="score">${S.profiles.map((q,i)=>`<span class="${i===turn?'cur':''}">${q.av} ${q.name} ${sc[i]}</span>`).join(' · ')}</div>
   <div class="msg">${p.av} ${p.name}!</div>`;
  quiz(wordsOf(tid), (w,ok)=>{ if(ok) sc[turn]++; const prev=S.cur; S.cur=turn; mark(w.id,ok); S.cur=prev; save();
    playTurn(tid, sc, (turn+1)%n, round+1); }, bar); }

$('#homeBtn').onclick=home; home();
