// 讀 GitHub Secret「PUSH」（app 設定頁產生的設定碼），送一則推播
import webpush from 'web-push';
const MAP = { '23 0 * * *': 'morning', '17 13 * * *': 'evening', '47 15 * * *': 'night' };
const BACKUP = { '53 0 * * *': ['morning', '23 0 * * *'], '9 16 * * *': ['night', '47 15 * * *'], '47 13 * * *': ['evening', '17 13 * * *'] };
const bk = BACKUP[process.env.SCHED];
const type = process.env.TYPE || MAP[process.env.SCHED] || (bk && bk[0]) || 'test';
// 備援排程：主排程這 60 分鐘內已經成功送過，就不再送
if (bk && process.env.GH_TOKEN) {
  try {
    const r = await fetch(`${process.env.API || 'https://api.github.com'}/repos/${process.env.REPO}/actions/workflows/notify.yml/runs?event=schedule&per_page=20`, { headers: { Authorization: 'Bearer ' + process.env.GH_TOKEN, Accept: 'application/vnd.github+json' } });
    const j = await r.json();
    const done = (j.workflow_runs || []).some(w => String(w.id) !== String(process.env.RUN_ID) && w.conclusion === 'success' && Date.now() - new Date(w.created_at).getTime() < 60 * 60e3);
    if (done) { console.log('主排程已經送過，備援略過'); process.exit(0); }
    console.log('主排程沒跑成功，由備援送出', type);
  } catch (e) { console.log('查詢失敗，直接送', e.message); }
}
if (!process.env.PUSH) { console.log('還沒設定 PUSH secret，跳過'); process.exit(0); }
let c;
try { c = JSON.parse(Buffer.from(process.env.PUSH.trim(), 'base64').toString()); }
catch (e) { console.error('PUSH 設定碼格式不對，請在 app 設定頁重新複製'); process.exit(1); }
webpush.setVapidDetails('https://kai11025.github.io/reset/', c.pub, c.priv);
// 計時：等到結束時間再送（最多 190 分鐘）
const end = +process.env.END || 0;
if (end) { const ms = Math.min(end - Date.now(), 190 * 60e3); if (ms > 0) { console.log('等待', Math.round(ms / 1000), '秒'); await new Promise(r => setTimeout(r, ms)); } }
const extra = { min: +process.env.MIN || 0, cat: process.env.CAT || '' };
try {
  const r = await webpush.sendNotification(c.s, JSON.stringify({ type, ...extra }), { TTL: 3600, urgency: 'high' });
  console.log('已送出', type, r.statusCode);
} catch (e) {
  console.error('送出失敗', e.statusCode, e.body || e.message);
  if (e.statusCode === 404 || e.statusCode === 410) console.error('訂閱失效了：到 app 設定頁 → 通知 → 重新開啟，再更新 PUSH secret');
  process.exit(1);
}
