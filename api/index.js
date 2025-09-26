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
app.use(cors());

// 413 (Payload Too Large) çözümü: body limit artır
app.use(express.json({ limit: "16mb" }));
app.use(express.urlencoded({ extended: true, limit: "16mb" }));

// LowDB setup
const dbFile = path.join(__dirname, "data", "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { config: { endDate: null }, ambassadors: [], logs: [] });
await db.read();
db.data ||= { config: { endDate: null }, ambassadors: [], logs: [] };

// Helpers
const todayStr = () => new Date().toISOString().slice(0,10);
const scoreOf = (log) => (log.story?100:0) + (log.post?150:0) + (log.product?300:0);

function ensureDayLog(ambassadorId, dateStr) {
  const log = db.data.logs.find(l => l.ambassadorId === ambassadorId && l.date === dateStr);
  if (log) return log;
  const newLog = { id: `${ambassadorId}-${dateStr}`, ambassadorId, date: dateStr, story:false, post:false, product:false };
  db.data.logs.push(newLog);
  return newLog;
}

// Auth
const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";

app.post("/api/login", (req, res) => {
  const { role, username, pin, password } = req.body;

  if (role === "admin") {
    if (password === ADMIN_PASS) return res.json({ ok:true, token:"admin-token", role:"admin" });
    return res.status(401).json({ ok:false, error:"Bad admin password" });
  }

  if (role === "amb") {
    const uname = String(username ?? "").trim().toLowerCase();
    const upin  = String(pin ?? "").trim();

    const amb = db.data.ambassadors.find(a =>
      String(a.username ?? "").trim().toLowerCase() === uname &&
      String(a.pin ?? "").trim() === upin
    );

    if (!amb) return res.status(401).json({ ok:false, error:"Bad credentials" });
    return res.json({ ok:true, token:`amb-${amb.id}`, role:"amb", ambassador: amb });
  }

  res.status(400).json({ ok:false, error:"role must be 'admin' or 'amb'" });
});

// Config
app.get("/api/config", (_req,res)=>{
  res.json({ endDate: db.data.config.endDate });
});
app.post("/api/admin/end-date", async (req,res)=>{
  const { date } = req.body; // ISO string
  db.data.config.endDate = date || null;
  await db.write();
  res.json({ ok:true, endDate: db.data.config.endDate });
});

// Admin list ambassadors + today's statuses
app.get("/api/admin/ambassadors", (req,res)=>{
  const date = (req.query.date || todayStr());
  const list = db.data.ambassadors.map(a=>{
    const log = db.data.logs.find(l => l.ambassadorId===a.id && l.date===date) || {story:false,post:false,product:false};
    return { ...a, today: log };
  });
  res.json(list);
});

// --- Elçi Ekle ---
app.post("/api/admin/ambassador", async (req,res)=>{
  try {
    let { name, username, pin, avatar } = req.body;

    // DEBUG: gelen payload'ı logla
    console.log("GELEN BODY /admin/ambassador:", {
      name,
      username,
      pin,
      avatarType: typeof avatar,
      avatarPrefix: typeof avatar === "string" ? avatar.slice(0, 30) : null,
      avatarLength: typeof avatar === "string" ? avatar.length : null
    });

    name = String(name ?? "").trim();
    username = String(username ?? "").trim();
    pin = String(pin ?? "").trim();
    avatar = typeof avatar === "string" ? avatar.trim() : "";

    if (!name || !username || !pin) {
      return res.status(400).json({ ok:false, error:"İsim, kullanıcı adı ve PIN zorunlu" });
    }
    // kullanıcı adı benzersiz
    if (db.data.ambassadors.some(a => String(a.username ?? "").trim().toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ ok:false, error:"Kullanıcı adı zaten var" });
    }

    const newAmb = {
      id: "a" + Date.now(),
      name,
      username,
      pin,
      avatar: avatar || "" // URL / @handle / data:image;base64 olabilir
    };

    db.data.ambassadors.push(newAmb);
    await db.write();
    res.json({ ok:true, ambassador:newAmb });
  } catch (e) {
    console.error("add ambassador error:", e);
    res.status(500).json({ ok:false, error:"Sunucu hatası" });
  }
});

// --- Elçi Sil ---
app.delete("/api/admin/ambassador/:id", async (req,res)=>{
  try {
    const { id } = req.params;
    const idx = db.data.ambassadors.findIndex(a => a.id === id);
    if (idx < 0) return res.status(404).json({ ok:false, error:"Ambassador not found" });

    const ambId = db.data.ambassadors[idx].id;
    db.data.ambassadors.splice(idx, 1);
    db.data.logs = db.data.logs.filter(l => l.ambassadorId !== ambId);

    await db.write();
    res.json({ ok:true });
  } catch (e) {
    console.error("remove ambassador error:", e);
    res.status(500).json({ ok:false, error:"Sunucu hatası" });
  }
});

// Mark S / P / Ü (gün başına 1)
app.post("/api/admin/mark", async (req,res)=>{
  const { ambassadorId, date, type } = req.body; // type: 'S'|'P'|'U'
  const dateStr = date || todayStr();

  const amb = db.data.ambassadors.find(a=>a.id===ambassadorId);
  if (!amb) return res.status(404).json({ ok:false, error:"Ambassador not found" });

  const log = ensureDayLog(ambassadorId, dateStr);

  if (type === "S") {
    if (log.story) return res.status(409).json({ ok:false, error:"Story already marked for this day" });
    log.story = true;
  } else if (type === "P") {
    if (log.post) return res.status(409).json({ ok:false, error:"Post/Reels already marked for this day" });
    log.post = true;
  } else if (type === "U") {
    if (log.product) return res.status(409).json({ ok:false, error:"Product already marked for this day" });
    log.product = true;
  } else {
    return res.status(400).json({ ok:false, error:"Unknown type" });
  }

  await db.write();
  res.json({ ok:true, log });
});

// UNMARK: S / P / Ü kaldır
app.post("/api/admin/unmark", async (req, res) => {
  const { ambassadorId, date, type } = req.body; // 'S' | 'P' | 'U'
  const dateStr = date || todayStr();

  const amb = db.data.ambassadors.find(a => a.id === ambassadorId);
  if (!amb) return res.status(404).json({ ok:false, error:"Ambassador not found" });

  const log = db.data.logs.find(l => l.ambassadorId === ambassadorId && l.date === dateStr);
  if (!log) return res.status(404).json({ ok:false, error:"Kayıt yok" });

  if (type === "S")      log.story = false;
  else if (type === "P") log.post = false;
  else if (type === "U") log.product = false;
  else return res.status(400).json({ ok:false, error:"Unknown type" });

  await db.write();
  res.json({ ok:true, log });
});

// Leaderboard
app.get("/api/leaderboard", (_req,res)=>{
  const totals = db.data.ambassadors.map(a => {
    const logs = db.data.logs.filter(l => l.ambassadorId === a.id);
    const total = logs.reduce((s,l)=>s+scoreOf(l),0);
    return { ...a, total };
  });
  totals.sort((x,y)=> y.total - x.total);
  res.json(totals);
});

// Ambassador own logs
app.get("/api/amb/:id/logs", (req,res)=>{
  const { id } = req.params;
  const amb = db.data.ambassadors.find(a=>a.id===id);
  if (!amb) return res.status(404).json({ ok:false, error:"Ambassador not found" });

  const logs = db.data.logs
    .filter(l => l.ambassadorId === id)
    .sort((a,b)=> a.date.localeCompare(b.date));

  const total = logs.reduce((s,l)=>s+scoreOf(l),0);
  res.json({ ambassador: amb, logs, total });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=>{
  console.log(`AMBA API running on http://127.0.0.1:${PORT}`);
});