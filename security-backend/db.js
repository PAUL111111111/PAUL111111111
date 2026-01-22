const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'security.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err); else resolve(this);
    });
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

async function init() {
  // users
  await run(`CREATE TABLE IF NOT EXISTS users (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    username TEXT UNIQUE NOT NULL,\
    password_hash TEXT NOT NULL,\
    created_at TEXT DEFAULT (datetime('now'))\
  )`);

  // login_records
  await run(`CREATE TABLE IF NOT EXISTS login_records (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    user_id INTEGER NOT NULL,\
    timestamp TEXT DEFAULT (datetime('now')),\
    device TEXT,\
    location TEXT,\
    ip_address TEXT,\
    status TEXT,\
    user_agent TEXT,\
    FOREIGN KEY(user_id) REFERENCES users(id)\
  )`);

  // monthly_plans
  await run(`CREATE TABLE IF NOT EXISTS monthly_plans (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    user_id INTEGER NOT NULL,\
    month TEXT NOT NULL,\
    goals TEXT,\
    tasks TEXT,\
    progress REAL DEFAULT 0,\
    notes TEXT,\
    login_count INTEGER DEFAULT 0,\
    updated_at TEXT DEFAULT (datetime('now')),\
    UNIQUE(user_id, month),\
    FOREIGN KEY(user_id) REFERENCES users(id)\
  )`);
}

module.exports = { db, run, get, all, init };