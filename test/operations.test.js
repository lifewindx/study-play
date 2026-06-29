import assert from "node:assert/strict";
import test from "node:test";

process.env.DB_HOST = "test";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";
process.env.DB_NAME = "test";

const { pool } = await import("../server/db.js");
const { executeForUser, selectForUser } = await import("../server/operations.js");

test("class reads are always scoped to the authenticated user", async () => {
  pool.execute = async (statement, params) => {
    assert.match(statement, /WHERE user_id=\?/);
    assert.deepEqual(params, ["user-a"]);
    return [[], []];
  };
  await selectForUser("user-a", "SELECT * FROM classes ORDER BY sort_order, id");
});

test("lesson reads normalize MySQL boolean values", async () => {
  pool.execute = async (_statement, params) => {
    assert.deepEqual(params, [5, "user-a"]);
    return [[{ id: 9, is_favorite: 1, split_enabled: 0 }], []];
  };
  const rows = await selectForUser("user-a", "SELECT * FROM lessons WHERE class_id = $1", [5]);
  assert.equal(rows[0].is_favorite, true);
  assert.equal(rows[0].split_enabled, false);
});

test("updates ignore client-provided SQL and use the server whitelist", async () => {
  pool.execute = async (statement, params) => {
    assert.equal(
      statement,
      "UPDATE lessons SET notes=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?",
    );
    assert.deepEqual(params, ["practice slowly", 12, "user-a"]);
    return [{ affectedRows: 1, insertId: 0 }, []];
  };
  const value = await executeForUser(
    "user-a",
    "UPDATE lessons SET notes = $1, updated_at = datetime('now','localtime') WHERE id = $2",
    ["practice slowly", 12],
  );
  assert.deepEqual(value, { rowsAffected: 1, lastInsertId: undefined });
});

test("unknown operations are rejected", async () => {
  await assert.rejects(
    () => selectForUser("user-a", "SELECT password_hash FROM users"),
    /Unsupported data query/,
  );
});
