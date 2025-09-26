// server/index.js
import express from "express";
import cors from "cors";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("json spaces", 2);
app.use(cors());
app.use(express.json({ limit: "16mb" }));
app.use(express.urlencoded({ extended: true, limit: "16mb" }));

/* ---------------- Root (/): sağlık ve linkler ---------------- */
app.get("/", (_req, res) => {
  res.type("html").send(`
    <style>
      body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;padding:24px;line-height:1.5;color:#42275a}
      h1{margin:0 0 8px;font-size:20px}
      small{color:#6b7280}
      a{color:#9333ea;text-decoration:none}
      a:hover{text-decoration:underline}
      ul{margin:12px 0 0 18px}
    </style>
    <h1>AMBA API</h1>
    <small>Çalışıyor ✅</small>
    <ul>
      <li><a href="/leaderboard">/leaderboard</a> <small>(HTML görünüm)</small></li>
      <li><a href="/api/leaderboard">/api/leaderboard</a> <small>(JSON)</small></li>
      <li><a href="/api/config">/api/config</a> <small>(JSON)</small></li>
    </ul>
  `);
});
app.get("/healthz", (_req, res) => res.send("ok"));

/* ---------------- LowDB ---------------- */
const dbFile = path.join(__dirname, "data", "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { config: { endDate: null }, ambassadors: [], logs: [], adjustments: [] });
await db.read();
db.data ||= { config: { endDate: null }, ambassadors: [], logs: [], adjustments: [] };
db.data.adjustments ||= [];

/* ---------------- Helpers ---------------- */
const todayStr = () => new Date().toISOString().slice(0, 10);
// Puanlar (Story 50 / Post 100 / Ürün 150)
const scoreOf = (log) => (log.story ? 50 : 0) + (log.post ? 100 : 0) + (log.product ? 150 : 0);

function ensureDayLog(ambassadorId, dateStr) {
  const log = db.data.logs.find((l) => l.ambassadorId === ambassadorId && l.date === dateStr);
  if (log) return log;
  const newLog = { id: `${ambassadorId}-${dateStr}`, ambassadorId, date: dateStr, story: false, post: false, product: false };
  db.data.logs.push(newLog);
  return newLog;
}
const sumAdjustments = (ambassadorId) =>
  db.data.adjustments
    .filter((a) => a.ambassadorId === ambassadorId)
    .reduce((s, a) => s + Number(a.delta || 0), 0);

/* ---------------- Auth ---------------- */
const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";

app.post("/api/login", (req, res) => {
  const { role, username, pin, password } = req.body;

  if (role === "admin") {
    if (password === ADMIN_PASS) return res.json({ ok: true, token: "admin-token", role: "admin" });
    return res.status(401).json({ ok: false, error: "Bad admin password" });
  }

  if (role === "amb") {
    const uname = (username ?? "").trim().toLowerCase();
    const upin = String(pin ?? "").trim();
    const amb = db.data.ambassadors.find(
      (a) => (a.username ?? "").toLowerCase() === uname && String(a.pin) === upin
    );
    if (!amb) return res.status(401).json({ ok: false, error: "Bad credentials" });
    return res.json({ ok: true, token: `amb-${amb.id}`, role: "amb", ambassador: amb });
  }

  res.status(400).json({ ok: false, error: "role must be 'admin' or 'amb'" });
});

/* ---------------- Config ---------------- */
app.get("/api/config", (_req, res) => {
  res.json({ endDate: db.data.config.endDate });
});
app.post("/api/admin/end-date", async (req, res) => {
  const { date } = req.body;
  db.data.config.endDate = date || null;
  await db.write();
  res.json({ ok: true, endDate: db.data.config.endDate });
});

/* ---------------- Admin: list + today flags ---------------- */
app.get("/api/admin/ambassadors", (req, res) => {
  const date = req.query.date || todayStr();
  const list = db.data.ambassadors.map((a) => {
    const log = db.data.logs.find((l) => l.ambassadorId === a.id && l.date === date) || {
      story: false,
      post: false,
      product: false,
    };
    return { ...a, today: log };
  });
  res.json(list);
});

/* ---------------- Admin: Ambassador Ekle/Sil ---------------- */
app.post("/api/admin/ambassador", async (req, res) => {
  let { name, username, pin, avatar } = req.body || {};
  name = String(name || "").trim();
  username = String(username || "").trim();
  pin = String(pin || "").trim();
  avatar = String(avatar || "").trim();

  if (!name || !username || !pin) {
    return res.status(400).json({ ok: false, error: "İsim, kullanıcı adı ve PIN zorunludur." });
  }

  const exists = db.data.ambassadors.find((a) => (a.username || "").toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(409).json({ ok: false, error: "Bu kullanıcı adı zaten mevcut." });
  }

  if (avatar && !/^https?:\/\//i.test(avatar) && !avatar.startsWith("data:image/")) {
    avatar = "";
  }

  const id = "a" + Math.random().toString(36).slice(2, 8);
  const amb = { id, name, username, pin, avatar };
  db.data.ambassadors.push(amb);
  await db.write();
  res.status(201).json({ ok: true, ambassador: amb });
});

app.delete("/api/admin/ambassador/:id", async (req, res) => {
  const { id } = req.params;
  const idx = db.data.ambassadors.findIndex((a) => a.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: "Elçi bulunamadı" });

  db.data.logs = db.data.logs.filter((l) => l.ambassadorId !== id);
  db.data.adjustments = db.data.adjustments.filter((a) => a.ambassadorId !== id);

  db.data.ambassadors.splice(idx, 1);
  await db.write();
  res.json({ ok: true });
});

/* ---------------- Admin: Mark / Unmark ---------------- */
app.post("/api/admin/mark", async (req, res) => {
  const { ambassadorId, date, type } = req.body;
  const dateStr = date || todayStr();

  const amb = db.data.ambassadors.find((a) => a.id === ambassadorId);
  if (!amb) return res.status(404).json({ ok: false, error: "Ambassador not found" });

  const log = ensureDayLog(ambassadorId, dateStr);

  if (type === "S") {
    if (log.story) return res.status(409).json({ ok: false, error: "Story already marked for this day" });
    log.story = true;
  } else if (type === "P") {
    if (log.post) return res.status(409).json({ ok: false, error: "Post/Reels already marked for this day" });
    log.post = true;
  } else if (type === "U") {
    if (log.product) return res.status(409).json({ ok: false, error: "Product already marked for this day" });
    log.product = true;
  } else return res.status(400).json({ ok: false, error: "Unknown type" });

  await db.write();
  res.json({ ok: true, log });
});

app.post("/api/admin/unmark", async (req, res) => {
  const { ambassadorId, date, type } = req.body;
  const dateStr = date || todayStr();

  const amb = db.data.ambassadors.find((a) => a.id === ambassadorId);
  if (!amb) return res.status(404).json({ ok: false, error: "Ambassador not found" });

  const log = db.data.logs.find((l) => l.ambassadorId === ambassadorId && l.date === dateStr);
  if (!log) return res.status(404).json({ ok: false, error: "Kayıt yok" });

  if (type === "S") log.story = false;
  else if (type === "P") log.post = false;
  else if (type === "U") log.product = false;
  else return res.status(400).json({ ok: false, error: "Unknown type" });

  await db.write();
  res.json({ ok: true, log });
});

/* ---------------- Admin: Manuel Puan Düzeltme ---------------- */
app.post("/api/admin/adjust", async (req, res) => {
  try {
    let { ambassadorId, delta, note, date } = req.body || {};
    const amb = db.data.ambassadors.find((a) => a.id === String(ambassadorId || ""));
    if (!amb) return res.status(404).json({ ok: false, error: "Ambassador not found" });

    const d = Number(delta);
    if (!Number.isFinite(d) || Math.abs(d) > 50000) {
      return res.status(400).json({ ok: false, error: "Geçersiz delta" });
    }

    const adj = {
      id: "adj" + Date.now().toString(36),
      ambassadorId: amb.id,
      date: (date && String(date).slice(0, 10)) || todayStr(),
      delta: d,
      note: String(note || "").slice(0, 300),
    };
    db.data.adjustments.push(adj);
    await db.write();

    const logsTotal = db.data.logs
      .filter((l) => l.ambassadorId === amb.id)
      .reduce((s, l) => s + scoreOf(l), 0);
    const adjTotal = sumAdjustments(amb.id);

    res.json({ ok: true, adjustment: adj, total: logsTotal + adjTotal });
  } catch (e) {
    console.error("adjust error:", e);
    res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
});

app.get("/api/admin/adjustments", (req, res) => {
  const { ambassadorId } = req.query || {};
  const list = ambassadorId
    ? db.data.adjustments.filter((a) => a.ambassadorId === ambassadorId)
    : db.data.adjustments.slice();
  list.sort((a, b) => a.date.localeCompare(b.date));
  res.json(list);
});

app.delete("/api/admin/adjustments/:id", async (req, res) => {
  const { id } = req.params;
  const idx = db.data.adjustments.findIndex((a) => a.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: "Bulunamadı" });
  db.data.adjustments.splice(idx, 1);
  await db.write();
  res.json({ ok: true });
});

/* ---------------- API Leaderboard (JSON) ---------------- */
app.get("/api/leaderboard", (_req, res) => {
  const totals = db.data.ambassadors.map((a) => {
    const logs = db.data.logs.filter((l) => l.ambassadorId === a.id);
    const totalLogs = logs.reduce((s, l) => s + scoreOf(l), 0);
    const adjTotal = sumAdjustments(a.id);
    return { ...a, total: totalLogs + adjTotal };
  });
  totals.sort((x, y) => y.total - x.total);
  res.json(totals);
});

/* ---------------- HTML Leaderboard (okunaklı tablo) ---------------- */
app.get("/leaderboard", (_req, res) => {
  const totals = db.data.ambassadors.map((a) => {
    const logs = db.data.logs.filter((l) => l.ambassadorId === a.id);
    const totalLogs = logs.reduce((s, l) => s + scoreOf(l), 0);
    const adjTotal = sumAdjustments(a.id);
    return { ...a, total: totalLogs + adjTotal };
  }).sort((x, y) => y.total - x.total);

  const rows = totals.map((a, i) => `
    <tr>
      <td style="padding:.5rem .75rem;border-bottom:1px solid #f1e7f7">${i+1}</td>
      <td style="padding:.5rem .75rem;border-bottom:1px solid #f1e7f7">${a.name || "-"}</td>
      <td style="padding:.5rem .75rem;border-bottom:1px solid #f1e7f7">${a.username || "-"}</td>
      <td style="padding:.5rem .75rem;border-bottom:1px solid #f1e7f7;text-align:right;font-weight:700">${a.total}</td>
    </tr>
  `).join("");

  res.type("html").send(`
    <style>
      body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;padding:24px;line-height:1.5;color:#42275a;background:#fff}
      h1{margin:0 0 12px;font-size:22px}
      a{color:#9333ea;text-decoration:none}
      a:hover{text-decoration:underline}
      table{border-collapse:collapse;width:100%;max-width:720px;background:#fff;border:1px solid #f1e7f7;border-radius:12px;overflow:hidden}
      th{background:#f9f5ff;color:#6b21a8;text-align:left;font-size:12px;letter-spacing:.02em}
      th,td{padding:.6rem .75rem}
    </style>
    <h1>Elçi Liderlik Tablosu</h1>
    <div style="margin:6px 0 16px;color:#6b7280">
      <a href="/">← Ana</a> • <a href="/api/leaderboard">JSON</a>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>İsim</th>
          <th>Kullanıcı</th>
          <th style="text-align:right">Puan</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="4" style="padding:1rem;text-align:center;color:#6b7280">Henüz veri yok.</td></tr>`}</tbody>
    </table>
  `);
});

/* ---------------- Ambassador logs (JSON) ---------------- */
app.get("/api/amb/:id/logs", (req, res) => {
  const { id } = req.params;
  const amb = db.data.ambassadors.find((a) => a.id === id);
  if (!amb) return res.status(404).json({ ok: false, error: "Ambassador not found" });

  const logs = db.data.logs.filter((l) => l.ambassadorId === id).sort((a, b) => a.date.localeCompare(b.date));
  const totalLogs = logs.reduce((s, l) => s + scoreOf(l), 0);
  const adjTotal = sumAdjustments(id);
  const total = totalLogs + adjTotal;

  res.json({ ambassador: amb, logs, total });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AMBA API running on http://127.0.0.1:${PORT}`);
});