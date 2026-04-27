# Google Drive Auto-Sync Setup

This guide walks through enabling automatic Google Drive backup. It's a one-time setup; takes about 10–15 minutes.

## Why is this needed?

Auto-sync needs OAuth 2.0 credentials so your app can talk to Google Drive on your behalf. Expo Go cannot do this — you must build a "development build" of the app (a one-time custom APK that replaces Expo Go for this project).

## Step 1 — Install EAS CLI and log in

In your project folder:

```
npm install -g eas-cli
eas login
```

Use your Expo account. If you don't have one, create at https://expo.dev (free).

## Step 2 — Configure EAS for builds

```
eas build:configure
```

Accept the defaults. This creates `eas.json` in your project.

## Step 3 — Get your SHA-1 certificate fingerprint

You need this for the Google OAuth Android Client.

```
eas credentials
```

When prompted:
- Platform: Android
- Profile: development
- Action: "Set up a new keystore" (first time)

After the keystore is set up, run:

```
eas credentials -p android
```

Pick your project, then "Keystore: Manage everything needed to build your project" → "Download credentials". You'll see a SHA-1 fingerprint like:

```
SHA1 Fingerprint: AB:CD:EF:12:34:56:...
```

**Copy that whole SHA-1 line** — you need it next.

## Step 4 — Create the OAuth Client in Google Cloud Console

1. Go to https://console.cloud.google.com
2. Create a new project (top bar → "Select project" → "New Project"). Name it "Finance Tracker".
3. In the left sidebar: **APIs & Services → Library**
4. Search for "Google Drive API" → click it → click **Enable**
5. Sidebar: **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: Finance Tracker
   - User support email: your email
   - Developer contact: your email
   - Save and continue through scopes (skip), test users (add your own Gmail), back to dashboard
   - **Important**: At the top, the app is in "Testing" status. That's fine — it works, but only for the test users you list. If you only use your own Gmail, leave it in Testing.

6. Sidebar: **APIs & Services → Credentials**
7. Click **+ Create Credentials → OAuth client ID**
   - Application type: **Android**
   - Name: Finance Tracker Android
   - Package name: `com.sohag.financetracker` (must match `app.json` exactly)
   - SHA-1 fingerprint: paste the SHA-1 from Step 3
   - Click Create → copy the **Client ID** (looks like `123456-abc.apps.googleusercontent.com`)

8. Click **+ Create Credentials → OAuth client ID** again
   - Application type: **Web application**
   - Name: Finance Tracker Web (fallback)
   - Authorized redirect URIs: leave empty for now
   - Click Create → copy the **Client ID**

## Step 5 — Paste IDs into the app

Open `src/config/google.js` and replace placeholders:

```js
export const GOOGLE_OAUTH = {
  androidClientId: '123456-abc.apps.googleusercontent.com',  // from Step 4 #7
  webClientId:     '789012-xyz.apps.googleusercontent.com',  // from Step 4 #8
};
```

## Step 6 — Build the development APK

```
eas build --profile development --platform android
```

This takes 10–20 minutes on EAS servers. When done, EAS shows a QR code / URL — scan it on your phone, install the APK.

This APK replaces Expo Go for this project. Install it once; you can keep using `npx expo start` to develop, just open the dev build app instead of Expo Go.

## Step 7 — Run and connect

```
npx expo start --dev-client
```

Open the dev build app → scan QR → app loads. Go to **Settings → Sign in with Google** → grant permissions.

From now on, every time you add or delete a transaction, the app silently uploads a backup to your Drive (in a hidden "App Data" folder you can see at https://drive.google.com → ⚙ → Manage apps).

## Step 8 — Verify it's working

After signing in:
1. Add a test transaction
2. Wait ~5 seconds
3. Open Settings — "Last backup: just now" should appear
4. Open https://drive.google.com → ⚙ Settings → Manage apps → find "Finance Tracker" → it should show "Hidden app data: ~2 KB"

## Troubleshooting

**"Sign-in failed: redirect_uri_mismatch"**
The package name or SHA-1 in Google Console doesn't match your APK. Run `eas credentials` again to re-verify SHA-1.

**"Sign-in failed: access_denied"**
You're not in the Test Users list on the OAuth consent screen. Add your Gmail there.

**"Drive upload failed: 403"**
Drive API not enabled for your Cloud project. Go to APIs & Services → Library and enable it.

**Auto-sync didn't fire after a transaction**
- Check Settings shows "Connected to Drive" and "Auto-sync on changes" is on
- Wait 3 seconds (debounced)
- Check phone is actually online

## Building a release APK (for permanent use)

When ready to install a non-debug version:

```
eas build --profile preview --platform android
```

Same OAuth credentials work. EAS will show you a download link.
