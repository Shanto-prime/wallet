/**
 * Google Drive integration using OAuth 2.0 + Drive REST API.
 *
 * SETUP (one-time):
 * 1. Go to https://console.cloud.google.com
 * 2. Create a project (or use existing)
 * 3. Enable "Google Drive API" under APIs & Services -> Library
 * 4. APIs & Services -> Credentials -> Create Credentials -> OAuth client ID
 *    - Application type: Android
 *    - Package name: com.sohag.financetracker (must match app.json)
 *    - SHA-1 certificate fingerprint: get from `eas credentials` or run:
 *        eas credentials -p android
 *      (Or for testing in dev build, use the debug SHA-1 shown by EAS)
 * 5. Also create an OAuth client of type "Web application":
 *    - Authorized redirect URI: https://auth.expo.io/@your-expo-username/finance-tracker
 *    - Copy the Client ID
 * 6. Paste both client IDs in src/config/google.js
 *
 * The app uses the "appdata" scope so files are stored in a hidden
 * folder only this app can access — invisible from the user's main Drive,
 * but visible at https://drive.google.com under "Settings -> Manage apps".
 */
import * as AuthSession from 'expo-auth-session';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { GOOGLE_OAUTH } from '../config/google';
import { safeQuery, resetDb } from '../db/database';

const TOKEN_KEY = 'googleDriveTokens';
const BACKUP_FILENAME = 'finance-backup.json';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// ============================================================
// AUTH
// ============================================================

function getRedirectUri() {
  // For development build / standalone APK
  return AuthSession.makeRedirectUri({
    scheme: 'financetracker',
    path: 'oauth2redirect',
  });
}

function getClientId() {
  return GOOGLE_OAUTH.androidClientId || GOOGLE_OAUTH.webClientId;
}

export async function isSignedIn() {
  const tokens = await getStoredTokens();
  return !!tokens?.refresh_token;
}

async function getStoredTokens() {
  const json = await AsyncStorage.getItem(TOKEN_KEY);
  return json ? JSON.parse(json) : null;
}

async function storeTokens(tokens) {
  // Merge with existing (refresh_token may not be returned on every refresh)
  const existing = await getStoredTokens();
  const merged = { ...(existing || {}), ...tokens };
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(merged));
}

export async function signOut() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

/**
 * Run the OAuth flow. Returns true if successful.
 * Must be called from a React component (uses async hooks-free flow).
 */
export async function signIn() {
  const clientId = getClientId();
  if (!clientId || clientId.includes('PASTE_')) {
    throw new Error('Google Client ID not configured. See src/config/google.js');
  }

  const redirectUri = getRedirectUri();

  // Build auth request manually (no hooks, callable from anywhere)
  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });

  await request.makeAuthUrlAsync(discovery);
  const result = await request.promptAsync(discovery);

  if (result.type !== 'success') {
    throw new Error(result.type === 'cancel' ? 'Sign-in cancelled' : 'Sign-in failed');
  }

  // Exchange code for tokens
  const tokenResp = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier },
    },
    discovery
  );

  await storeTokens({
    access_token: tokenResp.accessToken,
    refresh_token: tokenResp.refreshToken,
    expires_at: Date.now() + (tokenResp.expiresIn || 3600) * 1000,
  });

  return true;
}

async function getValidAccessToken() {
  const tokens = await getStoredTokens();
  if (!tokens) throw new Error('Not signed in to Google Drive');

  // Token still valid?
  if (tokens.access_token && tokens.expires_at && Date.now() < tokens.expires_at - 60_000) {
    return tokens.access_token;
  }

  // Refresh
  if (!tokens.refresh_token) throw new Error('No refresh token; sign in again');

  const resp = await AuthSession.refreshAsync(
    { clientId: getClientId(), refreshToken: tokens.refresh_token },
    discovery
  );

  await storeTokens({
    access_token: resp.accessToken,
    refresh_token: resp.refreshToken || tokens.refresh_token,
    expires_at: Date.now() + (resp.expiresIn || 3600) * 1000,
  });

  return resp.accessToken;
}

// ============================================================
// DRIVE API
// ============================================================

async function findBackupFileId(accessToken) {
  const res = await fetch(
    `${DRIVE_API}/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&q=name='${BACKUP_FILENAME}'`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const json = await res.json();
  return json.files?.[0]?.id || null;
}

async function uploadBackupFile(accessToken, jsonContent, existingFileId = null) {
  const metadata = {
    name: BACKUP_FILENAME,
    ...(existingFileId ? {} : { parents: ['appDataFolder'] }),
  };

  const boundary = `----FinanceBoundary${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent + '\r\n' +
    `--${boundary}--`;

  const url = existingFileId
    ? `${DRIVE_UPLOAD}/files/${existingFileId}?uploadType=multipart`
    : `${DRIVE_UPLOAD}/files?uploadType=multipart`;

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive upload failed: ${res.status} ${errText.slice(0, 200)}`);
  }
  return res.json();
}

async function downloadBackupFile(accessToken, fileId) {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
  return res.text();
}

// ============================================================
// BACKUP / RESTORE LOGIC
// ============================================================

const BACKUP_VERSION = 1;

async function buildBackupJson() {
  const data = await safeQuery(async db => {
    const accounts = await db.getAllAsync('SELECT * FROM accounts');
    const transactions = await db.getAllAsync('SELECT * FROM transactions');
    const parties = await db.getAllAsync('SELECT * FROM parties');
    return { accounts, transactions, parties };
  });
  return JSON.stringify({
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    ...data,
  }, null, 2);
}

/**
 * Upload current data to Drive. Used by manual button AND auto-sync.
 */
export async function backupToDrive() {
  const token = await getValidAccessToken();
  const json = await buildBackupJson();
  const existingId = await findBackupFileId(token);
  await uploadBackupFile(token, json, existingId);
  await AsyncStorage.setItem('lastDriveBackup', String(Date.now()));
  return true;
}

export async function restoreFromDrive() {
  const token = await getValidAccessToken();
  const fileId = await findBackupFileId(token);
  if (!fileId) throw new Error('No backup found in your Drive');

  const json = await downloadBackupFile(token, fileId);
  const backup = JSON.parse(json);
  if (!backup.version || !backup.accounts) {
    throw new Error('Drive backup file is invalid');
  }

  await resetDb();
  await safeQuery(async db => {
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

export async function getLastBackupTime() {
  const ms = await AsyncStorage.getItem('lastDriveBackup');
  return ms ? new Date(parseInt(ms, 10)) : null;
}

// ============================================================
// SHARE-SHEET FALLBACK (when not signed in or for sharing with people)
// ============================================================

export async function shareBackupFile() {
  const json = await buildBackupJson();
  const dateStr = new Date().toISOString().slice(0, 10);
  const path = `${FileSystem.cacheDirectory}finance-backup-${dateStr}.json`;
  await FileSystem.writeAsStringAsync(path, json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Share or save backup',
    });
  }
  return path;
}

export async function restoreFromBackupFile(filePath) {
  const json = await FileSystem.readAsStringAsync(filePath);
  const backup = JSON.parse(json);
  if (!backup.version || !backup.accounts) throw new Error('Invalid backup file');

  await resetDb();
  await safeQuery(async db => {
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
