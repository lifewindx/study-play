import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { pool, withTransaction } from "./db.js";
import {
  createSession,
  destroySession,
  hashPassword,
  publicUser,
  requireAuth,
  verifyPassword,
} from "./auth.js";
import { executeForUser, selectForUser } from "./operations.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());

app.use("/api/auth", rateLimit({
  windowMs: 15 * 60_000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
}));

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: "Password must be 8–128 characters" });
    }
    const passwordHash = await hashPassword(password);
    const id = crypto.randomUUID();
    await pool.execute("INSERT INTO users (id,email,password_hash) VALUES (?,?,?)", [id, email, passwordHash]);
    await createSession(res, id);
    res.status(201).json({ user: { id, email } });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "An account with this email already exists" });
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const [rows] = await pool.execute("SELECT id,email,password_hash FROM users WHERE email=? LIMIT 1", [email]);
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }
    await createSession(res, user.id);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    await destroySession(req, res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/session", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.put("/api/auth/password", requireAuth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: "Password must be 8–128 characters" });
    }
    const [rows] = await pool.execute("SELECT password_hash FROM users WHERE id=?", [req.user.id]);
    if (!rows[0] || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    await pool.execute("UPDATE users SET password_hash=?,updated_at=UTC_TIMESTAMP() WHERE id=?", [
      await hashPassword(newPassword),
      req.user.id,
    ]);
    await pool.execute("DELETE FROM auth_sessions WHERE user_id=?", [req.user.id]);
    await createSession(res, req.user.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/db/select", requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await selectForUser(req.user.id, req.body.query, req.body.bindValues) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/db/execute", requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await executeForUser(req.user.id, req.body.query, req.body.bindValues) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/segments/ensure-all", requireAuth, async (req, res, next) => {
  try {
    const lessonIds = [...new Set((req.body.lessonIds || []).map(Number).filter(Number.isFinite))];
    if (lessonIds.length === 0) return res.json({ count: 0 });
    const placeholders = lessonIds.map(() => "?").join(",");
    const [result] = await pool.execute(
      `INSERT IGNORE INTO segments (user_id,lesson_id,label,start_time,end_time,loop_gap,sort_order)
       SELECT ?,l.id,'All',0,0,0,COALESCE(MIN(s.sort_order)-1,0)
       FROM lessons l LEFT JOIN segments s ON s.lesson_id=l.id
       WHERE l.user_id=? AND l.id IN (${placeholders})
       GROUP BY l.id`,
      [req.user.id, req.user.id, ...lessonIds],
    );
    res.json({ count: result.affectedRows });
  } catch (error) {
    next(error);
  }
});

app.put("/api/routines/:id/completion", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const completedAt = new Date(req.body.completedAt);
    const routineDate = String(req.body.routineDate);
    const [result] = await pool.execute(
      `INSERT INTO routine_completions (user_id,routine_item_id,routine_date,completed_at)
       SELECT ?,id,?,? FROM routine_items WHERE id=? AND user_id=?
       ON DUPLICATE KEY UPDATE completed_at=VALUES(completed_at)`,
      [req.user.id, routineDate, completedAt, id, req.user.id],
    );
    res.json({ rowsAffected: result.affectedRows });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/routines/:id/completion", requireAuth, async (req, res, next) => {
  try {
    await pool.execute(
      "DELETE FROM routine_completions WHERE routine_item_id=? AND routine_date=? AND user_id=?",
      [Number(req.params.id), String(req.query.date), req.user.id],
    );
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/routines/completion-counts", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT routine_date,COUNT(*) AS count FROM routine_completions
       WHERE user_id=? AND routine_date BETWEEN ? AND ? GROUP BY routine_date`,
      [req.user.id, String(req.query.start), String(req.query.end)],
    );
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/account/data", requireAuth, async (req, res, next) => {
  try {
    await withTransaction(async (connection) => {
      await connection.execute("DELETE FROM users WHERE id=?", [req.user.id]);
    });
    res.clearCookie("studyplay_session", { path: "/" });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.delete("/api/study-history", requireAuth, async (req, res, next) => {
  try {
    await pool.execute("DELETE FROM study_sessions WHERE user_id=?", [req.user.id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use(express.static(path.join(root, "dist")));
app.get("/{*path}", (_req, res) => res.sendFile(path.join(root, "dist", "index.html")));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : "Internal server error" });
});

app.listen(port, () => console.log(`StudyPlay listening on port ${port}`));
