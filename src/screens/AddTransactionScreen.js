import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { addTransaction } from '../db/transactions';

const TX_TYPES = [
  { key: 'income', label: 'Income', color: '#388e3c', desc: 'Money received' },
  { key: 'expense', label: 'Expense', color: '#d32f2f', desc: 'Money spent' },
  { key: 'lent', label: 'Lent', color: '#f57c00', desc: 'Gave to someone' },
  { key: 'owe', label: 'Borrowed', color: '#f57c00', desc: 'Took from someone' },
  { key: 'repay_lent', label: 'Got Repaid', color: '#388e3c', desc: 'Someone paid you back' },
  { key: 'repay_owe', label: 'Repaid', color: '#d32f2f', desc: 'You paid back' },
];

export default function AddTransactionScreen({ navigation }) {
  const { accounts, refresh } = useApp();
  const [type, setType] = useState('income');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id);
  const [partyName, setPartyName] = useState('');
  const [note, setNote] = useState('');

  const needsParty = ['lent', 'owe', 'repay_lent', 'repay_owe'].includes(type);

  const onSave = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return Alert.alert('Invalid', 'Enter a valid amount');
    if (!accountId) return Alert.alert('Invalid', 'Select an account');
    if (needsParty && !partyName.trim()) return Alert.alert('Required', 'Enter the person\'s name');

    try {
      await addTransaction({
        type,
        amount: num,
        accountId,
        partyName: partyName.trim() || null,
        note: note.trim() || null,
      });
      await refresh();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Type</Text>
      <View style={styles.typeGrid}>
        {TX_TYPES.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.typeBtn, type === t.key && { backgroundColor: t.color, borderColor: t.color }]}
            onPress={() => setType(t.key)}
          >
            <Text style={[styles.typeBtnLabel, type === t.key && styles.typeBtnLabelActive]}>{t.label}</Text>
            <Text style={[styles.typeBtnDesc, type === t.key && styles.typeBtnLabelActive]}>{t.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Amount (BDT)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
      />

      <Text style={styles.label}>Account</Text>
      <View style={styles.accountList}>
        {accounts.map(a => (
          <TouchableOpacity
            key={a.id}
            style={[styles.accountChip, accountId === a.id && styles.accountChipActive]}
            onPress={() => setAccountId(a.id)}
          >
            <Text style={[styles.accountChipText, accountId === a.id && styles.accountChipTextActive]}>
              {a.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {needsParty && (
        <>
          <Text style={styles.label}>Person's Name</Text>
          <TextInput
            style={styles.input}
            value={partyName}
            onChangeText={setPartyName}
            placeholder="e.g. Sagar"
          />
        </>
      )}

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={note}
        onChangeText={setNote}
        placeholder="Any details..."
        multiline
      />

      <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveBtnText}>Save Transaction</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8, color: '#333' },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { width: '48%', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: 'white' },
  typeBtnLabel: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  typeBtnDesc: { fontSize: 11, color: '#888', marginTop: 2 },
  typeBtnLabelActive: { color: 'white' },
  accountList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  accountChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd' },
  accountChipActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  accountChipText: { fontSize: 13, color: '#333' },
  accountChipTextActive: { color: 'white' },
  saveBtn: { backgroundColor: '#1976d2', marginTop: 24, padding: 16, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
