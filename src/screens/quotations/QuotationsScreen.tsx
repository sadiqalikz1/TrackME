import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth, useNotification } from '@/contexts';
import { Card, Button, EmptyState } from '@/components/ui';
import { Quotation } from '@/types';
import { quotationService } from '@/services/dataService';
import { useData } from '@/hooks';
import { COLLECTIONS, CURRENCIES } from '@/utils/constants';
import { formatCurrency, formatDate } from '@/utils/formatters';

const QuotationsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const currencyInfo = CURRENCIES.find(c => c.code === (user?.currency || 'USD')) || CURRENCIES[0];

  const { data: quotationsData, loading, refetch } = useData('quotations');

  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'expired'>('all');

  // Ensure quotations is an array
  const quotations = Array.isArray(quotationsData) ? quotationsData : [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDeleteQuotation = (id: string) => {
    Alert.alert('Delete Quotation', 'Are you sure you want to delete this quotation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await quotationService.delete(id);
            await refetch();
            showSuccess('Quotation deleted');
          } catch (error) {
            showError('Failed to delete quotation');
          }
        },
      },
    ]);
  };

  const filteredQuotations = quotations.filter(q => 
    selectedStatus === 'all' ? true : q.status === selectedStatus
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'accepted':
        return colors.success;
      case 'rejected':
        return colors.danger;
      case 'expired':
        return colors.textMuted;
      default:
        return colors.primary;
    }
  };

  const renderQuotationItem = ({ item }: { item: Quotation }) => (
    <Card style={styles.quotationItem}>
      <View style={styles.quotationHeader}>
        <View style={styles.quotationInfo}>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {item.clientName}
          </Text>
          <Text style={[styles.quotationId, { color: colors.textMuted }]}>
            ID: {item.id.slice(0, 8)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.textMuted }]}>
        {item.description}
      </Text>

      <View style={styles.quotationDetails}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Items</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {item.items.length}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.detailValue, { color: colors.primary }]}>
            {currencyInfo.symbol}{item.total.toFixed(2)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Valid Until</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {formatDate(new Date(item.validUntil))}
          </Text>
        </View>
      </View>

      <View style={styles.quotationActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
          onPress={() => {
            (navigation as any).navigate('QuotationDetail', { quotationId: item.id });
          }}
        >
          <Ionicons name="eye" size={18} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.danger + '20' }]}
          onPress={() => handleDeleteQuotation(item.id)}
        >
          <Ionicons name="trash" size={18} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Quotations</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Quotations</Text>
        <TouchableOpacity onPress={() => (navigation as any).navigate('CreateQuotation')}>
          <Ionicons name="add-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Quotations List - FlatList as main scrolling container */}
      <FlatList
        style={styles.content}
        data={filteredQuotations}
        renderItem={renderQuotationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {(['all', 'pending', 'accepted', 'rejected', 'expired'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: selectedStatus === status ? colors.primary : colors.card,
                    borderColor: colors.border,
                  }
                ]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text style={[
                  styles.filterText,
                  { color: selectedStatus === status ? '#fff' : colors.text }
                ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        }
        ListEmptyComponent={
          <EmptyState 
            icon="document-text"
            title="No Quotations"
            description={selectedStatus === 'all' 
              ? 'Create your first quotation to get started'
              : `No ${selectedStatus} quotations`
            }
          />
        }
      />
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 16,
  },
  quotationItem: {
    marginBottom: 12,
    padding: 12,
  },
  quotationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  quotationInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quotationId: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 13,
    marginBottom: 8,
  },
  quotationDetails: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  quotationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
});

export default QuotationsScreen;
