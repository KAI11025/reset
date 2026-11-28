// 離線快取：每次都先拿網路最新版（不吃瀏覽器快取），沒網路才用快取
const C='reset-v64';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.json','icon.png'])));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request).then(r=>r||Response.error())))});

// ---------- 推播通知：GitHub 排程送來，依 app 存的進度組合「客製化」提醒 ----------
function idbGet(k){return new Promise(res=>{try{const r=indexedDB.open('reset_meta',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>{try{const db=r.result,q=db.transaction('kv','readonly').objectStore('kv').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)}catch(e){res(null)}};r.onerror=()=>res(null)}catch(e){res(null)}})}
function dayKey(ds,off){const d=new Date(Date.now()-(ds||0)*3600e3);d.setDate(d.getDate()+(off||0));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const pick=a=>a[Math.floor(Math.random()*a.length)];
const FCN={study:'讀書',esp:'西文',med:'冥想',body:'體能',tidy:'整理'};
function compose(type,st,d){d=d||{};
 if(type==='todo'){const T=((st&&st.todos)||[]).slice().sort((x,y)=>x.d<y.d?-1:1),td=dayKey(st?st.ds:0),hr=new Date().getHours();if(!T.length)return pick([['📜 委託板','這週的委託都清掉了，不錯。'],['📜 公會布告欄','打開看看有沒有新委託。']]);
  const x=T[0],left=Math.round((Date.parse(x.d)-Date.parse(td))/864e5),more=T.length>1?`（還有 ${T.length-1} 件）`:'',t=x.t;
  if(left<0)return pick([['⏰ 委託逾期了',`「${t}」已經過期，做完還是有完成獎勵。${more}`]]);
  if(left===0&&hr>=21)return pick([['🚨 委託今晚截止',`「${t}」再不做，明天就扣 15G。${more}`],['🕯️ 委託人還在等',`「${t}」今天最後期限，剩幾個小時。${more}`]]);
  if(left===0)return pick([['📜 委託今天截止',`「${t}」今天要搞定，現在做掉最輕鬆。${more}`],['🗡️ 公會提醒',`「${t}」今天到期，還沒完成。${more}`],['📯 委託人來催了',`「${t}」說好今天喔。${more}`]]);
  if(left===1)return pick([['📜 委託明天截止',`「${t}」明天要交，今天先動一點？${more}`],['🕯️ 公會布告欄',`「${t}」只剩一天。${more}`]]);
  return pick([[`📜 委託倒數 ${left} 天`,`「${t}」。先拆一小步做掉，之後輕鬆很多。${more}`],['🗺️ 委託進度',`「${t}」還有 ${left} 天，別拖到最後一晚。${more}`]])}
 if(type==='test'||!type){const h=new Date().getHours();return compose(h>=4&&h<12?'morning':h<21&&h>=12?'afternoon':'night',st,d)}
 if(type==='tick')return['⏰ 計時通知接通了','之後專注、休息時間到，鎖著螢幕也會叫你。'];
 if(type==='focus'){const M2=st&&st.minion||'魔物',c=FCN[d.cat]||'專注';return pick([[`⏰ ${c} ${d.min} 分鐘完成`,`斬擊命中「${M2}」！回來領獎勵，然後休息 5 分鐘。`],['⚔️ 專注討伐成功',`${d.min} 分鐘的${c}撐完了。站起來動一動、喝口水。`],[`🔔 時間到，可以休息了`,`${c} ${d.min} 分鐘完成。打開 RESET 收下戰利品。`]])}
 if(type==='break')return pick([['☕ 休息結束','回來再戰一場？'],['⚔️ 休息時間到',`${st&&st.minion||'魔物'}還在地城等你。`]]);
 const fresh=st&&st.d===dayKey(st.ds),yest=st&&st.d===dayKey(st.ds,-1);
 if(type==='evening')type='afternoon';
 const R=st&&st.region||'晨曦之村',M=st&&st.minion||'魔物',B=st&&st.bossName||'Boss',pet=st&&st.pet||'',n=st?Math.max(0,st.need-st.done):0,q=(st&&st.quick)||[],qs=q.slice(0,Math.max(1,Math.min(n,3))),sk=st&&st.streak||0,q0=q[0]||'冥想 1 分鐘',hr=new Date().getHours();
 // 週末休息日：不催任務
 if(st&&st.rest&&fresh&&type!=='todo'){
  if(type==='morning')return pick([['🏖️ 週末，好好休息','今天沒有任務。想做什麼就做，晚上回報一下就好。'],['☀️ 休息日','連續不會斷。去充電吧。'],pet?[`🐾 ${pet}也在放假`,'今天一起耍廢。']:['🌿 放假日','慢慢來，今天不用趕。']]);
  if(type==='afternoon')return st.boss?pick([[`⚔️ ${B}在等你`,'週末限定的決戰，打完再繼續放假。'],['🐉 Boss 戰開放中','這週的努力會變成蓄力一擊。']]):pick([['🏖️ 週末進行中','有做什麼值得記的？運動、讀書、陪家人都算，回報主線就前進一步。'],['🗺️ 主線小提醒','週末回報一件事，地圖也會往前走。']]);
  if(type==='night')return st.reported?pick([['🌙 週末辛苦了','回報收到了。早點睡，週一見。'],['💤 收工','手機放房間外面，好好睡。']]):pick([['📝 今天做了什麼？','寫一句週末回報，公會長週一會看，有機會加分。'],['🌙 睡前回報','一件就好：今天做了什麼讓你覺得充實？']]);
 }
 // 新手村暖身週：不提 Boss、不提連續
 if(st&&st.warm&&(fresh||yest)){const left=st.warm;
  if(type==='morning')return pick([['🏕️ 新手村的早晨',`暖身週，再 ${left} 天正式出發。今天先熟悉任務：${q0}。`],['📜 村長的叮嚀','「出發前，先把基本功練熟。」今天試著做完一半任務。'],['☀️ 早安，見習勇者',`先拿下第一個：${q0}。暖身週做多少都算經驗。`],pet?[`🥚 ${pet||'蛋'}動了一下`,'通關 3 天就會孵化。']:['🥚 蛋在晃','通關 3 天就會孵化，暖身週也算。']]);
  if(type==='afternoon'){if(fresh&&st.cleared)return pick([['🏕️ 今天的練習完成了','暖身週就通關，正式開始一定沒問題。'],['✅ 見習完成','村民都在說新來的勇者很認真。']]);
   return pick([['🏕️ 新手村訓練場',`還差 ${n} 項。${qs.join('、')}，迷你版就夠。`],['📜 村長在找你',`「今天的練習做了嗎？」還差 ${n} 項。`],['🗡️ 稻草人在等你',`隨便打兩下也好：${q0}。`]])}
  if(type==='night')return fresh&&!st.cleared?pick([['🌙 新手村的夜晚',`還差 ${n} 項，做個迷你版再睡。`],['🔥 營火快熄了','今天的練習還沒做完，睡前補一兩項。']]):pick([['🌙 新手村熄燈了','手機放房間外面，00:30 前上床。'],['💤 見習勇者該睡了','睡飽，是最便宜的外掛。']])}
 if(type==='morning'){
  if(yest&&!st.cleared&&!st.warm)return st.ym&&sk?['🚨 連續要斷了',`昨天差 ${n} 項沒過。今天補登昨天，或今天通關，${sk} 天才保得住。`]:pick([['⚠️ 昨天沒過',`昨天還差 ${n} 項，今天還能補登。打開 RESET 點「昨天」。`],['📜 昨天的委託還沒交',`還差 ${n} 項，今天可以補登。`]]);
  if(fresh||yest){const c=[];
   if(st.weak)c.push([`😵 ${pet}倒在路邊`,'牠已經兩天沒吃到通關，快撐不住了。今天先做一個迷你版救救牠。']);
   if(st.due&&st.due.length)c.push(['📌 今天要搞定',st.due.slice(0,3).join('、')]);
   if(st.boss)c.push(pick([[`⚔️ ${B}出現了`,'週末決戰日。這週的努力都會變成蓄力一擊。'],[`🐉 ${B}在等你`,'今天是決戰日。準備好了就打開 RESET。']]));
   if(st.ms&&!(fresh&&st.cleared)&&st.ms===sk+1)c.push(['🔥 今天是關鍵',`通關就是連續 ${st.ms} 天。`]);
   if(st.mapLeft===1)c.push(['🗺️ 只差 1 步',`今天通關就抵達「${st.mapNext}」，有寶箱。`]);
   if(st.egg!=null&&st.egg<=1)c.push(['🥚 蛋在晃了','今天通關，牠就會破殼。']);
   if(c.length&&Math.random()<.85)return c[0];
   return pick([[sk?`☀️ 早安・連續 ${sk} 天`:'☀️ 早安',`先拿下第一個：${q0}。今天就贏一半。`],['📜 冒險者公會',`今天的委託貼出來了。第一件：${q0}。`],pet?[`🐾 ${pet}在戳你`,`「起床了啦，今天要繼續往${R}前進。」`]:['🗺️ 新的一天',`${R}的路還很長。先做 ${q0}。`],[`👁️ ${M}醒了`,`牠在地城等你。${q0}就能先打牠一下。`],['🌅 系統啟動',`今天 ${st.total||''} 個任務。從最小的開始。`],['☕ 早安',`喝口水、拉個筋，然後 ${q0}。`]])}
  return['☀️ 早安','新的一天。先拿下第一個任務，今天就贏一半。']}
 if(!fresh)return type==='night'?pick([['🌙 手機離開房間','00:30 前上床。睡覺也是任務。'],['💤 營火熄了','今天就到這裡，明天再出發。']]):pick([['👀 今天還沒打開 RESET','一個任務都還沒勾。現在打開，先做最簡單的。'],[`🔥 ${M}在攻擊${R}`,'村民在找你。今天一個任務都還沒勾。'],pet?[`🐾 ${pet}等你一整天了`,'「你今天是不是忘記我了……」']:['📜 公會在找你','今天的委託一件都還沒接。']]);
 const risk=st.ym&&!st.cleared&&sk>0;
 if(type==='afternoon'){
  if(st.cleared)return pick([['✅ 今日通關',st.diary?'日記也寫了。剩下的時間是你的。':'下午就通關了。晚點寫兩句日記就好。'],[`✅ 連續 ${sk} 天`,pet?`${pet}吃飽了，在旁邊打呼。`:'今天打得很好。'],[`🏰 ${R}守住了`,'魔物全數擊退。要不要加碼一場專注？'],['🎯 還有餘力？','今天已經通關。想變強就去地城打一場。']]);
  if(risk)return pick([[`🚨 連續 ${sk} 天要斷了`,`昨天已經沒過。還差 ${n} 項：${qs.join('、')}。迷你版就算。`],[`🚨 ${R}的結界快破了`,`${sk} 天的守護就差今天。還差 ${n} 項：${qs.join('、')}。`]]);
  return pick([[`⚔️ 還差 ${n} 項通關`,`最快的路：${qs.join('＋')}。`],[`🔥 ${M}在攻擊${R}`,`還差 ${n} 項。完成就能擊退牠：${qs.join('、')}。`],pet?[`🐾 ${pet}在叫你`,`「還差 ${n} 項……先做 ${qs[0]} 好不好？」`]:['👀 系統在看你',`還差 ${n} 項。${qs[0]}，現在就做。`],['📜 公會的提醒',`今天的委託還剩 ${n} 件。先做最小的：${q0}。`],['⏳ 下午的空檔',`有 10 分鐘嗎？${q0}剛好。`],[`🗡️ ${M}露出破綻`,`現在出手最好打：${q0}。`]])}
 if(type==='night'){
  if(st.cleared)return pick([['🌙 手機離開房間','00:30 前上床。睡覺也是任務。'],['🌙 今天打得很好','放下手機，明天見。'],[pet?`💤 ${pet}睡著了`:'💤 營火熄了','「勇者也該睡了。」手機放房間外面。'],['📖 睡前一件事',st.diary?'日記寫了，手機可以放下了。':'寫兩句日記，然後放下手機。']]);
  if(risk)return pick([['🚨 最後機會',`再不做，${sk} 天的連續就沒了。${qs[0]}，幾分鐘的事。`],[`🌑 ${R}要失守了`,`${sk} 天的努力就差今晚。${qs[0]}，幾分鐘的事。`]]);
  return pick([['🌙 睡前最後一輪',`還差 ${n} 項：${qs.join('、')}。做完就睡。`],[pet?`😢 ${pet}還在門口等你`:'🌙 還沒通關',`差 ${n} 項。明天能補登，但現在做掉最輕鬆。`],[`🌑 夜晚降臨${R}`,`魔物在暗處集結。還差 ${n} 項，做完就能守住今晚。`]])}
 return['RESET','打開看看今天的進度。']}
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){}
 e.waitUntil(idbGet('status').then(st=>{const[title,body]=d.title?[d.title,d.body||'']:compose(d.type,st,d);return self.registration.showNotification(title,{body,icon:'icon.png',badge:'icon.png',tag:d.type||'reset',renotify:true,requireInteraction:d.type==='focus'||d.type==='break',vibrate:[200,100,200],data:{url:'./'}})}))});
self.addEventListener('message',e=>{const m=e.data||{};if(m.preview){idbGet('status').then(st=>{const out={};for(const t of['morning','afternoon','night'])out[t]=compose(t,st);e.ports[0]&&e.ports[0].postMessage(out);if(m.show)self.registration.showNotification(...(([a,b])=>[a,{body:b,icon:'icon.png',tag:'preview'}])(compose(m.show,st)))})}});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs)if('focus'in c)return c.focus();return clients.openWindow('./')}))});
