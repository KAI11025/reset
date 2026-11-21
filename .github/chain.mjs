// 通知鏈：自己算下一個通知時間 → 等 → 送 → 再叫醒下一棒。
// GitHub 的 schedule 常常不觸發，所以改成一棒接一棒（GITHUB_TOKEN 可以觸發 workflow_dispatch）。
import webpush from 'web-push';
const HOP = 320 * 60e3;                       // 單棒最多等 5h20m（job 上限 6h）
const SLOTS = [['morning', 7 * 60 + 41, 50], ['afternoon', 12 * 60 + 33, 300], ['night', 22 * 60 + 7, 40]]; // [類型, 台灣時間起點(分), 隨機範圍(分)]
const now = +process.env.NOW || Date.now();
const h = s => { let x = 2166136261; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) } x ^= x >>> 16; x = Math.imul(x, 2246822507); x ^= x >>> 13; return (x >>> 0) / 4294967296 };
const twDate = t => new Date(t + 8 * 3600e3).toISOString().slice(0, 10);
function slotsOf(day) { const base = Date.parse(day + 'T00:00:00+08:00'); return SLOTS.map(([type, m, r]) => ({ type, day, at: base + (m + Math.floor(h(day + type) * r)) * 60e3 })) }
function nextSlot(t) { const d0 = twDate(t); for (let i = 0; i < 3; i++) { const day = twDate(Date.parse(d0 + 'T12:00:00+08:00') + i * 864e5); for (const s of slotsOf(day)) if (s.at > t) return s } }
const s = nextSlot(now), wait = s.at - now;
const fmt = t => new Date(t + 8 * 3600e3).toISOString().slice(5, 16).replace('T', ' ');
console.log('現在', fmt(now), '→ 下一則', s.type, fmt(s.at), `（${Math.round(wait / 60e3)} 分後）`);
if (process.env.DRY) process.exit(0);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function relay() {
  const r = await fetch(`https://api.github.com/repos/${process.env.REPO}/actions/workflows/chain.yml/dispatches`, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.GH_TOKEN, Accept: 'application/vnd.github+json' }, body: JSON.stringify({ ref: 'main' }) });
  console.log('交棒', r.status);
}
if (wait > HOP) { await sleep(HOP); await relay(); process.exit(0); }
await sleep(Math.max(0, wait));
if (process.env.PUSH) {
  try {
    const c = JSON.parse(Buffer.from(process.env.PUSH.trim(), 'base64').toString());
    webpush.setVapidDetails('https://kai11025.github.io/reset/', c.pub, c.priv);
    const r = await webpush.sendNotification(c.s, JSON.stringify({ type: s.type }), { TTL: 3600, urgency: 'high' });
    console.log('已送出', s.type, r.statusCode);
  } catch (e) { console.error('送出失敗', e.statusCode, e.body || e.message) }
} else console.log('沒有 PUSH secret');
await sleep(5000);
await relay();
