import { TransactionCategory, WorkCategory, Currency, WorkStatus, RecurringFrequency, CurrencyInfo, BankType, ExpenseType } from '@/types';

// Transaction Categories
export const TRANSACTION_CATEGORIES: Record<TransactionCategory, { icon: string; color: string; label: string }> = {
  food: { icon: 'fast-food', color: '#f97316', label: 'Food & Dining' },
  transport: { icon: 'car', color: '#3b82f6', label: 'Transport' },
  rent: { icon: 'home', color: '#8b5cf6', label: 'Rent' },
  shopping: { icon: 'cart', color: '#ec4899', label: 'Shopping' },
  entertainment: { icon: 'game-controller', color: '#14b8a6', label: 'Entertainment' },
  health: { icon: 'medkit', color: '#ef4444', label: 'Health' },
  salary: { icon: 'wallet', color: '#10b981', label: 'Salary' },
  investment: { icon: 'trending-up', color: '#6366f1', label: 'Investment' },
  bills: { icon: 'receipt', color: '#f59e0b', label: 'Bills' },
  utilities: { icon: 'flash', color: '#06b6d4', label: 'Utilities' },
  work_profit: { icon: 'briefcase', color: '#059669', label: 'Work Profit' },
  stock_market: { icon: 'trending-up', color: '#7c3aed', label: 'Stock Market' },
  dividend: { icon: 'gift', color: '#db2777', label: 'Dividend' },
  bonus: { icon: 'star', color: '#d97706', label: 'Bonus' },
  gift: { icon: 'heart', color: '#ec4899', label: 'Gift' },
  refund: { icon: 'arrow-back', color: '#3b82f6', label: 'Refund' },
  loan_received: { icon: 'cash', color: '#10b981', label: 'Loan Received' },
  other: { icon: 'ellipsis-horizontal', color: '#6b7280', label: 'Other' },
};

export const INCOME_CATEGORIES: TransactionCategory[] = ['salary', 'investment', 'work_profit', 'stock_market', 'dividend', 'bonus', 'gift', 'refund', 'loan_received', 'other'];
export const EXPENSE_CATEGORIES: TransactionCategory[] = ['food', 'transport', 'rent', 'shopping', 'entertainment', 'health', 'bills', 'utilities', 'other'];

// Bank/Account Types
export const BANK_TYPES = {
  bank: 'Bank Account',
  wallet: 'Digital Wallet',
  investment: 'Investment Account',
  cash: 'Cash',
};

export const DEFAULT_BANKS = [
  { id: '1', name: 'My Bank Account', type: 'bank' as const },
  { id: '2', name: 'Wallet', type: 'wallet' as const },
  { id: '3', name: 'Investment Account', type: 'investment' as const },
  { id: '4', name: 'Cash', type: 'cash' as const },
];

// Work Categories
export const WORK_CATEGORIES: Record<WorkCategory, { icon: string; color: string; label: string }> = {
  cctv: { icon: 'videocam', color: '#3b82f6', label: 'CCTV' },
  hardware: { icon: 'hardware-chip', color: '#8b5cf6', label: 'Hardware' },
  networking: { icon: 'globe', color: '#14b8a6', label: 'Networking' },
  software: { icon: 'code', color: '#6366f1', label: 'Software' },
  maintenance: { icon: 'build', color: '#f59e0b', label: 'Maintenance' },
  consultation: { icon: 'chatbubbles', color: '#ec4899', label: 'Consultation' },
  other: { icon: 'ellipsis-horizontal', color: '#6b7280', label: 'Other' },
};

// Expense Types
export const EXPENSE_TYPES: Record<ExpenseType, { icon: string; color: string; label: string }> = {
  materials: { icon: 'cube', color: '#8b5cf6', label: 'Materials' },
  transportation: { icon: 'car', color: '#3b82f6', label: 'Transportation' },
  labor: { icon: 'people', color: '#10b981', label: 'Labor' },
  other: { icon: 'ellipsis-horizontal', color: '#6b7280', label: 'Other' },
};

// Work Status
export const STATUS_COLORS: Record<WorkStatus, { color: string; bgColor: string; label: string }> = {
  pending: { color: '#f59e0b', bgColor: '#fef3c7', label: 'Pending' },
  'in-progress': { color: '#3b82f6', bgColor: '#dbeafe', label: 'In Progress' },
  completed: { color: '#10b981', bgColor: '#d1fae5', label: 'Completed' },
  cancelled: { color: '#ef4444', bgColor: '#fee2e2', label: 'Cancelled' },
};

// Currencies
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
];

// Frequency Options
export const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// Date Formats
export const DATE_FORMATS = {
  display: 'MMM d, yyyy',
  monthYear: 'MMMM yyyy',
  monthKey: 'yyyy-MM',
  time: 'h:mm a',
  full: 'EEEE, MMMM d, yyyy',
  short: 'MM/dd/yyyy',
};

// Storage Keys
export const STORAGE_KEYS = {
  USER: '@trackme_user',
  THEME: '@trackme_theme',
  CURRENCY: '@trackme_currency',
  LAST_SYNC: '@trackme_last_sync',
  BIOMETRIC: '@trackme_biometric',
};

// Firestore Collections
export const COLLECTIONS = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  BUDGETS: 'budgets',
  WORKS: 'works',
  QUOTATIONS: 'quotations',
  GOALS: 'goals',
  RECURRING: 'recurring',
  BILL_REMINDERS: 'billReminders',
  BANK_ACCOUNTS: 'bankAccounts',
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'TrackME',
  VERSION: '1.0.0',
  MAX_BUDGET_CATEGORIES: 10,
  MAX_GOALS: 20,
  DEFAULT_BUDGET_ALERT: 80, // percentage
  SYNC_INTERVAL: 30000, // 30 seconds
  TOAST_DURATION: {
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000,
  },
};

// Goal Colors
export const GOAL_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
];

// Progress Steps for Work
export const PROGRESS_STEPS = [0, 25, 50, 75, 100];
