// 離線快取：每次都先拿網路最新版（不吃瀏覽器快取），沒網路才用快取
const C='reset-v38';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.json','icon.png'])));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
 e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)))});

// ---------- 推播通知：GitHub 排程送來，依 app 存的進度組合「客製化」提醒 ----------
function idbGet(k){return new Promise(res=>{try{const r=indexedDB.open('reset_meta',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>{try{const db=r.result,q=db.transaction('kv','readonly').objectStore('kv').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)}catch(e){res(null)}};r.onerror=()=>res(null)}catch(e){res(null)}})}
function dayKey(ds,off){const d=new Date(Date.now()-(ds||0)*3600e3);d.setDate(d.getDate()+(off||0));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const pick=a=>a[Math.floor(Math.random()*a.length)];
const FCN={study:'讀書',esp:'西文',med:'冥想',body:'體能',tidy:'整理'};
function compose(type,st,d){d=d||{};
 if(type==='test'||!type){const h=new Date().getHours();return compose(h>=4&&h<12?'morning':h<22&&h>=12?'evening':'night',st,d)}
 if(type==='tick')return['⏰ 計時通知接通了','之後專注、休息時間到，鎖著螢幕也會叫你。'];
 if(type==='focus'){const M2=st&&st.minion||'魔物',c=FCN[d.cat]||'專注';return pick([[`⏰ ${c} ${d.min} 分鐘完成`,`斬擊命中「${M2}」！回來領獎勵，然後休息 5 分鐘。`],['⚔️ 專注討伐成功',`${d.min} 分鐘的${c}撐完了。站起來動一動、喝口水。`],[`🔔 時間到，可以休息了`,`${c} ${d.min} 分鐘完成。打開 RESET 收下戰利品。`]])}
 if(type==='break')return pick([['☕ 休息結束','回來再戰一場？'],['⚔️ 休息時間到',`${st&&st.minion||'魔物'}還在地城等你。`]]);
 const fresh=st&&st.d===dayKey(st.ds),yest=st&&st.d===dayKey(st.ds,-1);
 const R=st&&st.region||'晨曦之村',M=st&&st.minion||'魔物',B=st&&st.bossName||'Boss',pet=st&&st.pet||'',n=st?Math.max(0,st.need-st.done):0,q=(st&&st.quick)||[],qs=q.slice(0,Math.max(1,Math.min(n,3))),sk=st&&st.streak||0;
 if(type==='morning'){
  if(yest&&!st.cleared)return st.ym&&sk?['🚨 連續要斷了',`昨天差 ${n} 項沒過。今天補登昨天，或今天通關，${sk} 天才保得住。`]:['⚠️ 昨天沒過',`昨天還差 ${n} 項，今天還能補登。打開 RESET 點「昨天」。`];
  if(fresh||yest){const c=[];
   if(st.weak)c.push([`😵 ${pet}倒在路邊`,'牠已經兩天沒吃到通關，快撐不住了。今天先做一個迷你版救救牠。']);
   if(st.due&&st.due.length)c.push(['📌 今天要搞定',st.due.slice(0,3).join('、')]);
   if(st.boss)c.push([`⚔️ ${B}出現了`,'週末決戰日。這週的努力都會變成蓄力一擊。']);
   if(st.ms&&!(fresh&&st.cleared)&&st.ms===sk+1)c.push(['🔥 今天是關鍵',`通關就是連續 ${st.ms} 天。`]);
   if(st.mapLeft===1)c.push(['🗺️ 只差 1 步',`今天通關就抵達「${st.mapNext}」，有寶箱。`]);
   if(st.egg!=null&&st.egg<=1)c.push(['🥚 蛋在晃了','今天通關，牠就會破殼。']);
   if(c.length)return c[0];
   const q0=q[0]||'冥想 1 分鐘';return pick([[sk?`☀️ 早安・連續 ${sk} 天`:'☀️ 早安',`先拿下第一個：${q0}。今天就贏一半。`],['📜 冒險者公會',`今天的委託貼出來了。第一件：${q0}。`],pet?[`🐾 ${pet}在戳你`,`「起床了啦，今天要繼續往${R}前進。」`]:['🗺️ 新的一天',`${R}的路還很長。先做 ${q0}。`],[`👁️ ${M}醒了`,`牠在地城等你。${q0}就能先打牠一下。`]])}
  return['☀️ 早安','新的一天。先拿下第一個任務，今天就贏一半。']}
 if(!fresh)return type==='night'?['🌙 手機離開房間','00:30 前上床。睡覺也是任務。']:pick([['👀 今天還沒打開 RESET','一個任務都還沒勾。現在打開，先做最簡單的。'],[`🔥 ${M}在攻擊${R}`,'村民在找你。今天一個任務都還沒勾。'],pet?[`🐾 ${pet}等你一整天了`,'「你今天是不是忘記我了……」']:['📜 公會在找你','今天的委託一件都還沒接。']]);
 const risk=st.ym&&!st.cleared&&sk>0;
 if(type==='evening'){
  if(st.cleared)return pick([['✅ 今日通關',st.diary?'日記也寫了。剩下的時間是你的。':'還差一篇日記，寫兩句就好。'],[`✅ 連續 ${sk} 天`,pet?`${pet}吃飽了，在旁邊打呼。`:'今天打得很好。'],[`🏰 ${R}守住了`,st.diary?'今天的魔物全數擊退。好好休息。':'魔物全數擊退。睡前把冒險寫進日記吧。']]);
  if(risk)return pick([[`🚨 連續 ${sk} 天要斷了`,`昨天已經沒過。還差 ${n} 項：${qs.join('、')}。迷你版就算。`],[`🚨 ${R}的結界快破了`,`${sk} 天的守護就差今天。還差 ${n} 項：${qs.join('、')}。`]]);
  return pick([[`⚔️ 還差 ${n} 項通關`,`最快的路：${qs.join('＋')}。`],[`🔥 ${M}在攻擊${R}`,`還差 ${n} 項。完成就能擊退牠：${qs.join('、')}。`],pet?[`🐾 ${pet}在叫你`,`「還差 ${n} 項……先做 ${qs[0]} 好不好？」`]:['👀 系統在看你',`還差 ${n} 項。${qs[0]}，現在就做。`],['⏰ 今天剩 3 小時',`${qs.join('、')}，迷你版就夠。`]])}
 if(type==='night'){
  if(st.cleared)return pick([['🌙 手機離開房間','00:30 前上床。睡覺也是任務。'],['🌙 今天打得很好','放下手機，明天見。'],[pet?`💤 ${pet}睡著了`:'💤 營火熄了','「勇者也該睡了。」手機放房間外面。']]);
  if(risk)return pick([['🚨 最後機會',`再不做，${sk} 天的連續就沒了。${qs[0]}，幾分鐘的事。`],[`🌑 ${R}要失守了`,`${sk} 天的努力就差今晚。${qs[0]}，幾分鐘的事。`]]);
  return pick([['🌙 快 00:30 了',`還差 ${n} 項：${qs.join('、')}。做完就睡。`],[pet?`😢 ${pet}還在門口等你`:'🌙 還沒通關',`差 ${n} 項。明天能補登，但現在做掉最輕鬆。`],[`🌑 夜晚降臨${R}`,`魔物在暗處集結。還差 ${n} 項，做完就能守住今晚。`]])}
 return['RESET','打開看看今天的進度。']}
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){}
 e.waitUntil(idbGet('status').then(st=>{const[title,body]=d.title?[d.title,d.body||'']:compose(d.type,st,d);return self.registration.showNotification(title,{body,icon:'icon.png',badge:'icon.png',tag:d.type||'reset',renotify:true,requireInteraction:d.type==='focus'||d.type==='break',vibrate:[200,100,200],data:{url:'./'}})}))});
self.addEventListener('message',e=>{const m=e.data||{};if(m.preview){idbGet('status').then(st=>{const out={};for(const t of['morning','evening','night'])out[t]=compose(t,st);e.ports[0]&&e.ports[0].postMessage(out);if(m.show)self.registration.showNotification(...(([a,b])=>[a,{body:b,icon:'icon.png',tag:'preview'}])(compose(m.show,st)))})}});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs)if('focus'in c)return c.focus();return clients.openWindow('./')}))});
