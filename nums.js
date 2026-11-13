// Number recognition for speech transcripts (browser global + Node module, see test-nums.js).
// numsIn(text, lang) -> Set of numbers 0-10 heard. Ambiguous homophones (是/事 = 4 or 10) add both,
// so a check for one expected number accepts them for whichever is expected.
(function(root){
  const ZH = {0:'〇零灵玲铃', 1:'一幺衣医依伊壹已以亿意易移姨椅', 2:'二两而儿耳尔贰', 3:'三山散伞叁',
    4:'四是事死似寺思丝斯司私肆', 5:'五我无舞午屋物吴伍雾武', 6:'六流留刘溜陆', 7:'七起其期气骑齐柒',
    8:'八吧爸把拔巴捌', 9:'九酒就久旧救玖', 10:'十是石时实事识拾'};
  const ZHMAP = {}; for(const n in ZH) for(const c of ZH[n]) (ZHMAP[c]=ZHMAP[c]||[]).push(+n);
  function numsIn(t, lang){ const out = new Set(); t = String(t||'').normalize('NFKC');   // NFKC: full-width ０-９ -> 0-9
    (t.match(/\d+/g)||[]).forEach(run => { if(+run<=10 && !(run.length>1 && run[0]==='0')) out.add(+run);   // "10"
      if(run.length>1 && run!=='10') [...run].forEach(c=>out.add(+c)); });                                  // "345" -> 3,4,5
    const dig = lang.digits||[];
    [...t].forEach(c => { const i = dig.indexOf(c); if(i>=0) out.add(i); });
    if(lang.code==='ko'){ if(/공/.test(t)) out.add(0); return out; }
    if(!lang.tones) return out;
    [...t].forEach(c => (ZHMAP[c]||[]).forEach(n=>out.add(n)));
    const p = t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,' ');   // pinyin output
    (lang.digitRom||[]).forEach((y,i) => { if(new RegExp('\\b'+y+'\\b').test(p)) out.add(i); });
    return out; }
  // true if any transcript/alternative contains the expected number n
  const heardNum = (alts, n, lang) => [].concat(alts).some(a => numsIn(a, lang).has(+n));
  const api = {numsIn, heardNum, ZH};
  if(typeof module!=='undefined' && module.exports) module.exports = api; else Object.assign(root, api);
})(typeof window!=='undefined' ? window : this);
