import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { exportToPDF, exportToImage } from '../services/export';

const FILTER_OPTIONS = [
  { key: 'last_30_days', label: 'Last 30 days' },
  { key: 'last_10', label: 'Last 10 transactions' },
  { key: 'income_only', label: 'Income only' },
  { key: 'expense_only', label: 'Expense only' },
  { key: 'lent_only', label: 'Lent only' },
  { key: 'owe_only', label: 'Owed only' },
  { key: 'all', label: 'Everything' },
];

export default function ExportScreen() {
  const { transactions, accounts, netWorth } = useApp();
  const [filter, setFilter] = React.useState('last_30_days');

  const onExportPDF = async () => {
    try {
      await exportToPDF({ transactions, accounts, netWorth, filter });
    } catch (e) {
      Alert.alert('Export failed', e.message);
    }
  };

  const onExportImage = async () => {
    try {
      await exportToImage({ transactions, accounts, netWorth, filter });
    } catch (e) {
      Alert.alert('Export failed', e.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Export & Share</Text>
      <Text style={styles.subtitle}>Pick what to include:</Text>

      {FILTER_OPTIONS.map(f => (
        <TouchableOpacity
          key={f.key}
          style={[styles.option, filter === f.key && styles.optionActive]}
          onPress={() => setFilter(f.key)}
        >
          <Text style={[styles.optionText, filter === f.key && { color: 'white' }]}>{f.label}</Text>
        </TouchableOpacity>
      ))}

      <View style={{ marginTop: 24, gap: 12 }}>
        <TouchableOpacity style={styles.btnPrimary} onPress={onExportPDF}>
          <Text style={styles.btnText}>📄 Export as PDF (with charts)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={onExportImage}>
          <Text style={styles.btnText}>🖼  Export as Image</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 16 },
  option: { backgroundColor: 'white', padding: 14, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#ddd' },
  optionActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  optionText: { fontSize: 14 },
  btnPrimary: { backgroundColor: '#d32f2f', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnSecondary: { backgroundColor: '#388e3c', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
