import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Modal } from './Modal';
import { Button } from './Button';
import { Card } from './Card';
import { DEFAULT_BANKS } from '@/utils/constants';
import { TransactionCategory } from '@/types';

interface ProfitTransferModalProps {
  visible: boolean;
  profit: number;
  onClose: () => void;
  onTransfer: (data: {
    amount: number;
    category: TransactionCategory;
    bankAccount: string;
  }) => Promise<void>;
}

export const ProfitTransferModal: React.FC<ProfitTransferModalProps> = ({
  visible,
  profit,
  onClose,
  onTransfer,
}) => {
  const { colors } = useTheme();
  const [amount, setAmount] = useState(profit.toString());
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory>('work_profit');
  const [selectedBank, setSelectedBank] = useState(DEFAULT_BANKS[0].name);
  const [isTransferring, setIsTransferring] = useState(false);

  const incomeCategories: Array<{ category: TransactionCategory; label: string; icon: string }> = [
    { category: 'work_profit', label: 'Work Profit', icon: 'briefcase' },
    { category: 'stock_market', label: 'Stock Market', icon: 'trending-up' },
    { category: 'investment', label: 'Investment', icon: 'trending-up' },
    { category: 'dividend', label: 'Dividend', icon: 'gift' },
    { category: 'bonus', label: 'Bonus', icon: 'star' },
    { category: 'gift', label: 'Gift', icon: 'heart' },
    { category: 'loan_received', label: 'Loan Received', icon: 'cash' },
    { category: 'refund', label: 'Refund', icon: 'arrow-back' },
  ];

  const handleTransfer = async () => {
    const transferAmount = parseFloat(amount) || 0;
    if (transferAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setIsTransferring(true);
    try {
      await onTransfer({
        amount: transferAmount,
        category: selectedCategory,
        bankAccount: selectedBank,
      });
      onClose();
    } finally {
      setIsTransferring(false);
    }
  };

  const handleReset = () => {
    setAmount(profit.toString());
    setSelectedCategory('work_profit');
    setSelectedBank(DEFAULT_BANKS[0].name);
  };

  return (
    <Modal
      visible={visible}
      title="Transfer Profit to Income"
      onClose={onClose}
    >
      <View style={styles.container}>
        {/* Amount Display */}
        <Card style={{ backgroundColor: colors.primary + '20', marginBottom: 16 }}>
          <View style={styles.amountSection}>
            <Text style={[styles.label, { color: colors.text }]}>Total Profit</Text>
            <Text style={[styles.amountText, { color: colors.primary }]}>
              {profit.toFixed(2)}
            </Text>
          </View>
        </Card>

        {/* Transfer Amount */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Transfer Amount</Text>
          <View
            style={[
              styles.inputBox,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Enter amount"
              placeholderTextColor={colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Income Category Selection */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Income Source</Text>
          <FlatList
            data={incomeCategories}
            keyExtractor={(item) => item.category}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  {
                    borderColor:
                      selectedCategory === item.category ? colors.primary : colors.border,
                    backgroundColor:
                      selectedCategory === item.category
                        ? colors.primary + '10'
                        : colors.background,
                  },
                ]}
                onPress={() => setSelectedCategory(item.category)}
              >
                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: colors.text,
                      fontWeight: selectedCategory === item.category ? '600' : '500',
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {selectedCategory === item.category && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Bank Account Selection */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Transfer To</Text>
          <View style={[styles.bankPicker, { borderColor: colors.border }]}>
            <Ionicons name="card" size={20} color={colors.primary} />
            <FlatList
              data={DEFAULT_BANKS}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.bankOption,
                    {
                      backgroundColor:
                        selectedBank === item.name ? colors.primary + '15' : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedBank(item.name)}
                >
                  <View>
                    <Text
                      style={[
                        styles.bankName,
                        {
                          color: colors.text,
                          fontWeight: selectedBank === item.name ? '600' : '500',
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.bankType, { color: colors.textSecondary }]}>
                      {item.type}
                    </Text>
                  </View>
                  {selectedBank === item.name && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>

        {/* Summary */}
        <Card style={{ backgroundColor: colors.background, marginVertical: 16 }}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Source:
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>Work Profit</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Category:
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {
                incomeCategories.find((c) => c.category === selectedCategory)?.label ||
                'N/A'
              }
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Account:
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedBank}</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            onPress={onClose}
            style={{ flex: 1, marginRight: 8 }}
            variant="secondary"
          />
          <Button
            title={isTransferring ? 'Transferring...' : 'Transfer'}
            onPress={handleTransfer}
            style={{ flex: 1, marginLeft: 8 }}
            disabled={isTransferring}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  amountText: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    gap: 12,
  },
  categoryText: {
    fontSize: 14,
    flex: 1,
  },
  bankPicker: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    gap: 12,
  },
  bankName: {
    fontSize: 14,
    marginBottom: 2,
  },
  bankType: {
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
