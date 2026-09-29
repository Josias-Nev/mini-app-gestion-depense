/**
 * Couche d'accès SQLite.
 *
 * Utilise `better-sqlite3` quand il est disponible (binaire natif),
 * sinon bascule sur le module embarqué `node:sqlite` (Node >= 22.5).
 * Les deux exposent la même petite API utilisée par l'application :
 *   new Db(path) · pragma(str) · exec(sql) · prepare(sql) · transaction(fn)
 */

let BetterSqlite3 = null;
try {
  // eslint-disable-next-line global-require
  BetterSqlite3 = require('better-sqlite3');
} catch {
  BetterSqlite3 = null;
}

let NodeSqlite = null;
if (!BetterSqlite3) {
  try {
    // eslint-disable-next-line global-require
    NodeSqlite = require('node:sqlite');
  } catch {
    NodeSqlite = null;
  }
}

if (!BetterSqlite3 && !NodeSqlite) {
  throw new Error(
    "Aucun moteur SQLite disponible : installez 'better-sqlite3' ou utilisez Node >= 22.5."
  );
}

const USING = BetterSqlite3 ? 'better-sqlite3' : 'node:sqlite';

function normalizeInfo(info) {
  return {
    changes: Number(info.changes ?? 0),
    lastInsertRowid: Number(info.lastInsertRowid ?? 0),
  };
}

class Database {
  constructor(file) {
    this.isNodeSqlite = !BetterSqlite3;
    this.db = this.isNodeSqlite ? new NodeSqlite.DatabaseSync(file) : new BetterSqlite3(file);
  }

  pragma(statement) {
    if (this.isNodeSqlite) this.db.exec(`PRAGMA ${statement}`);
    else this.db.pragma(statement);
  }

  exec(sql) {
    this.db.exec(sql);
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);
    if (!this.isNodeSqlite) return stmt;
    // Harmonise la valeur de retour de run() avec better-sqlite3
    return {
      run: (...params) => normalizeInfo(stmt.run(...params)),
      get: (...params) => stmt.get(...params),
      all: (...params) => stmt.all(...params),
    };
  }

  transaction(fn) {
    if (!this.isNodeSqlite) return this.db.transaction(fn);
    return (...args) => {
      this.db.exec('BEGIN');
      try {
        const result = fn(...args);
        this.db.exec('COMMIT');
        return result;
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    };
  }

  close() {
    this.db.close();
  }
}

module.exports = { Database, USING };
