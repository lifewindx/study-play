import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const required = [
  "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
  "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "MIGRATION_USERS_JSON",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userPasswords = JSON.parse(process.env.MIGRATION_USERS_JSON);
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  timezone: "Z",
});

async function supabase(path) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) throw new Error(`Supabase ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

async function allRows(table) {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await supabase(`/rest/v1/${table}?select=*&order=id.asc&offset=${offset}&limit=${pageSize}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function allUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const result = await supabase(`/auth/v1/admin/users?page=${page}&per_page=1000`);
    users.push(...result.users);
    if (!result.next_page) return users;
  }
}

function mysqlDate(value) {
  return value ? new Date(value).toISOString().slice(0, 23).replace("T", " ") : null;
}

const tableColumns = {
  classes: ["id", "user_id", "title", "description", "sort_order", "created_at", "updated_at"],
  lessons: ["id", "user_id", "class_id", "title", "video_url", "video_type", "local_file_path", "notes", "difficulty", "is_favorite", "play_count", "split_enabled", "split_position", "split_rotated_side", "sort_order", "created_at", "updated_at"],
  segments: ["id", "user_id", "lesson_id", "label", "start_time", "end_time", "loop_gap", "sort_order", "created_at", "updated_at"],
  study_sessions: ["id", "user_id", "lesson_id", "segment_id", "started_at", "ended_at", "duration_seconds"],
  routine_items: ["id", "user_id", "title", "completed_at", "sort_order", "created_at", "updated_at"],
  routine_completions: ["id", "user_id", "routine_item_id", "routine_date", "completed_at", "created_at"],
};

function valueFor(column, value) {
  if (column.endsWith("_at")) return mysqlDate(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

try {
  const users = await allUsers();
  const missingPasswords = users.filter((user) => user.email && !userPasswords[user.email]);
  if (missingPasswords.length) {
    throw new Error(`MIGRATION_USERS_JSON has no temporary password for: ${missingPasswords.map((user) => user.email).join(", ")}`);
  }

  await connection.beginTransaction();
  for (const user of users) {
    if (!user.email) continue;
    await connection.execute(
      `INSERT INTO users (id,email,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE email=VALUES(email),password_hash=VALUES(password_hash),updated_at=VALUES(updated_at)`,
      [user.id, user.email.toLowerCase(), await bcrypt.hash(userPasswords[user.email], 12), mysqlDate(user.created_at), mysqlDate(user.updated_at || user.created_at)],
    );
  }

  for (const [table, columns] of Object.entries(tableColumns)) {
    const rows = await allRows(table);
    const placeholders = columns.map(() => "?").join(",");
    const updates = columns.filter((column) => column !== "id").map((column) => `${column}=VALUES(${column})`).join(",");
    for (const row of rows) {
      await connection.execute(
        `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
        columns.map((column) => valueFor(column, row[column])),
      );
    }
    console.log(`${table}: ${rows.length} rows`);
  }
  await connection.commit();
  console.log(`Migration complete: ${users.length} users`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
