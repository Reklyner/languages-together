const $ = s => document.querySelector(s), app = $('#app');
const GUEST_KEY = 'mandarin-family-v1';
let KEY = GUEST_KEY, S;
// ---- languages: LANGS[code] from words-*.js; switch with setLang ----
let LANG, THEMES, WORDS, LEVELS, DIG, NUMS={}, CH2PY={};
function setLang(c){ LANG=LANGS[c]||LANGS.zh; THEMES=LANG.themes; DIG=LANG.digits;
  WORDS=THEMES.flatMap(t=>t.words.map(([hz,py,en,img])=>({id:hz,hz,py,en,img,theme:t.id,level:t.level||1})));
  LEVELS=[...new Set(THEMES.map(t=>t.level||1))]; NUMS={}; DIG.forEach((d,i)=>{ if(i) NUMS[d]=''+i; }); CH2PY={};
  if(LANG.tones) WORDS.forEach(w=>{ const sy=w.py.split(' '); if(sy.length===[...w.hz].length) [...w.hz].forEach((c,k)=>CH2PY[c]=STRIP(sy[k])); });
  pickVoice(); document.documentElement.lang='en'; }
const newId = () => Math.random().toString(36).slice(2,10);
function load(key){ KEY=key; try { S = JSON.parse(localStorage.getItem(KEY)); } catch(e){ S=null; }
  S = S || {cur:0, profiles:[], prog:{}}; S.prog = S.prog || {}; fixProg(); }
// progress is keyed by profile and language: S.prog[pid+'_'+lang] = {w:{wordId:{say:{box,due},hear:{box,due}}}, passed:{}, boss:{}}
function fixProg(){ const old=S.prog, np={}, curP=S.profiles[S.cur];
  S.profiles.forEach(p=>{ p.id = p.id || newId(); });
  const conv = o => { if(!o || o.w) return o; const w={}; for(const k in o) w[k] = o[k].say||o[k].hear ? o[k] : {say:{box:o[k].box||0,due:o[k].due||0}}; return {w}; };
  const legacy = Object.keys(old).some(k=>/^\d+$/.test(k) && !S.profiles.some(p=>p.id===k));
  // pre-v13 progress (keyed by profile id only) was all Mandarin: it becomes {pid}_zh
  S.profiles.forEach((p,i)=>{ const z = p.id+'_zh';
    np[z] = conv(old[z]) || conv(old[p.id]) || (legacy && p===curP ? conv(old[i]) : null) || {w:{}};
    Object.keys(LANGS).forEach(l=>{ const k=p.id+'_'+l, o=np[k]=np[k]||conv(old[k])||{w:{}}; o.w=o.w||{}; o.passed=o.passed||{}; o.boss=o.boss||{}; }); });
  S.prog = np; }
load(GUEST_KEY);
const save = () => { localStorage.setItem(KEY, JSON.stringify(S)); window.onLocalSave && window.onLocalSave(); };
// hooks for sync.js (cloud mode); guest mode needs none of this
window.App = { get S(){return S;}, set S(v){S=v; fixProg();}, load, save:()=>localStorage.setItem(KEY, JSON.stringify(S)), home:()=>home(), GUEST_KEY };
const P = () => { const p=S.profiles[S.cur], k=p&&p.id+'_'+LANG.code; return p ? (S.prog[k] = S.prog[k] || {w:{},passed:{},boss:{}}) : {w:{},passed:{},boss:{}}; };
const shuffle = a => a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);

// ---- tones ----
const TONES = {1:'āēīōūǖĀĒĪŌŪ',2:'áéíóúǘÁÉÍÓÚ',3:'ǎěǐǒǔǚǍĚǏǑǓ',4:'àèìòùǜÀÈÌÒÙ'};
const tone = syl => { for (const t in TONES) if ([...syl].some(c=>TONES[t].includes(c))) return t; return 0; };
const pyHTML = py => !LANG.tones ? `<b class="t0">${py}</b>` : py.split(' ').map(s=>`<b class="t${tone(s)}">${s}</b>`).join('');

// ---- speech ----
let zhVoice = null;
const pickVoice = () => { const v = speechSynthesis.getVoices();
  if(!LANG) return; const L=LANG.locale; zhVoice = v.find(x=>x.lang.replace('_','-').toLowerCase()===L.toLowerCase()) || v.find(x=>x.lang.toLowerCase().startsWith(LANG.code)) || null; };
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text, slow){ if(!('speechSynthesis' in window) || (typeof recState!=='undefined' && recState!=='idle')) return;
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text);
  u.lang=LANG.locale; if(zhVoice) u.voice=zhVoice; u.rate = slow?0.5:0.9; speechSynthesis.speak(u); }
let actx;
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
// Release all app audio so iOS can hand the audio session to the mic.
function releaseAudio(){ let busy=false;
  if('speechSynthesis' in window && (speechSynthesis.speaking||speechSynthesis.pending)){ busy=true; speechSynthesis.cancel(); }
  if(actx){ busy=busy||actx.state==='running'; try{actx.close();}catch(e){} actx=null; } return busy; }
function ding(good){ if(typeof recState!=='undefined' && recState!=='idle') return; try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)(); const o=actx.createOscillator(), g=actx.createGain();
  o.connect(g); g.connect(actx.destination); const t=actx.currentTime; o.frequency.setValueAtTime(good?660:300,t); if(good) o.frequency.setValueAtTime(990,t+.12);
  g.gain.setValueAtTime(.2,t); g.gain.exponentialRampToValueAtTime(.001,t+.4); o.start(t); o.stop(t+.4);}catch(e){} }
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
// syllable map built from our own word list, for toneless-pinyin matching (handles homophones like 他/她)
const STRIP = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ü/g,'v').toLowerCase();
const toPy = t => [...t].map(c=>CH2PY[c]||(/\d/.test(c)?NUMPY(c):c)).join('');
const NUMPY = d => LANG.digitRom[+d] || d;
// Speech recognition, tuned for iPad/iPhone Safari:
// - fresh recognizer per attempt (reusing one after onend is flaky on iOS)
// - continuous + interim results; we stop it ourselves on a match, a final result, or silence
// - if it ends within 1.5s with nothing heard (permission warm-up / busy audio session), auto-restart up to 2 times
let rec = null, recState = 'idle', lastTap = 0, cur = null, t0 = 0;
const status = t => { const s=document.getElementById('srstat'); if(!s) return;
  const line = ((Date.now()-t0)/1000).toFixed(1)+'s '+t; s.textContent = t==='tap' ? line : (s.textContent ? s.textContent+' → ' : '')+line; };
// Diagnostics: log any abort/stop/cancel/speak that happens while the mic is active, with the caller.
const caller = () => ((new Error().stack||'').split('\n')[3]||'').trim().replace(/^at /,'').replace(/\(?https?:\/\/[^/]+\//,'').slice(0,40);
let allowStop = false;
if(SR){ ['abort','stop'].forEach(m => { const o = SR.prototype[m]; if(!o) return;
  SR.prototype[m] = function(){ if(!allowStop && recState!=='idle') status(m+' called by '+caller()); return o.apply(this, arguments); }; }); }
if('speechSynthesis' in window){ ['cancel','speak'].forEach(m => { const o = speechSynthesis[m].bind(speechSynthesis);
  speechSynthesis[m] = (...x) => { if(recState!=='idle') status('tts.'+m+' called by '+caller()); return o(...x); }; }); }
function listen(w, done){
  const target = STRIP(w.py).replace(/[\s']/g,'');
  const match = a => a.includes(w.hz) || (NUMS[w.hz] && a.includes(NUMS[w.hz])) || (LANG.tones && toPy(a).replace(/\d+/g,NUMPY).includes(target)) || (!LANG.tones && a.includes(w.hz.replace(/\s/g,'')));
  let finished=false, restarts=0, startedAt=0, heardAny=false, last=[], silence, settle;
  const c = cur = {};
  const finish = (ok, heard) => { if(finished || cur!==c) return; finished=true; clearTimeout(silence); clearTimeout(settle);
    cur=null; recState='idle'; const r=rec; rec=null; if(r){ r.onend=r.onresult=r.onerror=null; allowStop=true; try{r.abort();}catch(e){} allowStop=false; } done(ok, heard); };
  c.finish = finish;
  const judge = () => last.length ? finish(last.some(match), last[0]) : finish(null,'no-speech');
  const armSilence = ms => { clearTimeout(silence); silence=setTimeout(()=>{ status('timeout'); judge(); }, ms); };
  function start(){
    const r = rec = new SR(); r.lang=LANG.locale; r.maxAlternatives=5; r.continuous=false; r.interimResults = restarts<2;
    r.onstart = () => { status('start'); recState='listening'; startedAt=Date.now(); };
    r.onaudiostart = () => status('audio');
    r.onspeechstart = () => { status('speech'); heardAny=true; armSilence(5000); };
    r.onresult = e => { heardAny=true; let fin=false; last=[];
      for(let k=e.resultIndex;k<e.results.length;k++){ const res=e.results[k]; if(res.isFinal) fin=true;
        for(const x of res) last.push(x.transcript.replace(/[\s。，！？、.,!?]/g,'')); }
      status((fin?'final: ':'heard: ')+(last[0]||''));
      if(last.some(match)) return finish(true, last[0]);
      if(fin) return finish(false, last[0]);
      clearTimeout(settle); settle=setTimeout(()=>{ status('settled'); judge(); }, 1500); };   // iOS rarely marks final
    r.onerror = e => { status('error: '+e.error);
      if(e.error==='not-allowed'||e.error==='service-not-allowed') finish(null, e.error); };   // others: let onend decide
    r.onend = () => { status('end'); if(finished || cur!==c || rec!==r) return;
      const quick = !startedAt || Date.now()-startedAt < 1500;
      if(!heardAny && quick && IOS){ return finish(null,'cutoff'); }
      if(!heardAny && quick && restarts<2){ restarts++; status('restart '+restarts); startedAt=0; setTimeout(()=>{ if(cur===c) start(); }, 250); return; }
      judge(); };
    status('start() called (cont=off, interim='+(r.interimResults?'on':'off')+')');
    try { r.start(); } catch(e){ status('start failed: '+(e.name||e.message)); finish(null,'start-failed'); }
  }
  recState='starting';
  // Never speak while listening. Cancel any speech, then start synchronously inside the tap (iOS gesture rule);
  // if the audio session was still busy, the quick-end auto-restart covers it.
  const busy = releaseAudio(); if(busy) status('audio released, wait 300ms');
  armSilence(7000);
  if(busy) setTimeout(()=>{ if(cur===c) start(); }, 300); else start();
}

// ---- progress: stars per word per direction ('say' | 'hear'), spaced repetition ----
const GAP = [0, 1, 5, 30, 180, 1440, 4320]; // minutes per box
const rec0 = (id,d) => ((P().w[id]||{})[d]) || {box:0,due:0};
function mark(id, d, ok){ const w = P().w[id] = P().w[id] || {}, p = w[d] || {box:0,due:0};
  p.box = ok ? Math.min(p.box+1, GAP.length-1) : Math.max(0, p.box-1); p.due = Date.now()+GAP[p.box]*60000; w[d]=p; save(); }
function seen(){}
const star = (id,d) => Math.min(3, rec0(id,d).box);
const stars = () => Object.values(P().w).reduce((n,w)=>n+Math.min(3,(w.say||{}).box||0)+Math.min(3,(w.hear||{}).box||0),0);
const EXPLAIN = 'Stars: 1 per correct answer in Practice, 3 = mastered; a miss drops one.';
const topicPct = t => { const ws=wordsOf(t.id); return Math.round(100*ws.filter(w=>star(w.id,'say')>=2&&star(w.id,'hear')>=2).length/ws.length); };
const levelReady = L => THEMES.filter(t=>(t.level||1)===L).every(t=>topicPct(t)>=80);
const curLevel = () => LEVELS.find(L=>!P().passed[L]) || LEVELS[LEVELS.length-1];
// practice pool: topic words + ~25% review from earlier levels
function withReview(ws){ const L=curLevel(), old=WORDS.filter(w=>(w.level||1)<L); if(!old.length) return ws;
  return ws.concat(shuffle(old).slice(0, Math.ceil(ws.length/3))); }

// ---- screens ----
function header(){ const p=S.profiles[S.cur]; if(!p){ $('#who').textContent=''; return; } $('#who').textContent = LANG.flag+' '+p.av+' ⭐'+stars(); $('#who').title=EXPLAIN; }
function home(){ if(cur) cur.finish(null,'left'); stopGame(); if(!window.signedIn) return window.showSignIn && window.showSignIn(); if(!S.profiles.length) return addPlayer(true);
  const pr=S.profiles[S.cur]; if(!pr.lang) return langPick(); setLang(pr.lang); header();
  app.innerHTML = `<div class="row">${S.profiles.map((p,i)=>`<button class="prof ${i==S.cur?'on':''}" data-i="${i}">
    <span class="av">${p.av}</span><input value="${p.name}" data-i="${i}" aria-label="name"><span class="del" data-i="${i}">✖</span></button>`).join('')}
   <button class="prof add" id="add"><span class="av">➕</span>Add user</button></div>
   <div class="row"><button class="big c1" id="mLearn">📚 Learn</button><button class="big c2" id="mPrac">🎯 Practice (say)</button>
   <button class="big c5" id="mHear">👂 Listen &amp; tap</button><button class="big c3" id="mPlay">👨‍👧‍👧 Play Together</button>
   <button class="big c4" id="mLvl">🏆 Level ${curLevel()}</button></div>
   <div class="row"><button class="big c2" id="mLang">${LANG.flag} ${LANG.name} · change language</button></div><p class="note">${EXPLAIN}</p>`;
  app.querySelectorAll('.prof').forEach(b=>b.onclick=e=>{ if(e.target.tagName==='INPUT') return; S.cur=+b.dataset.i; save(); home(); });
  app.querySelectorAll('.del').forEach(d=>d.onclick=e=>{ e.stopPropagation(); const i=+d.dataset.i;
    if(!confirm('Delete '+S.profiles[i].name+' and their progress?')) return;
    Object.keys(S.prog).forEach(k=>{ if(k.startsWith(S.profiles[i].id+'_')) delete S.prog[k]; }); S.profiles.splice(i,1);
    S.cur=Math.max(0,Math.min(S.cur>i?S.cur-1:S.cur, S.profiles.length-1)); save(); home(); });
  $('#add').onclick=()=>addPlayer();
  app.querySelectorAll('.prof input').forEach(inp=>inp.onchange=()=>{ S.profiles[inp.dataset.i].name=inp.value.trim()||'?'; save(); });
  $('#mLearn').onclick=()=>themes(learn); $('#mPrac').onclick=()=>themes(practice); $('#mHear').onclick=()=>themes(hearTap);
  $('#mPlay').onclick=()=>themes(playSetup); $('#mLvl').onclick=level; $('#mLang').onclick=langPick; }
function langPick(){ const p=S.profiles[S.cur]; $('#who').textContent=p.av+' '+p.name;
  app.innerHTML=`<div class="card"><h2>${p.name}, what are you learning?</h2><div class="row">${Object.values(LANGS).map(l=>
   `<button class="big c1 lang" data-l="${l.code}">${l.flag} ${l.name}<br><small>${l.native}</small></button>`).join('')}</div></div>`;
  app.querySelectorAll('.lang').forEach(b=>b.onclick=()=>{ p.lang=b.dataset.l; save(); home(); }); }
const AVS=['🧔','👩','👧','👦','👶','🧒','👴','👵','🐼','🐯','🐰','🦄','🐶','🐱','🦊','🐸'];
function addPlayer(first){ let av=AVS[8];
  app.innerHTML=`<div class="card"><h2>${first?'👋 Welcome! Add a user to start':'New user'}</h2><input id="nm" class="nm" placeholder="Name" maxlength="16">
   <div class="grid avs">${AVS.map(a=>`<button class="choice av1" data-a="${a}">${a}</button>`).join('')}</div>
   <div class="row"><button class="big c1" id="ok">✔ Add</button>${first?'':'<button class="big c4" id="cx">Cancel</button>'}</div></div>`;
  const pick=a=>{ av=a; app.querySelectorAll('.av1').forEach(b=>b.classList.toggle('right',b.dataset.a===a)); }; pick(av);
  app.querySelectorAll('.av1').forEach(b=>b.onclick=()=>pick(b.dataset.a));
  if($('#cx')) $('#cx').onclick=home;
  $('#ok').onclick=()=>{ const n=$('#nm').value.trim(); if(!n) return $('#nm').focus();
    const id=newId(); S.profiles.push({name:n,av,id}); S.cur=S.profiles.length-1; fixProg(); save(); home(); }; }
function themes(next){ header(); const L=curLevel();
  app.innerHTML = `<div class="grid">${THEMES.filter(t=>(t.level||1)<=L).map(t=>`<button class="theme" style="background:${t.color}" data-id="${t.id}">
   <span>${t.icon}</span>${t.name}<small class="pct">${topicPct(t)}%</small></button>`).join('')}<button class="theme" style="background:#555" data-id="all"><span>🌈</span>All</button></div>
   <p class="note">% = words with 2+ stars both ways. ${EXPLAIN}</p>`;
  app.querySelectorAll('.theme').forEach(b=>b.onclick=()=>next(b.dataset.id)); }
const wordsOf = id => id==='all' ? WORDS.filter(w=>(w.level||1)<=curLevel()) : WORDS.filter(w=>w.theme===id);
const starTxt = (id,d) => '★'.repeat(star(id,d))+'☆'.repeat(3-star(id,d));

// mic button helper (shared by Learn and Practice); onRes(ok) with ok=true/false/null
function micBtn(w, onRes){ const mic=$('#mic'), msg=$('#msg');
  mic.onclick=()=>{
    if(!SR){ msg.innerHTML=`<button class="big c5" id="ok">🙋 I said it (self-check)</button>`; $('#ok').onclick=()=>onRes(true,''); return; }
    const now=Date.now(); if(now-lastTap<800 || recState!=='idle') return; lastTap=now;
    mic.classList.add('listening'); mic.innerHTML='🎤 Listening…'; msg.textContent=''; t0=Date.now(); status('tap');
    const reset=()=>{ mic.classList.remove('listening'); mic.innerHTML='🎤 Say it'; };
    try { listen(w,(ok,heard)=>{ reset();
      if(ok){ msg.innerHTML=`<span class="ok">✔</span>`; ding(true); onRes(true); }
      else if(ok===false){ msg.innerHTML=`<span class="no">Try again</span><div class="en">heard: ${heard}</div>`; ding(false); setTimeout(()=>say(w.hz,true),400); onRes(false); }
      else msg.innerHTML = heard==='not-allowed'||heard==='service-not-allowed'
        ? `<span class="no">Microphone blocked: allow it in Settings › Safari › Microphone</span>`
        : heard==='cutoff' ? `<span class="no">Mic was cut off: check Siri is on, then tap again</span>`
        : `<span class="no">Didn't hear you, tap 🎤 to try again</span>`; }); }
    catch(e){ recState='idle'; cur=null; reset(); status('start failed: '+(e.name||e.message)); msg.innerHTML=`<span class="no">Didn't hear you, tap 🎤 to try again</span>`; } }; }

function learn(tid, i=0){ if(cur) cur.finish(null,'left'); header(); const ws=wordsOf(tid), w=ws[(i+ws.length)%ws.length];
  app.innerHTML = `<div class="card"><div class="pic" id="pic">${w.img}</div><div class="py">${pyHTML(w.py)}</div>
   <div class="hz">${w.hz}</div><div class="en">${w.en}</div>
   <div class="row"><button class="big c1" id="n">🔊</button><button class="big c5" id="s">🐢</button>
   <button class="big c4" id="mic">🎤 Say it</button></div><div class="msg" id="msg"></div><div id="srstat" class="srstat"></div>
   <div class="row"><button class="big c2" id="prev">⬅️</button><button class="big c2" id="next">➡️</button></div></div>
   ${LANG.tones?`<p class="legend"><b class="t1">ˉ1</b> <b class="t2">ˊ2</b> <b class="t3">ˇ3</b> <b class="t4">ˋ4</b> <b class="t0">· neutral</b></p>`:''}`;
  const go = d => learn(tid, (i+d+ws.length)%ws.length);
  $('#n').onclick=$('#pic').onclick=()=>say(w.hz); $('#s').onclick=()=>say(w.hz,true);
  $('#prev').onclick=()=>go(-1); $('#next').onclick=()=>go(1);
  micBtn(w, ok=>{ if(ok){ mark(w.id,'say',true); header(); } });
  if(!IOS) say(w.hz); }

function pickQ(ws, d){ const now=Date.now();
  const due = ws.filter(w=>rec0(w.id,d).due<=now), pool = due.length ? due : ws.slice();
  pool.sort((a,b)=>rec0(a.id,d).box-rec0(b.id,d).box);
  const w = pool[Math.floor(Math.random()*Math.min(4,pool.length))];
  const others = shuffle(WORDS.filter(x=>x.id!==w.id && x.img!==w.img && x.py!==w.py && x.theme===w.theme)).slice(0,3);
  return {w, opts: shuffle([w,...others])}; }
// Listen & tap: hear the word, tap the picture ('hear' stars)
function quiz(ws, onAnswer, extra=''){ const {w,opts}=pickQ(ws,'hear');
  app.innerHTML = `${extra}<div class="row"><button class="big c1" id="n">🔊</button><button class="big c5" id="s">🐢</button></div>
   <div class="grid">${opts.map(o=>`<button class="choice" data-id="${o.id}">${o.img}</button>`).join('')}</div>
   <div class="msg" id="msg"></div><p class="note">👂 ${starTxt(w.id,'hear')}</p>`;
  $('#n').onclick=()=>say(w.hz); $('#s').onclick=()=>say(w.hz,true); say(w.hz);
  let done=false;
  app.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{ if(done) return; done=true; const ok=b.dataset.id===w.id;
    b.classList.add(ok?'right':'wrong'); app.querySelector(`[data-id="${w.id}"]`).classList.add('right');
    $('#msg').innerHTML = (ok?'🎉 ':'💪 ')+`${w.hz} ${pyHTML(w.py)}`; ding(ok); if(!ok) setTimeout(()=>say(w.hz),300);
    setTimeout(()=>onAnswer(w,ok), ok?1200:2200); }); }
function hearTap(tid){ header(); quiz(withReview(wordsOf(tid)), (w,ok)=>{ mark(w.id,'hear',ok); hearTap(tid); }); }
// Practice (say): see the picture, say the word ('say' stars)
function practice(tid){ if(cur) cur.finish(null,'left'); header(); const {w}=pickQ(withReview(wordsOf(tid)),'say'); let done=false;
  const next=ok=>{ if(done) return; done=true; mark(w.id,'say',ok); header(); setTimeout(()=>practice(tid), ok?1000:2000); };
  app.innerHTML = `<div class="card"><div class="pic">${w.img}</div><div class="en">${w.en}</div><p class="note">🗣️ ${starTxt(w.id,'say')}</p>
   <div class="row"><button class="big c4" id="mic">🎤 Say it</button><button class="big c5" id="show">👀 Show</button></div>
   <div class="msg" id="msg"></div><div id="srstat" class="srstat"></div></div>`;
  micBtn(w, ok=>{ if(ok!==null) next(ok); });
  $('#show').onclick=()=>{ if(cur) cur.finish(null,'left'); say(w.hz);
    $('#msg').innerHTML=`<div class="hz">${w.hz}</div><div class="py">${pyHTML(w.py)}</div>
     <div class="row"><button class="big c1" id="y">✔ I knew it</button><button class="big c4" id="x">✖ Not yet</button></div>`;
    $('#y').onclick=()=>next(true); $('#x').onclick=()=>next(false); }; }

function playSetup(tid){ const sc=S.profiles.map(()=>0); playTurn(tid, sc, 0, 0); }
function playTurn(tid, sc, turn, round){ const n=S.profiles.length, ROUNDS=5;
  if(round>=ROUNDS*n){ const max=Math.max(...sc);
    app.innerHTML=`<div class="card"><div class="pic">🏆</div><div class="score">${S.profiles.map((p,i)=>`${p.av} ${p.name}: ${sc[i]} ${sc[i]===max?'👑':''}`).join('<br>')}</div>
     <div class="row"><button class="big c1" id="again">🔁</button><button class="big c2" id="h">🏠</button></div></div>`;
    $('#again').onclick=()=>playSetup(tid); $('#h').onclick=home; return; }
  const p=S.profiles[turn];
  const bar=`<div class="score">${S.profiles.map((q,i)=>`<span class="${i===turn?'cur':''}">${q.av} ${q.name} ${sc[i]}</span>`).join(' · ')}</div>
   <div class="msg">${p.av} ${p.name}!</div>`;
  quiz(wordsOf(tid), (w,ok)=>{ if(ok) sc[turn]++; const prev=S.cur; S.cur=turn; mark(w.id,'hear',ok); S.cur=prev; save();
    playTurn(tid, sc, (turn+1)%n, round+1); }, bar); }

// ---- levels & boss games ----
function level(){ header(); const L=curLevel(), pr=P(), ready=levelReady(L), b=pr.boss[L]||{};
  app.innerHTML = `<div class="card"><h2>Level ${L} ${pr.passed[L]?'✅ passed':''}</h2>
   ${THEMES.filter(t=>(t.level||1)===L).map(t=>`<div class="bar"><span>${t.icon} ${t.name}</span><i><b style="width:${topicPct(t)}%;background:${t.color}"></b></i>${topicPct(t)}%</div>`).join('')}
   <p class="note">Pass: every topic at 80%+ (2+ stars in both Practice and Listen &amp; tap), then beat both boss games.</p>
   ${L===1?`<div class="row"><button class="big c1" id="b1">📞 Phone Number ${b.phone?'✅':''}</button><button class="big c2" id="b2">🌧️ Number Rain ${b.rain?'✅':''}</button></div>
   ${ready?'':'<p class="note">🔒 Bosses unlock at 80%. <button class="link" id="any">Try boss anyway</button></p>'}`:'<p class="note">Boss games for this level are coming soon.</p>'}</div>`;
  if(L!==1) return; const lock=!ready;
  const en=()=>{ ['#b1','#b2'].forEach(s=>$(s).disabled=false); };
  if(lock) ['#b1','#b2'].forEach(s=>$(s).disabled=true);
  $('#b1').onclick=()=>phone(3,3); $('#b2').onclick=()=>rain();
  if($('#any')) $('#any').onclick=en; }
function bossWin(k){ const pr=P(), b=pr.boss[1]=pr.boss[1]||{}; b[k]=true; if(b.phone&&b.rain) pr.passed[1]=true; save(); }
const wait = ms => new Promise(r=>setTimeout(r,ms));
function sayAsync(t){ return new Promise(r=>{ if(!('speechSynthesis' in window)) return r(); speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(t);
  u.lang=LANG.locale; if(zhVoice) u.voice=zhVoice; u.rate=.8; u.onend=u.onerror=()=>r(); speechSynthesis.speak(u); setTimeout(r,2500); }); }
let gameId=0; const stopGame=()=>{ gameId++; if(rainT) clearInterval(rainT); rainT=null; };
function phone(n, lives){ stopGame(); const g=gameId, code=Array.from({length:n},()=>Math.floor(Math.random()*10)); let got=[];
  app.innerHTML=`<div class="card"><h2>📞 Phone Number: ${n} digits · ${'❤️'.repeat(lives)}</h2><div class="hz" id="typed">${'_ '.repeat(n)}</div>
   <div class="keypad">${[1,2,3,4,5,6,7,8,9,0].map(d=>`<button class="choice" data-d="${d}">${d}</button>`).join('')}</div>
   <div class="row"><button class="big c1" id="play">🔊 Play</button></div><div class="msg" id="msg"></div></div>`;
  const play=async()=>{ for(const d of code){ if(g!==gameId) return; await sayAsync(DIG[d]); await wait(350); } };
  $('#play').onclick=play; play();
  app.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{ if(g!==gameId) return; got.push(+b.dataset.d);
    $('#typed').textContent=got.join(' ')+' _'.repeat(n-got.length);
    const i=got.length-1;
    if(got[i]!==code[i]){ stopGame(); ding(false); $('#msg').innerHTML=`<span class="no">It was ${code.join(' ')}</span>`;
      return setTimeout(()=> lives>1 ? phone(n,lives-1) : over('📞 Out of lives', ()=>phone(3,3)), 2200); }
    if(got.length===n){ stopGame(); ding(true);
      if(n>=7){ bossWin('phone'); return over('🎉 Phone Number cleared!', ()=>phone(3,3), true); }
      $('#msg').innerHTML='<span class="ok">✔</span>'; setTimeout(()=>phone(n+1,lives),1200); } }); }
function over(t, again, win){ app.innerHTML=`<div class="card"><div class="pic">${win?'🏆':'💪'}</div><h2>${t}</h2>${P().passed[1]?'<h2>⭐ Level 1 passed!</h2>':''}
  <div class="row"><button class="big c1" id="ag">🔁 Again</button><button class="big c2" id="lv">🏆 Level</button></div></div>`;
  $('#ag').onclick=again; $('#lv').onclick=level; }
// Number Rain: numbers 0-10 fall; say one (mic) to pop it, or tap the one that was spoken (no mic)
const numsIn = t => { const out=new Set(), s=t.toLowerCase();
  (s.match(/\d+/g)||[]).forEach(d=>out.add(+d)); [...t].forEach(c=>{ const i=DIG.indexOf(c); if(i>=0) out.add(i); if(c==='〇') out.add(0); });
  if(LANG.code==='ko' && /공/.test(t)) out.add(0); if(!LANG.tones) return out;
  const p=STRIP(s).replace(/[^a-z]/g,' '); LANG.digitRom.forEach((y,i)=>{ if(new RegExp('\\b'+y+'\\b').test(p)) out.add(i); });
  if(/两/.test(t)) out.add(2); return out; };
let rainT=null;
function rain(tap){ stopGame(); const g=gameId; let drops=[], pops=0, miss=0, speed=0.35, tick=0, spoken=null;
  if(!SR) tap=true;
  app.innerHTML=`<div class="card"><h2>🌧️ Number Rain ${tap?'(tap)':'(say it)'} · <span id="sc">0</span>/10 · <span id="lv">❤️❤️❤️</span></h2>
   <div id="sky" class="sky"></div><div class="row">${tap?'<button class="big c1" id="rp">🔊</button>':'<button class="big c4" id="mic">🎤 Listen</button>'}
   ${tap?'':'<button class="link" id="tp">Mic not working? Tap mode</button>'}</div><div class="msg" id="msg"></div><div id="srstat" class="srstat"></div></div>`;
  const sky=$('#sky'), H=()=>sky.clientHeight||360;
  const end=win=>{ stopGame(); if(cur) cur.finish(null,'left'); if(win) bossWin('rain'); over(win?'🎉 Number Rain cleared!':'🌧️ 3 misses', ()=>rain(tap), win); };
  const pop=d=>{ d.el.classList.add('pop'); setTimeout(()=>d.el.remove(),300); drops=drops.filter(x=>x!==d); pops++; $('#sc').textContent=pops; ding(true); if(pops>=10) end(true); };
  const add=()=>{ const n=Math.floor(Math.random()*11), el=document.createElement('button'); el.className='drop'; el.textContent=n;
    el.style.left=(5+Math.random()*75)+'%'; sky.appendChild(el); const d={n,el,y:0}; drops.push(d);
    if(tap){ spoken=d; say(DIG[n]); el.onclick=()=>{ if(d===spoken) pop(d); else { miss++; $('#lv').textContent='❤️'.repeat(Math.max(0,3-miss)); ding(false); if(miss>=3) end(false); } }; } };
  rainT=setInterval(()=>{ if(g!==gameId) return; tick++;
    if(!drops.length || (!tap && tick%Math.max(40,120-pops*8)===0)) add();
    speed=0.35+pops*0.06;
    drops.slice().forEach(d=>{ d.y+=speed; d.el.style.top=d.y+'px';
      if(d.y>H()-60){ d.el.remove(); drops=drops.filter(x=>x!==d); miss++; $('#lv').textContent='❤️'.repeat(Math.max(0,3-miss)); if(miss>=3) end(false); } }); }, 30);
  if(tap){ $('#rp').onclick=()=>spoken&&say(DIG[spoken.n]); return; }
  $('#tp').onclick=()=>rain(true);
  const mic=$('#mic'); mic.onclick=()=>{ if(recState!=='idle') return; t0=Date.now(); status('tap'); hear(); };
  // continuous loop: one fresh recognizer per attempt (v10 iOS-safe listen()); any recognised number pops the matching drop
  const any={hz:'\u0000',py:'zzzz'};
  function hear(){ if(g!==gameId) return; mic.classList.add('listening'); mic.innerHTML='🎤 Listening…';
    listen(any,(ok,heard)=>{ mic.classList.remove('listening'); mic.innerHTML='🎤 Listen'; if(g!==gameId) return;
      if(heard==='not-allowed'||heard==='service-not-allowed'||heard==='cutoff'){ $('#msg').innerHTML='<span class="no">Mic unavailable. Use tap mode.</span>'; return; }
      const ns=numsIn(heard||''); let hit=false; ns.forEach(n=>{ const d=drops.find(x=>x.n===n); if(d){ pop(d); hit=true; } });
      if(heard && heard!=='no-speech') $('#msg').textContent='heard: '+heard;
      if(g===gameId) setTimeout(hear, 150); }); } }
$('#homeBtn').onclick=()=>{ try{speechSynthesis.cancel();}catch(e){} home(); };
setLang('zh');
