/** Shared vocabulary: account types, spending categories, strategy metadata. */

export const DEBT_TYPES = [
  { value: 'CREDIT_CARD', label: 'Credit card', tone: 'danger' },
  { value: 'STUDENT_LOAN', label: 'Student loan', tone: 'brand' },
  { value: 'AUTO_LOAN', label: 'Auto loan', tone: 'accent' },
  { value: 'MORTGAGE', label: 'Mortgage', tone: 'success' },
  { value: 'PERSONAL_LOAN', label: 'Personal loan', tone: 'warning' },
  { value: 'MEDICAL', label: 'Medical', tone: 'accent' },
  { value: 'OTHER', label: 'Other', tone: 'muted' },
];

export const debtTypeLabel = (value) =>
  DEBT_TYPES.find((t) => t.value === value)?.label ?? 'Other';

export const debtTypeTone = (value) =>
  DEBT_TYPES.find((t) => t.value === value)?.tone ?? 'muted';

export const CATEGORIES = [
  'Salary',
  'Side income',
  'Housing',
  'Food',
  'Transport',
  'Utilities',
  'Insurance',
  'Health',
  'Shopping',
  'Entertainment',
  'Education',
  'Debt payment',
  'Savings',
  'Other',
];

export const STRATEGIES = {
  avalanche: {
    key: 'avalanche',
    label: 'Avalanche',
    short: 'Highest rate first',
    description:
      'Every spare dollar attacks the account with the highest interest rate. It is the mathematically cheapest way out.',
    tone: 'brand',
  },
  snowball: {
    key: 'snowball',
    label: 'Snowball',
    short: 'Smallest balance first',
    description:
      'Every spare dollar clears the smallest balance. It costs a little more but delivers the first win sooner.',
    tone: 'accent',
  },
};

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: 'LayoutDashboard' },
  { to: '/debts', label: 'Accounts', icon: 'CreditCard' },
  { to: '/ledger', label: 'Ledger', icon: 'BookOpen' },
  { to: '/receipts', label: 'Documents', icon: 'FileText' },
  { to: '/profile', label: 'Settings', icon: 'Settings' },
];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'AED', 'SGD'];
