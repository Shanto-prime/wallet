# Finance Tracker

Personal finance app — track cash, bank, mobile wallets, lent/owe. Local-first with backup-to-anywhere.

## Setup

1. Install Node.js v20+ from https://nodejs.org
2. In project folder, run:
   ```
   npm install --legacy-peer-deps
   ```
3. Start dev server:
   ```
   npx expo start
   ```
4. Scan QR with Expo Go app on Android.

## Features

- **Tracking**: cash, bank accounts, mobile wallets (bKash, Nagad, Rocket), with custom accounts
- **Transactions**: income, expense, lent, borrowed, repayments
- **Auto balance calculation**: real-time, including lent/owe net worth
- **History**: filterable list with delete
- **Export**: PDF report with charts (pie + bar) for filtered periods
- **Backup**: JSON export via system share sheet — save to Drive, email, or anywhere
- **Restore**: from backup JSON file
- **Notifications**: daily 9 AM and 9 PM reminders with positive/negative-aware messages

## How backup to Google Drive works

1. Settings → Backup Now
2. Android share sheet appears
3. Pick "Save to Drive" (or any other destination)
4. File `finance-backup-YYYY-MM-DD.json` is uploaded

To restore: Settings → Restore → pick the JSON file from Drive (open Drive app, tap Download, then in Settings → Restore browse to it).

## How notifications work

Toggle on in Settings → Notifications. Two notifications scheduled per day:
- 9:00 AM and 9:00 PM
- Message text reflects balance state at the time you toggled — re-toggle or open the Settings tab to refresh messages with current balance.

## Build standalone APK (later)

When you're ready to make a permanent install on your phone:
```
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

## Project structure

```
src/
  db/           SQLite schema and CRUD
  screens/      Home, AddTransaction, Accounts, History, Export, Settings
  services/     drive (backup), notifications, export (PDF)
  utils/        balance calculation
  context/      Global app state
```

## Upgrading to true Drive auto-sync (optional, advanced)

The current backup uses Android's share sheet, which works in Expo Go.

For automatic Drive sync without picking from share sheet, you need:
1. Create OAuth 2.0 client in Google Cloud Console
2. Add `expo-dev-client` package
3. Build a development client APK (replaces Expo Go for your project)
4. Use `expo-auth-session` with your OAuth client ID

Ask if you want this — it's a separate ~30 min setup.
