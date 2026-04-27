import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetDb } from '../db/database';
import { useApp } from '../context/AppContext';
import {
  signIn, signOut, isSignedIn, restoreFromDrive,
  shareBackupFile, restoreFromBackupFile,
} from '../services/drive';
import { syncNow, getSyncStatus, setAutoSync } from '../services/sync';
import {
  scheduleNotifications, cancelNotifications,
  sendTestNotification, getScheduledCount,
} from '../services/notifications';

export default function SettingsScreen() {
  const { refresh } = useApp();
  const [autoBackup, setAutoBackup] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const ne = await AsyncStorage.getItem('notifEnabled');
    setNotifEnabled(ne !== 'false');
    setSignedIn(await isSignedIn());
    const status = await getSyncStatus();
    setSyncStatus(status);
    setAutoBackup(status.autoEnabled);
    try { setScheduledCount(await getScheduledCount()); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onSignIn = async () => {
    setBusy(true);
    try {
      await signIn();
      await reload();
      Alert.alert('Connected', 'Google Drive connected. Auto-sync is active.');
    } catch (e) {
      Alert.alert('Sign-in failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = () => {
    Alert.alert('Disconnect Drive?', 'You can sign in again any time.', [
      { text: 'Cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => {
        await signOut();
        await reload();
      }},
    ]);
  };

  const onBackupNow = async () => {
    setBusy(true);
    try {
      await syncNow();
      await reload();
      Alert.alert('Backed up', 'Latest data uploaded to Google Drive.');
    } catch (e) {
      Alert.alert('Backup failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const onRestoreFromDrive = () => {
    Alert.alert('Restore from Drive?', 'This wipes current data and replaces with the latest Drive backup.', [
      { text: 'Cancel' },
      { text: 'Restore', style: 'destructive', onPress: async () => {
        setBusy(true);
        try {
          const summary = await restoreFromDrive();
          await refresh();
          await reload();
          Alert.alert('Restored', `${summary.accounts} accounts, ${summary.transactions} transactions.`);
        } catch (e) {
          Alert.alert('Restore failed', e.message);
        } finally {
          setBusy(false);
        }
      }},
    ]);
  };

  const toggleAutoBackup = async (val) => {
    setAutoBackup(val);
    await setAutoSync(val);
  };

  const onShareBackup = async () => {
    try {
      await shareBackupFile();
    } catch (e) {
      Alert.alert('Share failed', e.message);
    }
  };

  const onRestoreFromFile = () => {
    Alert.alert('Restore from File?', 'This wipes current data. Continue?', [
      { text: 'Cancel' },
      { text: 'Pick file', style: 'destructive', onPress: async () => {
        try {
          const res = await DocumentPicker.getDocumentAsync({
            type: 'application/json', copyToCacheDirectory: true,
          });
          if (res.canceled) return;
          const file = res.assets?.[0];
          if (!file) return;
          const summary = await restoreFromBackupFile(file.uri);
          await refresh();
          Alert.alert('Restored', `${summary.accounts} accounts, ${summary.transactions} transactions.`);
        } catch (e) {
          Alert.alert('Restore failed', e.message);
        }
      }},
    ]);
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
      Alert.alert('Test sent', 'Notification will appear in 2 seconds.');
    } catch (e) {
      Alert.alert('Failed', e.message);
    }
  };

  const onResetAll = () => {
    Alert.alert('Wipe All Data', 'Delete ALL local data? Drive backup is unaffected.', [
      { text: 'Cancel' },
      { text: 'Wipe', style: 'destructive', onPress: async () => {
        await resetDb();
        await refresh();
        Alert.alert('Done', 'Local data cleared.');
      }},
    ]);
  };

  const lastBackupText = syncStatus?.last
    ? formatRelative(syncStatus.last)
    : 'Never';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Section title="Google Drive Sync">
        {!signedIn ? (
          <>
            <Text style={styles.help}>
              Connect Google Drive to enable automatic backup. Your data syncs whenever you add a transaction (when online).
            </Text>
            <TouchableOpacity style={styles.btn} onPress={onSignIn} disabled={busy}>
              <Ionicons name="logo-google" size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>{busy ? 'Connecting…' : 'Sign in with Google'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.statusBox}>
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={18} color="#388e3c" />
                <Text style={styles.statusText}>Connected to Drive</Text>
              </View>
              <Text style={styles.statusSub}>Last backup: {lastBackupText}</Text>
              {syncStatus?.pending && (
                <Text style={[styles.statusSub, { color: '#f57c00' }]}>
                  ⏳ Pending sync — will retry when online
                </Text>
              )}
              {!syncStatus?.online && (
                <Text style={[styles.statusSub, { color: '#d32f2f' }]}>📡 Offline</Text>
              )}
            </View>

            <View style={styles.row}>
              <Text style={styles.rowText}>Auto-sync on changes</Text>
              <Switch value={autoBackup} onValueChange={toggleAutoBackup} />
            </View>

            <TouchableOpacity style={styles.btn} onPress={onBackupNow} disabled={busy}>
              <Ionicons name="cloud-upload" size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>{busy ? 'Backing up…' : 'Backup Now'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, { backgroundColor: '#f57c00' }]} onPress={onRestoreFromDrive} disabled={busy}>
              <Ionicons name="cloud-download" size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>Restore from Drive</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, { backgroundColor: '#666' }]} onPress={onSignOut}>
              <Text style={styles.btnText}>Disconnect</Text>
            </TouchableOpacity>
          </>
        )}
      </Section>

      <Section title="Manual Backup (Share)">
        <Text style={styles.help}>
          Export a JSON file you can share via WhatsApp, email, or save anywhere.
        </Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#388e3c' }]} onPress={onShareBackup}>
          <Ionicons name="share-social" size={18} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.btnText}>Share Backup File</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#7b1fa2' }]} onPress={onRestoreFromFile}>
          <Ionicons name="document" size={18} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.btnText}>Restore from JSON File</Text>
        </TouchableOpacity>
      </Section>

      <Section title="Notifications">
        <Text style={styles.help}>
          Daily reminders at 9 AM and 9 PM with messages based on your balance.
        </Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>Daily balance reminders</Text>
          <Switch value={notifEnabled} onValueChange={toggleNotif} />
        </View>
        <Text style={styles.smallNote}>{scheduledCount} scheduled</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#388e3c' }]} onPress={onTestNotif}>
          <Ionicons name="notifications" size={18} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.btnText}>Send Test Notification</Text>
        </TouchableOpacity>
      </Section>

      <Section title="Danger Zone">
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#d32f2f' }]} onPress={onResetAll}>
          <Ionicons name="trash" size={18} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.btnText}>Wipe Local Data</Text>
        </TouchableOpacity>
      </Section>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function formatRelative(date) {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString();
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
  btn: { backgroundColor: '#1976d2', padding: 12, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { color: 'white', fontWeight: 'bold' },
  statusBox: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 6, marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 14, fontWeight: '600', color: '#333' },
  statusSub: { fontSize: 12, color: '#666', marginTop: 4 },
});
