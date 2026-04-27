/**
 * Backup strategy:
 * - Export entire DB content to a JSON file
 * - Open Android share sheet so user picks "Save to Drive" / Gmail / WhatsApp etc.
 * - For restore: read JSON file from device and re-insert all data
 *
 * This works in Expo Go without OAuth setup. To save to Drive, the user
 * just picks "Save to Drive" from the share menu (works only if the
 * Google Drive app is installed, which it is by default on Android).
 *
 * For true automatic Drive sync (without share sheet), an OAuth setup
 * is required which needs a development build (expo-dev-client) — not Expo Go.
 * See README for that upgrade path.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { safeQuery, resetDb } from '../db/database';

const BACKUP_VERSION = 1;

export async function exportBackupJson() {
  const data = await safeQuery(async db => {
    const accounts = await db.getAllAsync('SELECT * FROM accounts');
    const transactions = await db.getAllAsync('SELECT * FROM transactions');
    const parties = await db.getAllAsync('SELECT * FROM parties');
    return { accounts, transactions, parties };
  });

  const backup = {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    ...data,
  };

  const json = JSON.stringify(backup, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const path = `${FileSystem.cacheDirectory}finance-backup-${dateStr}.json`;
  await FileSystem.writeAsStringAsync(path, json);
  return path;
}

/**
 * Generate a backup file and open the share sheet so user can save it
 * to Google Drive, email, WhatsApp, or any cloud service.
 */
export async function backupToCloud() {
  const path = await exportBackupJson();
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Save backup — pick Google Drive or any service',
    });
  } else {
    throw new Error('Sharing not available on this device');
  }
  return path;
}

/**
 * Read a backup JSON file from device and restore all data.
 * User picks the file from Files app or downloads it from Drive first.
 */
export async function restoreFromBackupFile(filePath) {
  const json = await FileSystem.readAsStringAsync(filePath);
  let backup;
  try {
    backup = JSON.parse(json);
  } catch {
    throw new Error('Selected file is not a valid backup');
  }
  if (!backup.version || !backup.accounts) {
    throw new Error('File is not a Finance Tracker backup');
  }

  // Wipe and recreate
  await resetDb();

  await safeQuery(async db => {
    // Insert accounts (preserve IDs so transactions still link)
    for (const a of backup.accounts) {
      await db.runAsync(
        'INSERT INTO accounts (id, type, name, balance, created_at) VALUES (?, ?, ?, ?, ?)',
        [a.id, a.type, a.name, a.balance, a.created_at]
      );
    }
    for (const t of backup.transactions || []) {
      await db.runAsync(
        `INSERT INTO transactions (id, type, amount, account_id, party_name, note, date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.type, t.amount, t.account_id, t.party_name, t.note, t.date, t.created_at]
      );
    }
    for (const p of backup.parties || []) {
      await db.runAsync(
        'INSERT INTO parties (id, name, lent_total, owe_total) VALUES (?, ?, ?, ?)',
        [p.id, p.name, p.lent_total, p.owe_total]
      );
    }
  });

  return {
    accounts: backup.accounts.length,
    transactions: (backup.transactions || []).length,
    parties: (backup.parties || []).length,
  };
}

/**
 * Auto backup: silently writes a backup JSON to cache directory.
 * Called on app start if last backup was over 24h ago. The user still
 * needs to manually share to Drive periodically — we just keep the
 * latest file ready in cache so they can grab it any time.
 */
export async function autoBackupIfNeeded() {
  const lastKey = 'lastAutoBackup';
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const last = await AsyncStorage.getItem(lastKey);
  const lastMs = last ? parseInt(last, 10) : 0;
  const now = Date.now();
  if (now - lastMs < 24 * 60 * 60 * 1000) return false;

  await exportBackupJson();
  await AsyncStorage.setItem(lastKey, String(now));
  return true;
}
