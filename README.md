# Personal Finance Tracker

A local-first personal finance app for Android with Google Drive backup.

## Features

- Track cash, bank accounts, mobile wallets
- Record income, expense, lent, owe transactions
- Real-time balance calculation
- Daily motivational/warning notifications based on balance
- Auto + manual Google Drive backup
- Export as PDF (with charts) or image
- Filter exports: last 30 days, last 10 transactions, income only, expense only, etc.

## Setup (one-time)

### 1. Install Node.js

Download from https://nodejs.org (LTS version, v20+).

### 2. Install Expo CLI globally

```bash
npm install -g expo-cli eas-cli
```

### 3. Install Expo Go on your Android phone

Get it from Play Store. This lets you test the app live without building an APK.

### 4. Install project dependencies

From the project folder:

```bash
npm install
```

### 5. Run the app

```bash
npx expo start
```

Scan the QR code with Expo Go app on your phone. The app will load.

## Project structure

```
src/
  db/           SQLite setup and queries
  screens/      App screens (Home, AddTransaction, etc.)
  components/   Reusable UI pieces
  services/     Drive backup, notifications, export
  utils/        Helpers (balance calc, date formatting)
  context/      Global app state
```

## Build APK for permanent install

After development is done:

```bash
eas build --platform android --profile preview
```

This gives you a downloadable APK.

## Google Drive setup

See `docs/google-drive-setup.md` for steps to create OAuth credentials.
This is needed before backup will work.
=======
