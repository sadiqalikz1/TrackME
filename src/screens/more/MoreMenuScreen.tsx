import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  screen: string;
  color?: string;
}

const MoreMenuScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  const menuItems: MenuItem[] = [
    { icon: 'wallet-outline', label: 'Budgets', screen: 'Budgets', color: colors.warning },
    { icon: 'flag-outline', label: 'Savings Goals', screen: 'Goals', color: colors.success },
    { icon: 'bar-chart-outline', label: 'Analysis', screen: 'Analysis', color: colors.info },
    { icon: 'alarm-outline', label: 'Bill Reminders', screen: 'BillReminders', color: colors.danger },
    { icon: 'settings-outline', label: 'Settings', screen: 'Settings', color: colors.textSecondary },
  ];

  const handleNavigate = (screen: string) => {
    navigation.navigate(screen as never);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User Profile Header */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {user?.displayName || 'User'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
              {user?.email || ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.cardSecondary }]}
            onPress={() => handleNavigate('Settings')}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>MENU</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.menuItem, { backgroundColor: colors.card }]}
              onPress={() => handleNavigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: (item.color || colors.primary) + '20' }]}>
                <Ionicons name={item.icon} size={22} color={item.color || colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            FinanceFlow v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
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
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 12,
  },
});

export default MoreMenuScreen;
