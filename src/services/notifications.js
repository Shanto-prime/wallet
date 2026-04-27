// Daily notification scheduling — full implementation in Step 3
import * as Notifications from 'expo-notifications';

export async function requestPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleNotifications() {
  // Will be implemented in Step 3
  console.log('scheduleNotifications stub');
}

export async function cancelNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
