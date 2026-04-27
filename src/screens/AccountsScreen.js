import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { createAccount, deleteAccount } from '../db/accounts';
import { formatBDT } from '../utils/balance';

export default function AccountsScreen() {
  const { accounts, refresh } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState('bank');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');

  useFocusEffect(React.useCallback(() => { refresh(); }, [refresh]));

  const onAdd = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Account name needed');
    await createAccount({ type, name: name.trim(), balance: parseFloat(balance) || 0 });
    setName(''); setBalance('0'); setModalOpen(false);
    refresh();
  };

  const onDelete = (a) => {
    Alert.alert('Delete Account', `Delete "${a.name}"? All its transactions will also be removed.`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteAccount(a.id); refresh(); } },
    ]);
  };

  const grouped = {
    cash: accounts.filter(a => a.type === 'cash'),
    bank: accounts.filter(a => a.type === 'bank'),
    wallet: accounts.filter(a => a.type === 'wallet'),
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accounts</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {Object.entries(grouped).map(([groupType, list]) => (
          list.length > 0 && (
            <View key={groupType}>
              <Text style={styles.groupTitle}>{groupType.toUpperCase()}</Text>
              {list.map(a => (
                <TouchableOpacity key={a.id} style={styles.row} onLongPress={() => onDelete(a)}>
                  <Text style={styles.name}>{a.name}</Text>
                  <Text style={styles.balance}>{formatBDT(a.balance)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        ))}
        <Text style={styles.hint}>Long-press to delete an account</Text>
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Account</Text>
            <View style={styles.typeRow}>
              {['cash', 'bank', 'wallet'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, type === t && styles.typeChipActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeChipText, type === t && { color: 'white' }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
            <TextInput
              style={styles.input}
              placeholder="Initial balance"
              value={balance}
              onChangeText={setBalance}
              keyboardType="decimal-pad"
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#888' }]} onPress={() => setModalOpen(false)}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#1976d2' }]} onPress={onAdd}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#1976d2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  groupTitle: { fontSize: 12, fontWeight: 'bold', color: '#888', marginHorizontal: 16, marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 14, marginHorizontal: 16, marginVertical: 2, borderRadius: 6 },
  name: { fontSize: 15 },
  balance: { fontSize: 15, fontWeight: '600' },
  hint: { textAlign: 'center', color: '#888', fontSize: 12, marginTop: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#ddd' },
  typeChipActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  typeChipText: { textTransform: 'capitalize' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 8 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
});
