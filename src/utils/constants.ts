import { TransactionCategory, WorkCategory, Currency, CurrencyInfo } from '@/types';

// Transaction Categories with icons and colors
export const TRANSACTION_CATEGORIES: Record<TransactionCategory, { label: string; icon: string; color: string }> = {
  food: { label: 'Food & Dining', icon: 'restaurant', color: '#f97316' },
  transport: { label: 'Transport', icon: 'car', color: '#3b82f6' },
  rent: { label: 'Rent & Housing', icon: 'home', color: '#8b5cf6' },
  shopping: { label: 'Shopping', icon: 'shopping-bag', color: '#ec4899' },
  entertainment: { label: 'Entertainment', icon: 'film', color: '#f59e0b' },
  health: { label: 'Health', icon: 'heart', color: '#ef4444' },
  salary: { label: 'Salary', icon: 'briefcase', color: '#10b981' },
  investment: { label: 'Investment', icon: 'trending-up', color: '#06b6d4' },
  bills: { label: 'Bills & Utilities', icon: 'file-text', color: '#6366f1' },
  other: { label: 'Other', icon: 'more-horizontal', color: '#64748b' },
};

// Work Categories
export const WORK_CATEGORIES: Record<WorkCategory, { label: string; icon: string; color: string }> = {
  cctv: { label: 'CCTV Installation', icon: 'video', color: '#3b82f6' },
  hardware: { label: 'Computer Hardware', icon: 'cpu', color: '#8b5cf6' },
  networking: { label: 'Networking', icon: 'wifi', color: '#06b6d4' },
  software: { label: 'Software Development', icon: 'code', color: '#10b981' },
  maintenance: { label: 'Maintenance', icon: 'tool', color: '#f59e0b' },
  consultation: { label: 'Consultation', icon: 'users', color: '#ec4899' },
  other: { label: 'Other', icon: 'more-horizontal', color: '#64748b' },
};

// Currencies
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
];

// Chart Colors
export const CHART_COLORS = [
  '#6366f1', // Primary indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

// Goal Colors
export const GOAL_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

// Status Colors
export const STATUS_COLORS = {
  pending: '#f59e0b',
  'in-progress': '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
};

// Work Status Options
export const WORK_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Recurring Frequency Options
export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// Notification Days Before Options
export const NOTIFICATION_DAYS_OPTIONS = [
  { value: 0, label: 'On due date' },
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '1 week before' },
];

// Default User Settings
export const DEFAULT_USER_SETTINGS = {
  currency: 'USD' as Currency,
  theme: 'dark' as const,
  budgetAlertThreshold: 80,
  biometricEnabled: false,
};

// Date Formats
export const DATE_FORMATS = {
  display: 'MMM dd, yyyy',
  displayShort: 'MMM dd',
  month: 'MMMM yyyy',
  monthKey: 'yyyy-MM',
  time: 'HH:mm',
  full: 'MMM dd, yyyy HH:mm',
};

// API Endpoints
export const API_ENDPOINTS = {
  exchangeRates: 'https://v6.exchangerate-api.com/v6',
};

// Storage Keys
export const STORAGE_KEYS = {
  user: '@financeflow:user',
  theme: '@financeflow:theme',
  currency: '@financeflow:currency',
  biometric: '@financeflow:biometric',
  exchangeRates: '@financeflow:exchangeRates',
  lastSync: '@financeflow:lastSync',
  offlineQueue: '@financeflow:offlineQueue',
};

// Firestore Collections
export const COLLECTIONS = {
  users: 'users',
  transactions: 'transactions',
  budgets: 'budgets',
  works: 'works',
  goals: 'goals',
  recurring: 'recurring',
  billReminders: 'billReminders',
};

// App Constants
export const APP_CONFIG = {
  name: 'FinanceFlow',
  version: '1.0.0',
  maxPhotosPerWork: 5,
  maxTransactionsPerPage: 50,
  syncIntervalMs: 30000, // 30 seconds
  exchangeRateCacheMs: 86400000, // 24 hours
  budgetAlertDefault: 80, // percentage
};
