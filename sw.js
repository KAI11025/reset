// 離線快取：每次都先拿網路最新版（不吃瀏覽器快取），沒網路才用快取
const C='reset-v28';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.json','icon.png'])));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
 e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)))});

// ---------- 推播通知：GitHub 排程送來，內容依 app 存的今日狀態組合 ----------
function idbGet(k){return new Promise(res=>{try{const r=indexedDB.open('reset_meta',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>{try{const db=r.result,q=db.transaction('kv','readonly').objectStore('kv').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)}catch(e){res(null)}};r.onerror=()=>res(null)}catch(e){res(null)}})}
function dayKey(ds){const d=new Date(Date.now()-(ds||0)*3600e3);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function compose(type,st){const fresh=st&&st.d===dayKey(st.ds),left=fresh?st.left||[]:[],n=fresh?Math.max(0,st.need-st.done):null,pet=st&&st.pet?st.pet:'系統';
 if(type==='morning'){if(!st)return['☀️ 早安，勇者','新的一天。先拿下第一個任務，今天就贏一半。'];
  return[st.streak?`☀️ 早安・連續 ${st.streak} 天`:'☀️ 早安，勇者',st.weak&&st.pet?`${pet}好餓……今天通關餵牠好不好。先做一個迷你版就好。`:`今天 ${st.total||''} 個任務，先拿下第一個，今天就贏一半。`]}
 if(type==='evening'){if(!fresh)return['🌙 晚上了','打開 RESET 看看今天還差什麼。'];
  if(st.cleared)return['✅ 今日已通關',left.length?`還能加碼：${left.slice(0,3).join('、')}。日記也別忘了寫。`:'全部完成。剩下的時間是你的。'];
  return[`⚔️ 還差 ${n} 項通關`,`${left.slice(0,4).join('、')}。做迷你版也算。`]}
 if(type==='night'){if(fresh&&!st.cleared)return['🌙 快 00:30 了',`今天還差 ${n} 項：${left.slice(0,3).join('、')}。做迷你版也算，做完就睡。`];
  return['🌙 手機離開房間','00:30 前上床。睡覺也是任務。']}
 if(type==='test')return['🔔 通知測試成功','RESET 的推播已經接通了。'];
 return['RESET','打開看看今天的進度。']}
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){}
 e.waitUntil(idbGet('status').then(st=>{const[title,body]=d.title?[d.title,d.body||'']:compose(d.type,st);return self.registration.showNotification(title,{body,icon:'icon.png',badge:'icon.png',tag:d.type||'reset',data:{url:'./'}})}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs)if('focus'in c)return c.focus();return clients.openWindow('./')}))});
