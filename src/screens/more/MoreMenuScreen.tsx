import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth } from '@/contexts';
import { Card } from '@/components/ui';

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  description: string;
  color: string;
  screen: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'budgets',
    icon: 'pie-chart',
    label: 'Budgets',
    description: 'Set and track spending limits',
    color: '#6366f1',
    screen: 'Budgets',
  },
  {
    id: 'goals',
    icon: 'flag',
    label: 'Savings Goals',
    description: 'Track your financial goals',
    color: '#10b981',
    screen: 'Goals',
  },
  {
    id: 'analysis',
    icon: 'analytics',
    label: 'Analysis',
    description: 'Financial insights and trends',
    color: '#f59e0b',
    screen: 'Analysis',
  },
  {
    id: 'bills',
    icon: 'calendar',
    label: 'Bill Reminders',
    description: 'Never miss a payment',
    color: '#ef4444',
    screen: 'BillReminders',
  },
  {
    id: 'settings',
    icon: 'settings',
    label: 'Settings',
    description: 'Customize your experience',
    color: '#8b5cf6',
    screen: 'Settings',
  },
];

const MoreMenuScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleNavigate = (screen: string) => {
    navigation.navigate(screen as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>More</Text>
        </View>

        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.displayName || 'User'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textMuted }]}>
              {user?.email}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Card>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleNavigate(item.screen)}
              style={[
                styles.menuItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.menuDescription, { color: colors.textMuted }]}>
                  {item.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  bottomPadding: {
    height: 100,
  },
});

export default MoreMenuScreen;
