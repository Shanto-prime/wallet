/**
 * Sync orchestrator:
 * - Watches network connectivity
 * - Triggers Drive backup on:
 *     a) Every transaction add/delete (debounced)
 *     b) Network reconnect if there are pending changes
 *     c) Daily timer
 * - Marks "pending" state in AsyncStorage so a missed sync gets retried
 */
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backupToDrive, isSignedIn } from './drive';

const PENDING_KEY = 'pendingDriveSync';
const LAST_KEY = 'lastDriveBackup';
const AUTO_KEY = 'autoBackupEnabled';

let debounceTimer = null;
let isOnline = true;
let listenerInitialized = false;

export function initSyncListener() {
  if (listenerInitialized) return;
  listenerInitialized = true;

  NetInfo.addEventListener(state => {
    const wasOffline = !isOnline;
    isOnline = state.isConnected && state.isInternetReachable !== false;

    // If we just came back online and there's a pending sync, run it
    if (wasOffline && isOnline) {
      retryPendingSync();
    }
  });

  // On startup, retry pending sync
  retryPendingSync();
}

async function retryPendingSync() {
  const pending = await AsyncStorage.getItem(PENDING_KEY);
  if (pending !== '1') return;
  try {
    await runSync();
  } catch {
    // still pending; will retry next time
  }
}

/**
 * Public: trigger sync after a data change. Debounces 3 seconds so
 * rapid edits coalesce into one upload.
 */
export async function triggerSync() {
  // Mark pending immediately so we don't lose the intent
  await AsyncStorage.setItem(PENDING_KEY, '1');

  const enabled = await AsyncStorage.getItem(AUTO_KEY);
  if (enabled === 'false') return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      await runSync();
    } catch (e) {
      // Stay in pending state — will retry on next event
      console.log('[sync] failed, will retry:', e.message);
    }
  }, 3000);
}

async function runSync() {
  if (!isOnline) throw new Error('Offline');
  if (!(await isSignedIn())) throw new Error('Not signed in');
  await backupToDrive();
  await AsyncStorage.removeItem(PENDING_KEY);
  await AsyncStorage.setItem(LAST_KEY, String(Date.now()));
}

/**
 * Public: force an immediate sync, used by manual "Backup Now" button.
 * Bypasses debounce.
 */
export async function syncNow() {
  if (debounceTimer) clearTimeout(debounceTimer);
  await runSync();
}

export async function getSyncStatus() {
  const lastMs = await AsyncStorage.getItem(LAST_KEY);
  const pending = await AsyncStorage.getItem(PENDING_KEY);
  const enabled = await AsyncStorage.getItem(AUTO_KEY);
  return {
    last: lastMs ? new Date(parseInt(lastMs, 10)) : null,
    pending: pending === '1',
    autoEnabled: enabled !== 'false',
    online: isOnline,
  };
}

export async function setAutoSync(enabled) {
  await AsyncStorage.setItem(AUTO_KEY, String(enabled));
}
