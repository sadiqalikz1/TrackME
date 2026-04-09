import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAuth } from '@/contexts';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { WorkPayment, PaymentType } from '@/types';
import { CURRENCIES } from '@/utils/constants';

interface WorkPaymentModalProps {
  visible: boolean;
  payments: WorkPayment[];
  onClose: () => void;
  onAddPayment: (payment: Omit<WorkPayment, 'id'>) => Promise<void>;
  onRemovePayment: (paymentId: string) => Promise<void>;
}

const PAYMENT_TYPES: { type: PaymentType; label: string; icon: string; color: string }[] = [
  { type: 'advance', label: 'Advance', icon: 'arrow-up-circle', color: '#3b82f6' },
  { type: 'partial', label: 'Partial', icon: 'pie-chart', color: '#8b5cf6' },
  { type: 'balance', label: 'Balance', icon: 'checkmark-circle', color: '#10b981' },
  { type: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle', color: '#f59e0b' },
];

export const WorkPaymentModal: React.FC<WorkPaymentModalProps> = ({
  visible,
  payments,
  onClose,
  onAddPayment,
  onRemovePayment,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const currencyInfo = CURRENCIES.find(c => c.code === (user?.currency || 'USD')) || CURRENCIES[0];

  const [selectedType, setSelectedType] = useState<PaymentType>('partial');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [amountError, setAmountError] = useState(false);

  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleAddPayment = async () => {
    const paymentAmount = parseFloat(amount) || 0;
    if (paymentAmount <= 0) {
      setAmountError(true);
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }
    setAmountError(false);

    setAdding(true);
    try {
      await onAddPayment({
        type: selectedType,
        amount: paymentAmount,
        date,
        description: description.trim() || undefined,
        note: note.trim() || undefined,
      });
      setAmount('');
      setDescription('');
      setNote('');
      setSelectedType('partial');
      setDate(new Date().toISOString().split('T')[0]);
    } finally {
      setAdding(false);
    }
  };

  const handleRemovePayment = (paymentId: string) => {
    Alert.alert('Remove Payment', 'Delete this payment entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onRemovePayment(paymentId),
      },
    ]);
  };

  const paymentsByType = PAYMENT_TYPES.reduce((acc, pt) => {
    const total = payments.filter(p => p.type === pt.type).reduce((sum, p) => sum + p.amount, 0);
    return { ...acc, [pt.type]: total };
  }, {} as Record<PaymentType, number>);

  return (
    <Modal visible={visible} title="Income Tracking" onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Total Summary */}
        <Card style={{ backgroundColor: colors.primary + '15', marginBottom: 16 }}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Received</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {currencyInfo.symbol}{totalReceived.toFixed(2)}
          </Text>
        </Card>

        {/* Payment Breakdown by Type */}
        <Card style={{ marginBottom: 16, padding: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Breakdown by Type</Text>
          {PAYMENT_TYPES.map((pt) => (
            <View key={pt.type} style={styles.breakdownRow}>
              <View style={styles.breakdownLabel}>
                <Ionicons name={pt.icon as any} size={16} color={pt.color} />
                <Text style={[styles.breakdownText, { color: colors.text }]}>{pt.label}</Text>
              </View>
              <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                {currencyInfo.symbol}{paymentsByType[pt.type as PaymentType].toFixed(2)}
              </Text>
            </View>
          ))}
        </Card>

        {/* Add Payment Section */}
        <Card style={{ marginBottom: 16, padding: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Payment</Text>

          {/* Payment Type Selection */}
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Payment Type</Text>
          <View style={styles.typeButtonsContainer}>
            {PAYMENT_TYPES.map((pt) => (
              <TouchableOpacity
                key={pt.type}
                onPress={() => setSelectedType(pt.type)}
                style={[
                  styles.typeButton,
                  {
                    borderColor: selectedType === pt.type ? pt.color : colors.border,
                    backgroundColor:
                      selectedType === pt.type ? pt.color + '15' : colors.background,
                  },
                ]}
              >
                <Ionicons name={pt.icon as any} size={18} color={pt.color} />
                <Text style={[styles.typeButtonText, { color: colors.text }]}>{pt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount */}
          <View style={{ marginTop: 12, marginHorizontal: 0 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Amount <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <View style={[styles.inputBox, { borderColor: amountError ? colors.danger : colors.border, borderWidth: amountError ? 2 : 1 }]}>
              <Text style={[styles.currency, { color: colors.textSecondary }]}>{currencyInfo.symbol}</Text>
              <Input
                placeholder="0.00"
                value={amount}
                onChangeText={(text) => { setAmount(text); setAmountError(false); }}
                keyboardType="decimal-pad"
                style={{ flex: 1, borderWidth: 0 }}
              />
            </View>
            {amountError && <Text style={{ fontSize: 11, color: colors.danger, marginTop: 4 }}>Please enter a valid amount</Text>}
          </View>

          {/* Date */}
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <Input
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
              editable={false}
            />
          </View>

          {/* Description */}
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <Input
              placeholder="e.g., Payment for CCTV installation"
              value={description}
              onChangeText={setDescription}
              maxLength={100}
            />
          </View>

          {/* Note */}
          <View style={{ marginTop: 12, marginBottom: 12 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Note (optional)</Text>
            <Input
              placeholder="Any additional notes..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
              maxLength={200}
            />
          </View>

          <Button
            title={adding ? 'Adding...' : 'Add Payment'}
            onPress={handleAddPayment}
            disabled={adding}
          />
        </Card>

        {/* Payments List */}
        {payments.length > 0 && (
          <Card style={{ marginBottom: 16, padding: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History</Text>
            {payments.map((payment) => {
              const pt = PAYMENT_TYPES.find(t => t.type === payment.type) || PAYMENT_TYPES[0];
              return (
                <View
                  key={payment.id}
                  style={[
                    styles.paymentRow,
                    { borderBottomColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <View style={styles.paymentInfo}>
                    <View style={styles.paymentHeader}>
                      <Ionicons name={pt.icon as any} size={16} color={pt.color} />
                      <Text style={[styles.paymentType, { color: colors.text }]}>{pt.label}</Text>
                      <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
                        {new Date(payment.date).toLocaleDateString()}
                      </Text>
                    </View>
                    {payment.description && (
                      <Text style={[styles.paymentDesc, { color: colors.textSecondary }]}>
                        {payment.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={[styles.paymentAmount, { color: pt.color }]}>
                      {currencyInfo.symbol}{payment.amount.toFixed(2)}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemovePayment(payment.id)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownText: {
    fontSize: 13,
    fontWeight: '500',
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  paymentType: {
    fontSize: 13,
    fontWeight: '600',
  },
  paymentDate: {
    fontSize: 12,
  },
  paymentDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
