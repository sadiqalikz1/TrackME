import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Modal } from './Modal';
import { Button } from './Button';
import { formatDate } from '@/utils/formatters';

interface DateTimePickerProps {
  visible: boolean;
  onClose: () => void;
  onDateTimeSelected: (date: Date, time: string) => void;
  initialDate?: Date;
  initialTime?: string;
  title?: string;
  showTime?: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  visible,
  onClose,
  onDateTimeSelected,
  initialDate,
  initialTime,
  title = 'Select Date & Time',
  showTime = true,
}) => {
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [selectedTime, setSelectedTime] = useState(initialTime || '12:00');
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const currentDayCount = daysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= currentDayCount; i++) {
    days.push(i);
  }

  const handleDateSelect = (day: number | null) => {
    if (day === null) return;
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);
  };

  const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
    const [hour, minute] = selectedTime.split(':');
    if (type === 'hour') {
      const newHour = Math.min(23, Math.max(0, parseInt(value) || 0)).toString().padStart(2, '0');
      setSelectedTime(`${newHour}:${minute}`);
    } else {
      const newMinute = Math.min(59, Math.max(0, parseInt(value) || 0)).toString().padStart(2, '0');
      setSelectedTime(`${hour}:${newMinute}`);
    }
  };

  const handleConfirm = () => {
    onDateTimeSelected(selectedDate, selectedTime);
    onClose();
  };

  const handlePreviousMonth = () => {
    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    setSelectedDate(prevDate);
  };

  const handleNextMonth = () => {
    const nextDate = new Date(currentYear, currentMonth + 1, 1);
    setSelectedDate(nextDate);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  const isTimeValid = timeRegex.test(selectedTime);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <View style={styles.modalFooter}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            style={styles.footerButton}
          />
          <Button
            title="Confirm"
            onPress={handleConfirm}
            style={styles.footerButton}
          />
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Current Selection Display */}
        <View style={[styles.selectionDisplay, { backgroundColor: colors.primary + '15' }]}>
          <View>
            <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>Date</Text>
            <Text style={[styles.displayValue, { color: colors.primary }]}>
              {formatDate(selectedDate, 'MMM dd, yyyy')}
            </Text>
          </View>
          {showTime && (
            <View>
              <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>Time</Text>
              <Text style={[styles.displayValue, { color: colors.primary }]}>
                {selectedTime}
              </Text>
            </View>
          )}
        </View>

        {/* Month Navigation */}
        <View style={[styles.monthHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowMonthPicker(!showMonthPicker)}
            style={styles.monthButton}
          >
            <Text style={[styles.monthText, { color: colors.text }]}>
              {monthNames[currentMonth]} {currentYear}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Month/Year Selector */}
        {showMonthPicker && (
          <View style={[styles.monthPickerContainer, { backgroundColor: colors.card }]}>
            <View style={styles.monthPickerRow}>
              {monthNames.map((month, idx) => (
                <TouchableOpacity
                  key={month}
                  onPress={() => {
                    const newDate = new Date(currentYear, idx, 1);
                    setSelectedDate(newDate);
                    setShowMonthPicker(false);
                  }}
                  style={[
                    styles.monthOption,
                    {
                      backgroundColor: idx === currentMonth ? colors.primary : colors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.monthOptionText,
                      { color: idx === currentMonth ? '#ffffff' : colors.text },
                    ]}
                  >
                    {month.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Year Selector */}
            <View style={[styles.yearSelector, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setSelectedDate(new Date(currentYear - 1, currentMonth, 1))}
                style={styles.yearButton}
              >
                <Ionicons name="remove" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: colors.text }]}>{currentYear}</Text>
              <TouchableOpacity
                onPress={() => setSelectedDate(new Date(currentYear + 1, currentMonth, 1))}
                style={styles.yearButton}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Calendar Grid */}
        <View style={[styles.calendarContainer, { backgroundColor: colors.card }]}>
          {/* Day Headers */}
          <View style={styles.dayHeaderRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text
                key={day}
                style={[styles.dayHeader, { color: colors.textSecondary }]}
              >
                {day}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {days.map((day: number | null, idx: number) => {
              const isToday =
                day !== null &&
                new Date().toDateString() === new Date(currentYear, currentMonth, day as number).toDateString();
              const isSelected =
                day !== null &&
                selectedDate.toDateString() === new Date(currentYear, currentMonth, day as number).toDateString();

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleDateSelect(day as number)}
                  disabled={day === null}
                  style={[
                    styles.dayButton,
                    isSelected && [styles.dayButtonSelected, { backgroundColor: colors.primary }],
                    isToday && !isSelected && [styles.dayButtonToday, { borderColor: colors.primary }],
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && { color: '#ffffff' },
                      isToday && !isSelected && { color: colors.primary },
                      !isSelected && !isToday && { color: colors.text },
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Time Picker */}
        {showTime && (
          <View style={[styles.timePickerContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.timeLabel, { color: colors.text }]}>Time</Text>
            <View style={styles.timeInputRow}>
              <View style={styles.timeInputGroup}>
                <Text style={[styles.timeInputLabel, { color: colors.textSecondary }]}>
                  Hour
                </Text>
                <View
                  style={[
                    styles.timeInput,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() =>
                      handleTimeChange(
                        'hour',
                        (parseInt(selectedTime.split(':')[0]) - 1).toString()
                      )
                    }
                  >
                    <Ionicons name="remove" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.timeValue, { color: colors.text }]}>
                    {selectedTime.split(':')[0]}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      handleTimeChange(
                        'hour',
                        (parseInt(selectedTime.split(':')[0]) + 1).toString()
                      )
                    }
                  >
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>

              <View style={styles.timeInputGroup}>
                <Text style={[styles.timeInputLabel, { color: colors.textSecondary }]}>
                  Minute
                </Text>
                <View
                  style={[
                    styles.timeInput,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() =>
                      handleTimeChange(
                        'minute',
                        (parseInt(selectedTime.split(':')[1]) - 5).toString()
                      )
                    }
                  >
                    <Ionicons name="remove" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.timeValue, { color: colors.text }]}>
                    {selectedTime.split(':')[1]}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      handleTimeChange(
                        'minute',
                        (parseInt(selectedTime.split(':')[1]) + 5).toString()
                      )
                    }
                  >
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectionDisplay: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  displayLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  displayValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  monthPickerContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  monthPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthOption: {
    width: '22%',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  monthOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  yearButton: {
    padding: 8,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
  },
  calendarContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: '600',
    width: '14.28%',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderRadius: 8,
  },
  dayButtonSelected: {
    backgroundColor: '#3b82f6',
  },
  dayButtonToday: {
    borderWidth: 2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timePickerContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 12,
  },
  timeInputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  timeInputLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: '100%',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 4,
    minWidth: 30,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  footerButton: {
    flex: 1,
  },
});
