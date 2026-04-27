# Finance Tracker

Personal finance app — track cash, bank, mobile wallets, lent/owe. With Google Drive auto-sync.

## Quick start (Expo Go — limited features)

```
npm install --legacy-peer-deps
npx expo start
```

Scan QR with Expo Go. Drive auto-sync **will not work** in Expo Go (uses share-sheet manual backup as fallback).

## Full setup (Drive auto-sync)

For automatic Drive backup on every transaction:
1. Read **GOOGLE_DRIVE_SETUP.md**
2. Set up Google Cloud OAuth (~10 min)
3. Build a development APK with EAS (~15 min)
4. Use that APK instead of Expo Go

## Features

- Income, expense, lent, borrowed, repayments
- Cash, bank accounts, mobile wallets (bKash, Nagad, Rocket, custom)
- Real-time balance + lent/owe tracking
- PDF export with charts (pie + bar)
- JSON backup to Drive (auto on transaction, when online)
- Manual share backup (works in Expo Go)
- Daily 9 AM / 9 PM notifications based on positive/negative balance
- Network-aware: queues sync when offline, runs on reconnect

## How auto-sync works

1. You add a transaction
2. Sync triggers after 3 second debounce (so rapid edits coalesce)
3. If online + signed in to Drive → upload immediately
4. If offline → mark "pending"; auto-runs when network returns
5. Each upload **overwrites** the previous backup (single file `finance-backup.json` in Drive's app data folder)

The Drive backup lives in a hidden app folder, invisible from your main Drive UI.
View it at https://drive.google.com → ⚙ Settings → Manage apps → Finance Tracker.

## Project structure

```
src/
  config/google.js       OAuth client IDs (you fill these)
  db/                    SQLite schema and CRUD
  screens/               UI screens
  services/
    drive.js             OAuth + Drive API
    sync.js              Auto-sync orchestrator
    notifications.js     Daily reminders
    export.js            PDF generation
  utils/balance.js       Net worth calculation
  context/AppContext.js  Global state
```

## Build standalone APK

After Google setup is done:

```
eas build --profile preview --platform android
```

Same OAuth credentials work for the release APK.
