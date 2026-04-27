import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { formatBDT } from '../utils/balance';

export default function HomeScreen({ navigation }) {
  const { accounts, transactions, netWorth, refresh } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => { refresh(); }, [refresh])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const isPositive = netWorth.netWorth >= 0;
  const recentTx = transactions.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.balanceCard, isPositive ? styles.positive : styles.negative]}>
        <Text style={styles.balanceLabel}>Net Balance</Text>
        <Text style={styles.balanceValue}>{formatBDT(netWorth.netWorth)}</Text>
        <Text style={styles.balanceStatus}>
          {isPositive ? '✓ Positive — keep going!' : '⚠ Negative — earn more'}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <SummaryBox label="In Accounts" value={netWorth.accountBalance} color="#1976d2" />
        <SummaryBox label="Lent (you'll get)" value={netWorth.lent} color="#388e3c" />
        <SummaryBox label="Owe (you'll pay)" value={netWorth.owe} color="#d32f2f" />
      </View>

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('AddTransaction')}
      >
        <Text style={styles.addBtnText}>+ Add Transaction</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Accounts</Text>
      {accounts.map(a => (
        <View key={a.id} style={styles.accountRow}>
          <View style={styles.accountIcon}>
            <Text>{iconFor(a.type)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName}>{a.name}</Text>
            <Text style={styles.accountType}>{a.type.toUpperCase()}</Text>
          </View>
          <Text style={styles.accountBalance}>{formatBDT(a.balance)}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {recentTx.length === 0 ? (
        <Text style={styles.emptyText}>No transactions yet. Add your first one!</Text>
      ) : (
        recentTx.map(t => (
          <View key={t.id} style={styles.txRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txType}>{labelFor(t.type)}</Text>
              <Text style={styles.txMeta}>
                {t.account_name}{t.party_name ? ` · ${t.party_name}` : ''}
              </Text>
            </View>
            <Text style={[styles.txAmount, signColor(t.type)]}>
              {signFor(t.type)}{formatBDT(t.amount)}
            </Text>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function SummaryBox({ label, value, color }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{formatBDT(value)}</Text>
    </View>
  );
}

const iconFor = t => ({ cash: '💵', bank: '🏦', wallet: '📱' }[t] || '💰');
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  balanceCard: { padding: 24, margin: 16, borderRadius: 12, alignItems: 'center' },
  positive: { backgroundColor: '#e8f5e9' },
  negative: { backgroundColor: '#ffebee' },
  balanceLabel: { fontSize: 14, color: '#666' },
  balanceValue: { fontSize: 36, fontWeight: 'bold', marginVertical: 8 },
  balanceStatus: { fontSize: 14, color: '#555' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 8, gap: 8 },
  summaryBox: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: '#666', textAlign: 'center' },
  summaryValue: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  addBtn: { backgroundColor: '#1976d2', margin: 16, padding: 16, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  accountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, marginHorizontal: 16, marginBottom: 4, borderRadius: 6 },
  accountIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  accountName: { fontSize: 14, fontWeight: '500' },
  accountType: { fontSize: 11, color: '#888' },
  accountBalance: { fontSize: 14, fontWeight: '600' },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, marginHorizontal: 16, marginBottom: 4, borderRadius: 6 },
  txType: { fontSize: 14, fontWeight: '500' },
  txMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#888', padding: 16 },
});
