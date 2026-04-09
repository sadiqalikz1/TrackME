import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, useAuth, useNotification } from '@/contexts';
import {
  Card,
  Button,
  ProgressBar,
  Modal,
  Input,
  ProfitTransferModal,
  TimeEntryModal,
  DetailedExpenseModal,
  WorkPaymentModal,
  AdditionalWorkModal,
} from '@/components/ui';
import { Work, Transaction, TransactionCategory, DetailedExpense, TimeEntry, WorkPayment, AdditionalWork } from '@/types';
import { workService, transactionService } from '@/services/dataService';
import { WORK_CATEGORIES, STATUS_COLORS, COLLECTIONS, EXPENSE_TYPES } from '@/utils/constants';
import { formatCurrency, formatDate, formatPercentage, calculateProfit } from '@/utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WorkDetailScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { workId } = route.params as { workId: string };

  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [additionalWorkModalVisible, setAdditionalWorkModalVisible] = useState(false);

  const currency = user?.currency || 'USD';

  useEffect(() => {
    loadWork();
  }, [workId]);

  const loadWork = async () => {
    try {
      const data = await workService.getById(workId);
      setWork(data);
    } catch (error) {
      showError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && work) {
        const newPhotos = [...work.photos, result.assets[0].uri];
        await workService.update(work.id, { photos: newPhotos });
        setWork({ ...work, photos: newPhotos });
        showSuccess('Photo added');
      }
    } catch (error) {
      showError('Failed to add photo');
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!work) return;
          const newPhotos = work.photos.filter((_, i) => i !== index);
          await workService.update(work.id, { photos: newPhotos });
          setWork({ ...work, photos: newPhotos });
          showSuccess('Photo removed');
        },
      },
    ]);
  };

  const handleMarkComplete = async () => {
    if (!work) return;

    Alert.alert('Mark as Complete', 'Are you sure this project is completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            await workService.update(work.id, {
              status: 'completed',
              progress: 100,
              endDate: new Date(),
            });
            setWork({ ...work, status: 'completed', progress: 100, endDate: new Date() });
            showSuccess('Project marked as complete!');
          } catch (error) {
            showError('Failed to update project');
          }
        },
      },
    ]);
  };

  const handleTransferProfit = () => {
    if (!work || work.isProfitTransferred || work.profit <= 0) return;
    setTransferModalVisible(true);
  };

  const handleTransferProfitSubmit = async (data: {
    amount: number;
    category: TransactionCategory;
    bankAccount: string;
  }) => {
    if (!work) return;

    try {
      // Create income transaction
      const transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
        uid: user!.uid,
        amount: data.amount,
        type: 'income',
        category: data.category,
        note: `Profit from: ${work.title}`,
        date: new Date().toISOString().split('T')[0],
        isRecurring: false,
        bankAccount: data.bankAccount,
        workId: work.id,
      };

      await transactionService.create(transaction);

      // Mark as transferred
      await workService.update(work.id, {
        isProfitTransferred: true,
        profitTransferredAmount: data.amount,
        profitTransferredDate: new Date(),
        profitTransferredTo: data.bankAccount,
      });

      setWork({
        ...work,
        isProfitTransferred: true,
        profitTransferredAmount: data.amount,
        profitTransferredDate: new Date(),
        profitTransferredTo: data.bankAccount,
      });

      showSuccess('Profit transferred to income!');
      setTransferModalVisible(false);
    } catch (error) {
      console.error('Transfer error:', error);
      showError(error instanceof Error ? error.message : 'Failed to transfer profit');
    }
  };

  const handleAddTimeEntry = async (entry: Omit<TimeEntry, 'id' | 'hoursWorked'>) => {
    if (!work) return;
    const newEntry: TimeEntry = {
      ...entry,
      id: Date.now().toString(),
      hoursWorked: entry.duration / 60,
    };
    const timeEntries = [...(work.timeEntries || []), newEntry];
    const totalHours = timeEntries.reduce((sum, t) => sum + t.hoursWorked, 0);

    try {
      await workService.update(work.id, {
        timeEntries,
        totalHoursWorked: totalHours,
      });
      setWork({ ...work, timeEntries, totalHoursWorked: totalHours });
      showSuccess('Time entry added');
    } catch (error) {
      showError('Failed to add time entry');
    }
  };

  const handleRemoveTimeEntry = async (entryId: string) => {
    if (!work) return;
    const timeEntries = work.timeEntries?.filter((t) => t.id !== entryId) || [];
    const totalHours = timeEntries.reduce((sum, t) => sum + t.hoursWorked, 0);

    try {
      await workService.update(work.id, {
        timeEntries,
        totalHoursWorked: totalHours,
      });
      setWork({ ...work, timeEntries, totalHoursWorked: totalHours });
      showSuccess('Time entry removed');
    } catch (error) {
      showError('Failed to remove time entry');
    }
  };

  const handleAddExpense = async (expense: Omit<DetailedExpense, 'id'>) => {
    if (!work) return;
    const newExpense: DetailedExpense = {
      ...expense,
      id: Date.now().toString(),
    };
    const detailedExpenses = [...(work.detailedExpenses || []), newExpense];
    
    // Recalculate total expenses
    const materialTotal = detailedExpenses
      .filter((e) => e.type === 'materials')
      .reduce((sum, e) => sum + e.amount, 0);
    const transportTotal = detailedExpenses
      .filter((e) => e.type === 'transportation')
      .reduce((sum, e) => sum + e.amount, 0);
    const laborTotal = detailedExpenses
      .filter((e) => e.type === 'labor')
      .reduce((sum, e) => sum + e.amount, 0);
    const otherTotal = detailedExpenses
      .filter((e) => e.type === 'other')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = materialTotal + transportTotal + laborTotal + otherTotal;

    try {
      const profit = calculateProfit(
        work.quotationAmount,
        work.workingCost + totalExpenses,
        totalExpenses
      );

      await workService.update(work.id, {
        detailedExpenses,
        materialCost: materialTotal,
        transportationCost: transportTotal,
        laborCost: laborTotal,
        otherExpenses: otherTotal,
        expenses: totalExpenses,
        profit,
      });

      setWork({
        ...work,
        detailedExpenses,
        materialCost: materialTotal,
        transportationCost: transportTotal,
        laborCost: laborTotal,
        otherExpenses: otherTotal,
        expenses: totalExpenses,
        profit,
      });

      showSuccess('Expense added');
    } catch (error) {
      showError('Failed to add expense');
    }
  };

  const handleRemoveExpense = async (expenseId: string) => {
    if (!work) return;
    const detailedExpenses = work.detailedExpenses?.filter((e) => e.id !== expenseId) || [];

    const materialTotal = detailedExpenses
      .filter((e) => e.type === 'materials')
      .reduce((sum, e) => sum + e.amount, 0);
    const transportTotal = detailedExpenses
      .filter((e) => e.type === 'transportation')
      .reduce((sum, e) => sum + e.amount, 0);
    const laborTotal = detailedExpenses
      .filter((e) => e.type === 'labor')
      .reduce((sum, e) => sum + e.amount, 0);
    const otherTotal = detailedExpenses
      .filter((e) => e.type === 'other')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = materialTotal + transportTotal + laborTotal + otherTotal;

    try {
      const profit = calculateProfit(
        work.quotationAmount,
        work.workingCost + totalExpenses,
        totalExpenses
      );

      await workService.update(work.id, {
        detailedExpenses,
        materialCost: materialTotal,
        transportationCost: transportTotal,
        laborCost: laborTotal,
        otherExpenses: otherTotal,
        expenses: totalExpenses,
        profit,
      });

      setWork({
        ...work,
        detailedExpenses,
        materialCost: materialTotal,
        transportationCost: transportTotal,
        laborCost: laborTotal,
        otherExpenses: otherTotal,
        expenses: totalExpenses,
        profit,
      });

      showSuccess('Expense removed');
    } catch (error) {
      showError('Failed to remove expense');
    }
  };

  // Payment handlers
  const handleAddPayment = async (payment: Omit<WorkPayment, 'id'>) => {
    if (!work) return;
    const newPayment: WorkPayment = {
      ...payment,
      id: Date.now().toString(),
    };
    const payments = [...(work.payments || []), newPayment];
    const totalPaymentsReceived = payments.reduce((sum, p) => sum + p.amount, 0);

    try {
      await workService.update(work.id, {
        payments,
        totalPaymentsReceived,
      });
      setWork({ ...work, payments, totalPaymentsReceived });
      showSuccess('Payment added');
    } catch (error) {
      showError('Failed to add payment');
    }
  };

  const handleRemovePayment = async (paymentId: string) => {
    if (!work) return;
    const payments = work.payments?.filter((p) => p.id !== paymentId) || [];
    const totalPaymentsReceived = payments.reduce((sum, p) => sum + p.amount, 0);

    try {
      await workService.update(work.id, {
        payments,
        totalPaymentsReceived,
      });
      setWork({ ...work, payments, totalPaymentsReceived });
      showSuccess('Payment removed');
    } catch (error) {
      showError('Failed to remove payment');
    }
  };

  // Additional work handlers
  const handleAddAdditionalWork = async (additionalWork: Omit<AdditionalWork, 'id'>) => {
    if (!work) return;
    const newWork: AdditionalWork = {
      ...additionalWork,
      id: Date.now().toString(),
    };
    const additionalWorks = [...(work.additionalWorks || []), newWork];
    const totalAdditionalAmount = additionalWorks.reduce((sum, w) => sum + w.amount, 0);

    try {
      await workService.update(work.id, {
        additionalWorks,
        totalAdditionalAmount,
      });
      setWork({ ...work, additionalWorks, totalAdditionalAmount });
      showSuccess('Additional work added');
    } catch (error) {
      showError('Failed to add additional work');
    }
  };

  const handleRemoveAdditionalWork = async (workId: string) => {
    if (!work) return;
    const additionalWorks = work.additionalWorks?.filter((w) => w.id !== workId) || [];
    const totalAdditionalAmount = additionalWorks.reduce((sum, w) => sum + w.amount, 0);

    try {
      await workService.update(work.id, {
        additionalWorks,
        totalAdditionalAmount,
      });
      setWork({ ...work, additionalWorks, totalAdditionalAmount });
      showSuccess('Additional work removed');
    } catch (error) {
      showError('Failed to remove additional work');
    }
  };


  const handleDelete = () => {
    Alert.alert('Delete Project', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await workService.delete(workId);
            showSuccess('Project deleted');
            navigation.goBack();
          } catch (error) {
            showError('Failed to delete project');
          }
        },
      },
    ]);
  };

  if (loading || !work) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  const category = WORK_CATEGORIES[work.category];
  const status = STATUS_COLORS[work.status];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {work.title}
          </Text>
          <View style={styles.headerMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: category.color + '20' }]}>
              <Ionicons name={category.icon as any} size={14} color={category.color} />
              <Text style={[styles.categoryText, { color: category.color }]}>{category.label}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress Section */}
        <Card style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Progress</Text>
            <Text style={[styles.progressPercent, { color: colors.primary }]}>
              {formatPercentage(work.progress, 0)}
            </Text>
          </View>
          <ProgressBar progress={work.progress} color={status.color} height={12} />
          {work.status !== 'completed' && (
            <Button
              title="Mark as Complete"
              variant="success"
              onPress={handleMarkComplete}
              style={styles.completeButton}
              icon={<Ionicons name="checkmark-circle" size={20} color="#fff" />}
            />
          )}
        </Card>

        {/* Financial Breakdown */}
        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Financial Breakdown</Text>
          
          <View style={styles.financialRow}>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: colors.textMuted }]}>Quotation</Text>
              <Text style={[styles.financialValue, { color: colors.text }]}>
                {formatCurrency(work.quotationAmount, currency)}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.financialRow}>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: colors.textMuted }]}>Working Cost</Text>
              <Text style={[styles.financialValue, { color: colors.danger }]}>
                -{formatCurrency(work.workingCost, currency)}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: colors.textMuted }]}>Material Cost</Text>
              <Text style={[styles.financialValue, { color: colors.danger }]}>
                -{formatCurrency(work.materialCost || 0, currency)}
              </Text>
            </View>
          </View>

          <View style={styles.financialRow}>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: colors.textMuted }]}>Transport</Text>
              <Text style={[styles.financialValue, { color: colors.danger }]}>
                -{formatCurrency(work.transportationCost || 0, currency)}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: colors.textMuted }]}>Other Expenses</Text>
              <Text style={[styles.financialValue, { color: colors.danger }]}>
                -{formatCurrency(work.otherExpenses || 0, currency)}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.financialRow}>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: colors.textMuted }]}>Expenses</Text>
              <Text style={[styles.financialValue, { color: colors.danger }]}>
                -{formatCurrency(work.expenses, currency)}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.profitRow}>
            <Text style={[styles.profitLabel, { color: colors.text }]}>Net Profit</Text>
            <Text
              style={[
                styles.profitValue,
                { color: work.profit >= 0 ? colors.success : colors.danger },
              ]}
            >
              {formatCurrency(work.profit, currency)}
            </Text>
          </View>

          {work.status === 'completed' && !work.isProfitTransferred && work.profit > 0 && (
            <Button
              title="Transfer Profit as Income"
              onPress={handleTransferProfit}
              style={styles.transferButton}
              icon={<Ionicons name="arrow-forward-circle" size={20} color="#fff" />}
            />
          )}
          {work.isProfitTransferred && (
            <View style={[styles.transferredBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.transferredText, { color: colors.success }]}>
                Profit transferred
              </Text>
            </View>
          )}
        </Card>

        {/* Time Tracking */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Time Tracking</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                {work.totalHoursWorked || 0} hours tracked
              </Text>
            </View>
            <TouchableOpacity onPress={() => setTimeModalVisible(true)}>
              <Ionicons name="time" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Button
            title="Add/View Time Entries"
            variant="secondary"
            onPress={() => setTimeModalVisible(true)}
            icon={<Ionicons name="add-circle" size={18} color={colors.primary} />}
          />
        </Card>

        {/* Detailed Expenses Tracking */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Expense Details</Text>
              <View style={styles.expenseBreakdown}>
                <View style={styles.expenseItem}>
                  <Text style={[styles.expenseItemLabel, { color: colors.textSecondary }]}>
                    Materials:
                  </Text>
                  <Text style={[styles.expenseItemValue, { color: colors.text }]}>
                    {formatCurrency(work.materialCost || 0, currency)}
                  </Text>
                </View>
                <View style={styles.expenseItem}>
                  <Text style={[styles.expenseItemLabel, { color: colors.textSecondary }]}>
                    Transport:
                  </Text>
                  <Text style={[styles.expenseItemValue, { color: colors.text }]}>
                    {formatCurrency(work.transportationCost || 0, currency)}
                  </Text>
                </View>
                <View style={styles.expenseItem}>
                  <Text style={[styles.expenseItemLabel, { color: colors.textSecondary }]}>
                    Other:
                  </Text>
                  <Text style={[styles.expenseItemValue, { color: colors.text }]}>
                    {formatCurrency(work.otherExpenses || 0, currency)}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => setExpenseModalVisible(true)}>
              <Ionicons name="receipt" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Button
            title="Add/View Expenses"
            variant="secondary"
            onPress={() => setExpenseModalVisible(true)}
            icon={<Ionicons name="add-circle" size={18} color={colors.primary} />}
          />
        </Card>

        {/* Income Payments Tracking */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Income Payments</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                {work.payments?.length || 0} payments received
              </Text>
            </View>
            <TouchableOpacity onPress={() => setPaymentModalVisible(true)}>
              <Ionicons name="wallet" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Button
            title="Add/View Payments"
            variant="secondary"
            onPress={() => setPaymentModalVisible(true)}
            icon={<Ionicons name="add-circle" size={18} color={colors.primary} />}
          />
        </Card>

        {/* Additional Works */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Additional Works</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                {work.additionalWorks?.length || 0} items added
              </Text>
            </View>
            <TouchableOpacity onPress={() => setAdditionalWorkModalVisible(true)}>
              <Ionicons name="hammer" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Button
            title="Add/View Works"
            variant="secondary"
            onPress={() => setAdditionalWorkModalVisible(true)}
            icon={<Ionicons name="add-circle" size={18} color={colors.primary} />}
          />
        </Card>

        {/* Description */}
        {work.description && (
          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {work.description}
            </Text>
          </Card>
        )}

        {/* Photos */}
        <Card style={styles.card}>
          <View style={styles.photosHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Photos</Text>
            <TouchableOpacity onPress={handleAddPhoto} style={styles.addPhotoButton}>
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={[styles.addPhotoText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>
          {work.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {work.photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onLongPress={() => handleRemovePhoto(index)}
                  style={styles.photoContainer}
                >
                  <Image source={{ uri: photo }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.noPhotos, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="images-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.noPhotosText, { color: colors.textMuted }]}>
                No photos added yet
              </Text>
            </View>
          )}
        </Card>

        {/* Timeline */}
        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Timeline</Text>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineLabel, { color: colors.textMuted }]}>Started</Text>
              <Text style={[styles.timelineValue, { color: colors.text }]}>
                {formatDate(work.startDate, 'MMMM d, yyyy')}
              </Text>
            </View>
          </View>
          {work.endDate && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: colors.success }]} />
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, { color: colors.textMuted }]}>Completed</Text>
                <Text style={[styles.timelineValue, { color: colors.text }]}>
                  {formatDate(work.endDate, 'MMMM d, yyyy')}
                </Text>
              </View>
            </View>
          )}
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <ProfitTransferModal
        visible={transferModalVisible}
        profit={work.profit}
        onClose={() => setTransferModalVisible(false)}
        onTransfer={handleTransferProfitSubmit}
      />

      <TimeEntryModal
        visible={timeModalVisible}
        timeEntries={work.timeEntries || []}
        totalHours={work.totalHoursWorked || 0}
        onClose={() => setTimeModalVisible(false)}
        onAddTime={handleAddTimeEntry}
        onRemoveTime={handleRemoveTimeEntry}
      />

      <DetailedExpenseModal
        visible={expenseModalVisible}
        expenses={work.detailedExpenses || []}
        onClose={() => setExpenseModalVisible(false)}
        onAddExpense={handleAddExpense}
        onRemoveExpense={handleRemoveExpense}
      />

      <WorkPaymentModal
        visible={paymentModalVisible}
        payments={work.payments || []}
        onClose={() => setPaymentModalVisible(false)}
        onAddPayment={handleAddPayment}
        onRemovePayment={handleRemovePayment}
      />

      <AdditionalWorkModal
        visible={additionalWorkModalVisible}
        additionalWorks={work.additionalWorks || []}
        onClose={() => setAdditionalWorkModalVisible(false)}
        onAddWork={handleAddAdditionalWork}
        onRemoveWork={handleRemoveAdditionalWork}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '700',
  },
  completeButton: {
    marginTop: 16,
  },
  financialRow: {
    flexDirection: 'row',
    gap: 16,
  },
  financialItem: {
    flex: 1,
  },
  financialLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  profitValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  transferButton: {
    marginTop: 16,
  },
  transferredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  transferredText: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  photoContainer: {
    marginRight: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  noPhotos: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 12,
  },
  noPhotosText: {
    fontSize: 14,
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineContent: {
    marginLeft: 12,
  },
  timelineLabel: {
    fontSize: 12,
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  expenseBreakdown: {
    marginTop: 8,
    gap: 4,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  expenseItemLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  expenseItemValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default WorkDetailScreen;
