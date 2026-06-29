import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const COOKIE_NAME = "studyplay_session";
const SESSION_DAYS = Math.max(1, Number(process.env.SESSION_DAYS || 30));

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function publicUser(row) {
  return { id: row.id, email: row.email };
}

export async function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await pool.execute(
    "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    [tokenHash(token), userId, expiresAt],
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(req, res) {
  const token = req.cookies[COOKIE_NAME];
  if (token) await pool.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [tokenHash(token)]);
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const [rows] = await pool.execute(
      `SELECT u.id, u.email
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
       LIMIT 1`,
      [tokenHash(token)],
    );
    if (!rows[0]) {
      res.clearCookie(COOKIE_NAME, { path: "/" });
      return res.status(401).json({ error: "Session expired" });
    }
    req.user = publicUser(rows[0]);
    next();
  } catch (error) {
    next(error);
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
