import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal as RNModal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts';
import { Card, EmptyState } from '@/components/ui';
import { BankAccount, BankType } from '@/types';
import { CURRENCIES } from '@/utils/constants';

const BANK_TYPES: { type: BankType; label: string; icon: string; color: string }[] = [
  { type: 'bank', label: 'Bank', icon: 'business', color: '#3b82f6' },
  { type: 'card', label: 'Card', icon: 'card', color: '#f59e0b' },
  { type: 'wallet', label: 'Wallet', icon: 'wallet', color: '#8b5cf6' },
  { type: 'investment', label: 'Investment', icon: 'trending-up', color: '#10b981' },
];

interface BankAccountSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (account: BankAccount) => void;
  accounts: BankAccount[];
  paymentMode: BankType;
  selectedAccountId?: string;
}

const BankAccountSelector: React.FC<BankAccountSelectorProps> = ({
  visible,
  onClose,
  onSelect,
  accounts,
  paymentMode,
  selectedAccountId,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Filter accounts by payment mode type
  const filteredAccounts = useMemo(
    () => accounts.filter(a => a.type === paymentMode),
    [accounts, paymentMode]
  );

  const getBankTypeInfo = (type: BankType) => {
    return BANK_TYPES.find(bt => bt.type === type) || BANK_TYPES[0];
  };

  const renderAccountItem = ({ item }: { item: BankAccount }) => {
    const isSelected = selectedAccountId === item.id;
    const bankType = getBankTypeInfo(item.type);
    const currencyInfo = CURRENCIES.find(c => c.code === item.currency) || CURRENCIES[0];

    return (
      <TouchableOpacity
        onPress={() => {
          onSelect(item);
          onClose();
        }}
        style={[
          styles.accountItem,
          {
            backgroundColor: isSelected ? colors.primary + '15' : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: bankType.color + '20' }]}>
          <Ionicons name={bankType.icon as any} size={24} color={bankType.color} />
        </View>

        <View style={styles.accountDetails}>
          <Text style={[styles.accountName, { color: colors.text }]}>{item.name}</Text>
          {item.accountNumber && (
            <Text style={[styles.accountNumber, { color: colors.textMuted }]}>
              ···· {item.accountNumber.slice(-4)}
            </Text>
          )}
          {item.isDefault && (
            <Text style={[styles.defaultLabel, { color: colors.primary }]}>Default Account</Text>
          )}
        </View>

        <View style={styles.balanceContainer}>
          <Text style={[styles.balance, { color: colors.text }]}>
            {currencyInfo.symbol}{item.balance.toFixed(2)}
          </Text>
          {isSelected && (
            <View
              style={[styles.checkmark, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <RNModal
      visible={visible}
      onRequestClose={onClose}
      transparent
      animationType="slide"
    >
      <View
        style={[
          styles.overlay,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Select Account</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* List */}
        <FlatList
          data={filteredAccounts}
          keyExtractor={(item) => item.id}
          renderItem={renderAccountItem}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No {BANK_TYPES.find(bt => bt.type === paymentMode)?.label} accounts
              </Text>
            </View>
          }
        />
      </View>
    </RNModal>
  );
};

BankAccountSelector.displayName = 'BankAccountSelector';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  accountNumber: {
    fontSize: 12,
    marginBottom: 4,
  },
  defaultLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  balanceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  balance: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BankAccountSelector;
