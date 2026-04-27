import { safeQuery } from './database';
import { adjustBalance } from './accounts';

function balanceDelta(type, amount) {
  switch (type) {
    case 'income':
    case 'owe':
    case 'repay_lent':
      return amount;
    case 'expense':
    case 'lent':
    case 'repay_owe':
      return -amount;
    default:
      throw new Error(`Unknown transaction type: ${type}`);
  }
}

export async function addTransaction({ type, amount, accountId, partyName = null, note = null, date = Date.now() }) {
  if (amount <= 0) throw new Error('Amount must be positive');
  if (!accountId) throw new Error('Account is required');

  await safeQuery(db => db.runAsync(
    `INSERT INTO transactions (type, amount, account_id, party_name, note, date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [type, amount, accountId, partyName, note, date]
  ));

  const delta = balanceDelta(type, amount);
  await adjustBalance(accountId, delta);

  if (partyName && (type === 'lent' || type === 'owe')) {
    await upsertParty(partyName, type, amount);
  } else if (partyName && type === 'repay_lent') {
    await upsertParty(partyName, 'lent', -amount);
  } else if (partyName && type === 'repay_owe') {
    await upsertParty(partyName, 'owe', -amount);
  }
}

async function upsertParty(name, type, amount) {
  return safeQuery(async db => {
    const column = type === 'lent' ? 'lent_total' : 'owe_total';
    const existing = await db.getFirstAsync('SELECT * FROM parties WHERE name = ?', [name]);
    if (existing) {
      await db.runAsync(`UPDATE parties SET ${column} = ${column} + ? WHERE name = ?`, [amount, name]);
    } else {
      const lent = type === 'lent' ? amount : 0;
      const owe = type === 'owe' ? amount : 0;
      await db.runAsync('INSERT INTO parties (name, lent_total, owe_total) VALUES (?, ?, ?)', [name, lent, owe]);
    }
  });
}

export async function deleteTransaction(id) {
  const tx = await safeQuery(db => db.getFirstAsync('SELECT * FROM transactions WHERE id = ?', [id]));
  if (!tx) return;
  const delta = balanceDelta(tx.type, tx.amount);
  await adjustBalance(tx.account_id, -delta);
  await safeQuery(db => db.runAsync('DELETE FROM transactions WHERE id = ?', [id]));
}

export async function getAllTransactions(limit = null) {
  const sql = `
    SELECT t.*, a.name as account_name, a.type as account_type
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    ORDER BY t.date DESC
    ${limit ? 'LIMIT ?' : ''}
  `;
  return safeQuery(db => limit ? db.getAllAsync(sql, [limit]) : db.getAllAsync(sql));
}

export async function getTransactionsByDateRange(startMs, endMs) {
  return safeQuery(db => db.getAllAsync(
    `SELECT t.*, a.name as account_name, a.type as account_type
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     WHERE t.date >= ? AND t.date <= ?
     ORDER BY t.date DESC`,
    [startMs, endMs]
  ));
}

export async function getTransactionsByType(type, limit = null) {
  const sql = `
    SELECT t.*, a.name as account_name, a.type as account_type
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE t.type = ?
    ORDER BY t.date DESC
    ${limit ? 'LIMIT ?' : ''}
  `;
  return safeQuery(db => limit ? db.getAllAsync(sql, [type, limit]) : db.getAllAsync(sql, [type]));
}

export async function getLentOweSummary() {
  return safeQuery(async db => {
    const row = await db.getFirstAsync(`
      SELECT
        COALESCE(SUM(lent_total), 0) as total_lent,
        COALESCE(SUM(owe_total), 0) as total_owe
      FROM parties
    `);
    return row;
  });
}

export async function getAllParties() {
  return safeQuery(db => db.getAllAsync('SELECT * FROM parties ORDER BY name'));
}
