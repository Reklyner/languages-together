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
let user = null, timer = null, cloudIds = new Set();

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
  const prog = {}; pr.forEach(d => prog[d.id] = d.data().words || {});
  const profiles = ps.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0));
  cloudIds = new Set(profiles.map(p=>p.id));
  return { profiles: profiles.map(({order,...p})=>p), prog: profiles.map(p=>prog[p.id]||{}) };
}
async function push(){
  if(!user) return; const S = A.S, uid = user.uid, b = writeBatch(db), ids = new Set();
  S.profiles.forEach((p,i) => { ids.add(p.id);
    b.set(doc(db,'users',uid,'profiles',p.id), {name:p.name, av:p.av, order:i});
    b.set(doc(db,'users',uid,'progress',p.id), {words: S.prog[i] || {}}); });
  cloudIds.forEach(id => { if(!ids.has(id)){ b.delete(doc(db,'users',uid,'profiles',id)); b.delete(doc(db,'users',uid,'progress',id)); } });
  try { await b.commit(); cloudIds = ids; } catch(e){ console.warn('sync failed, kept locally', e.code); }
}
window.onLocalSave = () => { if(!user) return; clearTimeout(timer); timer = setTimeout(push, 1500); };

async function enterCloud(u){
  user = u; const guest = A.S;
  A.load(ukey(u.uid));                       // offline cache for this account
  try {
    const c = await pull(u.uid);
    if(!c.profiles.length && guest.profiles.length){      // first sign-in: upload this device's users
      A.S = {cur:0, profiles: guest.profiles.map(p=>({...p})), prog: Object.fromEntries(guest.profiles.map((_,i)=>[i, guest.prog[i]||{}]))};
      A.save(); await push();
    } else if(c.profiles.length){
      A.S = {cur: Math.min(A.S.cur||0, c.profiles.length-1), profiles:c.profiles, prog:Object.fromEntries(c.prog.map((p,i)=>[i,p]))}; A.save();
    }
  } catch(e){ console.warn('offline, using cached data', e.code); }
  A.home();
}
onAuthStateChanged(auth, u => { if(u) enterCloud(u); else if(user){ user=null; A.load(A.GUEST_KEY); A.home(); } });
getRedirectResult(auth).catch(e => console.warn(e.code));

// ---- account screen ----
function account(){
  if(user){ main.innerHTML = `<div class="card auth"><h2>Account</h2><p class="note">Signed in as<br><b>${user.email||user.displayName}</b></p>
    <p class="note">Your users and progress sync to every device you sign in on.</p>
    <button class="big c4" id="out">Sign out</button><button class="link" id="back">Back</button></div>`;
    $('#out').onclick = () => signOut(auth); $('#back').onclick = A.home; return; }
  main.innerHTML = `<div class="card auth"><h2>Sign in to sync</h2>
    <p class="note">Use the same account on your iPhone and iPad to share users and progress.</p>
    <button class="big gbtn" id="g">🇬 Sign in with Google</button><p class="note">or</p>
    <input id="em" type="email" placeholder="Email" autocomplete="email">
    <input id="pw" type="password" placeholder="Password" autocomplete="current-password">
    <div class="err" id="err"></div>
    <button class="big c2" id="in">Sign in</button><button class="big c1" id="up">Create account</button>
    <button class="link" id="reset">Forgot password?</button><button class="link" id="back">Continue without an account</button></div>`;
  const err = m => $('#err').textContent = m, em = () => $('#em').value.trim(), pw = () => $('#pw').value;
  $('#g').onclick = async () => { err(''); const p = new GoogleAuthProvider();
    try { await signInWithPopup(auth, p); }
    catch(e){ if(['auth/popup-blocked','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment'].includes(e.code)) signInWithRedirect(auth, p); else err(friendly(e)); } };
  $('#in').onclick = () => { err(''); signInWithEmailAndPassword(auth, em(), pw()).catch(e => err(friendly(e))); };
  $('#up').onclick = () => { err(''); createUserWithEmailAndPassword(auth, em(), pw()).catch(e => err(friendly(e))); };
  $('#reset').onclick = () => { if(!em()) return err('Type your email first.');
    sendPasswordResetEmail(auth, em()).then(() => err('✔ Reset email sent. Check your inbox.')).catch(e => err(friendly(e))); };
  $('#back').onclick = A.home;
}
$('#acctBtn').onclick = account;
