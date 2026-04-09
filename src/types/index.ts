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
export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'LKR' | 'SAR' | 'AED' | 'PKR' | 'BDT' | 'SGD' | 'HKD' | 'CAD' | 'AUD' | 'NZD';

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
  | 'work_profit'
  | 'stock_market'
  | 'dividend'
  | 'bonus'
  | 'gift'
  | 'refund'
  | 'loan_received'
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
  time: string; // HH:mm format
  isRecurring: boolean;
  recurringId?: string;
  bankAccount?: string;
  workId?: string; // Reference to Work if from profit transfer
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

export type ExpenseType = 'materials' | 'transportation' | 'labor' | 'other';

export interface DetailedExpense {
  id: string;
  type: ExpenseType;
  description: string;
  amount: number;
  date: string;
  quantity?: number;
  unit?: string;
}

export interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  description: string;
  hoursWorked: number;
}

export type PaymentType = 'advance' | 'partial' | 'balance' | 'other';

export interface WorkPayment {
  id: string;
  type: PaymentType;
  amount: number;
  date: string;
  description?: string;
  note?: string;
}

export interface AdditionalWork {
  id: string;
  description: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Quotation {
  id: string;
  uid: string;
  workId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  description?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  validUntil: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

export interface Work {
  id: string;
  uid: string;
  title: string;
  description: string;
  category: WorkCategory;
  status: WorkStatus;
  quotationAmount: number;
  quotationId?: string;
  finalAmount: number;
  workingCost: number;
  materialCost: number;
  transportationCost: number;
  laborCost: number;
  otherExpenses: number;
  expenses: number;
  detailedExpenses: DetailedExpense[];
  profit: number;
  progress: number;
  totalHoursWorked: number;
  timeEntries: TimeEntry[];
  hourlyRate?: number;
  photos: string[];
  payments: WorkPayment[];
  additionalWorks: AdditionalWork[];
  totalPaymentsReceived: number;
  totalAdditionalAmount: number;
  isProfitTransferred: boolean;
  profitTransferredAmount?: number;
  profitTransferredDate?: Date;
  profitTransferredTo?: string;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Bank Account Types
export type BankType = 'bank' | 'wallet' | 'investment' | 'cash';

export interface BankAccount {
  id: string;
  uid: string;
  name: string; // e.g., "Bank of America - Checking"
  type: BankType;
  accountNumber?: string;
  balance: number;
  currency: Currency;
  isDefault: boolean;
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
