import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme, useAuth, useNotification } from '@/contexts';
import { Card, Button, Input, Modal } from '@/components/ui';
import { Quotation } from '@/types';
import { getQuotationById } from '@/services/firebase';
import { quotationService } from '@/services/dataService';
import { COLLECTIONS, CURRENCIES } from '@/utils/constants';
import { formatCurrency, formatDate } from '@/utils/formatters';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const QuotationDetailScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { quotationId } = route.params as { quotationId: string };

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editStatus, setEditStatus] = useState<Quotation['status']>('pending');
  const [exporting, setExporting] = useState(false);
  const [editItemModalVisible, setEditItemModalVisible] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [editedItemName, setEditedItemName] = useState('');
  const [editedItemPrice, setEditedItemPrice] = useState('');
  const [editedItemQty, setEditedItemQty] = useState('');

  const currencyInfo = CURRENCIES.find(c => c.code === (user?.currency || 'USD')) || CURRENCIES[0];

  useEffect(() => {
    loadQuotation();
  }, [quotationId]);

  const loadQuotation = async () => {
    try {
      const q = await getQuotationById(quotationId);
      if (q) {
        setQuotation(q);
        setEditStatus(q.status);
      } else {
        showError('Quotation not found');
        navigation.goBack();
      }
    } catch (error) {
      showError('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!quotation) return;
    try {
      await quotationService.update(quotation.id, { status: editStatus });
      setQuotation({ ...quotation, status: editStatus });
      setEditModalVisible(false);
      showSuccess('Status updated');
    } catch (error) {
      showError('Failed to update status');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Quotation', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await quotationService.delete(quotation!.id);
            showSuccess('Quotation deleted');
            navigation.goBack();
          } catch (error) {
            showError('Failed to delete quotation');
          }
        },
      },
    ]);
  };

  const handleEditItem = (index: number) => {
    if (!quotation) return;
    const item = quotation.items[index];
    setSelectedItemIndex(index);
    setEditedItemName(item.name);
    setEditedItemPrice(item.unitPrice.toString());
    setEditedItemQty(item.quantity.toString());
    setEditItemModalVisible(true);
  };

  const handleSaveItemChanges = async () => {
    if (selectedItemIndex === null || !quotation || !editedItemName.trim() || !editedItemPrice) {
      Alert.alert('Invalid Input', 'Please fill in all fields');
      return;
    }

    try {
      const updatedItems = quotation.items.map((item, idx) => {
        if (idx === selectedItemIndex) {
          const quantity = parseFloat(editedItemQty) || 1;
          const unitPrice = parseFloat(editedItemPrice);
          return {
            ...item,
            name: editedItemName.trim(),
            quantity,
            unitPrice,
            total: quantity * unitPrice,
          };
        }
        return item;
      });

      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      const updatedQuotation = {
        ...quotation,
        items: updatedItems,
        subtotal,
        total: subtotal + quotation.tax - quotation.discount,
      };

      await quotationService.update(quotation.id, {
        items: updatedItems,
        subtotal,
        total: updatedQuotation.total,
      });

      setQuotation(updatedQuotation);
      setEditItemModalVisible(false);
      showSuccess('Item updated');
    } catch (error) {
      showError('Failed to update item');
    }
  };

  const generatePDF = async () => {
    if (!quotation) return;

    setExporting(true);
    try {
      const taxPercentage = quotation.subtotal > 0 ? ((quotation.tax / quotation.subtotal) * 100).toFixed(0) : '0';
      
      const itemsHTML = quotation.items
        .map(
          (item) =>
            `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currencyInfo.symbol}${item.unitPrice.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${taxPercentage}%</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currencyInfo.symbol}${item.total.toFixed(2)}</td>
        </tr>
      `
        )
        .join('');

      const html = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; }
              .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .subtitle { font-size: 12px; color: #666; }
              .client-info { margin-bottom: 20px; }
              .client-info p { margin: 5px 0; font-size: 12px; }
              .details-table { width: 100%; margin-bottom: 20px; font-size: 12px; }
              .details-table tr td { padding: 5px 0; }
              .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
              .items-table th { background-color: #f3f4f6; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #333; }
              .summary { width: 100%; margin-left: auto; margin-right: 0; width: 300px; font-size: 12px; }
              .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
              .summary-row.total { font-weight: bold; font-size: 14px; border-top: 2px solid #333; padding-top: 10px; }
              .status-badge { display: inline-block; background-color: #e5e7eb; padding: 5px 10px; border-radius: 3px; font-size: 11px; }
              .footer { margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 10px; text-align: center; }
              .currency { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">QUOTATION</div>
              <div class="subtitle">Quote ID: ${quotation.id.slice(0, 8).toUpperCase()}</div>
            </div>

            <div class="client-info">
              <strong>Bill To:</strong><br/>
              <p><strong>${quotation.clientName}</strong></p>
              ${quotation.clientEmail ? `<p>Email: ${quotation.clientEmail}</p>` : ''}
              ${quotation.clientPhone ? `<p>Phone: ${quotation.clientPhone}</p>` : ''}
            </div>

            <table class="details-table">
              <tr>
                <td><strong>Date:</strong> ${formatDate(new Date())}</td>
                <td><strong>Currency:</strong> <span class="currency">${currencyInfo.code}</span></td>
              </tr>
              <tr>
                <td><strong>Valid Until:</strong> ${quotation.validUntil}</td>
                <td><strong>Status:</strong> <span class="status-badge">${quotation.status.toUpperCase()}</span></td>
              </tr>
              ${quotation.description ? `<tr><td colspan="2"><strong>Description:</strong> ${quotation.description}</td></tr>` : ''}
            </table>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: center;">Tax %</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span><span class="currency">${currencyInfo.symbol}</span>${quotation.subtotal.toFixed(2)}</span>
              </div>
              ${
                quotation.tax > 0
                  ? `<div class="summary-row">
                <span>Tax (${taxPercentage}%):</span>
                <span><span class="currency">${currencyInfo.symbol}</span>${quotation.tax.toFixed(2)}</span>
              </div>`
                  : ''
              }
              ${
                quotation.discount > 0
                  ? `<div class="summary-row">
                <span>Discount:</span>
                <span>-<span class="currency">${currencyInfo.symbol}</span>${quotation.discount.toFixed(2)}</span>
              </div>`
                  : ''
              }
              <div class="summary-row total">
                <span>Total:</span>
                <span><span class="currency">${currencyInfo.symbol}</span>${quotation.total.toFixed(2)}</span>
              </div>
            </div>

            <div class="footer">
              <p>This is a quotation generated by TrackME on ${formatDate(new Date(), 'MMMM d, yyyy')}</p>
              <p>Currency: ${currencyInfo.name} (${currencyInfo.code})</p>
              <p>Thank you for your business!</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      const filename = `Quotation_${quotation.id.slice(0, 8)}_${Date.now()}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.copyAsync({ from: uri, to: newUri });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri);
      } else {
        showSuccess('PDF saved to downloads');
      }
    } catch (error) {
      showError('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Quotation Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!quotation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Quotation Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Quotation not found</Text>
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
        <Text style={[styles.title, { color: colors.text }]}>Quotation Details</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash" size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client Info */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Client Information</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Name</Text>
            <Text style={[styles.value, { color: colors.text }]}>{quotation.clientName}</Text>
          </View>
          {quotation.clientEmail && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
              <Text style={[styles.value, { color: colors.text }]}>{quotation.clientEmail}</Text>
            </View>
          )}
          {quotation.clientPhone && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Phone</Text>
              <Text style={[styles.value, { color: colors.text }]}>{quotation.clientPhone}</Text>
            </View>
          )}
        </Card>

        {/* Quotation Info */}
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quotation Details</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quotation.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(quotation.status) }]}>
                {quotation.status}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>ID</Text>
            <Text style={[styles.value, { color: colors.text }]}>{quotation.id.slice(0, 8)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Valid Until</Text>
            <Text style={[styles.value, { color: colors.text }]}>{quotation.validUntil}</Text>
          </View>
          {quotation.description && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
              <Text style={[styles.value, { color: colors.text }]}>{quotation.description}</Text>
            </View>
          )}
        </Card>

        {/* Items */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Items ({quotation.items.length})</Text>
          {quotation.items.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.itemRow, { borderBottomColor: colors.border }]}
              onPress={() => handleEditItem(index)}
            >
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemDetails, { color: colors.textMuted }]}>
                  {item.quantity} × {currencyInfo.symbol}{item.unitPrice.toFixed(2)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.itemTotal, { color: colors.primary }]}>
                  {currencyInfo.symbol}{item.total.toFixed(2)}
                </Text>
                <Ionicons name="pencil" size={14} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Summary */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {currencyInfo.symbol}{quotation.subtotal.toFixed(2)}
            </Text>
          </View>
          {quotation.tax > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Tax</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {currencyInfo.symbol}{quotation.tax.toFixed(2)}
              </Text>
            </View>
          )}
          {quotation.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Discount</Text>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>
                -{currencyInfo.symbol}{quotation.discount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {currencyInfo.symbol}{quotation.total.toFixed(2)}
            </Text>
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Update Status"
            variant="secondary"
            onPress={() => setEditModalVisible(true)}
            icon={<Ionicons name="pencil" size={18} color={colors.primary} />}
          />
          <Button
            title={exporting ? 'Generating PDF...' : 'Export PDF'}
            variant="primary"
            onPress={generatePDF}
            disabled={exporting}
            icon={<Ionicons name="document-outline" size={18} color="#fff" />}
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Update Status Modal */}
      <Modal visible={editModalVisible} title="Update Status" onClose={() => setEditModalVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={[styles.label, { color: colors.textMuted, marginBottom: 12 }]}>
            Select Status
          </Text>
          {(['pending', 'accepted', 'rejected', 'expired'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusOption,
                {
                  backgroundColor: editStatus === status ? colors.primary + '20' : colors.card,
                  borderColor: editStatus === status ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setEditStatus(status)}
            >
              <Ionicons
                name={editStatus === status ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={editStatus === status ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.statusOptionText, { color: colors.text }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          <Button title="Save" onPress={handleUpdateStatus} style={{ marginTop: 12 }} />
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={editItemModalVisible} title="Edit Item" onClose={() => setEditItemModalVisible(false)}>
        <View style={styles.modalContent}>
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.label, { color: colors.textMuted, marginBottom: 8 }]}>Item Name</Text>
            <Input
              placeholder="Item name"
              value={editedItemName}
              onChangeText={setEditedItemName}
            />
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.label, { color: colors.textMuted, marginBottom: 8 }]}>Unit Price</Text>
            <Input
              placeholder="0.00"
              value={editedItemPrice}
              onChangeText={setEditedItemPrice}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.label, { color: colors.textMuted, marginBottom: 8 }]}>Quantity</Text>
            <Input
              placeholder="1"
              value={editedItemQty}
              onChangeText={setEditedItemQty}
              keyboardType="decimal-pad"
            />
          </View>

          <Button title="Save Changes" onPress={handleSaveItemChanges} style={{ marginTop: 12 }} />
        </View>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 12,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    gap: 8,
    marginTop: 12,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  modalContent: {
    padding: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default QuotationDetailScreen;
