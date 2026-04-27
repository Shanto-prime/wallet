import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllAccounts } from '../db/accounts';
import { getAllTransactions } from '../db/transactions';
import { calculateNetWorth } from '../utils/balance';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [netWorth, setNetWorth] = useState({
    accountBalance: 0, lent: 0, owe: 0, netWorth: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [a, t, n] = await Promise.all([
      getAllAccounts(),
      getAllTransactions(),
      calculateNetWorth(),
    ]);
    setAccounts(a);
    setTransactions(t);
    setNetWorth(n);
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  return (
    <AppContext.Provider value={{ accounts, transactions, netWorth, loading, refresh }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
