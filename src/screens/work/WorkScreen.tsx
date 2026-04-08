import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Modal, Button, Input, EmptyState, ProgressBar } from '@/components/ui';
import { WorkCard } from '@/components/common';
import { Work, WorkCategory, WorkStatus, WorkFormData } from '@/types';
import { WORK_CATEGORIES, WORK_STATUS_OPTIONS, STATUS_COLORS } from '@/utils/constants';
import { parseCurrencyInput, isValidAmount, calculateProfit } from '@/utils/formatters';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
} from '@/services/firebase';
import { where, orderBy, Timestamp } from 'firebase/firestore';

const WorkScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [works, setWorks] = useState<Work[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState<WorkFormData>({
    title: '',
    description: '',
    category: 'other',
    status: 'pending',
    quotationAmount: '',
    workingCost: '',
    expenses: '',
    startDate: new Date(),
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToCollection<Work>(
      'works',
      [where('uid', '==', user.uid), orderBy('createdAt', 'desc')],
      (data) => {
        setWorks(
          data.map((w) => ({
            ...w,
            startDate: typeof (w.startDate as any)?.toDate === 'function' ? (w.startDate as any).toDate() : new Date(w.startDate),
            endDate: typeof (w.endDate as any)?.toDate === 'function' ? (w.endDate as any).toDate() : undefined,
            createdAt: typeof (w.createdAt as any)?.toDate === 'function' ? (w.createdAt as any).toDate() : new Date(),
            updatedAt: typeof (w.updatedAt as any)?.toDate === 'function' ? (w.updatedAt as any).toDate() : new Date(),
          }))
        );
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredWorks = useMemo(() => {
    if (statusFilter === 'all') return works;
    return works.filter((w) => w.status === statusFilter);
  }, [works, statusFilter]);

  const stats = useMemo(() => {
    const totalQuotation = works.reduce((sum, w) => sum + w.quotationAmount, 0);
    const totalProfit = works
      .filter((w) => w.status === 'completed')
      .reduce((sum, w) => sum + w.profit, 0);
    const activeCount = works.filter((w) => w.status === 'in-progress').length;
    const completedCount = works.filter((w) => w.status === 'completed').length;

    return { totalQuotation, totalProfit, activeCount, completedCount };
  }, [works]);

  const openAddModal = () => {
    setEditingWork(null);
    setFormData({
      title: '',
      description: '',
      category: 'other',
      status: 'pending',
      quotationAmount: '',
      workingCost: '',
      expenses: '',
      startDate: new Date(),
    });
    setProgress(0);
    setModalVisible(true);
  };

  const openEditModal = (work: Work) => {
    setEditingWork(work);
    setFormData({
      title: work.title,
      description: work.description,
      category: work.category,
      status: work.status,
      quotationAmount: work.quotationAmount.toString(),
      workingCost: work.workingCost.toString(),
      expenses: work.expenses.toString(),
      startDate: new Date(work.startDate),
      endDate: work.endDate ? new Date(work.endDate) : undefined,
    });
    setProgress(work.progress);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.title.trim()) {
      showError('Please enter a title');
      return;
    }

    try {
      const quotation = parseCurrencyInput(formData.quotationAmount) || 0;
      const workingCost = parseCurrencyInput(formData.workingCost) || 0;
      const expenses = parseCurrencyInput(formData.expenses) || 0;
      const profit = calculateProfit(quotation, workingCost, expenses);

      const workData = {
        uid: user.uid,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        status: formData.status,
        quotationAmount: quotation,
        finalAmount: quotation,
        workingCost,
        expenses,
        profit,
        progress,
        photos: editingWork?.photos || [],
        isProfitTransferred: editingWork?.isProfitTransferred || false,
        startDate: Timestamp.fromDate(formData.startDate),
        endDate: formData.status === 'completed' ? Timestamp.fromDate(new Date()) : null,
      };

      if (editingWork) {
        await updateDocument('works', editingWork.id, workData);
        showSuccess('Work project updated');
      } else {
        await createDocument('works', workData);
        showSuccess('Work project created');
      }

      setModalVisible(false);
    } catch (error: any) {
      showError(error.message || 'Failed to save work project');
    }
  };

  const handleDelete = (work: Work) => {
    Alert.alert(
      'Delete Work Project',
      `Are you sure you want to delete "${work.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument('works', work.id);
              showSuccess('Work project deleted');
            } catch (error: any) {
              showError(error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.activeCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.completedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={[
            { value: 'all', label: 'All' },
            ...WORK_STATUS_OPTIONS,
          ]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    statusFilter === item.value
                      ? colors.primary
                      : colors.card,
                },
              ]}
              onPress={() => setStatusFilter(item.value as WorkStatus | 'all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === item.value ? '#fff' : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Work List */}
      <FlatList
        data={filteredWorks}
        renderItem={({ item }) => (
          <WorkCard work={item} onPress={() => openEditModal(item)} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-outline"
            title="No work projects"
            description="Start tracking your professional projects"
            action={<Button title="Add Project" onPress={openAddModal} />}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingWork ? 'Edit Project' : 'New Project'}
        size="lg"
        footer={
          <View style={styles.modalFooter}>
            {editingWork && (
              <Button
                title="Delete"
                variant="danger"
                onPress={() => {
                  setModalVisible(false);
                  handleDelete(editingWork);
                }}
                style={{ flex: 1 }}
              />
            )}
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setModalVisible(false)}
              style={{ flex: 1 }}
            />
            <Button title="Save" onPress={handleSave} style={{ flex: 2 }} />
          </View>
        }
      >
        <Input
          label="Title"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          placeholder="Project name..."
          variant="filled"
        />

        <Input
          label="Description"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Brief description..."
          multiline
          numberOfLines={3}
          variant="filled"
        />

        {/* Category Selector */}
        <Text style={[styles.label, { color: colors.text }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {Object.entries(WORK_CATEGORIES).map(([key, { label, color }]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: formData.category === key ? color : colors.card,
                  borderColor: color,
                },
              ]}
              onPress={() => setFormData({ ...formData, category: key as WorkCategory })}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: formData.category === key ? '#fff' : color },
                ]}
              >
                {label.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Selector */}
        <Text style={[styles.label, { color: colors.text }]}>Status</Text>
        <View style={styles.statusGrid}>
          {WORK_STATUS_OPTIONS.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.statusChip,
                {
                  backgroundColor:
                    formData.status === value ? STATUS_COLORS[value as WorkStatus] : colors.card,
                },
              ]}
              onPress={() => setFormData({ ...formData, status: value as WorkStatus })}
            >
              <Text
                style={[
                  styles.statusChipText,
                  { color: formData.status === value ? '#fff' : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Financial Inputs */}
        <View style={styles.row}>
          <Input
            label="Quotation"
            value={formData.quotationAmount}
            onChangeText={(text) => setFormData({ ...formData, quotationAmount: text })}
            keyboardType="decimal-pad"
            placeholder="0.00"
            containerStyle={{ flex: 1 }}
            variant="filled"
          />
          <View style={{ width: 12 }} />
          <Input
            label="Working Cost"
            value={formData.workingCost}
            onChangeText={(text) => setFormData({ ...formData, workingCost: text })}
            keyboardType="decimal-pad"
            placeholder="0.00"
            containerStyle={{ flex: 1 }}
            variant="filled"
          />
        </View>

        <Input
          label="Expenses"
          value={formData.expenses}
          onChangeText={(text) => setFormData({ ...formData, expenses: text })}
          keyboardType="decimal-pad"
          placeholder="0.00"
          variant="filled"
        />

        {/* Progress Slider */}
        <Text style={[styles.label, { color: colors.text }]}>Progress: {progress}%</Text>
        <ProgressBar progress={progress} />
        <View style={styles.progressButtons}>
          {[0, 25, 50, 75, 100].map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.progressButton,
                {
                  backgroundColor: progress === val ? colors.primary : colors.card,
                },
              ]}
              onPress={() => setProgress(val)}
            >
              <Text
                style={{ color: progress === val ? '#fff' : colors.textSecondary, fontSize: 12 }}
              >
                {val}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  filterContainer: {
    paddingVertical: 12,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
  progressButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
  },
  progressButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
});

export default WorkScreen;
