import * as SQLite from 'expo-sqlite';

let db = null;

export async function getDb() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('finance.db');
  await initSchema();
  return db;
}

async function initSchema() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('cash','bank','wallet')),
      name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income','expense','lent','owe','repay_lent','repay_owe')),
      amount REAL NOT NULL,
      account_id INTEGER NOT NULL,
      party_name TEXT,
      note TEXT,
      date INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      lent_total REAL NOT NULL DEFAULT 0,
      owe_total REAL NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);
  `);

  // Seed default accounts on first run
  const existing = await db.getFirstAsync('SELECT COUNT(*) as c FROM accounts');
  if (existing.c === 0) {
    await db.execAsync(`
      INSERT INTO accounts (type, name, balance) VALUES
        ('cash', 'Cash', 0),
        ('bank', 'City Bank', 0),
        ('bank', 'EBL', 0),
        ('bank', 'MTB', 0),
        ('wallet', 'bKash', 0),
        ('wallet', 'Nagad', 0),
        ('wallet', 'Rocket', 0);
    `);
  }
}

export async function resetDb() {
  const d = await getDb();
  await d.execAsync(`
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS parties;
    DROP TABLE IF EXISTS accounts;
  `);
  db = null;
  return getDb();
}
