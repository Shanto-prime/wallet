import { getDb } from './database';

export async function getAllAccounts() {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM accounts ORDER BY type, name');
}

export async function getAccount(id) {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM accounts WHERE id = ?', [id]);
}

export async function createAccount({ type, name, balance = 0 }) {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO accounts (type, name, balance) VALUES (?, ?, ?)',
    [type, name, balance]
  );
  return result.lastInsertRowId;
}

export async function updateAccount(id, { name, balance }) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE accounts SET name = ?, balance = ? WHERE id = ?',
    [name, balance, id]
  );
}

export async function deleteAccount(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
}

export async function adjustBalance(accountId, delta) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE accounts SET balance = balance + ? WHERE id = ?',
    [delta, accountId]
  );
}

export async function getTotalAccountBalance() {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT COALESCE(SUM(balance), 0) as total FROM accounts');
  return row.total;
}
