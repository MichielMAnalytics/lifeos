// Mock data for the /finance/inspiration chooser. Same shapes the four
// finance section components consume in production — only the IDs are
// fakes (prefixed `mock_`) so any accidental mutation against them no-ops
// at the Convex layer. The chooser passes these through props so the
// preview renders without an API key, an upload, or a sign-in.

import type { Doc, Id } from '@/lib/convex-api';

type Category = Doc<'financeCategories'>;
type Transaction = Doc<'financeTransactions'>;
type Statement = Doc<'financeStatements'>;

const CAT_DEFS: Array<{ slug: string; name: string; color: string; isIncome: boolean }> = [
  { slug: 'food',         name: 'Food & Dining', color: '#f97316', isIncome: false },
  { slug: 'transport',    name: 'Transport',     color: '#3b82f6', isIncome: false },
  { slug: 'housing',      name: 'Housing',       color: '#a855f7', isIncome: false },
  { slug: 'subscriptions',name: 'Subscriptions', color: '#06b6d4', isIncome: false },
  { slug: 'shopping',     name: 'Shopping',      color: '#ec4899', isIncome: false },
  { slug: 'health',       name: 'Health',        color: '#10b981', isIncome: false },
  { slug: 'entertainment',name: 'Entertainment', color: '#eab308', isIncome: false },
  { slug: 'travel',       name: 'Travel',        color: '#14b8a6', isIncome: false },
  { slug: 'business',     name: 'Business',      color: '#6366f1', isIncome: false },
  { slug: 'salary',       name: 'Salary',        color: '#22c55e', isIncome: true },
];

function isoDate(daysAgo: number, now: number): string {
  return new Date(now - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

export function mockFinanceData(now = Date.now()) {
  const userId = 'mock_user' as Id<'users'>;

  const categories: Category[] = CAT_DEFS.map((def, i) => ({
    _id: `mock_cat_${def.slug}` as Id<'financeCategories'>,
    _creationTime: now - 30 * 86_400_000,
    userId,
    name: def.name,
    color: def.color,
    isIncome: def.isIncome,
    isDefault: true,
    updatedAt: now - 30 * 86_400_000,
  }));

  const catId = (slug: string) =>
    `mock_cat_${slug}` as Id<'financeCategories'>;

  // Categorised transactions for the monthly summary (this month).
  const categorized: Transaction[] = [
    mkTxn('cat_1', isoDate(2, now),  'Whole Foods Market',     -84.20, catId('food'),          true,  now),
    mkTxn('cat_2', isoDate(3, now),  'Uber',                   -18.50, catId('transport'),     true,  now),
    mkTxn('cat_3', isoDate(5, now),  'Netflix',                -15.99, catId('subscriptions'), true,  now),
    mkTxn('cat_4', isoDate(7, now),  'Spotify',                -9.99,  catId('subscriptions'), true,  now),
    mkTxn('cat_5', isoDate(9, now),  'Apartment rent',         -2400,  catId('housing'),       true,  now),
    mkTxn('cat_6', isoDate(11, now), 'CVS Pharmacy',           -42.10, catId('health'),        true,  now),
    mkTxn('cat_7', isoDate(12, now), 'Salary - Q2 payroll',    +5800,  catId('salary'),        true,  now, true),
    mkTxn('cat_8', isoDate(14, now), 'Trader Joe\'s',          -67.40, catId('food'),          true,  now),
    mkTxn('cat_9', isoDate(16, now), 'Lyft',                   -11.20, catId('transport'),     true,  now),
    mkTxn('cat_10',isoDate(18, now), 'Cinema City',            -28.00, catId('entertainment'), true,  now),
    mkTxn('cat_11',isoDate(20, now), 'Amazon Order',           -134.50,catId('shopping'),      true,  now),
    mkTxn('cat_12',isoDate(22, now), 'Apartment co-op fees',   -180,   catId('housing'),       true,  now),
  ];

  // Uncategorised transactions for the inbox preview.
  const uncategorized: Transaction[] = [
    mkUncat('un_1', isoDate(1, now), 'STARBUCKS #2147',     -6.85,  catId('food'),     'memory', 1.0,  now),
    mkUncat('un_2', isoDate(1, now), 'AERO MEX FLIGHT BCN', -312.00,catId('travel'),   'llm',    0.92, now),
    mkUncat('un_3', isoDate(2, now), 'CHATGPT PLUS',        -20.00, catId('subscriptions'), 'llm',  0.88, now),
    mkUncat('un_4', isoDate(2, now), 'WHOLE FOODS',         -54.30, catId('food'),     'memory', 1.0,  now),
    mkUncat('un_5', isoDate(3, now), 'BLU MEDIC PHARMACY',  -28.40, catId('health'),   'llm',    0.78, now),
    mkUncat('un_6', isoDate(4, now), 'IDR — KOPI KENANGAN', -32_000, undefined, undefined, undefined, now),
    mkUncat('un_7', isoDate(4, now), 'CLAUDE PRO',          -20.00, catId('subscriptions'), 'memory', 1.0, now),
  ];

  const allTransactions = [...uncategorized, ...categorized];

  // byCategory rollup for the monthly summary (only categorised, only spend).
  const byCategory: Record<string, number> = {};
  let income = 0;
  let spend = 0;
  for (const t of categorized) {
    const amt = Math.abs(t.amountUsd ?? t.amount);
    if (t.isIncome) income += amt;
    else {
      spend += amt;
      byCategory[String(t.categoryId)] = (byCategory[String(t.categoryId)] ?? 0) + amt;
    }
  }

  const yearMonth = new Date(now).toISOString().slice(0, 7);
  const summary = {
    yearMonth,
    income,
    spend,
    net: income - spend,
    counts: {
      total: allTransactions.length,
      categorized: categorized.length,
      uncategorized: uncategorized.length,
    },
    byCategory,
  };

  const statements: Statement[] = [
    {
      _id: 'mock_stmt_1' as Id<'financeStatements'>,
      _creationTime: now - 5 * 60_000,
      userId,
      source: 'revolut',
      filename: 'revolut-2026-04.csv',
      uploadedAt: now - 5 * 60_000,
      parsedCount: 47,
      skippedCount: 2,
    },
    {
      _id: 'mock_stmt_2' as Id<'financeStatements'>,
      _creationTime: now - 4 * 86_400_000,
      userId,
      source: 'wio',
      filename: 'wio-personal-april.csv',
      accountLabel: 'WIO Personal AED',
      uploadedAt: now - 4 * 86_400_000,
      parsedCount: 23,
      skippedCount: 0,
    },
  ];

  return { categories, uncategorized, allTransactions, summary, statements };
}

// ── builders ──

function mkTxn(
  slug: string,
  date: string,
  description: string,
  amountUsd: number,
  categoryId: Id<'financeCategories'>,
  hasUsd: boolean,
  now: number,
  isIncome = false,
): Transaction {
  return {
    _id: `mock_txn_${slug}` as Id<'financeTransactions'>,
    _creationTime: now - 60_000,
    userId: 'mock_user' as Id<'users'>,
    externalId: `mock_${slug}`,
    date,
    description,
    merchantRaw: description,
    amount: amountUsd,
    currency: 'USD',
    amountUsd: hasUsd ? amountUsd : undefined,
    categoryId,
    status: 'categorized',
    source: 'revolut',
    isIncome,
    updatedAt: now - 60_000,
  };
}

function mkUncat(
  slug: string,
  date: string,
  description: string,
  amount: number,
  suggestedCategoryId: Id<'financeCategories'> | undefined,
  suggestionSource: 'memory' | 'llm' | undefined,
  confidence: number | undefined,
  now: number,
): Transaction {
  const isIdr = description.startsWith('IDR');
  const currency = isIdr ? 'IDR' : 'USD';
  const amountUsd = isIdr ? amount / 16_000 : amount;
  return {
    _id: `mock_txn_${slug}` as Id<'financeTransactions'>,
    _creationTime: now - 60_000,
    userId: 'mock_user' as Id<'users'>,
    externalId: `mock_${slug}`,
    date,
    description,
    merchantRaw: description,
    amount,
    currency,
    amountUsd,
    status: 'uncategorized',
    source: 'revolut',
    isIncome: false,
    suggestedCategoryId,
    suggestionConfidence: confidence,
    suggestionSource,
    updatedAt: now - 60_000,
  };
}
