import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Card, Modal, Button } from '@/components/ui';
import { Currency } from '@/types';
import { CURRENCIES } from '@/utils/constants';

const SettingsScreen: React.FC = () => {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, updateUser, signOut } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(user?.biometricEnabled || false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCurrencyChange = async (currency: Currency) => {
    try {
      await updateUser({ currency });
      showSuccess(`Currency changed to ${currency}`);
      setCurrencyModalVisible(false);
    } catch (error: any) {
      showError(error.message || 'Failed to update currency');
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      setBiometricEnabled(value);
      await updateUser({ biometricEnabled: value });
      showSuccess(value ? 'Biometric lock enabled' : 'Biometric lock disabled');
    } catch (error: any) {
      setBiometricEnabled(!value);
      showError(error.message || 'Failed to update setting');
    }
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export all your financial data as JSON?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              // TODO: Implement actual export
              showSuccess('Data exported to device');
            } catch (error: any) {
              showError(error.message || 'Export failed');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              showError(error.message || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const currencyInfo = CURRENCIES.find(c => c.code === user?.currency);

  const SettingItem: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    color?: string;
    danger?: boolean;
  }> = ({ icon, label, value, onPress, rightElement, color, danger }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: (color || colors.primary) + '20' }]}>
        <Ionicons name={icon} size={20} color={color || colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: danger ? colors.danger : colors.text }]}>
        {label}
      </Text>
      {value && (
        <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>
      )}
      {rightElement}
      {onPress && !rightElement && (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* User Profile Section */}
      <Card style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>
          {user?.displayName || 'User'}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {user?.email}
        </Text>
      </Card>

      {/* Preferences */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PREFERENCES</Text>
      <Card padding="none">
        <SettingItem
          icon="cash-outline"
          label="Currency"
          value={currencyInfo ? `${currencyInfo.symbol} ${currencyInfo.code}` : 'USD'}
          onPress={() => setCurrencyModalVisible(true)}
          color={colors.success}
        />
        <SettingItem
          icon={theme === 'dark' ? 'moon' : 'sunny'}
          label="Dark Mode"
          rightElement={
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          }
          color={colors.warning}
        />
        <SettingItem
          icon="finger-print"
          label="Biometric Lock"
          rightElement={
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          }
          color={colors.info}
        />
      </Card>

      {/* Data */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DATA</Text>
      <Card padding="none">
        <SettingItem
          icon="download-outline"
          label="Export Data"
          onPress={handleExportData}
          color={colors.info}
        />
        <SettingItem
          icon="sync-outline"
          label="Sync Status"
          value="Synced"
          color={colors.success}
        />
      </Card>

      {/* Account */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCOUNT</Text>
      <Card padding="none">
        <SettingItem
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          onPress={() => {}}
        />
        <SettingItem
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => {}}
        />
        <SettingItem
          icon="log-out-outline"
          label="Sign Out"
          onPress={handleSignOut}
          danger
          color={colors.danger}
        />
      </Card>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appVersion, { color: colors.textMuted }]}>
          FinanceFlow v1.0.0
        </Text>
        <Text style={[styles.copyright, { color: colors.textMuted }]}>
          © 2024 All rights reserved
        </Text>
      </View>

      {/* Currency Modal */}
      <Modal
        visible={currencyModalVisible}
        onClose={() => setCurrencyModalVisible(false)}
        title="Select Currency"
        size="sm"
      >
        {CURRENCIES.map((curr) => (
          <TouchableOpacity
            key={curr.code}
            style={[
              styles.currencyOption,
              {
                backgroundColor:
                  user?.currency === curr.code ? colors.primary + '20' : 'transparent',
                borderColor: user?.currency === curr.code ? colors.primary : colors.border,
              },
            ]}
            onPress={() => handleCurrencyChange(curr.code)}
          >
            <Text style={[styles.currencySymbol, { color: colors.primary }]}>
              {curr.symbol}
            </Text>
            <View style={styles.currencyInfo}>
              <Text style={[styles.currencyCode, { color: colors.text }]}>{curr.code}</Text>
              <Text style={[styles.currencyName, { color: colors.textSecondary }]}>
                {curr.name}
              </Text>
            </View>
            {user?.currency === curr.code && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 14,
    marginRight: 8,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 32,
  },
  appVersion: {
    fontSize: 13,
    marginBottom: 4,
  },
  copyright: {
    fontSize: 11,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    width: 40,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 13,
  },
});

export default SettingsScreen;
