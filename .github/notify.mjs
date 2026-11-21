// 讀 GitHub Secret「PUSH」（app 設定頁產生的設定碼），送一則推播
import webpush from 'web-push';
// 排程：[類型, 隨機延後上限(分), 備援時檢查的時間窗(分)]
const MAP = { '41 23 * * *': ['morning', 50], '33 4 * * *': ['afternoon', 300], '7 14 * * *': ['night', 40] };
const BACKUP = { '53 0 * * *': ['morning', 0, 100], '43 5 * * *': ['afternoon', 200, 90], '59 14 * * *': ['night', 0, 70] };
const m = MAP[process.env.SCHED], bk = BACKUP[process.env.SCHED];
const type = process.env.TYPE || (m && m[0]) || (bk && bk[0]) || 'test';
const maxDelay = (m && m[1]) || (bk && bk[1]) || 0;
if (!process.env.PUSH) { console.log('還沒設定 PUSH secret，跳過'); process.exit(0); }
let c;
try { c = JSON.parse(Buffer.from(process.env.PUSH.trim(), 'base64').toString()); }
catch (e) { console.error('PUSH 設定碼格式不對，請在 app 設定頁重新複製'); process.exit(1); }
webpush.setVapidDetails('https://kai11025.github.io/reset/', c.pub, c.priv);
// 備援：主排程在時間窗內已經送過或正在等，就略過
if (bk && process.env.GH_TOKEN) {
  try {
    const r = await fetch(`${process.env.API || 'https://api.github.com'}/repos/${process.env.REPO}/actions/workflows/notify.yml/runs?event=schedule&per_page=20`, { headers: { Authorization: 'Bearer ' + process.env.GH_TOKEN, Accept: 'application/vnd.github+json' } });
    const j = await r.json();
    const busy = (j.workflow_runs || []).some(w => String(w.id) !== String(process.env.RUN_ID) && (w.status !== 'completed' || w.conclusion === 'success') && Date.now() - new Date(w.created_at).getTime() < bk[2] * 60e3);
    if (busy) { console.log('主排程已經送過或正在等，備援略過'); process.exit(0); }
    console.log('主排程沒跑，由備援送出', type);
  } catch (e) { console.log('查詢失敗，直接送', e.message); }
}
// 隨機延後，讓每天的時間不一樣
if (maxDelay > 0) { const ms = Math.floor(Math.random() * maxDelay * 60e3 * (+process.env.DELAY_SCALE || 1)); console.log('隨機延後', Math.round(ms / 60e3), '分鐘'); await new Promise(r => setTimeout(r, ms)); }
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
