import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { deleteTransaction } from '../db/transactions';
import { formatBDT } from '../utils/balance';
import { format } from 'date-fns';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expense' },
  { key: 'lent', label: 'Lent' },
  { key: 'owe', label: 'Borrowed' },
];

export default function HistoryScreen() {
  const { transactions, refresh } = useApp();
  const [filter, setFilter] = useState('all');

  useFocusEffect(React.useCallback(() => { refresh(); }, [refresh]));

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  const onLongPress = (t) => {
    Alert.alert('Delete', 'Delete this transaction? Account balance will be reverted.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteTransaction(t.id);
        refresh();
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && { color: 'white' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>No transactions</Text>
        ) : (
          filtered.map(t => (
            <TouchableOpacity key={t.id} style={styles.row} onLongPress={() => onLongPress(t)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{labelFor(t.type)}</Text>
                <Text style={styles.meta}>
                  {format(t.date, 'dd MMM yyyy, HH:mm')} · {t.account_name}
                  {t.party_name ? ` · ${t.party_name}` : ''}
                </Text>
                {t.note ? <Text style={styles.note}>{t.note}</Text> : null}
              </View>
              <Text style={[styles.amount, signColor(t.type)]}>
                {signFor(t.type)}{formatBDT(t.amount)}
              </Text>
            </TouchableOpacity>
          ))
        )}
        <Text style={styles.hint}>Long-press to delete</Text>
      </ScrollView>
    </View>
  );
}

const labelFor = t => ({
  income: 'Income', expense: 'Expense',
  lent: 'Lent', owe: 'Borrowed',
  repay_lent: 'Repaid to you', repay_owe: 'You repaid',
}[t] || t);
const signFor = t => ['income', 'owe', 'repay_lent'].includes(t) ? '+' : '−';
const signColor = t => ({
  color: ['income', 'repay_lent'].includes(t) ? '#388e3c'
       : ['expense', 'repay_owe'].includes(t) ? '#d32f2f'
       : '#f57c00'
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', padding: 16 },
  filterRow: { paddingHorizontal: 16, marginBottom: 8, maxHeight: 50 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'white', marginRight: 6, borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  chipText: { fontSize: 13 },
  row: { flexDirection: 'row', backgroundColor: 'white', padding: 12, marginHorizontal: 16, marginVertical: 2, borderRadius: 6 },
  label: { fontSize: 14, fontWeight: '500' },
  meta: { fontSize: 11, color: '#888', marginTop: 2 },
  note: { fontSize: 12, color: '#555', marginTop: 4, fontStyle: 'italic' },
  amount: { fontSize: 14, fontWeight: '600', alignSelf: 'center' },
  empty: { textAlign: 'center', color: '#888', padding: 32 },
  hint: { textAlign: 'center', color: '#888', fontSize: 11, padding: 16 },
});
