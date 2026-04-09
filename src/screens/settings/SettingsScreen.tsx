import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme, useAuth, useNotification } from '@/contexts';
import { Card, Modal, Button } from '@/components/ui';
import { Currency } from '@/types';
import { CURRENCIES } from '@/utils/constants';

const SettingsScreen: React.FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, signOut: authSignOut, updateUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentCurrency = user?.currency || 'USD';
  const currencyInfo = CURRENCIES.find((c) => c.code === currentCurrency);

  const handleCurrencyChange = async (currency: Currency) => {
    if (!user) return;

    setSaving(true);
    try {
      await updateUser({ currency });
      showSuccess(`Currency changed to ${currency}`);
      setCurrencyModalVisible(false);
    } catch (error) {
      showError('Failed to update currency');
    } finally {
      setSaving(false);
    }
  };

  const handleBiometricToggle = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        showError('Biometric authentication not available');
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        showError('No biometrics enrolled on this device');
        return;
      }

      if (!biometricEnabled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable biometric lock',
          fallbackLabel: 'Use passcode',
        });

        if (result.success) {
          setBiometricEnabled(true);
          showSuccess('Biometric lock enabled');
        }
      } else {
        setBiometricEnabled(false);
        showSuccess('Biometric lock disabled');
      }
    } catch (error) {
      showError('Failed to toggle biometric');
    }
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export your data as a CSV file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            // TODO: Implement actual export
            showSuccess('Data exported to Downloads folder');
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear locally cached data. Your account data will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: () => {
            showSuccess('Cache cleared');
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
              await authSignOut();
            } catch (error) {
              showError('Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Type "DELETE" to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          },
        },
      ]
    );
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    danger,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: (danger ? colors.danger : colors.primary) + '15' }]}>
        <Ionicons name={icon as any} size={20} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: danger ? colors.danger : colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        )}
      </View>
      {rightElement || (onPress && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />)}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile */}
        {user && (
          <Card style={styles.profileCard}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {user.displayName || 'User'}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textMuted }]}>
                {user.email}
              </Text>
            </View>
          </Card>
        )}

        {/* Preferences */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Preferences</Text>
        <Card style={styles.section}>
          <SettingRow
            icon="cash-outline"
            title="Currency"
            subtitle={currencyInfo ? `${currencyInfo.code} (${currencyInfo.symbol})` : currentCurrency}
            onPress={() => setCurrencyModalVisible(true)}
          />
          <SettingRow
            icon="moon-outline"
            title="Dark Mode"
            subtitle={isDark ? 'Enabled' : 'Disabled'}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            }
          />
          <SettingRow
            icon="notifications-outline"
            title="Notifications"
            subtitle={notificationsEnabled ? 'Enabled' : 'Disabled'}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            }
          />
        </Card>

        {/* Security */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Security</Text>
        <Card style={styles.section}>
          <SettingRow
            icon="finger-print-outline"
            title="Biometric Lock"
            subtitle={biometricEnabled ? 'Enabled' : 'Disabled'}
            rightElement={
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            }
          />
          <SettingRow
            icon="lock-closed-outline"
            title="Change Password"
            onPress={() => showSuccess('Password reset email sent')}
          />
        </Card>

        {/* Data */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Data</Text>
        <Card style={styles.section}>
          <SettingRow
            icon="download-outline"
            title="Export Data"
            subtitle="Download your data as CSV"
            onPress={handleExportData}
          />
          <SettingRow
            icon="trash-outline"
            title="Clear Cache"
            subtitle="Free up storage space"
            onPress={handleClearCache}
          />
        </Card>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>About</Text>
        <Card style={styles.section}>
          <SettingRow
            icon="information-circle-outline"
            title="App Version"
            subtitle="1.0.0"
          />
          <SettingRow
            icon="document-text-outline"
            title="Privacy Policy"
            onPress={() => showSuccess('Opening privacy policy...')}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            title="Terms of Service"
            onPress={() => showSuccess('Opening terms of service...')}
          />
        </Card>

        {/* Account Actions */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Account</Text>
        <Card style={styles.section}>
          <SettingRow
            icon="log-out-outline"
            title="Sign Out"
            onPress={handleSignOut}
          />
          <SettingRow
            icon="trash-outline"
            title="Delete Account"
            danger
            onPress={handleDeleteAccount}
          />
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Currency Modal */}
      <Modal
        visible={currencyModalVisible}
        onClose={() => setCurrencyModalVisible(false)}
        title="Select Currency"
      >
        <FlatList
          data={CURRENCIES}
          keyExtractor={(item) => item.code}
          style={{ maxHeight: 400 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.currencyItem,
                {
                  backgroundColor: item.code === currentCurrency ? colors.primary + '15' : 'transparent',
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleCurrencyChange(item.code as Currency)}
              disabled={saving}
            >
              <Text style={[styles.currencySymbol, { color: colors.primary }]}>{item.symbol}</Text>
              <View style={styles.currencyInfo}>
                <Text style={[styles.currencyCode, { color: colors.text }]}>{item.code}</Text>
                <Text style={[styles.currencyName, { color: colors.textMuted }]}>{item.name}</Text>
              </View>
              {item.code === currentCurrency && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    padding: 0,
    marginBottom: 24,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    width: 32,
  },
  currencyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currencyCode: {
    fontSize: 15,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 12,
  },
});

export default SettingsScreen;
