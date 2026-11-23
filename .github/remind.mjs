// 委託提醒：app 算好提醒時間（只有時間，不含內容）丟進來，到點送推播，內容由手機上的 SW 依委託狀態組出來。
import webpush from 'web-push';
const HOP = 320 * 60e3, t0 = Date.now(), sleep = ms => new Promise(r => setTimeout(r, ms));
let times = (process.env.TIMES || '').split(',').map(Number).filter(x => x > Date.now() - 60e3).sort((a, b) => a - b);
const fmt = t => new Date(t + 8 * 3600e3).toISOString().slice(5, 16).replace('T', ' ');
console.log('提醒時間', times.map(fmt).join(' | ') || '（沒有）');
if (process.env.DRY || !times.length) process.exit(0);
let c = null;
try { c = JSON.parse(Buffer.from((process.env.PUSH || '').trim(), 'base64').toString()); webpush.setVapidDetails('https://kai11025.github.io/reset/', c.pub, c.priv) } catch (e) { console.log('沒有 PUSH 設定'); process.exit(0) }
async function relay() {
  const r = await fetch(`https://api.github.com/repos/${process.env.REPO}/actions/workflows/remind.yml/dispatches`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.GH_TOKEN, Accept: 'application/vnd.github+json' }, body: JSON.stringify({ ref: 'main', inputs: { times: times.join(',') } }) });
  console.log('交棒', r.status);
}
while (times.length) {
  const wait = times[0] - Date.now(), used = Date.now() - t0;
  if (used + Math.max(0, wait) > HOP) { await sleep(Math.max(0, HOP - used)); times = times.filter(x => x > Date.now() - 60e3); await relay(); process.exit(0) }
  await sleep(Math.max(0, wait));
  try { const r = await webpush.sendNotification(c.s, JSON.stringify({ type: 'todo' }), { TTL: 3600, urgency: 'high' }); console.log('已送出', fmt(times[0]), r.statusCode) } catch (e) { console.error('送出失敗', e.statusCode, e.body || e.message) }
  times.shift();
}
