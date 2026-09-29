const path = require('path');
const fs = require('fs');
const { Database, USING } = require('./dbClient');

console.log(`[db] moteur SQLite utilisé : ${USING}`);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'EUR',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('income','expense')),
  color      TEXT NOT NULL DEFAULT '#10b981',
  icon       TEXT NOT NULL DEFAULT '📦',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, name, type)
);

CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount      INTEGER NOT NULL CHECK (amount > 0), -- montant en centimes
  description TEXT NOT NULL DEFAULT '',
  date        TEXT NOT NULL, -- format YYYY-MM-DD
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budgets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month       TEXT NOT NULL, -- format YYYY-MM
  amount      INTEGER NOT NULL CHECK (amount > 0), -- en centimes
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, category_id, month)
);

CREATE TABLE IF NOT EXISTS recurring_rules (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount        INTEGER NOT NULL CHECK (amount > 0), -- en centimes
  description   TEXT NOT NULL DEFAULT '',
  frequency     TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
  start_date    TEXT NOT NULL, -- format YYYY-MM-DD
  next_run_date TEXT NOT NULL, -- prochaine échéance
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  icon           TEXT NOT NULL DEFAULT '🎯',
  color          TEXT NOT NULL DEFAULT '#3b82f6',
  target_amount  INTEGER NOT NULL CHECK (target_amount > 0), -- en centimes
  current_amount INTEGER NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline       TEXT, -- format YYYY-MM-DD, optionnel
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_cat  ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user        ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month     ON budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_recurring_active       ON recurring_rules(active, next_run_date);
CREATE INDEX IF NOT EXISTS idx_goals_user             ON savings_goals(user_id);
`);

module.exports = db;
