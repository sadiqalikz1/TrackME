// User types
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  currency: Currency;
  theme: 'light' | 'dark';
  budgetAlertThreshold: number;
  biometricEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction types
export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'food'
  | 'transport'
  | 'rent'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'salary'
  | 'investment'
  | 'bills'
  | 'other';

export interface Transaction {
  id: string;
  uid: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  note: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  isRecurring?: boolean;
  recurringId?: string;
}

// Budget types
export interface Budget {
  id: string;
  uid: string;
  category: TransactionCategory;
  limit: number;
  spent: number;
  month: string; // YYYY-MM format
  createdAt: Date;
  updatedAt: Date;
}

// Work/Project types
export type WorkCategory =
  | 'cctv'
  | 'hardware'
  | 'networking'
  | 'software'
  | 'maintenance'
  | 'consultation'
  | 'other';

export type WorkStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface Work {
  id: string;
  uid: string;
  title: string;
  description: string;
  category: WorkCategory;
  status: WorkStatus;
  quotationAmount: number;
  finalAmount: number;
  workingCost: number;
  expenses: number;
  profit: number;
  progress: number; // 0-100
  photos: string[];
  isProfitTransferred: boolean;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Savings Goal types
export interface Goal {
  id: string;
  uid: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

// Recurring Transaction types
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  uid: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  note: string;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date;
  lastGenerated?: Date;
  active: boolean;
  createdAt: Date;
}

// Bill Reminder types
export interface BillReminder {
  id: string;
  uid: string;
  title: string;
  amount: number;
  category: TransactionCategory;
  dueDate: Date;
  frequency: RecurringFrequency;
  isPaid: boolean;
  notificationEnabled: boolean;
  notificationDaysBefore: number;
  lastPaidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Currency types
export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'LKR';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
}

export interface ExchangeRates {
  base: Currency;
  rates: Record<Currency, number>;
  lastUpdated: Date;
}

// Chart data types
export interface ChartData {
  label: string;
  value: number;
  color?: string;
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  BiometricLock: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  AddTransaction: undefined;
  Work: undefined;
  More: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Budgets: undefined;
  Goals: undefined;
  Analysis: undefined;
  Settings: undefined;
  Recurring: undefined;
  BillReminders: undefined;
};

// Sync types for offline mode
export type SyncStatus = 'synced' | 'pending' | 'error';

export interface SyncableEntity {
  syncStatus: SyncStatus;
  localId?: string;
  lastSyncedAt?: Date;
}

// Form types
export interface TransactionFormData {
  amount: string;
  type: TransactionType;
  category: TransactionCategory;
  note: string;
  date: Date;
}

export interface WorkFormData {
  title: string;
  description: string;
  category: WorkCategory;
  status: WorkStatus;
  quotationAmount: string;
  workingCost: string;
  expenses: string;
  startDate: Date;
  endDate?: Date;
}

export interface GoalFormData {
  name: string;
  targetAmount: string;
  deadline: Date;
  color: string;
}

export interface BudgetFormData {
  category: TransactionCategory;
  limit: string;
  month: string;
}

export interface BillReminderFormData {
  title: string;
  amount: string;
  category: TransactionCategory;
  dueDate: Date;
  frequency: RecurringFrequency;
  notificationEnabled: boolean;
  notificationDaysBefore: number;
}
