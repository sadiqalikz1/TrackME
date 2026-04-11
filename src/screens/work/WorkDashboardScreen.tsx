import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth, useWorkDashboard } from '@/contexts';
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
  const { config: workDashboardConfig, getEnabledCards } = useWorkDashboard();

  // Use hook for data fetching through service layer (not direct Firebase)
  const { data: worksData, loading, refetch } = useData('work');

  const [refreshing, setRefreshing] = useState(false);

  // Ensure works is an array
  const works = Array.isArray(worksData) ? worksData : [];

  const currencyInfo = CURRENCIES.find(c => c.code === (user?.currency || 'USD')) || CURRENCIES[0];

  // Get enabled cards from configuration
  const enabledCards = useMemo(() => {
    return getEnabledCards().map(card => card.id);
  }, [workDashboardConfig]);

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
    const totalBalanceDue = works.reduce((sum, w) => {
      const balance = (w.quotationAmount || 0) + (w.totalAdditionalAmount || 0) - (w.totalPaymentsReceived || 0);
      return sum + Math.max(0, balance);
    }, 0);

    const avgProfit = completed > 0 ? totalProfit / completed : 0;
    const profitMargin = totalQuotation > 0 ? (totalProfit / totalQuotation) * 100 : 0;
    const avgRevenuePerProject = total > 0 ? totalIncome / total : 0;
    const onTimeProjects = completed; // Simple metric - can be enhanced

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
      totalBalanceDue,
      avgRevenuePerProject,
      onTimeProjects,
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

  const EnhancedProjectCard: React.FC<{ project: Work }> = ({ project }) => {
    const category = WORK_CATEGORIES[project.category];
    const statusColor = STATUS_COLORS[project.status].color;
    const balanceDue = (project.quotationAmount || 0) + (project.totalAdditionalAmount || 0) - (project.totalPaymentsReceived || 0);
    const hoursWorked = project.totalHoursWorked || 0;

    return (
      <TouchableOpacity
        style={[styles.projectCard, { backgroundColor: colors.background, borderColor: colors.border }] as any}
        onPress={() => handleProjectTap(project.id)}
      >
        {/* Header */}
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

        {/* Main Metrics */}
        <View style={styles.projectCardBody as any}>
          <View style={styles.projectItem as any}>
            <Text style={[styles.projectItemLabel, { color: colors.textSecondary }] as any}>Quotation</Text>
            <Text style={[styles.projectItemValue, { color: colors.text }] as any}>
              {currencyInfo.symbol}{(project.quotationAmount || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.projectDivider as any} />
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
        </View>

        {/* Additional Details */}
        <View style={styles.projectCardFooter as any}>
          <View style={styles.detailRow as any}>
            <View style={styles.detailItem as any}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }] as any}>Balance Due</Text>
              <Text style={[styles.detailValue, { 
                color: balanceDue > 0 ? colors.warning : colors.success 
              }] as any}>
                {currencyInfo.symbol}{balanceDue.toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailItem as any}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }] as any}>Additional</Text>
              <Text style={[styles.detailValue, { color: colors.info }] as any}>
                {currencyInfo.symbol}{(project.totalAdditionalAmount || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailItem as any}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }] as any}>Hours</Text>
              <Text style={[styles.detailValue, { color: colors.primary }] as any}>
                {hoursWorked.toFixed(1)}h
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }] as any}>
      {/* Header with Settings */}
      <View style={[styles.header, { paddingTop: insets.top }] as any}>
        <Text style={[styles.headerTitle, { color: colors.text }] as any}>Work Dashboard</Text>
        <View style={styles.headerActions as any}>
          <TouchableOpacity onPress={() => (navigation as any).navigate('WorkDashboardCustomization')}>
            <Ionicons name="settings-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => (navigation as any).navigate('WorkMain')} style={{ marginLeft: 16 }}>
            <Ionicons name="list" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content as any}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Overview Stats - Always visible */}
        {enabledCards.includes('overview') && (
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
        )}

        {/* Financial Summary */}
        {enabledCards.includes('financialSummary') && (
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
        )}

        {/* Time & Payment Tracking */}
        {enabledCards.includes('timeTracking') && (
          <View style={styles.section as any}>
            <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Time Tracking</Text>
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
                label="Avg Revenue"
                value={`${currencyInfo.symbol}${stats.avgRevenuePerProject.toFixed(2)}`}
                subtext="per project"
                color={colors.success}
              />
            </View>
          </View>
        )}

        {/* Balance Due Card */}
        {enabledCards.includes('balanceDue') && (
          <View style={styles.section as any}>
            <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Outstanding</Text>
            <View style={[styles.balanceDueCard, { borderLeftColor: stats.totalBalanceDue > 0 ? colors.warning : colors.success }] as any}>
              <View style={[styles.balanceDueContent, { alignItems: 'center' }]} as any>
                <Text style={[styles.balanceDueLabel, { color: colors.textSecondary }] as any}>Total Balance Due</Text>
                <Text style={[styles.balanceDueValue, { 
                  color: stats.totalBalanceDue > 0 ? colors.warning : colors.success 
                }] as any}>
                  {currencyInfo.symbol}{stats.totalBalanceDue.toFixed(2)}
                </Text>
                <Text style={[styles.balanceDueSubtext, { color: colors.textMuted }] as any}>
                  From {works.filter(w => {
                    const balance = (w.quotationAmount || 0) + (w.totalAdditionalAmount || 0) - (w.totalPaymentsReceived || 0);
                    return balance > 0;
                  }).length} project{works.filter(w => {
                    const balance = (w.quotationAmount || 0) + (w.totalAdditionalAmount || 0) - (w.totalPaymentsReceived || 0);
                    return balance > 0;
                  }).length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Performance Metrics */}
        {enabledCards.includes('performanceMetrics') && (
          <View style={styles.section as any}>
            <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Performance</Text>
            <View style={styles.statsGrid as any}>
              <StatCard
                icon="trending-up"
                label="Avg Profit"
                value={`${currencyInfo.symbol}${stats.avgProfit.toFixed(2)}`}
                subtext="per completed"
                color={colors.success}
              />
              <StatCard
                icon="checkmark-circle"
                label="Completion Rate"
                value={`${total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}%`}
                color={colors.primary}
              />
            </View>
          </View>
        )}

        {/* Category Breakdown */}
        {enabledCards.includes('categoryBreakdown') && Object.keys(categoryBreakdown).length > 0 && (
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

        {/* Top Performing Projects with enhanced details */}
        {enabledCards.includes('topPerformers') && topProjects.length > 0 && (
          <View style={styles.section as any}>
            <View style={styles.sectionHeader as any}>
              <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Top Performers</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }] as any}>
                By Profit
              </Text>
            </View>
            {topProjects.map((project) => (
              <EnhancedProjectCard key={project.id} project={project} />
            ))}
          </View>
        )}

        {/* Recent Projects with enhanced details */}
        {enabledCards.includes('recentActivity') && recentProjects.length > 0 && (
          <View style={styles.section as any}>
            <View style={styles.sectionHeader as any}>
              <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Recent Activity</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }] as any}>
                Recently Updated
              </Text>
            </View>
            {recentProjects.map((project) => (
              <EnhancedProjectCard key={project.id} project={project} />
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

const total = 0;

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectCardFooter: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  balanceDueCard: {
    padding: 16,
    borderLeftWidth: 4,
    borderRadius: 12,
  },
  balanceDueContent: {
    justifyContent: 'center',
  },
  balanceDueLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  balanceDueValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceDueSubtext: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default WorkDashboardScreen;
