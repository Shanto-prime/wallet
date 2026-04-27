import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { calculateNetWorth } from '../utils/balance';

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const POSITIVE_MESSAGES = [
  "Great work — you're in positive balance! Keep saving and earning more.",
  "Positive balance check ✓ Stay consistent and grow it further.",
  "You're doing well financially. Don't lose this momentum!",
  "Healthy balance today. Focus on increasing income.",
];

const NEGATIVE_MESSAGES = [
  "⚠ Negative balance. Time to earn more and cut expenses.",
  "Your balance is below zero. Please review and act today.",
  "Heads up — you're in the red. Plan a way back to positive.",
  "Negative balance alert. Focus on income before more spending.",
];

function pickMessage(positive) {
  const arr = positive ? POSITIVE_MESSAGES : NEGATIVE_MESSAGES;
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function requestNotificationPermission() {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('balance-reminders', {
      name: 'Balance Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  return status === 'granted';
}

/**
 * Schedule two daily notifications at 9 AM and 9 PM that
 * read the current balance and choose an appropriate message.
 *
 * Note: expo-notifications can only schedule a fixed message
 * at trigger-time. To make the message reflect *current* balance,
 * we schedule it with the message computed RIGHT NOW. The notification
 * is reschedled every time the user opens the app, so messages stay fresh.
 */
export async function scheduleNotifications() {
  const granted = await requestNotificationPermission();
  if (!granted) {
    throw new Error('Notification permission not granted. Enable in phone Settings.');
  }

  // Cancel anything previously scheduled
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Get current balance to pick message text
  const balance = await calculateNetWorth();
  const positive = balance.netWorth >= 0;
  const morningMsg = pickMessage(positive);
  const eveningMsg = pickMessage(positive);

  // Daily at 09:00
  await Notifications.scheduleNotificationAsync({
    content: {
      title: positive ? '☀ Good morning — Positive Balance' : '☀ Good morning — Negative Balance',
      body: morningMsg,
      data: { type: 'morning' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9, minute: 0,
    },
  });

  // Daily at 21:00
  await Notifications.scheduleNotificationAsync({
    content: {
      title: positive ? '🌙 Evening — Positive Balance' : '🌙 Evening — Negative Balance',
      body: eveningMsg,
      data: { type: 'evening' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21, minute: 0,
    },
  });

  return true;
}

export async function cancelNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledCount() {
  const list = await Notifications.getAllScheduledNotificationsAsync();
  return list.length;
}

/**
 * Send a notification immediately for testing.
 */
export async function sendTestNotification() {
  const granted = await requestNotificationPermission();
  if (!granted) throw new Error('Permission not granted');
  const balance = await calculateNetWorth();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test — Finance Tracker',
      body: `Current net balance is ${balance.netWorth.toFixed(2)} BDT. ${balance.netWorth >= 0 ? 'Positive!' : 'Negative — earn more.'}`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
}
