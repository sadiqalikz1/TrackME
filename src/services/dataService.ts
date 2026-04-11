import { hybridRepository } from './repositories/hybridRepository';
import { CollectionName } from './database';

/**
 * DataService: High-level API for data operations with offline support
 * Screens use this instead of calling Firebase directly
 */

// Transactions
export const transactionService = {
  async getAll() {
    return hybridRepository.getCollection('transactions');
  },

  async getById(id: string) {
    return hybridRepository.getDocument('transactions', id);
  },

  async create(data: any) {
    const id = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await hybridRepository.saveDocument('transactions', id, { ...data, id });
    return id;
  },

  async update(id: string, data: any) {
    await hybridRepository.updateDocument('transactions', id, data);
  },

  async delete(id: string) {
    await hybridRepository.deleteDocument('transactions', id);
  },
};

// Budgets
export const budgetService = {
  async getAll() {
    return hybridRepository.getCollection('budgets');
  },

  async getById(id: string) {
    return hybridRepository.getDocument('budgets', id);
  },

  async create(data: any) {
    const id = `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await hybridRepository.saveDocument('budgets', id, { ...data, id });
    return id;
  },

  async update(id: string, data: any) {
    await hybridRepository.updateDocument('budgets', id, data);
  },

  async delete(id: string) {
    await hybridRepository.deleteDocument('budgets', id);
  },
};

// Work
export const workService = {
  async getAll() {
    return hybridRepository.getCollection('work');
  },

  async getById(id: string) {
    return hybridRepository.getDocument('work', id);
  },

  async create(data: any) {
    const id = `work_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await hybridRepository.saveDocument('work', id, { ...data, id });
    return id;
  },

  async update(id: string, data: any) {
    await hybridRepository.updateDocument('work', id, data);
  },

  async delete(id: string) {
    await hybridRepository.deleteDocument('work', id);
  },
};

// Goals
export const goalService = {
  async getAll() {
    return hybridRepository.getCollection('goals');
  },

  async getById(id: string) {
    return hybridRepository.getDocument('goals', id);
  },

  async create(data: any) {
    const id = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await hybridRepository.saveDocument('goals', id, { ...data, id });
    return id;
  },

  async update(id: string, data: any) {
    await hybridRepository.updateDocument('goals', id, data);
  },

  async delete(id: string) {
    await hybridRepository.deleteDocument('goals', id);
  },
};

// Quotations
export const quotationService = {
  async getAll() {
    return hybridRepository.getCollection('quotations');
  },

  async getById(id: string) {
    return hybridRepository.getDocument('quotations', id);
  },

  async create(data: any) {
    const id = `quotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await hybridRepository.saveDocument('quotations', id, { ...data, id });
    return id;
  },

  async update(id: string, data: any) {
    await hybridRepository.updateDocument('quotations', id, data);
  },

  async delete(id: string) {
    await hybridRepository.deleteDocument('quotations', id);
  },
};

// Bill Reminders
export const billReminderService = {
  async getAll() {
    return hybridRepository.getCollection('billReminders');
  },

  async getById(id: string) {
    return hybridRepository.getDocument('billReminders', id);
  },

  async create(data: any) {
    const id = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await hybridRepository.saveDocument('billReminders', id, { ...data, id });
    return id;
  },

  async update(id: string, data: any) {
    await hybridRepository.updateDocument('billReminders', id, data);
  },

  async delete(id: string) {
    await hybridRepository.deleteDocument('billReminders', id);
  },
};

// Bank Accounts
export const bankAccountService = {
  async getAll() {
    return hybridRepository.getCollection('bankAccounts');
  },

  async getById(id: string) {
    return hybridRepository.getDocument('bankAccounts', id);
  },

  async create(data: any) {
    const id = `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await hybridRepository.saveDocument('bankAccounts', id, { ...data, id });
    return id;
  },

  async update(id: string, data: any) {
    await hybridRepository.updateDocument('bankAccounts', id, data);
  },

  async delete(id: string) {
    await hybridRepository.deleteDocument('bankAccounts', id);
  },
};

// Export all services
export const dataService = {
  transactions: transactionService,
  budgets: budgetService,
  work: workService,
  goals: goalService,
  quotations: quotationService,
  billReminders: billReminderService,
  bankAccounts: bankAccountService,
};
