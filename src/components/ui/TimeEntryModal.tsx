import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Modal } from './Modal';
import { Button } from './Button';
import { Card } from './Card';
import { TimeEntry } from '@/types';
import { formatDate } from '@/utils/formatters';

interface TimeEntryModalProps {
  visible: boolean;
  timeEntries: TimeEntry[];
  totalHours: number;
  onClose: () => void;
  onAddTime: (entry: Omit<TimeEntry, 'id' | 'hoursWorked'>) => Promise<void>;
  onRemoveTime: (entryId: string) => Promise<void>;
}

export const TimeEntryModal: React.FC<TimeEntryModalProps> = ({
  visible,
  timeEntries,
  totalHours,
  onClose,
  onAddTime,
  onRemoveTime,
}) => {
  const { colors } = useTheme();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);

  const calculateDuration = () => {
    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return endMinutes - startMinutes;
    } catch {
      return 0;
    }
  };

  const handleAddTime = async () => {
    const duration = calculateDuration();
    if (duration <= 0) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }

    setAdding(true);
    try {
      await onAddTime({
        date,
        startTime,
        endTime,
        duration,
        description: description.trim() || 'Work',
      });
      setStartTime('09:00');
      setEndTime('17:00');
      setDescription('');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveTime = (entryId: string) => {
    Alert.alert('Remove Time Entry', 'Delete this time entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onRemoveTime(entryId),
      },
    ]);
  };

  return (
    <Modal visible={visible} title="Time Tracking" onClose={onClose}>
      <View style={styles.container}>
        {/* Total Hours Summary */}
        <Card style={{ backgroundColor: colors.primary + '20', marginBottom: 16 }}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Total Hours Worked
              </Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {totalHours.toFixed(1)} hrs
              </Text>
            </View>
            <Ionicons name="time" size={40} color={colors.primary} />
          </View>
        </Card>

        {/* Add Time Entry */}
        <Card style={{ marginBottom: 16, padding: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Time Entry</Text>

          {/* Date */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <TouchableOpacity
              style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <Ionicons name="calendar" size={18} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(new Date(date), 'MMM d, yyyy')}</Text>
            </TouchableOpacity>
          </View>

          {/* Start Time */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Start Time</Text>
            <View style={[styles.timeInput, { borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="09:00"
                placeholderTextColor={colors.textSecondary}
                value={startTime}
                onChangeText={setStartTime}
                maxLength={5}
              />
            </View>
          </View>

          {/* End Time */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>End Time</Text>
            <View style={[styles.timeInput, { borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="17:00"
                placeholderTextColor={colors.textSecondary}
                value={endTime}
                onChangeText={setEndTime}
                maxLength={5}
              />
            </View>
          </View>

          {/* Duration Display */}
          <View style={styles.durationBox}>
            <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>Duration</Text>
            <Text style={[styles.durationValue, { color: colors.primary }]}>
              {(calculateDuration() / 60).toFixed(1)} hrs
            </Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.descriptionInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="What did you work on?"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />
          </View>

          <Button
            title={adding ? 'Adding...' : 'Add Entry'}
            onPress={handleAddTime}
            disabled={adding}
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* Time Entries List */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>
            Recent Entries
          </Text>
          <FlatList
            data={timeEntries}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No time entries yet
              </Text>
            }
            renderItem={({ item }) => (
              <Card
                style={{
                  marginBottom: 8,
                  backgroundColor: colors.background,
                  paddingVertical: 10,
                }}
              >
                <View style={styles.entryHeader}>
                  <View>
                    <Text style={[styles.entryDate, { color: colors.text }]}>
                      {formatDate(new Date(item.date), 'MMM d')}
                    </Text>
                    <Text style={[styles.entryTime, { color: colors.textSecondary }]}>
                      {item.startTime} - {item.endTime}
                    </Text>
                  </View>
                  <View style={styles.entryRight}>
                    <Text style={[styles.entryDuration, { color: colors.primary }]}>
                      {(item.duration / 60).toFixed(1)}h
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveTime(item.id)}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
                {item.description && (
                  <Text style={[styles.entryDescription, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>
                )}
              </Card>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 12,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  durationBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  durationLabel: {
    fontSize: 12,
  },
  durationValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDate: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  entryTime: {
    fontSize: 11,
  },
  entryRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  entryDuration: {
    fontSize: 13,
    fontWeight: '600',
  },
  entryDescription: {
    fontSize: 11,
    marginTop: 6,
  },
});
