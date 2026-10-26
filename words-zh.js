// pinyin syllables separated by spaces; tone read from diacritics (none = neutral)
(window.LANGS=window.LANGS||{}).zh = {code:'zh', name:'Mandarin', native:'中文', flag:'🇨🇳', locale:'zh-CN', rom:'Pinyin', script:'Characters', tones:true,
 digits:['零','一','二','三','四','五','六','七','八','九','十'], digitRom:['ling','yi','er','san','si','wu','liu','qi','ba','jiu','shi'],
 themes:[
 {level:1,id:'common',name:'Most Common',icon:'⭐',color:'#e63946',words:[
  ['我','wǒ','I / me','🙋'],['你','nǐ','you','🫵'],['他','tā','he / him','👨'],['她','tā','she / her','👩'],['我们','wǒ men','we / us','👨‍👩‍👧'],
  ['的','de','\'s (of)','🔗'],['这','zhè','this','👇'],['那','nà','that','👉'],['有','yǒu','have','🎁'],['没有','méi yǒu','don\'t have','🙅'],
  ['在','zài','at / in','📍'],['和','hé','and','➕'],['也','yě','also / too','🔁'],['很','hěn','very','‼️'],['都','dōu','all','💯'],
  ['大','dà','big','🐘'],['小','xiǎo','small','🐭'],['多','duō','many / a lot','🍬'],['少','shǎo','few / a little','🤏'],['好','hǎo','good','👍'],
  ['来','lái','come','🫴'],['去','qù','go','🚶'],['吃','chī','eat','😋'],['喝','hē','drink','🧃'],['看','kàn','look / watch','🧐'],
  ['要','yào','want','🤲'],['爱','ài','love','❤️'],['喜欢','xǐ huan','like','😍'],['想','xiǎng','think / miss','💭'],['说','shuō','speak','🗣️'],
  ['听','tīng','listen','🎧'],['读','dú','read','📚'],['写','xiě','write','✍️'],['买','mǎi','buy','🛒'],['开','kāi','open','🔓'],
  ['坐','zuò','sit','🧘'],['做','zuò','do / make','🔨'],['睡觉','shuì jiào','sleep','😴'],['叫','jiào','be called / call','📣'],['认识','rèn shi','know (a person)','🤝'],
  ['会','huì','can (know how)','💪'],['热','rè','hot','🥵'],['冷','lěng','cold','🥶'],['高兴','gāo xìng','happy','😄'],['漂亮','piào liang','pretty','🌸'],
  ['今天','jīn tiān','today','📅'],['明天','míng tiān','tomorrow','⏭️'],['昨天','zuó tiān','yesterday','⏮️'],['现在','xiàn zài','now','⏰'],['上','shàng','up / on','⬆️'],
  ['下','xià','down / under','⬇️'],['人','rén','person','🧍'],['朋友','péng you','friend','🧑‍🤝‍🧑'],['老师','lǎo shī','teacher','🧑‍🏫'],['学生','xué sheng','student','🧑‍🎓'],
  ['医生','yī shēng','doctor','🧑‍⚕️'],['家','jiā','home / family','🏡'],['学校','xué xiào','school','🏫'],['商店','shāng diàn','shop','🏪'],['飞机','fēi jī','plane','✈️'],
  ['出租车','chū zū chē','taxi','🚕'],['下雨','xià yǔ','rain','🌧️'],['茶','chá','tea','🍵'],['菜','cài','vegetables / dish','🥬'],['水果','shuǐ guǒ','fruit','🍇'],
  ['衣服','yī fu','clothes','👕'],['钱','qián','money','💰'],['电脑','diàn nǎo','computer','💻'],['中国','Zhōng guó','China','🇨🇳'],['什么','shén me','what','❓'],
  ['谁','shéi','who','🕵️'],['哪儿','nǎr','where','🗺️'],['几','jǐ','how many','🧮'],['月','yuè','month / moon','🌕'],['年','nián','year','🎆']]},
 {level:1,id:'greet',name:'Greetings',icon:'👋',color:'#ff7a59',words:[
  ['你好','nǐ hǎo','hello','👋'],['谢谢','xiè xie','thank you','🙏'],['再见','zài jiàn','goodbye','🙋'],
  ['对不起','duì bu qǐ','sorry','😔'],['早上好','zǎo shang hǎo','good morning','🌅'],['晚安','wǎn ān','good night','🌙'],
  ['是','shì','yes','✅'],['不','bù','no','❌']]},
 {level:1,id:'family',name:'Family',icon:'👨‍👩‍👧‍👧',color:'#f7b32b',words:[
  ['爸爸','bà ba','dad','👨'],['妈妈','mā ma','mum','👩'],['哥哥','gē ge','big brother','👦'],['姐姐','jiě jie','big sister','👧'],
  ['弟弟','dì di','little brother','🧒'],['妹妹','mèi mei','little sister','👧🏻'],['爷爷','yé ye','grandpa (dad\'s dad)','👴'],
  ['奶奶','nǎi nai','grandma (dad\'s mum)','👵'],['外公','wài gōng','grandpa (mum\'s dad)','👴🏻'],['外婆','wài pó','grandma (mum\'s mum)','👵🏻'],
  ['宝宝','bǎo bao','baby','👶']]},
 {level:1,id:'num',name:'Numbers',icon:'🔢',color:'#2ec4b6',words:[
  ['一','yī','one','1️⃣'],['二','èr','two','2️⃣'],['三','sān','three','3️⃣'],['四','sì','four','4️⃣'],['五','wǔ','five','5️⃣'],
  ['六','liù','six','6️⃣'],['七','qī','seven','7️⃣'],['八','bā','eight','8️⃣'],['九','jiǔ','nine','9️⃣'],['十','shí','ten','🔟']]},
 {level:1,id:'color',name:'Colours',icon:'🎨',color:'#9b5de5',words:[
  ['红色','hóng sè','red','🔴'],['黄色','huáng sè','yellow','🟡'],['蓝色','lán sè','blue','🔵'],['绿色','lǜ sè','green','🟢'],
  ['白色','bái sè','white','⚪'],['黑色','hēi sè','black','⚫'],['橙色','chéng sè','orange','🟠'],['紫色','zǐ sè','purple','🟣']]},
 {level:1,id:'animal',name:'Animals',icon:'🐼',color:'#06d6a0',words:[
  ['猫','māo','cat','🐱'],['狗','gǒu','dog','🐶'],['鱼','yú','fish','🐟'],['鸟','niǎo','bird','🐦'],['马','mǎ','horse','🐴'],
  ['牛','niú','cow','🐮'],['猪','zhū','pig','🐷'],['兔子','tù zi','rabbit','🐰'],['熊猫','xióng māo','panda','🐼'],['老虎','lǎo hǔ','tiger','🐯']]},
 {level:1,id:'food',name:'Food',icon:'🍎',color:'#ef476f',words:[
  ['苹果','píng guǒ','apple','🍎'],['香蕉','xiāng jiāo','banana','🍌'],['米饭','mǐ fàn','rice','🍚'],['面条','miàn tiáo','noodles','🍜'],
  ['水','shuǐ','water','💧'],['牛奶','niú nǎi','milk','🥛'],['鸡蛋','jī dàn','egg','🥚'],['饺子','jiǎo zi','dumplings','🥟'],['西瓜','xī guā','watermelon','🍉']]},
 {level:1,id:'body',name:'Body',icon:'🖐️',color:'#118ab2',words:[
  ['眼睛','yǎn jing','eyes','👀'],['鼻子','bí zi','nose','👃'],['嘴巴','zuǐ ba','mouth','👄'],['耳朵','ěr duo','ear','👂'],
  ['手','shǒu','hand','✋'],['脚','jiǎo','foot','🦶'],['头发','tóu fa','hair','💇'],['牙齿','yá chǐ','teeth','🦷']]},
 {level:1,id:'home',name:'Home',icon:'🏠',color:'#fb8500',words:[
  ['房子','fáng zi','house','🏠'],['门','mén','door','🚪'],['床','chuáng','bed','🛏️'],['椅子','yǐ zi','chair','🪑'],
  ['电视','diàn shì','TV','📺'],['书','shū','book','📖'],['杯子','bēi zi','cup','🥤'],['灯','dēng','lamp','💡'],['车','chē','car','🚗']]}
]};
