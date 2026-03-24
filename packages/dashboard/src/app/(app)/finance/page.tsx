'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn, formatDate } from '@/lib/utils';

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function FinancePage() {
  const transactions = useQuery(api.finance.listTransactions, {});
  const netWorthData = useQuery(api.finance.listNetWorth, { latest: true });

  if (transactions === undefined && netWorthData === undefined) {
    return <div className="text-text-muted">Loading...</div>;
  }

  const txList = transactions ?? [];
  const netWorth = netWorthData?.[0] ?? null;

  // Compute max absolute value for breakdown bar scaling
  const breakdownEntries = netWorth
    ? Object.entries(netWorth.breakdown ?? {}).sort(([, a], [, b]) => (b as number) - (a as number))
    : [];
  const maxAbsValue = breakdownEntries.reduce(
    (max, [, v]) => Math.max(max, Math.abs(v as number)),
    1,
  );

  return (
    <div className="max-w-none space-y-8">
      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight text-text">Finance</h1>

      {/* Net Worth */}
      {netWorth ? (
        <div className="border border-border p-8">
          <div className="mb-8">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Net Worth</p>
            <p className="text-5xl font-bold text-text tracking-tight">
              {formatCurrency(netWorth.total)}
            </p>
            <p className="text-xs text-text-muted mt-2 font-mono">
              As of {formatDate(netWorth.date)}
            </p>
          </div>

          {/* Breakdown bars */}
          {breakdownEntries.length > 0 && (
            <div className="space-y-4">
              {breakdownEntries.map(([label, amount]) => {
                const barWidth = Math.max((Math.abs(amount as number) / maxAbsValue) * 100, 2);
                const isPositive = (amount as number) >= 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-text-muted">{label}</span>
                      <span
                        className={cn(
                          'font-mono font-medium',
                          isPositive ? 'text-success' : 'text-danger',
                        )}
                      >
                        {formatCurrency(amount as number)}
                      </span>
                    </div>
                    <div className="h-px w-full bg-border overflow-hidden">
                      <div
                        className={cn(
                          'h-0.5 transition-all duration-500',
                          isPositive ? 'bg-success' : 'bg-danger',
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {netWorth.notes && (
            <p className="mt-6 text-xs text-text-muted border-t border-border pt-4">
              {netWorth.notes}
            </p>
          )}
        </div>
      ) : (
        <div className="border border-border p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-text-muted">No net worth data yet.</p>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">Recent Transactions</h2>
        </div>

        {txList.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-text-muted">No transactions recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Merchant</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {txList.map((tx) => (
                  <tr
                    key={tx._id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-surface-hover"
                  >
                    <td className="px-6 py-4 text-text-muted whitespace-nowrap font-mono text-xs">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-6 py-4 text-text">
                      {tx.merchant ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {tx.source ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span
                        className={cn(
                          'font-mono font-medium',
                          tx.amount >= 0 ? 'text-success' : 'text-danger',
                        )}
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
