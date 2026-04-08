import { format, formatDistanceToNow, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { Currency } from '@/types';
import { CURRENCIES, DATE_FORMATS } from './constants';

// Currency Formatters
export const formatCurrency = (amount: number, currency: Currency = 'USD'): string => {
  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const symbol = currencyInfo?.symbol || '$';
  
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
};

export const formatCompactCurrency = (amount: number, currency: Currency = 'USD'): string => {
  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const symbol = currencyInfo?.symbol || '$';
  
  const absAmount = Math.abs(amount);
  let formatted: string;
  
  if (absAmount >= 1000000) {
    formatted = `${(absAmount / 1000000).toFixed(1)}M`;
  } else if (absAmount >= 1000) {
    formatted = `${(absAmount / 1000).toFixed(1)}K`;
  } else {
    formatted = absAmount.toFixed(2);
  }
  
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
};

export const parseCurrencyInput = (input: string): number => {
  // Remove all non-numeric characters except decimal point and minus
  const cleaned = input.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Date Formatters
export const formatDate = (date: Date | string, formatStr: string = DATE_FORMATS.display): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  return format(dateObj, formatStr);
};

export const formatRelativeDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const now = new Date();
  const days = differenceInDays(now, dateObj);
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

export const getMonthKey = (date: Date = new Date()): string => {
  return format(date, DATE_FORMATS.monthKey);
};

export const getMonthName = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  return format(dateObj, 'MMMM');
};

export const calculateDaysRemaining = (targetDate: Date | string): number => {
  const dateObj = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  if (isNaN(dateObj.getTime())) return 0;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const target = new Date(dateObj);
  target.setHours(0, 0, 0, 0);
  
  return differenceInDays(target, now);
};

export const getMonthRange = (date: Date = new Date()): { start: Date; end: Date } => {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
};

export const getLast6Months = (): { key: string; label: string }[] => {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(now, i);
    months.push({
      key: format(date, DATE_FORMATS.monthKey),
      label: format(date, 'MMM'),
    });
  }
  
  return months;
};

export const getDaysUntil = (date: Date | string): number => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 0;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  dateObj.setHours(0, 0, 0, 0);
  
  return differenceInDays(dateObj, now);
};

// Number Formatters
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatNumber = (value: number): string => {
  return value.toLocaleString('en-US');
};

export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

// Profit Calculation
export const calculateProfit = (quotation: number, workingCost: number, expenses: number): number => {
  return quotation - workingCost - expenses;
};

// Random Color Generator
export const getRandomColor = (): string => {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
    '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#ec4899',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Validation Helpers
export const isValidAmount = (amount: number | string): boolean => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && isFinite(num);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
