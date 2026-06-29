import { pool } from "./db.js";

const normalized = (query) => String(query).replace(/\s+/g, " ").trim();
const asNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const result = (value) => ({ rowsAffected: value.affectedRows, lastInsertId: value.insertId || undefined });

export async function selectForUser(userId, query, values = []) {
  const sql = normalized(query);
  let statement;
  let params;

  if (sql.startsWith("SELECT * FROM classes ORDER BY")) {
    statement = "SELECT id,title,description,sort_order,created_at,updated_at FROM classes WHERE user_id=? ORDER BY sort_order,id";
    params = [userId];
  } else if (sql.startsWith("SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM classes")) {
    statement = "SELECT COALESCE(MAX(sort_order), -1) + 1 AS max FROM classes WHERE user_id=?";
    params = [userId];
  } else if (sql.startsWith("SELECT * FROM classes WHERE id =")) {
    statement = "SELECT id,title,description,sort_order,created_at,updated_at FROM classes WHERE id=? AND user_id=?";
    params = [asNumber(values[0]), userId];
  } else if (sql === "SELECT class_id FROM lessons") {
    statement = "SELECT class_id FROM lessons WHERE user_id=?";
    params = [userId];
  } else if (sql.startsWith("SELECT * FROM lessons WHERE class_id =")) {
    statement = "SELECT id,class_id,title,video_url,video_type,local_file_path,notes,difficulty,is_favorite,play_count,split_enabled,split_position,split_rotated_side,sort_order,created_at,updated_at FROM lessons WHERE class_id=? AND user_id=? ORDER BY sort_order,id";
    params = [asNumber(values[0]), userId];
  } else if (sql.startsWith("SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM lessons")) {
    statement = "SELECT COALESCE(MAX(sort_order), -1) + 1 AS max FROM lessons WHERE class_id=? AND user_id=?";
    params = [asNumber(values[0]), userId];
  } else if (sql.startsWith("SELECT * FROM lessons WHERE id =")) {
    statement = "SELECT id,class_id,title,video_url,video_type,local_file_path,notes,difficulty,is_favorite,play_count,split_enabled,split_position,split_rotated_side,sort_order,created_at,updated_at FROM lessons WHERE id=? AND user_id=?";
    params = [asNumber(values[0]), userId];
  } else if (sql.startsWith("SELECT * FROM segments WHERE lesson_id =")) {
    statement = "SELECT id,lesson_id,label,start_time,end_time,loop_gap,sort_order,created_at,updated_at FROM segments WHERE lesson_id=? AND user_id=? ORDER BY sort_order,id";
    params = [asNumber(values[0]), userId];
  } else if (sql.startsWith("SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM segments")) {
    statement = "SELECT COALESCE(MAX(sort_order), -1) + 1 AS max FROM segments WHERE lesson_id=? AND user_id=?";
    params = [asNumber(values[0]), userId];
  } else if (sql.includes("FROM study_sessions ss JOIN lessons l")) {
    const startDate = String(values[0]);
    const endDate = values[1] ? String(values[1]) : startDate;
    const classId = values.length > 2 && values[2] !== null ? asNumber(values[2]) : null;
    statement = `SELECT ss.id,ss.lesson_id,ss.segment_id,ss.started_at,ss.ended_at,ss.duration_seconds,
      l.title AS lesson_title,l.class_id,c.title AS class_title
      FROM study_sessions ss JOIN lessons l ON l.id=ss.lesson_id AND l.user_id=ss.user_id
      JOIN classes c ON c.id=l.class_id AND c.user_id=ss.user_id
      WHERE ss.user_id=? AND ss.started_at>=? AND ss.started_at<=?`;
    params = [userId, `${startDate} 00:00:00`, `${endDate} 23:59:59`];
    if (classId !== null) {
      statement += " AND l.class_id=?";
      params.push(classId);
    }
    statement += " ORDER BY ss.started_at DESC";
  } else if (sql.startsWith("SELECT * FROM routine_items ORDER BY")) {
    statement = "SELECT id,title,completed_at,sort_order,created_at,updated_at FROM routine_items WHERE user_id=? ORDER BY sort_order,id";
    params = [userId];
  } else if (sql.startsWith("SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM routine_items")) {
    statement = "SELECT COALESCE(MAX(sort_order), -1) + 1 AS max FROM routine_items WHERE user_id=?";
    params = [userId];
  } else {
    throw Object.assign(new Error("Unsupported data query"), { status: 400 });
  }

  const [rows] = await pool.execute(statement, params);
  if (sql.startsWith("SELECT * FROM lessons")) {
    return rows.map((row) => ({
      ...row,
      is_favorite: Boolean(row.is_favorite),
      split_enabled: Boolean(row.split_enabled),
    }));
  }
  return rows;
}

export async function executeForUser(userId, query, values = []) {
  const sql = normalized(query);
  let statement;
  let params;

  if (sql.startsWith("CREATE TABLE")) return { rowsAffected: 0 };
  if (sql.startsWith("INSERT INTO classes")) {
    statement = "INSERT INTO classes (user_id,title,description,sort_order) VALUES (?,?,?,?)";
    params = [userId, String(values[0]), String(values[1] ?? ""), asNumber(values[2])];
  } else if (sql.startsWith("INSERT INTO lessons")) {
    statement = `INSERT INTO lessons (user_id,class_id,title,video_url,video_type,sort_order)
      SELECT ?,id,?,?,?,? FROM classes WHERE id=? AND user_id=?`;
    params = [userId, String(values[1]), String(values[2]), values[3] === "local" ? "local" : "youtube", asNumber(values[4]), asNumber(values[0]), userId];
  } else if (sql.startsWith("INSERT INTO segments")) {
    statement = `INSERT INTO segments (user_id,lesson_id,label,start_time,end_time,loop_gap,sort_order)
      SELECT ?,id,?,?,?,?,? FROM lessons WHERE id=? AND user_id=?`;
    params = [userId, String(values[1] ?? ""), asNumber(values[2]), asNumber(values[3]), asNumber(values[4]), asNumber(values[5]), asNumber(values[0]), userId];
  } else if (sql.startsWith("INSERT INTO study_sessions")) {
    statement = `INSERT INTO study_sessions (user_id,lesson_id,segment_id,started_at,ended_at,duration_seconds)
      SELECT ?,l.id,?, ?,?,? FROM lessons l
      WHERE l.id=? AND l.user_id=? AND (? IS NULL OR EXISTS (
        SELECT 1 FROM segments s WHERE s.id=? AND s.lesson_id=l.id AND s.user_id=?
      ))`;
    const segmentId = values[1] === null || values[1] === undefined ? null : asNumber(values[1]);
    params = [userId, segmentId, String(values[2]), String(values[3]), asNumber(values[4]), asNumber(values[0]), userId, segmentId, segmentId, userId];
  } else if (sql.startsWith("INSERT INTO routine_items")) {
    statement = "INSERT INTO routine_items (user_id,title,sort_order) VALUES (?,?,?)";
    params = [userId, String(values[0] ?? ""), asNumber(values[1])];
  } else if (sql.startsWith("UPDATE classes SET sort_order")) {
    statement = "UPDATE classes SET sort_order=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [asNumber(values[0]), asNumber(values[1]), userId];
  } else if (sql.startsWith("UPDATE classes SET title")) {
    statement = "UPDATE classes SET title=?,description=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [String(values[0] ?? ""), String(values[1] ?? ""), asNumber(values[2]), userId];
  } else if (sql.startsWith("UPDATE lessons SET sort_order")) {
    statement = "UPDATE lessons SET sort_order=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [asNumber(values[0]), asNumber(values[1]), userId];
  } else if (sql.startsWith("UPDATE lessons SET title")) {
    statement = "UPDATE lessons SET title=?,video_url=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [String(values[0] ?? ""), String(values[1] ?? ""), asNumber(values[2]), userId];
  } else if (sql.startsWith("UPDATE lessons SET notes")) {
    statement = "UPDATE lessons SET notes=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [String(values[0] ?? ""), asNumber(values[1]), userId];
  } else if (sql.startsWith("UPDATE lessons SET difficulty")) {
    statement = "UPDATE lessons SET difficulty=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [Math.max(0, Math.min(5, asNumber(values[0]))), asNumber(values[1]), userId];
  } else if (sql.startsWith("UPDATE lessons SET is_favorite")) {
    statement = "UPDATE lessons SET is_favorite=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [Boolean(values[0]), asNumber(values[1]), userId];
  } else if (sql.startsWith("UPDATE lessons SET play_count")) {
    statement = "UPDATE lessons SET play_count=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [Math.max(0, asNumber(values[0])), asNumber(values[1]), userId];
  } else if (sql.startsWith("UPDATE lessons SET split_enabled")) {
    statement = "UPDATE lessons SET split_enabled=?,split_position=?,split_rotated_side=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [Boolean(values[0]), Math.max(10, Math.min(90, asNumber(values[1], 50))), values[2] === "bottom" ? "bottom" : "top", asNumber(values[3]), userId];
  } else if (sql.startsWith("UPDATE segments SET sort_order")) {
    statement = "UPDATE segments SET sort_order=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [asNumber(values[0]), asNumber(values[1]), userId];
  } else if (sql.startsWith("UPDATE segments SET label")) {
    statement = "UPDATE segments SET label=?,start_time=?,end_time=?,loop_gap=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [String(values[0] ?? ""), asNumber(values[1]), asNumber(values[2]), asNumber(values[3]), asNumber(values[4]), userId];
  } else if (sql.startsWith("UPDATE routine_items SET sort_order")) {
    statement = "UPDATE routine_items SET sort_order=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [asNumber(values[0]), asNumber(values[1]), userId];
  } else if (sql.startsWith("UPDATE routine_items SET completed_at")) {
    statement = "UPDATE routine_items SET completed_at=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [values[0] === null ? null : String(values[0]), asNumber(values[1]), userId];
  } else if (sql.startsWith("UPDATE routine_items SET title")) {
    statement = "UPDATE routine_items SET title=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?";
    params = [String(values[0] ?? ""), asNumber(values[1]), userId];
  } else if (sql.startsWith("DELETE FROM classes")) {
    statement = "DELETE FROM classes WHERE id=? AND user_id=?";
    params = [asNumber(values[0]), userId];
  } else if (sql.startsWith("DELETE FROM lessons")) {
    statement = "DELETE FROM lessons WHERE id=? AND user_id=?";
    params = [asNumber(values[0]), userId];
  } else if (sql.startsWith("DELETE FROM segments")) {
    statement = "DELETE FROM segments WHERE id=? AND user_id=?";
    params = [asNumber(values[0]), userId];
  } else if (sql.startsWith("DELETE FROM routine_items")) {
    statement = "DELETE FROM routine_items WHERE id=? AND user_id=?";
    params = [asNumber(values[0]), userId];
  } else {
    throw Object.assign(new Error("Unsupported data command"), { status: 400 });
  }

  const [dbResult] = await pool.execute(statement, params);
  return result(dbResult);
}
