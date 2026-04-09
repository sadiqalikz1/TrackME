import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth, useNotification } from '@/contexts';
import { Card, Modal, Button, Input, EmptyState } from '@/components/ui';
import { BankAccount, BankType } from '@/types';
import { CURRENCIES } from '@/utils/constants';
import { formatCurrency, parseCurrencyInput, isValidAmount } from '@/utils/formatters';

const BANK_TYPES: { type: BankType; label: string; icon: string; color: string }[] = [
  { type: 'bank', label: 'Bank', icon: 'business', color: '#3b82f6' },
  { type: 'card', label: 'Card', icon: 'card', color: '#f59e0b' },
  { type: 'wallet', label: 'Wallet', icon: 'wallet', color: '#8b5cf6' },
  { type: 'investment', label: 'Investment', icon: 'trending-up', color: '#10b981' },
];

const BankAccountsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<BankType>('bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [balance, setBalance] = useState('0');
  const [currency, setCurrency] = useState<string>(user?.currency || 'USD');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [balanceError, setBalanceError] = useState(false);

  // Load accounts
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual data service call
      setAccounts([]);
    } catch (error) {
      showError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const nameStr = name.trim();
    const balanceNum = parseCurrencyInput(balance);

    let hasError = false;
    if (!nameStr) {
      setNameError(true);
      hasError = true;
    } else {
      setNameError(false);
    }

    if (!isValidAmount(balanceNum)) {
      setBalanceError(true);
      hasError = true;
    } else {
      setBalanceError(false);
    }

    if (hasError) {
      showError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const accountData: BankAccount = {
        id: editingAccount?.id || Date.now().toString(),
        uid: user!.uid,
        name: nameStr,
        type,
        accountNumber: accountNumber.trim() || undefined,
        balance: balanceNum,
        currency: currency as any,
        isDefault,
        createdAt: editingAccount?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (editingAccount) {
        setAccounts(accounts.map(a => a.id === editingAccount.id ? accountData : a));
        showSuccess('Account updated');
      } else {
        setAccounts([...accounts, accountData]);
        showSuccess('Account created');
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      showError('Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (account: BankAccount) => {
    Alert.alert('Delete Account', `Delete "${account.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setAccounts(accounts.filter(a => a.id !== account.id));
            showSuccess('Account deleted');
          } catch (error) {
            showError('Failed to delete account');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setName('');
    setType('bank');
    setAccountNumber('');
    setBalance('0');
    setCurrency(user?.currency || 'USD');
    setIsDefault(false);
    setNameError(false);
    setBalanceError(false);
  };

  const openAddModal = () => {
    setEditingAccount(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (account: BankAccount) => {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setAccountNumber(account.accountNumber || '');
    setBalance(account.balance.toString());
    setCurrency(account.currency);
    setIsDefault(account.isDefault);
    setModalVisible(true);
  };

  const renderAccountItem = ({ item }: { item: BankAccount }) => {
    const bankType = BANK_TYPES.find(bt => bt.type === item.type) || BANK_TYPES[0];
    const currencyInfo = CURRENCIES.find(c => c.code === item.currency) || CURRENCIES[0];

    return (
      <TouchableOpacity
        onPress={() => openEditModal(item)}
        onLongPress={() => handleDelete(item)}
        style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[styles.accountIcon, { backgroundColor: bankType.color + '20' }]}>
          <Ionicons name={bankType.icon as any} size={28} color={bankType.color} />
        </View>

        <View style={styles.accountInfo}>
          <View style={styles.accountHeader}>
            <Text style={[styles.accountName, { color: colors.text }]}>{item.name}</Text>
            {item.isDefault && (
              <View style={[styles.defaultBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
              </View>
            )}
          </View>
          <Text style={[styles.accountType, { color: colors.textMuted }]}>{bankType.label}</Text>
          {item.accountNumber && (
            <Text style={[styles.accountNumber, { color: colors.textMuted }]}>
              {item.accountNumber}
            </Text>
          )}
        </View>

        <View style={styles.balanceContainer}>
          <Text style={[styles.balance, { color: colors.primary }]}>
            {currencyInfo.symbol}{item.balance.toFixed(2)}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack?.()) {
            navigation.goBack();
          }
        }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Bank Accounts</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Total Balance Card */}
      {accounts.length > 0 && (
        <Card style={[styles.totalCard, { backgroundColor: colors.primary + '15', marginHorizontal: 16, marginBottom: 16 }]}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Balance</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>
            {totalBalance.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </Card>
      )}

      {/* Accounts List */}
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderAccountItem}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title="No Accounts"
            description="Add your first bank account, card, or wallet"
            actionLabel="Add Account"
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
        title={editingAccount ? 'Edit Account' : 'New Account'}
        footer={
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setModalVisible(false)}
              style={styles.footerButton}
            />
            <Button
              title={editingAccount ? 'Update' : 'Create'}
              onPress={handleSave}
              loading={saving}
              style={styles.footerButton}
            />
          </View>
        }
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalContent}>
          {/* Type Selection */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Account Type</Text>
          <View style={styles.typeGrid}>
            {BANK_TYPES.map((bt) => (
              <TouchableOpacity
                key={bt.type}
                onPress={() => setType(bt.type)}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: type === bt.type ? bt.color + '20' : colors.card,
                    borderColor: type === bt.type ? bt.color : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={bt.icon as any}
                  size={24}
                  color={type === bt.type ? bt.color : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: type === bt.type ? bt.color : colors.text },
                  ]}
                >
                  {bt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Name */}
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Account Name <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <Input
              placeholder="e.g., Main Bank Account"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setNameError(false);
              }}
              style={{ borderColor: nameError ? colors.danger : undefined, borderWidth: nameError ? 2 : 1 }}
            />
            {nameError && (
              <Text style={{ fontSize: 11, color: colors.danger, marginTop: 4 }}>
                Account name is required
              </Text>
            )}
          </View>

          {/* Account Number */}
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Account Number (Optional)</Text>
            <Input
              placeholder="Last 4 digits or full number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              maxLength={20}
            />
          </View>

          {/* Balance */}
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Current Balance <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <Input
              placeholder="0.00"
              value={balance}
              onChangeText={(text) => {
                setBalance(text);
                setBalanceError(false);
              }}
              keyboardType="decimal-pad"
              leftIcon={<Text style={{ color: colors.textMuted, fontSize: 18 }}>$</Text>}
              style={{ borderColor: balanceError ? colors.danger : undefined, borderWidth: balanceError ? 2 : 1 }}
            />
            {balanceError && (
              <Text style={{ fontSize: 11, color: colors.danger, marginTop: 4 }}>
                Please enter a valid balance
              </Text>
            )}
          </View>

          {/* Currency */}
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Currency</Text>
            <View style={[styles.currencyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{currency}</Text>
            </View>
          </View>

          {/* Default Toggle */}
          <TouchableOpacity
            onPress={() => setIsDefault(!isDefault)}
            style={[styles.defaultToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.defaultToggleText, { color: colors.text }]}>Set as Default</Text>
              <Text style={[styles.defaultToggleDesc, { color: colors.textMuted }]}>
                Use this account by default for transactions
              </Text>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: isDefault ? colors.primary : 'transparent',
                  borderColor: isDefault ? colors.primary : colors.border,
                },
              ]}
            >
              {isDefault && <Ionicons name="checkmark" size={16} color="#ffffff" />}
            </View>
          </TouchableOpacity>
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  totalCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  accountIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    maxWidth: '70%',
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
  },
  accountType: {
    fontSize: 13,
    marginBottom: 2,
  },
  accountNumber: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balance: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
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
  modalContent: {
    paddingHorizontal: 0,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginHorizontal: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  currencyBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  defaultToggleText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  defaultToggleDesc: {
    fontSize: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

BankAccountsScreen.displayName = 'BankAccountsScreen';

export default BankAccountsScreen;
