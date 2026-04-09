import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAuth } from '@/contexts';
import { Modal } from './Modal';
import { Button } from './Button';
import { Card } from './Card';
import { DetailedExpense, ExpenseType } from '@/types';
import { EXPENSE_TYPES, CURRENCIES } from '@/utils/constants';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { setUserActionInProgress, pauseCollectionSync, resumeCollectionSync } from '@/services/repositories/hybridRepository';

const UNIT_OPTIONS = ['pcs', 'ft', 'm', 'kg', 'g', 'L', 'ml', 'hr', 'box', 'set'];

interface DetailedExpenseModalProps {
  visible: boolean;
  expenses: DetailedExpense[];
  onClose: () => void;
  onAddExpense: (expense: Omit<DetailedExpense, 'id'>) => Promise<void>;
  onRemoveExpense: (expenseId: string) => Promise<void>;
}

export const DetailedExpenseModal: React.FC<DetailedExpenseModalProps> = ({
  visible,
  expenses,
  onClose,
  onAddExpense,
  onRemoveExpense,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const currencyInfo = CURRENCIES.find(c => c.code === (user?.currency || 'USD')) || CURRENCIES[0];
  
  const [type, setType] = useState<ExpenseType>('materials');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [adding, setAdding] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);
  const [amountError, setAmountError] = useState(false);
  const [unitError, setUnitError] = useState(false);

  // Pause background sync while user is filling the form
  useEffect(() => {
    if (visible) {
      pauseCollectionSync('transactions');
    }
    return () => {
      resumeCollectionSync('transactions');
    };
  }, [visible]);

  const handleAddExpense = async () => {
    const expenseAmount = parseFloat(amount) || 0;
    const desc = description.trim();
    const unitVal = unit.trim();
    
    let hasError = false;
    if (!desc) {
      setDescriptionError(true);
      hasError = true;
    } else {
      setDescriptionError(false);
    }
    
    if (expenseAmount <= 0) {
      setAmountError(true);
      hasError = true;
    } else {
      setAmountError(false);
    }
    
    if (!unitVal) {
      setUnitError(true);
      hasError = true;
    } else {
      setUnitError(false);
    }
    
    if (hasError) {
      Alert.alert('Invalid Input', 'Please fill in all required fields');
      return;
    }

    setAdding(true);
    try {
      await onAddExpense({
        type,
        description: description.trim(),
        amount: expenseAmount,
        date,
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit: unit.trim() || undefined,
      });
      setDescription('');
      setAmount('');
      setQuantity('1');
      setUnit('');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveExpense = (expenseId: string) => {
    Alert.alert('Remove Expense', 'Delete this expense entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onRemoveExpense(expenseId),
      },
    ]);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expensesByType = Object.keys(EXPENSE_TYPES).map((t) => ({
    type: t as ExpenseType,
    total: expenses.filter((e) => e.type === t).reduce((sum, e) => sum + e.amount, 0),
  }));

  return (
    <Modal visible={visible} title="Expense Tracking" onClose={onClose}>
      <View style={styles.container}>
        {/* Total Expenses Summary */}
        <Card style={{ backgroundColor: colors.danger + '15', marginBottom: 16 }}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Expenses</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>
            {currencyInfo.symbol}{totalExpenses.toFixed(2)}
          </Text>
        </Card>

        {/* Expense Breakdown by Type */}
        <Card style={{ marginBottom: 16, padding: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Breakdown by Type</Text>
          {expensesByType.map((item) => (
            <View key={item.type} style={styles.breakdownRow}>
              <View style={styles.breakdownLabel}>
                <Ionicons
                  name={EXPENSE_TYPES[item.type].icon as any}
                  size={16}
                  color={EXPENSE_TYPES[item.type].color}
                />
                <Text style={[styles.breakdownText, { color: colors.text }]}>
                  {EXPENSE_TYPES[item.type].label}
                </Text>
              </View>
              <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                {currencyInfo.symbol}{item.total.toFixed(2)}
              </Text>
            </View>
          ))}
        </Card>

        {/* Add Expense */}
        <Card style={{ marginBottom: 16, padding: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Expense</Text>

          {/* Expense Type */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeScroll}
            >
              {Object.entries(EXPENSE_TYPES).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: type === key ? value.color : colors.background,
                      borderColor: value.color,
                    },
                  ]}
                  onPress={() => setType(key as ExpenseType)}
                >
                  <Ionicons
                    name={value.icon as any}
                    size={16}
                    color={type === key ? '#fff' : value.color}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      { color: type === key ? '#fff' : value.color },
                    ]}
                  >
                    {value.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Description <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { borderColor: descriptionError ? colors.danger : colors.border, borderWidth: descriptionError ? 2 : 1, color: colors.text }]}
              placeholder="What did you buy?"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={(text) => { setDescription(text); setDescriptionError(false); }}
            />
            {descriptionError && <Text style={{ fontSize: 11, color: colors.danger, marginTop: 4 }}>Description is required</Text>}
          </View>

          {/* Amount */}
          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Amount <Text style={{ color: colors.danger }}>*</Text>
              </Text>
              <View style={[styles.inputBox, { borderColor: amountError ? colors.danger : colors.border, borderWidth: amountError ? 2 : 1 }]}>
                <Text style={[styles.currency, { color: colors.textSecondary }]}>$</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, flex: 1 }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={amount}
                  onChangeText={(text) => { setAmount(text); setAmountError(false); }}
                  keyboardType="decimal-pad"
                />
              </View>
              {amountError && <Text style={{ fontSize: 11, color: colors.danger, marginTop: 4 }}>Amount is required</Text>}
            </View>

            {/* Quantity */}
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Qty</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="1"
                placeholderTextColor={colors.textSecondary}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Unit */}
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Unit <Text style={{ color: colors.danger }}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setShowUnitPicker(!showUnitPicker)}
                style={[styles.input, { 
                  borderColor: unitError ? colors.danger : colors.border, 
                  borderWidth: unitError ? 2 : 1,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 12
                }]}
              >
                <Text style={{ color: unit ? colors.text : colors.textSecondary, fontSize: 14 }}>
                  {unit || 'Select unit'}
                </Text>
                <Ionicons 
                  name={showUnitPicker ? 'chevron-up' : 'chevron-down'} 
                  size={16} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
              {unitError && <Text style={{ fontSize: 11, color: colors.danger, marginTop: 4 }}>Unit is required</Text>}
              
              {showUnitPicker && (
                <View style={[styles.unitDropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <ScrollView>
                    {UNIT_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => { setUnit(opt); setShowUnitPicker(false); setUnitError(false); }}
                        style={[styles.unitOption, { 
                          backgroundColor: unit === opt ? colors.primary + '15' : 'transparent',
                          borderBottomColor: colors.border
                        }]}
                      >
                        <Text style={[styles.unitOptionText, { 
                          color: unit === opt ? colors.primary : colors.text,
                          fontWeight: unit === opt ? '600' : '500'
                        }]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <Button
            title={adding ? 'Adding...' : 'Add Expense'}
            onPress={handleAddExpense}
            disabled={adding}
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* Expenses List */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>
            Expense Entries ({expenses.length})
          </Text>
          {expenses.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No expenses added yet
            </Text>
          ) : (
            <View>
              {expenses.map((item) => (
                <Card
                  key={item.id}
                  style={{
                    marginBottom: 8,
                    backgroundColor: colors.background,
                    paddingVertical: 10,
                  }}
                >
                  <View style={styles.expenseRow}>
                    <Ionicons
                      name={EXPENSE_TYPES[item.type].icon as any}
                      size={20}
                      color={EXPENSE_TYPES[item.type].color}
                    />
                    <View style={styles.expenseContent}>
                      <Text style={[styles.expenseDesc, { color: colors.text }]}>
                        {item.description}
                      </Text>
                      <View style={styles.expenseDetails}>
                        <Text style={[styles.expenseType, { color: colors.textSecondary }]}>
                          {EXPENSE_TYPES[item.type].label}
                        </Text>
                        {item.quantity && (
                          <Text style={[styles.expenseType, { color: colors.textSecondary }]}>
                            • {item.quantity} {item.unit}
                          </Text>
                        )}
                        <Text style={[styles.expenseDate, { color: colors.textSecondary }]}>
                          • {formatDate(new Date(item.date), 'MMM d')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.expenseRight}>
                      <Text style={[styles.expenseAmount, { color: colors.danger }]}>
                        {currencyInfo.symbol}{item.amount.toFixed(2)}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveExpense(item.id)}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  typeScroll: {
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  currency: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownText: {
    fontSize: 13,
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 12,
  },
  expenseRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  expenseContent: {
    flex: 1,
  },
  expenseDesc: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  expenseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  expenseType: {
    fontSize: 11,
  },
  expenseDate: {
    fontSize: 11,
  },
  expenseRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  expenseAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  unitDropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 150,
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  unitOptionText: {
    fontSize: 13,
  },
});
