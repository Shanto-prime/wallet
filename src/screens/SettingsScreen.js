import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetDb } from '../db/database';
import { useApp } from '../context/AppContext';
import { backupToDrive, restoreFromDrive, signInToDrive } from '../services/drive';
import { scheduleNotifications, cancelNotifications } from '../services/notifications';

export default function SettingsScreen() {
  const { refresh } = useApp();
  const [autoBackup, setAutoBackup] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const ab = await AsyncStorage.getItem('autoBackup');
      const ne = await AsyncStorage.getItem('notifEnabled');
      setAutoBackup(ab !== 'false');
      setNotifEnabled(ne !== 'false');
    })();
  }, []);

  const toggleAutoBackup = async (val) => {
    setAutoBackup(val);
    await AsyncStorage.setItem('autoBackup', String(val));
  };

  const toggleNotif = async (val) => {
    setNotifEnabled(val);
    await AsyncStorage.setItem('notifEnabled', String(val));
    if (val) await scheduleNotifications();
    else await cancelNotifications();
  };

  const onBackupNow = async () => {
    try {
      await signInToDrive();
      await backupToDrive();
      Alert.alert('Success', 'Backup uploaded to Google Drive');
    } catch (e) {
      Alert.alert('Backup failed', e.message);
    }
  };

  const onRestore = () => {
    Alert.alert('Restore', 'This will replace all current data with your last backup. Continue?', [
      { text: 'Cancel' },
      { text: 'Restore', style: 'destructive', onPress: async () => {
        try {
          await signInToDrive();
          await restoreFromDrive();
          await refresh();
          Alert.alert('Success', 'Data restored from Google Drive');
        } catch (e) {
          Alert.alert('Restore failed', e.message);
        }
      }},
    ]);
  };

  const onResetAll = () => {
    Alert.alert('Wipe All Data', 'Delete ALL accounts, transactions and parties? This cannot be undone.', [
      { text: 'Cancel' },
      { text: 'Wipe', style: 'destructive', onPress: async () => {
        await resetDb();
        await refresh();
        Alert.alert('Done', 'All data cleared');
      }},
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Section title="Google Drive Backup">
        <View style={styles.row}>
          <Text style={styles.rowText}>Auto backup daily</Text>
          <Switch value={autoBackup} onValueChange={toggleAutoBackup} />
        </View>
        <TouchableOpacity style={styles.btn} onPress={onBackupNow}>
          <Text style={styles.btnText}>Backup Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#f57c00' }]} onPress={onRestore}>
          <Text style={styles.btnText}>Restore from Drive</Text>
        </TouchableOpacity>
      </Section>

      <Section title="Notifications">
        <View style={styles.row}>
          <Text style={styles.rowText}>Daily balance reminders (9 AM & 9 PM)</Text>
          <Switch value={notifEnabled} onValueChange={toggleNotif} />
        </View>
      </Section>

      <Section title="Danger Zone">
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#d32f2f' }]} onPress={onResetAll}>
          <Text style={styles.btnText}>Wipe All Data</Text>
        </TouchableOpacity>
      </Section>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowText: { fontSize: 14, flex: 1 },
  btn: { backgroundColor: '#1976d2', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  btnText: { color: 'white', fontWeight: 'bold' },
});
