const $ = s => document.querySelector(s), app = $('#app');
const KEY = 'mandarin-family-v1';
const DEF = {cur:0, profiles:[], prog:{}};
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
let actx;
function ding(good){ try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)(); const o=actx.createOscillator(), g=actx.createGain();
  o.connect(g); g.connect(actx.destination); const t=actx.currentTime; o.frequency.setValueAtTime(good?660:300,t); if(good) o.frequency.setValueAtTime(990,t+.12);
  g.gain.setValueAtTime(.2,t); g.gain.exponentialRampToValueAtTime(.001,t+.4); o.start(t); o.stop(t+.4);}catch(e){} }
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const NUMS = {'一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10'};
// syllable map built from our own word list, for toneless-pinyin matching (handles homophones like 他/她)
const STRIP = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ü/g,'v').toLowerCase();
const CH2PY = {}; WORDS.forEach(w=>{ const sy=w.py.split(' '); if(sy.length===[...w.hz].length) [...w.hz].forEach((c,k)=>CH2PY[c]=STRIP(sy[k])); });
const toPy = t => [...t].map(c=>CH2PY[c]||NUMPY[c]||c).join('');
const NUMPY = {'1':'yi','2':'er','3':'san','4':'si','5':'wu','6':'liu','7':'qi','8':'ba','9':'jiu','10':'shi'};
let rec = null;
function listen(w, done){
  if(rec){ try{rec.abort();}catch(e){} rec=null; }
  speechSynthesis && speechSynthesis.cancel();
  const r = rec = new SR(); r.lang='zh-CN'; r.maxAlternatives=5; r.interimResults=false; r.continuous=false;
  let finished=false, timer;
  const finish = (ok, heard) => { if(finished) return; finished=true; clearTimeout(timer); try{r.stop();}catch(e){} rec=null; done(ok, heard); };
  const arm = ms => { clearTimeout(timer); timer=setTimeout(()=>finish(null,'no-speech'), ms); };
  const target = STRIP(w.py).replace(/[\s']/g,'');
  r.onresult = e => { const alts=[]; for(const res of e.results) for(const a of res) alts.push(a.transcript.replace(/[\s。，！？、.,!?]/g,''));
    const ok = alts.some(a => a.includes(w.hz) || (NUMS[w.hz] && a.includes(NUMS[w.hz])) || toPy(a).replace(/\d+/g,d=>NUMPY[d]||d).includes(target));
    finish(ok, alts[0]||''); };
  r.onspeechstart = () => arm(4000);
  r.onspeechend = () => { try{r.stop();}catch(e){} arm(2500); };   // unreliable on iOS; timeout is the backstop
  r.onerror = e => finish(null, e.error);
  r.onend = () => setTimeout(()=>finish(null,'no-speech'), 800);   // ended with no result
  arm(6000);
  r.start();   // must run synchronously inside the tap handler for iOS Safari
}

// ---- progress / spaced repetition (Leitner boxes) ----
const GAP = [0, 1, 5, 30, 180, 1440, 4320]; // minutes per box
function mark(id, ok){ const p = P()[id] || {box:0,due:0,seen:1};
  p.box = ok ? Math.min(p.box+1, GAP.length-1) : 0; p.due = Date.now()+GAP[p.box]*60000; P()[id]=p; save(); }
function seen(id){ if(!P()[id]){ P()[id]={box:0,due:0,seen:1}; save(); } }
const stars = () => Object.values(P()).filter(p=>p.box>=3).length;

// ---- screens ----
function header(){ const p=S.profiles[S.cur]; if(!p){ $('#who').textContent=''; return; } $('#who').textContent = p.av+' ⭐'+stars(); }
function home(){ if(!S.profiles.length) return addPlayer(true); header();
  app.innerHTML = `<div class="row">${S.profiles.map((p,i)=>`<button class="prof ${i==S.cur?'on':''}" data-i="${i}">
    <span class="av">${p.av}</span><input value="${p.name}" data-i="${i}" aria-label="name"><span class="del" data-i="${i}">✖</span></button>`).join('')}
   <button class="prof add" id="add"><span class="av">➕</span>Add user</button></div>
   <div class="row"><button class="big c1" id="mLearn">📚 Learn</button><button class="big c2" id="mPrac">🎯 Practice</button>
   <button class="big c3" id="mPlay">👨‍👧‍👧 Play Together</button></div>`;
  app.querySelectorAll('.prof').forEach(b=>b.onclick=e=>{ if(e.target.tagName==='INPUT') return; S.cur=+b.dataset.i; save(); home(); });
  app.querySelectorAll('.del').forEach(d=>d.onclick=e=>{ e.stopPropagation(); const i=+d.dataset.i;
        if(!confirm('Delete '+S.profiles[i].name+' and their progress?')) return;
    S.profiles.splice(i,1); const np={}; S.profiles.forEach((_,k)=>np[k]=S.prog[k<i?k:k+1]||{}); S.prog=np;
    S.cur=Math.max(0,Math.min(S.cur>i?S.cur-1:S.cur, S.profiles.length-1)); save(); home(); });
  $('#add').onclick=()=>addPlayer();
  app.querySelectorAll('.prof input').forEach(inp=>inp.onchange=()=>{ S.profiles[inp.dataset.i].name=inp.value.trim()||'?'; save(); });
  $('#mLearn').onclick=()=>themes(learn); $('#mPrac').onclick=()=>themes(practice); $('#mPlay').onclick=()=>themes(playSetup); }
const AVS=['🧔','👩','👧','👦','👶','🧒','👴','👵','🐼','🐯','🐰','🦄','🐶','🐱','🦊','🐸'];
function addPlayer(first){ let av=AVS[8];
  app.innerHTML=`<div class="card"><h2>${first?'👋 Welcome! Add a user to start':'New user'}</h2><input id="nm" class="nm" placeholder="Name" maxlength="16">
   <div class="grid avs">${AVS.map(a=>`<button class="choice av1" data-a="${a}">${a}</button>`).join('')}</div>
   <div class="row"><button class="big c1" id="ok">✔ Add</button>${first?'':'<button class="big c4" id="cx">Cancel</button>'}</div></div>`;
  const pick=a=>{ av=a; app.querySelectorAll('.av1').forEach(b=>b.classList.toggle('right',b.dataset.a===a)); }; pick(av);
  app.querySelectorAll('.av1').forEach(b=>b.onclick=()=>pick(b.dataset.a));
  if($('#cx')) $('#cx').onclick=home;
  $('#ok').onclick=()=>{ const n=$('#nm').value.trim(); if(!n) return $('#nm').focus();
    S.profiles.push({name:n,av}); S.cur=S.profiles.length-1; S.prog[S.cur]={}; save(); home(); }; }
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
  const mic=$('#mic'), msg=$('#msg');
  mic.onclick=()=>{
    if(!SR){ msg.innerHTML=`<button class="big c5" id="ok">🙋 I said it (self-check)</button>`;
      $('#ok').onclick=()=>{ mark(w.id,true); msg.innerHTML='<span class="ok">✔</span>'; header(); }; return; }
    if(mic.classList.contains('listening')) return;
    mic.classList.add('listening'); mic.innerHTML='🎤 Listening…'; msg.textContent='';
    try { listen(w,(ok,heard)=>{ mic.classList.remove('listening'); mic.innerHTML='🎤 Say it';
      if(ok){ mark(w.id,true); header(); msg.innerHTML=`<span class="ok">✔</span>`; ding(true); }
      else if(ok===false){ msg.innerHTML=`<span class="no">Try again</span><div class="en">heard: ${heard}</div>`; ding(false); setTimeout(()=>say(w.hz,true),400); }
      else msg.innerHTML = heard==='not-allowed'||heard==='service-not-allowed'
        ? `<span class="no">Microphone blocked: allow it in Settings › Safari › Microphone</span>`
        : `<span class="no">Didn't hear you, tap 🎤 to try again</span>`; }); }
    catch(e){ mic.classList.remove('listening'); mic.innerHTML='🎤 Say it'; msg.innerHTML=`<span class="no">Didn't hear you, tap 🎤 to try again</span>`; } };
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
