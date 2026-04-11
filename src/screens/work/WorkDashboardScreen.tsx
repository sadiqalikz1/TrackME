import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth } from '@/contexts';
import { Card, Button } from '@/components/ui';
import { Work, WorkStatus } from '@/types';
import { useData } from '@/hooks';
import { STATUS_COLORS, WORK_CATEGORIES } from '@/utils/constants';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { CURRENCIES } from '@/utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WorkDashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Use hook for data fetching through service layer (not direct Firebase)
  const { data: worksData, loading, refetch } = useData('work');

  const [refreshing, setRefreshing] = useState(false);

  // Ensure works is an array
  const works = Array.isArray(worksData) ? worksData : [];

  const currencyInfo = CURRENCIES.find(c => c.code === (user?.currency || 'USD')) || CURRENCIES[0];

  // Type helper for flexible style unions
  const withStyle = (baseStyle: any, overrides: any = {}) => [baseStyle, overrides] as any;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = works.length;
    const pending = works.filter(w => w.status === 'pending').length;
    const inProgress = works.filter(w => w.status === 'in-progress').length;
    const completed = works.filter(w => w.status === 'completed').length;
    const cancelled = works.filter(w => w.status === 'cancelled').length;

    const totalQuotation = works.reduce((sum, w) => sum + w.quotationAmount, 0);
    const totalExpenses = works.reduce((sum, w) => sum + (w.expenses || 0), 0);
    const totalIncome = works.reduce((sum, w) => sum + (w.totalPaymentsReceived || 0), 0);
    const totalAdditional = works.reduce((sum, w) => sum + (w.totalAdditionalAmount || 0), 0);
    const totalProfit = works.reduce((sum, w) => sum + (w.profit || 0), 0);
    const totalHours = works.reduce((sum, w) => sum + (w.totalHoursWorked || 0), 0);

    const avgProfit = completed > 0 ? totalProfit / completed : 0;
    const profitMargin = totalQuotation > 0 ? (totalProfit / totalQuotation) * 100 : 0;

    return {
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      totalQuotation,
      totalExpenses,
      totalIncome,
      totalAdditional,
      totalProfit,
      totalHours,
      avgProfit,
      profitMargin,
    };
  }, [works]);

  // Get project category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    works.forEach(w => {
      breakdown[w.category] = (breakdown[w.category] || 0) + 1;
    });
    return breakdown;
  }, [works]);

  // Get top performers
  const topProjects = useMemo(() => {
    return [...works]
      .sort((a, b) => (b.profit || 0) - (a.profit || 0))
      .slice(0, 5);
  }, [works]);

  // Get recent projects
  const recentProjects = useMemo(() => {
    return [...works]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [works]);

  const handleProjectTap = (workId: string) => {
    (navigation as any).navigate('WorkDetailsPage', { workId });
  };

  const StatCard: React.FC<{
    icon: string;
    label: string;
    value: string | number;
    subtext?: string;
    color?: string;
    onPress?: () => void;
  }> = ({ icon, label, value, subtext, color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }] as any}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconContainer, { backgroundColor: (color || colors.primary) + '20' }] as any}>
        <Ionicons name={icon as any} size={24} color={color || colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statLabel, { color: colors.textSecondary }] as any}>{label}</Text>
        <Text style={[styles.statValue, { color: colors.text }] as any}>{value}</Text>
        {subtext && <Text style={[styles.statSubtext, { color: colors.textMuted }] as any}>{subtext}</Text>}
      </View>
    </TouchableOpacity>
  );

  const StatusBadge: React.FC<{ status: WorkStatus; count: number }> = ({ status, count }) => {
    const statusColor = STATUS_COLORS[status].color;
    return (
      <TouchableOpacity
        style={[
          styles.statusBadge,
          { backgroundColor: statusColor + '20', borderColor: statusColor },
        ] as any}
      >
        <Text style={[styles.statusBadgeText, { color: statusColor }] as any}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
        <Text style={[styles.statusBadgeCount, { color: statusColor }] as any}>{count}</Text>
      </TouchableOpacity>
    );
  };

  const ProjectCard: React.FC<{ project: Work }> = ({ project }) => {
    const category = WORK_CATEGORIES[project.category];
    const statusColor = STATUS_COLORS[project.status].color;
    return (
      <TouchableOpacity
        style={[styles.projectCard, { backgroundColor: colors.background, borderColor: colors.border }] as any}
        onPress={() => handleProjectTap(project.id)}
      >
        <View style={styles.projectCardHeader as any}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.projectTitle, { color: colors.text }] as any} numberOfLines={1}>
              {project.title}
            </Text>
            <View style={styles.projectMeta as any}>
              <Ionicons name={category?.icon as any} size={12} color={colors.textSecondary} />
              <Text style={[styles.projectMetaText, { color: colors.textSecondary }] as any}>
                {category?.label}
              </Text>
              <Text style={[styles.projectStatus, { color: statusColor }] as any}>
                • {project.status}
              </Text>
            </View>
          </View>
          <View style={[styles.progressBadge, { backgroundColor: statusColor + '20' }] as any}>
            <Text style={[styles.progressText, { color: statusColor }] as any}>
              {project.progress}%
            </Text>
          </View>
        </View>

        <View style={styles.projectCardBody as any}>
          <View style={styles.projectItem as any}>
            <Text style={[styles.projectItemLabel, { color: colors.textSecondary }] as any}>Income</Text>
            <Text style={[styles.projectItemValue, { color: colors.success }] as any}>
              {currencyInfo.symbol}{(project.totalPaymentsReceived || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.projectDivider as any} />
          <View style={styles.projectItem as any}>
            <Text style={[styles.projectItemLabel, { color: colors.textSecondary }] as any}>Expenses</Text>
            <Text style={[styles.projectItemValue, { color: colors.danger }] as any}>
              {currencyInfo.symbol}{(project.expenses || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.projectDivider as any} />
          <View style={styles.projectItem as any}>
            <Text style={[styles.projectItemLabel, { color: colors.textSecondary }] as any}>Profit</Text>
            <Text
              style={[
                styles.projectItemValue,
                { color: (project.profit || 0) >= 0 ? colors.success : colors.danger },
              ] as any}
            >
              {currencyInfo.symbol}{(project.profit || 0).toFixed(2)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }] as any}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }] as any}>
        <Text style={[styles.headerTitle, { color: colors.text }] as any}>Work Dashboard</Text>
        <TouchableOpacity onPress={() => (navigation as any).navigate('WorkMain')}>
          <Ionicons name="list" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content as any}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Overview Stats */}
        <View style={styles.section as any}>
          <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Overview</Text>
          <View style={styles.statsGrid as any}>
            <StatCard
              icon="briefcase-outline"
              label="Total Projects"
              value={stats.total}
              color={colors.primary}
            />
            <StatCard
              icon="checkmark-done-circle"
              label="Completed"
              value={stats.completed}
              color={colors.success}
              onPress={() =>
                (navigation as any).navigate('WorkMain', { focusStatus: 'completed' })
              }
            />
          </View>
          <View style={styles.statsGrid as any}>
            <StatCard
              icon="time-outline"
              label="In Progress"
              value={stats.inProgress}
              color={colors.warning || '#f59e0b'}
              onPress={() =>
                (navigation as any).navigate('WorkMain', { focusStatus: 'in-progress' })
              }
            />
            <StatCard
              icon="alert-circle"
              label="Pending"
              value={stats.pending}
              color="#8b5cf6"
              onPress={() =>
                (navigation as any).navigate('WorkMain', { focusStatus: 'pending' })
              }
            />
          </View>
        </View>

        {/* Financial Overview */}
        <View style={styles.section as any}>
          <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Financial Summary</Text>
          <Card style={[styles.financialCard, { marginBottom: 12 }] as any}>
            <View style={styles.financialRow as any}>
              <View>
                <Text style={[styles.financialLabel, { color: colors.textSecondary }] as any}>Total Quotation</Text>
                <Text style={[styles.financialValue, { color: colors.text }] as any}>
                  {currencyInfo.symbol}{stats.totalQuotation.toFixed(2)}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 12 }} />
              <View>
                <Text style={[styles.financialLabel, { color: colors.textSecondary }] as any}>Total Income</Text>
                <Text style={[styles.financialValue, { color: colors.success }] as any}>
                  {currencyInfo.symbol}{stats.totalIncome.toFixed(2)}
                </Text>
              </View>
            </View>
          </Card>

          <Card style={[styles.financialCard, { marginBottom: 12 }] as any}>
            <View style={styles.financialRow as any}>
              <View>
                <Text style={[styles.financialLabel, { color: colors.textSecondary }] as any}>Total Expenses</Text>
                <Text style={[styles.financialValue, { color: colors.danger }] as any}>
                  {currencyInfo.symbol}{stats.totalExpenses.toFixed(2)}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 12 }} />
              <View>
                <Text style={[styles.financialLabel, { color: colors.textSecondary }] as any}>Additional Works</Text>
                <Text style={[styles.financialValue, { color: colors.warning || '#f59e0b' }] as any}>
                  {currencyInfo.symbol}{stats.totalAdditional.toFixed(2)}
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.profitCard as any}>
            <View style={styles.profitRow as any}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profitLabel, { color: colors.textSecondary }] as any}>Total Profit</Text>
                <Text
                  style={[
                    styles.profitValue,
                    { color: stats.totalProfit >= 0 ? colors.success : colors.danger },
                  ] as any}
                >
                  {currencyInfo.symbol}{stats.totalProfit.toFixed(2)}
                </Text>
              </View>
              <View style={styles.profitDivider as any} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.profitLabel, { color: colors.textSecondary }] as any}>Profit Margin</Text>
                <Text style={[styles.profitValue, { color: colors.primary }] as any}>
                  {stats.profitMargin.toFixed(1)}%
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Time & Payment Tracking */}
        <View style={styles.section as any}>
          <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Tracking</Text>
          <View style={styles.statsGrid as any}>
            <StatCard
              icon="hourglass-outline"
              label="Total Hours"
              value={stats.totalHours.toFixed(1)}
              subtext="hours worked"
              color={colors.primary}
            />
            <StatCard
              icon="wallet-outline"
              label="Avg Profit"
              value={`${currencyInfo.symbol}${stats.avgProfit.toFixed(2)}`}
              subtext="per project"
              color={colors.success}
            />
          </View>
        </View>

        {/* Project Status Breakdown */}
        <View style={styles.section as any}>
          <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Project Status</Text>
          <View style={styles.statusGrid as any}>
            <StatusBadge status="pending" count={stats.pending} />
            <StatusBadge status="in-progress" count={stats.inProgress} />
            <StatusBadge status="completed" count={stats.completed} />
            <StatusBadge status="cancelled" count={stats.cancelled} />
          </View>
        </View>

        {/* Category Breakdown */}
        {Object.keys(categoryBreakdown).length > 0 && (
          <View style={styles.section as any}>
            <Text style={[styles.sectionTitle, { color: colors.text }] as any}>By Category</Text>
            <Card style={{ padding: 12 } as any}>
              {Object.entries(categoryBreakdown).map(([category, count]) => {
                const cat = (WORK_CATEGORIES as any)[category] || { icon: 'briefcase', color: colors.text, label: category };
                return (
                  <View key={category} style={styles.categoryRow as any}>
                    <View style={styles.categoryLabel as any}>
                      <Ionicons name={cat?.icon as any} size={16} color={cat?.color} />
                      <Text style={[styles.categoryText, { color: colors.text }] as any}>
                        {cat?.label}
                      </Text>
                    </View>
                    <Text style={[styles.categoryCount, { color: colors.primary }] as any}>
                      {count} project{count > 1 ? 's' : ''}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {/* Top Performing Projects */}
        {topProjects.length > 0 && (
          <View style={styles.section as any}>
            <View style={styles.sectionHeader as any}>
              <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Top Performers</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }] as any}>
                By Profit
              </Text>
            </View>
            {topProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </View>
        )}

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <View style={styles.section as any}>
            <View style={styles.sectionHeader as any}>
              <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Recent Activity</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }] as any}>
                Recently Updated
              </Text>
            </View>
            {recentProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </View>
        )}

        {/* Empty State */}
        {works.length === 0 && (
          <View style={[styles.emptyState, { paddingTop: 60 }] as any}>
            <Ionicons name="briefcase-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary, marginTop: 16 }] as any}>
              No projects yet
            </Text>
            <Button
              title="Create Your First Project"
              onPress={() => (navigation as any).navigate('WorkMain')}
              style={{ marginTop: 20 }}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  financialCard: {
    padding: 12,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financialLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  profitCard: {
    padding: 16,
    borderRadius: 12,
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profitDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  profitLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  profitValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'column' as const,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeCount: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  projectCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  projectStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
  },
  projectCardBody: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  projectItem: {
    flex: 1,
    alignItems: 'center',
  },
  projectItemLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  projectItemValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  projectDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkDashboardScreen;
