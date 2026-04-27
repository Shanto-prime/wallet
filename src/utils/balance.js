import { getTotalAccountBalance } from '../db/accounts';
import { getLentOweSummary } from '../db/transactions';

/**
 * Net worth = total in your accounts + money others owe you - money you owe
 */
export async function calculateNetWorth() {
  const accountTotal = await getTotalAccountBalance();
  const { total_lent, total_owe } = await getLentOweSummary();
  return {
    accountBalance: accountTotal,
    lent: total_lent,
    owe: total_owe,
    netWorth: accountTotal + total_lent - total_owe,
  };
}

export function formatBDT(amount) {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}৳ ${abs.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
