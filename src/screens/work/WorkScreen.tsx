import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth, useNotification } from '@/contexts';
import { Card, Input, Modal, Button, EmptyState } from '@/components/ui';
import { WorkCard } from '@/components/common';
import { Work, WorkCategory, WorkStatus } from '@/types';
import { workService } from '@/services/dataService';
import { useData } from '@/hooks';
import { COLLECTIONS, WORK_CATEGORIES, STATUS_COLORS, PROGRESS_STEPS } from '@/utils/constants';
import { parseCurrencyInput, isValidAmount, calculateProfit, formatCurrency } from '@/utils/formatters';

const WorkScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Use hook for data fetching through service layer (not direct Firebase)
  const { data: worksData, loading, refetch } = useData('work');

  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all');

  // Ensure works is an array
  const works = Array.isArray(worksData) ? worksData : [];

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WorkCategory>('cctv');
  const [status, setStatus] = useState<WorkStatus>('pending');
  const [quotation, setQuotation] = useState('');
  const [workingCost, setWorkingCost] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [expenses, setExpenses] = useState('');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const filteredWorks = useMemo(() => {
    if (statusFilter === 'all') return works;
    return works.filter((w) => w.status === statusFilter);
  }, [works, statusFilter]);

  const stats = useMemo(() => {
    const activeCount = works.filter((w) => w.status !== 'completed' && w.status !== 'cancelled').length;
    const completedCount = works.filter((w) => w.status === 'completed').length;
    return { activeCount, completedCount };
  }, [works]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditingWork(null);
    setTitle('');
    setDescription('');
    setCategory('cctv');
    setStatus('pending');
    setQuotation('');
    setWorkingCost('');
    setMaterialCost('');
    setExpenses('');
    setProgress(0);
    setModalVisible(true);
  };

  const openEditModal = (work: Work) => {
    setEditingWork(work);
    setTitle(work.title);
    setDescription(work.description);
    setCategory(work.category);
    setStatus(work.status);
    setQuotation(work.quotationAmount.toString());
    setWorkingCost(work.workingCost.toString());
    setMaterialCost(work.materialCost?.toString() || '');
    setExpenses(work.expenses.toString());
    setProgress(work.progress);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showError('Please enter a title');
      return;
    }

    const parsedQuotation = parseCurrencyInput(quotation) || 0;
    const parsedWorkingCost = parseCurrencyInput(workingCost) || 0;
    const parsedMaterialCost = parseCurrencyInput(materialCost) || 0;
    const parsedExpenses = parseCurrencyInput(expenses) || 0;
    const profit = calculateProfit(parsedQuotation, parsedWorkingCost + parsedMaterialCost, parsedExpenses);

    setSaving(true);
    try {
      const workData: any = {
        uid: user!.uid,
        title: title.trim(),
        description: description.trim(),
        category,
        status,
        quotationAmount: parsedQuotation,
        finalAmount: parsedQuotation,
        workingCost: parsedWorkingCost,
        materialCost: parsedMaterialCost,
        transportationCost: editingWork?.transportationCost || 0,
        otherExpenses: editingWork?.otherExpenses || 0,
        expenses: parsedExpenses,
        detailedExpenses: editingWork?.detailedExpenses || [],
        profit,
        progress,
        totalHoursWorked: editingWork?.totalHoursWorked || 0,
        timeEntries: editingWork?.timeEntries || [],
        photos: editingWork?.photos || [],
        isProfitTransferred: editingWork?.isProfitTransferred || false,
        startDate: editingWork?.startDate || new Date(),
      };

      if (status === 'completed') {
        workData.endDate = new Date();
      }

      if (editingWork) {
        await workService.update(editingWork.id, workData);
        showSuccess('Project updated');
      } else {
        await workService.create(workData);
        showSuccess('Project created');
      }

      setModalVisible(false);
    } catch (error) {
      console.error('Save error:', error);
      showError(error instanceof Error ? error.message : 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingWork) return;

    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await workService.delete(editingWork.id);
              showSuccess('Project deleted');
              setModalVisible(false);
            } catch (error) {
              showError('Failed to delete project');
            }
          },
        },
      ]
    );
  };

  const openWorkDetail = (work: Work) => {
    (navigation as any).navigate('WorkDetail', { workId: work.id });
  };

  const renderStatusFilter = (filterStatus: WorkStatus | 'all', label: string) => {
    const isActive = statusFilter === filterStatus;
    const statusColor = filterStatus !== 'all' ? STATUS_COLORS[filterStatus].color : colors.primary;

    return (
      <TouchableOpacity
        onPress={() => setStatusFilter(filterStatus)}
        style={[
          styles.statusChip,
          {
            backgroundColor: isActive ? statusColor : colors.card,
            borderColor: isActive ? statusColor : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.statusChipText,
            { color: isActive ? '#ffffff' : colors.text },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Work Projects</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.activeCount}</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Active</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: colors.success + '20' }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.completedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.success }]}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {renderStatusFilter('all', 'All')}
        {renderStatusFilter('pending', 'Pending')}
        {renderStatusFilter('in-progress', 'In Progress')}
        {renderStatusFilter('completed', 'Completed')}
        {renderStatusFilter('cancelled', 'Cancelled')}
      </ScrollView>

      {/* Work List */}
      <FlatList
        data={filteredWorks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkCard
            work={item}
            onPress={() => openWorkDetail(item)}
            onLongPress={() => openEditModal(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-outline"
            title="No Projects"
            description="Start tracking your work projects"
            actionLabel="Add Project"
            onAction={openAddModal}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingWork ? 'Edit Project' : 'New Project'}
        size="large"
        footer={
          <View style={styles.modalFooter}>
            {editingWork && (
              <Button
                title="Delete"
                variant="danger"
                onPress={handleDelete}
                style={styles.deleteButton}
              />
            )}
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setModalVisible(false)}
              style={styles.footerButton}
            />
            <Button
              title={editingWork ? 'Update' : 'Create'}
              onPress={handleSave}
              loading={saving}
              style={styles.footerButton}
            />
          </View>
        }
      >
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="Project title" />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Project description"
          multiline
          numberOfLines={3}
        />

        {/* Category */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {Object.entries(WORK_CATEGORIES).map(([key, cat]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setCategory(key as WorkCategory)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: category === key ? cat.color : colors.inputBackground,
                  borderColor: category === key ? cat.color : colors.border,
                },
              ]}
            >
              <Ionicons
                name={cat.icon as any}
                size={18}
                color={category === key ? '#ffffff' : cat.color}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  { color: category === key ? '#ffffff' : colors.text },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
        <View style={styles.statusGrid}>
          {Object.entries(STATUS_COLORS).map(([key, stat]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setStatus(key as WorkStatus)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: status === key ? stat.color : colors.inputBackground,
                  borderColor: status === key ? stat.color : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: status === key ? '#ffffff' : colors.text },
                ]}
              >
                {stat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Financial */}
        <Input
          label="Quotation Amount"
          value={quotation}
          onChangeText={setQuotation}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <Input
          label="Working Cost"
          value={workingCost}
          onChangeText={setWorkingCost}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <Input
          label="Material Cost"
          value={materialCost}
          onChangeText={setMaterialCost}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <Input
          label="Additional Expenses"
          value={expenses}
          onChangeText={setExpenses}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        {/* Progress */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Progress</Text>
        <View style={styles.progressButtons}>
          {PROGRESS_STEPS.map((step) => (
            <TouchableOpacity
              key={step}
              onPress={() => setProgress(step)}
              style={[
                styles.progressButton,
                {
                  backgroundColor: progress === step ? colors.primary : colors.inputBackground,
                  borderColor: progress === step ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.progressButtonText,
                  { color: progress === step ? '#ffffff' : colors.text },
                ]}
              >
                {step}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  statusChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 0.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  progressButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  progressButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  progressButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WorkScreen;
