// node test-nums.js : checks number recognition for Mandarin and Korean transcripts
const {numsIn, heardNum} = require('./nums.js');
const load = f => { global.window = {}; require('./'+f); return Object.values(window.LANGS)[0]; };
const zh = load('words-zh.js'), ko = load('words-ko.js');
let fail = 0; const ok = (c, m) => { if(!c){ fail++; console.log('FAIL', m); } };
const yes = {0:'零 〇 0 灵 ０ ling', 1:'一 衣 1 医 依 伊 壹 已 以 亿 意 易 移 姨 椅 幺 １ yi', 2:'二 两 2 而 儿 耳 尔', 3:'三 山 散 伞 3',
  4:'四 是 死 4 事 似 寺 思 丝 斯 司 私 肆 ４ si', 5:'五 我 舞 5 无 午 屋 物 吴 伍 雾 武 wu', 6:'六 流 留 刘 溜 陆 6', 7:'七 起 其 期 气 骑 齐 7',
  8:'八 吧 爸 把 拔 巴 8', 9:'九 酒 就 久 旧 救 9', 10:'十 是 石 时 实 事 识 10 １０ shi'};
for(const n in yes) for(const t of yes[n].split(' ')) ok(heardNum(t, n, zh), `zh "${t}" should be ${n}`);
ok(heardNum('我说的是一', 1, zh), 'anywhere in sentence');
ok(heardNum(['你好','衣服'], 1, zh), 'any alternative');
ok(!heardNum('三', 1, zh), '三 is not 1'); ok(!heardNum('五', 4, zh), '五 is not 4'); ok(!heardNum('8', 5, zh), '8 is not 5');
ok(!heardNum('10', 1, zh), '"10" is not 1');
const eq = (t, want, L=zh) => { const got=[...numsIn(t,L)].sort((a,b)=>a-b).join(','); ok(got===want, `numsIn("${t}") = ${got}, want ${want}`); };
eq('34567', '3,4,5,6,7'); eq('３４５', '3,4,5'); eq('一四五', '1,4,5'); eq('衣死我', '1,4,5'); eq('10', '10'); eq('是', '4,10');
// Korean unchanged: digits, Hangul numbers, 공 for 0, no Chinese homophones
for(const [i,d] of ko.digits.entries()) ok(heardNum(d, i, ko), `ko "${d}" should be ${i}`);
ok(heardNum('3', 3, ko), 'ko digit'); ok(heardNum('공', 0, ko), 'ko 공'); ok(!heardNum('是', 4, ko), 'ko ignores hanzi');
eq('삼사오', '3,4,5', ko);
console.log(fail ? fail+' failed' : 'all number tests passed'); process.exit(fail?1:0);
