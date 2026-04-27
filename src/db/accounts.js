import { safeQuery } from './database';

export async function getAllAccounts() {
  return safeQuery(db => db.getAllAsync('SELECT * FROM accounts ORDER BY type, name'));
}

export async function getAccount(id) {
  return safeQuery(db => db.getFirstAsync('SELECT * FROM accounts WHERE id = ?', [id]));
}

export async function createAccount({ type, name, balance = 0 }) {
  return safeQuery(async db => {
    const result = await db.runAsync(
      'INSERT INTO accounts (type, name, balance) VALUES (?, ?, ?)',
      [type, name, balance]
    );
    return result.lastInsertRowId;
  });
}

export async function updateAccount(id, { name, balance }) {
  return safeQuery(db => db.runAsync(
    'UPDATE accounts SET name = ?, balance = ? WHERE id = ?',
    [name, balance, id]
  ));
}

export async function deleteAccount(id) {
  return safeQuery(db => db.runAsync('DELETE FROM accounts WHERE id = ?', [id]));
}

export async function adjustBalance(accountId, delta) {
  return safeQuery(db => db.runAsync(
    'UPDATE accounts SET balance = balance + ? WHERE id = ?',
    [delta, accountId]
  ));
}

export async function getTotalAccountBalance() {
  return safeQuery(async db => {
    const row = await db.getFirstAsync('SELECT COALESCE(SUM(balance), 0) as total FROM accounts');
    return row.total;
  });
}
