// User Types
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  currency: Currency;
  theme: 'light' | 'dark';
  budgetAlertThreshold: number;
  biometricEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Currency Types
export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'LKR';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
}

// Transaction Types
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
  | 'utilities'
  | 'other';

export interface Transaction {
  id: string;
  uid: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  description?: string;
  note: string;
  date: string;
  isRecurring: boolean;
  recurringId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Budget Types
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

// Work Types
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
  materialCost: number;
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

// Goal Types
export interface Goal {
  id: string;
  uid: string;
  name: string;
  target: number;
  saved: number;
  deadline?: string;
  color: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Recurring Transaction Types
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type BillFrequency = 'once' | 'weekly' | 'monthly' | 'yearly';

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

// Bill Reminder Types
export interface BillReminder {
  id: string;
  uid: string;
  name: string;
  amount: number;
  category: TransactionCategory;
  dueDate: string;
  frequency: BillFrequency;
  isPaid: boolean;
  isAutoPay: boolean;
  notifyDaysBefore: number;
  lastPaidDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Chart Types
export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

export interface CategoryData {
  name: string;
  amount: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

// Notification Types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

// Exchange Rate Types
export interface ExchangeRates {
  base: Currency;
  date: string;
  rates: Record<Currency, number>;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Dashboard: undefined;
  Transactions: undefined;
  Work: undefined;
  WorkDetail: { workId: string };
  MoreMenu: undefined;
  Budgets: undefined;
  Goals: undefined;
  Analysis: undefined;
  Settings: undefined;
  BillReminders: undefined;
};

// Theme Types
export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  border: string;
  borderLight: string;
  inputBackground: string;
  tabBarBackground: string;
  tabBarInactive: string;
}
