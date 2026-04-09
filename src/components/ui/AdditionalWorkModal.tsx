import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAuth } from '@/contexts';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { AdditionalWork } from '@/types';
import { CURRENCIES } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';

interface AdditionalWorkModalProps {
  visible: boolean;
  additionalWorks: AdditionalWork[];
  onClose: () => void;
  onAddWork: (work: Omit<AdditionalWork, 'id'>) => Promise<void>;
  onRemoveWork: (workId: string) => Promise<void>;
}

export const AdditionalWorkModal: React.FC<AdditionalWorkModalProps> = ({
  visible,
  additionalWorks,
  onClose,
  onAddWork,
  onRemoveWork,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const currencyInfo = CURRENCIES.find(c => c.code === (user?.currency || 'USD')) || CURRENCIES[0];

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);

  const totalAdditionalAmount = additionalWorks.reduce((sum, w) => sum + w.amount, 0);

  const handleAddWork = async () => {
    const workAmount = parseFloat(amount) || 0;
    if (!description.trim() || workAmount <= 0) {
      Alert.alert('Invalid Input', 'Please enter description and valid amount');
      return;
    }

    setAdding(true);
    try {
      await onAddWork({
        description: description.trim(),
        amount: workAmount,
        date,
        note: note.trim() || undefined,
      });
      setDescription('');
      setAmount('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveWork = (workId: string) => {
    Alert.alert('Remove Additional Work', 'Delete this work entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onRemoveWork(workId),
      },
    ]);
  };

  return (
    <Modal visible={visible} title="Additional Works" onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Total Summary */}
        <Card style={{ backgroundColor: colors.warning + '15', marginBottom: 16 }}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Total Additional Amount
          </Text>
          <Text style={[styles.summaryValue, { color: colors.warning || '#f59e0b' }]}>
            {currencyInfo.symbol}{totalAdditionalAmount.toFixed(2)}
          </Text>
        </Card>

        {/* Add Work Section */}
        <Card style={{ marginBottom: 16, padding: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Add New Work</Text>

          {/* Description */}
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Work Description *</Text>
            <Input
              placeholder="e.g., Additional wiring installation"
              value={description}
              onChangeText={setDescription}
              maxLength={100}
            />
          </View>

          {/* Amount */}
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount *</Text>
            <View style={[styles.inputBox, { borderColor: colors.border }]}>
              <Text style={[styles.currency, { color: colors.textSecondary }]}>
                {currencyInfo.symbol}
              </Text>
              <Input
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={{ flex: 1, borderWidth: 0 }}
              />
            </View>
          </View>

          {/* Date */}
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <Input placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} editable={false} />
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
            title={adding ? 'Adding...' : 'Add Work'}
            onPress={handleAddWork}
            disabled={adding}
          />
        </Card>

        {/* Works List */}
        {additionalWorks.length > 0 && (
          <Card style={{ marginBottom: 16, padding: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Work History</Text>
            <FlatList
              data={additionalWorks}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.workRow,
                    { borderBottomColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <View style={styles.workInfo}>
                    <Text style={[styles.workDesc, { color: colors.text }]}>{item.description}</Text>
                    <Text style={[styles.workDate, { color: colors.textSecondary }]}>
                      <Ionicons name="calendar-outline" size={12} /> {new Date(item.date).toLocaleDateString()}
                    </Text>
                    {item.note && (
                      <Text style={[styles.workNote, { color: colors.textSecondary }]}>
                        {item.note}
                      </Text>
                    )}
                  </View>
                  <View style={styles.workRight}>
                    <Text style={[styles.workAmount, { color: colors.warning || '#f59e0b' }]}>
                      {currencyInfo.symbol}{item.amount.toFixed(2)}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveWork(item.id)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </Card>
        )}

        {additionalWorks.length === 0 && (
          <Card style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="construct-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 12 }]}>
              No additional works added yet
            </Text>
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
  workRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  workInfo: {
    flex: 1,
    marginRight: 8,
  },
  workDesc: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  workDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  workNote: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  workRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  workAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
