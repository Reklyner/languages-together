// Cloud sign-in + sync (Firebase modular SDK from CDN, no build step).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyDHzrBi3JflMU9oNAejnDVrNQj412s_mUc", authDomain: "mandarin-together.firebaseapp.com",
  projectId: "mandarin-together", storageBucket: "mandarin-together.firebasestorage.app", messagingSenderId: "219781169800",
  appId: "1:219781169800:web:71253a23535102c795d53d" };
const fb = initializeApp(firebaseConfig), auth = getAuth(fb), db = getFirestore(fb);
const A = window.App, $ = s => document.querySelector(s), main = $('#app');
let user = null, timer = null, cloudIds = new Set(), progIds = new Set();

const ERR = { 'auth/invalid-email':'That email doesn\'t look right.', 'auth/missing-password':'Please type a password.',
  'auth/weak-password':'Password needs at least 6 characters.', 'auth/email-already-in-use':'That email already has an account. Try Sign in.',
  'auth/invalid-credential':'Wrong email or password.', 'auth/wrong-password':'Wrong email or password.', 'auth/user-not-found':'No account with that email. Try Create account.',
  'auth/too-many-requests':'Too many tries. Please wait a minute.', 'auth/network-request-failed':'No internet connection.',
  'auth/popup-closed-by-user':'Sign-in window was closed.', 'auth/unauthorized-domain':'This website isn\'t authorised in Firebase yet.',
  'auth/operation-not-allowed':'This sign-in method isn\'t switched on yet.', 'permission-denied':'Cloud access denied (check Firestore rules).' };
const friendly = e => ERR[e && e.code] || 'Something went wrong. Please try again.';

// ---- sync ----
const ukey = uid => A.GUEST_KEY + ':' + uid;
async function pull(uid){
  const [ps, pr] = await Promise.all([getDocs(collection(db,'users',uid,'profiles')), getDocs(collection(db,'users',uid,'progress'))]);
  const prog = {}; pr.forEach(d => prog[d.id] = d.data().words || {}); progIds = new Set(Object.keys(prog));
  const profiles = ps.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0));
  cloudIds = new Set(profiles.map(p=>p.id));
  return { profiles: profiles.map(({order,...p})=>p), prog };   // App.S setter maps old {pid} docs to {pid}_zh
}
async function push(){
  if(!user) return; const S = A.S, uid = user.uid, b = writeBatch(db), ids = new Set(), pids = new Set();
  S.profiles.forEach((p,i) => { ids.add(p.id);
    b.set(doc(db,'users',uid,'profiles',p.id), {name:p.name, av:p.av, order:i, ...(p.lang?{lang:p.lang}:{})});
    Object.keys(S.prog).filter(k=>k.startsWith(p.id+'_')).forEach(k => { pids.add(k); b.set(doc(db,'users',uid,'progress',k), {words: S.prog[k]}); }); });
  cloudIds.forEach(id => { if(!ids.has(id)) b.delete(doc(db,'users',uid,'profiles',id)); });
  progIds.forEach(id => { if(!pids.has(id)) b.delete(doc(db,'users',uid,'progress',id)); });   // includes migrated pre-v13 {pid} docs
  try { await b.commit(); cloudIds = ids; progIds = pids; } catch(e){ console.warn('sync failed, kept locally', e.code); }
}
window.onLocalSave = () => { if(!user) return; clearTimeout(timer); timer = setTimeout(push, 1500); };

async function enterCloud(u){
  user = u; const guest = A.S;
  A.load(ukey(u.uid));                       // offline cache for this account
  try {
    const c = await pull(u.uid);
    if(!c.profiles.length && guest.profiles.length){      // first sign-in: upload this device's users
      A.S = {cur:0, profiles: guest.profiles.map(p=>({...p})), prog: {...guest.prog}};
      A.save(); await push(); localStorage.removeItem(A.GUEST_KEY);   // moved into the account
    } else if(c.profiles.length){
      A.S = {cur: Math.min(A.S.cur||0, c.profiles.length-1), profiles:c.profiles, prog:c.prog}; A.save();
      if(Object.keys(c.prog).some(k=>!k.includes('_'))) push();   // finish moving old Mandarin progress to {pid}_zh
    }
  } catch(e){ console.warn('offline, using cached data', e.code); }
  A.home();
}
onAuthStateChanged(auth, u => { if(u){ window.signedIn=true; document.body.classList.remove('out'); enterCloud(u); }
  else { user=null; window.signedIn=false; A.load(A.GUEST_KEY); signIn(); } });
getRedirectResult(auth).catch(e => console.warn(e.code));

// ---- sign-in (required) and account menu ----
function signIn(mode){ document.body.classList.add('out'); $('#who').textContent='';
  const form = mode ? `<input id="em" type="email" placeholder="Email" autocomplete="email">
    <input id="pw" type="password" placeholder="Password" autocomplete="${mode==='up'?'new-password':'current-password'}">
    <button class="big ${mode==='up'?'c1':'c2'}" id="go">${mode==='up'?'Create account':'Sign in'}</button>` : '';
  main.innerHTML = `<div class="card auth"><div class="pic" style="font-size:90px">🐼</div><h2>Languages Together</h2>
    <button class="big gbtn" id="g"><b style="color:#4285f4">G</b> Sign in with Google</button>
    ${mode ? form : '<button class="big c2" id="emb">✉️ Sign in with email</button>'}
    <div class="err" id="err"></div>
    ${mode==='up' ? '<button class="link" id="inl">I already have an account</button>' : '<button class="link" id="upl">Create account</button>'}
    <button class="link" id="reset">Forgot password?</button></div>`;
  const err = m => $('#err').textContent = m, em = () => ($('#em')||{value:''}).value.trim(), pw = () => $('#pw').value;
  $('#g').onclick = async () => { err(''); const p = new GoogleAuthProvider();
    try { await signInWithPopup(auth, p); }
    catch(e){ if(['auth/popup-blocked','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment'].includes(e.code)) signInWithRedirect(auth, p); else err(friendly(e)); } };
  if($('#emb')) $('#emb').onclick = () => signIn('in');
  if($('#upl')) $('#upl').onclick = () => signIn('up');
  if($('#inl')) $('#inl').onclick = () => signIn('in');
  if($('#go')) $('#go').onclick = () => { err('');
    (mode==='up' ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(auth, em(), pw()).catch(e => err(friendly(e))); };
  $('#reset').onclick = () => { if(!em()) return mode ? err('Type your email first.') : signIn('in');
    sendPasswordResetEmail(auth, em()).then(() => err('✔ Reset email sent. Check your inbox.')).catch(e => err(friendly(e))); };
}
window.showSignIn = () => signIn();
function account(){ if(!user) return signIn();
  main.innerHTML = `<div class="card auth"><h2>Account</h2><p class="note">Signed in as<br><b>${user.email||user.displayName}</b></p>
    <p class="note">Your users and progress sync to every device you sign in on.</p>
    <button class="big c4" id="out">Sign out</button><button class="link" id="back">Back</button></div>`;
  $('#out').onclick = () => signOut(auth); $('#back').onclick = A.home; }
$('#acctBtn').onclick = account;
