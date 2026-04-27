import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetDb } from '../db/database';
import { useApp } from '../context/AppContext';
import { backupToCloud, restoreFromBackupFile } from '../services/drive';
import {
  scheduleNotifications, cancelNotifications,
  sendTestNotification, getScheduledCount,
} from '../services/notifications';

export default function SettingsScreen() {
  const { refresh } = useApp();
  const [autoBackup, setAutoBackup] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    (async () => {
      const ab = await AsyncStorage.getItem('autoBackup');
      const ne = await AsyncStorage.getItem('notifEnabled');
      setAutoBackup(ab !== 'false');
      setNotifEnabled(ne !== 'false');
      try {
        setScheduledCount(await getScheduledCount());
      } catch {}
    })();
  }, []);

  const toggleAutoBackup = async (val) => {
    setAutoBackup(val);
    await AsyncStorage.setItem('autoBackup', String(val));
  };

  const toggleNotif = async (val) => {
    setNotifEnabled(val);
    await AsyncStorage.setItem('notifEnabled', String(val));
    try {
      if (val) {
        await scheduleNotifications();
        Alert.alert('Notifications enabled', 'Reminders set for 9 AM and 9 PM daily.');
      } else {
        await cancelNotifications();
      }
      setScheduledCount(await getScheduledCount());
    } catch (e) {
      Alert.alert('Notification error', e.message);
      setNotifEnabled(false);
    }
  };

  const onTestNotif = async () => {
    try {
      await sendTestNotification();
      Alert.alert('Test sent', 'You should see a notification within 2 seconds.');
    } catch (e) {
      Alert.alert('Failed', e.message);
    }
  };

  const onBackupNow = async () => {
    try {
      await backupToCloud();
      // share sheet handles UX; success is implicit
    } catch (e) {
      Alert.alert('Backup failed', e.message);
    }
  };

  const onRestore = () => {
    Alert.alert(
      'Restore from Backup',
      'This will WIPE all current data and replace it with the backup file. Continue?',
      [
        { text: 'Cancel' },
        { text: 'Pick file', style: 'destructive', onPress: async () => {
          try {
            const res = await DocumentPicker.getDocumentAsync({
              type: 'application/json',
              copyToCacheDirectory: true,
            });
            if (res.canceled) return;
            const file = res.assets?.[0];
            if (!file) return;
            const summary = await restoreFromBackupFile(file.uri);
            await refresh();
            Alert.alert(
              'Restored',
              `${summary.accounts} accounts, ${summary.transactions} transactions, ${summary.parties} parties.`
            );
          } catch (e) {
            Alert.alert('Restore failed', e.message);
          }
        }},
      ]
    );
  };

  const onResetAll = () => {
    Alert.alert(
      'Wipe All Data',
      'Delete ALL accounts, transactions and parties? This cannot be undone.',
      [
        { text: 'Cancel' },
        { text: 'Wipe', style: 'destructive', onPress: async () => {
          await resetDb();
          await refresh();
          Alert.alert('Done', 'All data cleared, default accounts restored.');
        }},
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Section title="Backup & Restore">
        <Text style={styles.help}>
          Tap "Backup Now" to export your data as a JSON file, then pick "Save to Drive" from the share menu.
          To restore, tap "Restore" and pick the backup JSON file from your Files / Drive app.
        </Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>Auto-prepare backup daily</Text>
          <Switch value={autoBackup} onValueChange={toggleAutoBackup} />
        </View>
        <TouchableOpacity style={styles.btn} onPress={onBackupNow}>
          <Text style={styles.btnText}>Backup Now (Save to Drive)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#f57c00' }]} onPress={onRestore}>
          <Text style={styles.btnText}>Restore from File</Text>
        </TouchableOpacity>
      </Section>

      <Section title="Notifications">
        <Text style={styles.help}>
          Daily reminders at 9 AM and 9 PM. Message changes based on whether your balance is positive or negative.
        </Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>Daily balance reminders</Text>
          <Switch value={notifEnabled} onValueChange={toggleNotif} />
        </View>
        <Text style={styles.smallNote}>
          {scheduledCount} scheduled
        </Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#388e3c' }]} onPress={onTestNotif}>
          <Text style={styles.btnText}>Send Test Notification</Text>
        </TouchableOpacity>
      </Section>

      <Section title="Danger Zone">
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#d32f2f' }]} onPress={onResetAll}>
          <Text style={styles.btnText}>Wipe All Data</Text>
        </TouchableOpacity>
      </Section>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  section: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 12 },
  help: { fontSize: 12, color: '#777', marginBottom: 12, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowText: { fontSize: 14, flex: 1 },
  smallNote: { fontSize: 11, color: '#888', marginVertical: 4 },
  btn: { backgroundColor: '#1976d2', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  btnText: { color: 'white', fontWeight: 'bold' },
});
