/**
 * Google OAuth credentials — paste your Client IDs here after setup.
 *
 * See GOOGLE_DRIVE_SETUP.md in project root for the step-by-step.
 *
 * For a development build (which you will use), the Android client ID
 * is what gets used. The web client ID is a fallback / for browser tests.
 */
export const GOOGLE_OAUTH = {
  // Created in Google Cloud Console as type "Android"
  // Required: package name = com.sohag.financetracker, SHA-1 fingerprint of your dev/prod keystore
  androidClientId: 'PASTE_ANDROID_CLIENT_ID_HERE.apps.googleusercontent.com',

  // Created in Google Cloud Console as type "Web application"
  webClientId: 'PASTE_WEB_CLIENT_ID_HERE.apps.googleusercontent.com',
};
