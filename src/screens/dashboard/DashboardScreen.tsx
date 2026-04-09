import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth, useDashboard } from '@/contexts';
import { Card, SkeletonList, CardContextMenu } from '@/components/ui';
import {
  TransactionItem,
  GoalCard,
  IncomeExpenseCard,
  BudgetStatusCard,
  WorkOverviewCard,
  NetWorthCard,
  SpendingTrendsCard,
  TopCategoriesCard,
  UpcomingBillsCard,
  EnhancedGoalProgressCard,
} from '@/components/common';
import { Transaction, Goal, Budget, Work, BillReminder, DashboardCardId } from '@/types';
import { useData } from '@/hooks';
import { formatCurrency, formatDate } from '@/utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { config, toggleCardVisibility, reorderCards, updateCardColor, getEnabledCards } = useDashboard();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Fetch all data
  const { data: transactionsData, loading: transLoading, refetch: refetchTransactions } = useData('transactions');
  const { data: goalsData, loading: goalsLoading, refetch: refetchGoals } = useData('goals');
  const { data: budgetsData, loading: budgetsLoading, refetch: refetchBudgets } = useData('budgets');
  const { data: worksData, loading: worksLoading, refetch: refetchWorks } = useData('work');
  const { data: billsData, loading: billsLoading, refetch: refetchBills } = useData('billReminders');

  const [refreshing, setRefreshing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; cardId: DashboardCardId | null }>({
    visible: false,
    cardId: null,
  });

  // Ensure data is arrays
  const transactions = useMemo(
    () => (Array.isArray(transactionsData) ? transactionsData : []) as Transaction[],
    [transactionsData]
  );
  const goals = useMemo(() => (Array.isArray(goalsData) ? goalsData : []) as Goal[], [goalsData]);
  const budgets = useMemo(() => (Array.isArray(budgetsData) ? budgetsData : []) as Budget[], [budgetsData]);
  const works = useMemo(() => (Array.isArray(worksData) ? worksData : []) as Work[], [worksData]);
  const bills = useMemo(
    () => (Array.isArray(billsData) ? billsData : []) as BillReminder[],
    [billsData]
  );

  const loading = transLoading || goalsLoading || budgetsLoading || worksLoading || billsLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTransactions(), refetchGoals(), refetchBudgets(), refetchWorks(), refetchBills()]);
    setRefreshing(false);
  };

  const currency = user?.currency || 'USD';
  const enabledCards = getEnabledCards();

  const renderCard = (cardId: DashboardCardId, card: any) => {
    const customColor = config.cards.find((c) => c.id === cardId)?.customColor;
    
    return (
      <Pressable
        key={cardId}
        onLongPress={() => setContextMenu({ visible: true, cardId })}
        delayLongPress={500}
      >
        {cardId === 'balance' && (
          <BalanceCard transactions={transactions} currency={currency} customColor={customColor} />
        )}
        {cardId === 'incomeExpense' && (
          <IncomeExpenseCard transactions={transactions} currency={currency} customColor={customColor} />
        )}
        {cardId === 'budgetStatus' && (
          <BudgetStatusCard budgets={budgets} transactions={transactions} currency={currency} customColor={customColor} />
        )}
        {cardId === 'workOverview' && (
          <WorkOverviewCard works={works} customColor={customColor} onWorkPress={(work) => (navigation as any).navigate('WorkDetail', { workId: work.id })} />
        )}
        {cardId === 'netWorth' && (
          <NetWorthCard transactions={transactions} currency={currency} customColor={customColor} />
        )}
        {cardId === 'spendingTrends' && (
          <SpendingTrendsCard transactions={transactions} currency={currency} customColor={customColor} />
        )}
        {cardId === 'topCategories' && (
          <TopCategoriesCard transactions={transactions} currency={currency} customColor={customColor} />
        )}
        {cardId === 'upcomingBills' && (
          <UpcomingBillsCard bills={bills} currency={currency} customColor={customColor} />
        )}
        {cardId === 'goals' && (
          <EnhancedGoalProgressCard goals={goals} currency={currency} customColor={customColor} onGoalPress={(goal) => (navigation as any).navigate('More', { screen: 'Goals' })} />
        )}
        {cardId === 'recentTransactions' && (
          <RecentTransactionsCard transactions={transactions} currency={currency} customColor={customColor} navigation={navigation} />
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <SkeletonList count={4} style={styles.skeletonContainer} />
      </View>
    );
  }

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu.cardId) return;

    if (action === 'toggle') {
      toggleCardVisibility(contextMenu.cardId);
      setContextMenu({ visible: false, cardId: null });
    }
  };

  const handleColorChange = (color: string) => {
    if (!contextMenu.cardId) return;
    updateCardColor(contextMenu.cardId, color);
  };

  const currentCardIndex = enabledCards.findIndex((c) => c.id === contextMenu.cardId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.displayName || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.card }]}
            onPress={() => (navigation as any).navigate('More', { screen: 'DashboardCustomization' })}
          >
            <Ionicons name="settings" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Enabled Cards */}
        {enabledCards.length > 0 ? (
          enabledCards.map((card) => renderCard(card.id as DashboardCardId, card))
        ) : (
          <Card>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No cards enabled. Go to settings to customize your dashboard.
            </Text>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Context Menu */}
      <CardContextMenu
        visible={contextMenu.visible}
        onDismiss={() => setContextMenu({ visible: false, cardId: null })}
        onToggleVisibility={() => handleContextMenuAction('toggle')}
        onChangeColor={handleColorChange}
        onMove={(direction) => {
          // Implement reordering logic here
          setContextMenu({ visible: false, cardId: null });
        }}
        canMoveUp={currentCardIndex > 0}
        canMoveDown={currentCardIndex < enabledCards.length - 1}
        currentColor={config.cards.find((c) => c.id === contextMenu.cardId)?.customColor}
      />
    </View>
  );
};

// Balance Card Component (inline for backward compatibility)
interface BalanceCardProps {
  transactions: Transaction[];
  currency: string;
  customColor?: string;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ transactions, currency, customColor }) => {
  const { colors } = useTheme();

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return date >= start && date <= end;
    });

    const income = monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expense, balance: income - expense };
  }, [transactions]);

  const cardStyle = customColor ? { backgroundColor: customColor } : {};

  return (
    <Card style={[styles.balanceCard, cardStyle]}>
      <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
        {formatDate(new Date(), 'MMMM yyyy')} Balance
      </Text>
      <Text style={[styles.balanceAmount, { color: colors.text }]}>
        {formatCurrency(monthlyStats.balance, currency as any)}
      </Text>
      <View style={styles.balanceRow}>
        <View style={styles.balanceItem}>
          <View style={[styles.balanceIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="arrow-down" size={16} color={colors.success} />
          </View>
          <View>
            <Text style={[styles.balanceItemLabel, { color: colors.textMuted }]}>Income</Text>
            <Text style={[styles.balanceItemAmount, { color: colors.success }]}>
              {formatCurrency(monthlyStats.income, currency as any)}
            </Text>
          </View>
        </View>
        <View style={styles.balanceItem}>
          <View style={[styles.balanceIcon, { backgroundColor: colors.danger + '20' }]}>
            <Ionicons name="arrow-up" size={16} color={colors.danger} />
          </View>
          <View>
            <Text style={[styles.balanceItemLabel, { color: colors.textMuted }]}>Expense</Text>
            <Text style={[styles.balanceItemAmount, { color: colors.danger }]}>
              {formatCurrency(monthlyStats.expense, currency as any)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
};

// Recent Transactions Card Component
interface RecentTransactionsCardProps {
  transactions: Transaction[];
  currency: string;
  customColor?: string;
  navigation: any;
}

const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  transactions,
  currency,
  customColor,
  navigation,
}) => {
  const { colors } = useTheme();

  const recentTransactions = transactions.slice(0, 5);
  const cardStyle = customColor ? { backgroundColor: customColor } : {};

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>
      {recentTransactions.length > 0 ? (
        recentTransactions.map((transaction) => <TransactionItem key={transaction.id} transaction={transaction} />)
      ) : (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No transactions yet</Text>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  skeletonContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    marginTop: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 24,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceItemLabel: {
    fontSize: 12,
  },
  balanceItemAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 100,
  },
});

export default DashboardScreen;
