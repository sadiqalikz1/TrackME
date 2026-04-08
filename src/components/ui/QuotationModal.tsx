import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Modal } from './Modal';
import { Button } from './Button';
import { Card } from './Card';
import { Quotation } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface QuotationModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateQuotation: (quotation: Omit<Quotation, 'id' | 'uid' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

interface QuoteItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  visible,
  onClose,
  onCreateQuotation,
}) => {
  const { colors } = useTheme();
  
  // Quotation fields
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [description, setDescription] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [tax, setTax] = useState('0');
  const [discount, setDiscount] = useState('0');

  // Items
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnitPrice, setItemUnitPrice] = useState('');

  // UI state
  const [creating, setCreating] = useState(false);
  const [expandItems, setExpandItems] = useState(true);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = (subtotal * parseFloat(tax || '0')) / 100;
  const discountAmount = parseFloat(discount || '0');
  const total = subtotal + taxAmount - discountAmount;

  const handleAddItem = () => {
    const price = parseFloat(itemUnitPrice) || 0;
    const qty = parseFloat(itemQuantity) || 1;

    if (!itemName.trim() || price <= 0) {
      Alert.alert('Invalid Item', 'Please enter item name and unit price');
      return;
    }

    setItems([
      ...items,
      {
        name: itemName.trim(),
        quantity: qty,
        unitPrice: price,
      },
    ]);

    setItemName('');
    setItemQuantity('1');
    setItemUnitPrice('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateQuotation = async () => {
    if (!clientName.trim()) {
      Alert.alert('Missing Info', 'Please enter client name');
      return;
    }

    if (items.length === 0) {
      Alert.alert('No Items', 'Please add at least one item to the quotation');
      return;
    }

    setCreating(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(validDays || '30'));

      const quoteDescription = description.trim();
      await onCreateQuotation({
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        description: quoteDescription || 'Quotation',
        items: items.map((item) => ({
          ...item,
          total: item.quantity * item.unitPrice,
        })),
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total,
        validUntil: validUntil.toISOString().split('T')[0],
        status: 'pending',
      });

      Alert.alert('Success', 'Quotation created successfully!');
      resetForm();
      onClose();
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setDescription('');
    setValidDays('30');
    setTax('0');
    setDiscount('0');
    setItems([]);
    setItemName('');
    setItemQuantity('1');
    setItemUnitPrice('');
  };

  return (
    <Modal visible={visible} title="Create Quotation" onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Client Info */}
        <Card style={{ marginBottom: 12, padding: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Client Information</Text>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Client Name *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter client name"
              placeholderTextColor={colors.textSecondary}
              value={clientName}
              onChangeText={setClientName}
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="email@example.com"
                placeholderTextColor={colors.textSecondary}
                value={clientEmail}
                onChangeText={setClientEmail}
                keyboardType="email-address"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="+1 234 567"
                placeholderTextColor={colors.textSecondary}
                value={clientPhone}
                onChangeText={setClientPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.descriptionInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Project description"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />
          </View>
        </Card>

        {/* Items */}
        <Card style={{ marginBottom: 12, padding: 12 }}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setExpandItems(!expandItems)}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Items</Text>
            <Ionicons
              name={expandItems ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {expandItems && (
            <>
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Item Name</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g., CCTV Installation"
                  placeholderTextColor={colors.textSecondary}
                  value={itemName}
                  onChangeText={setItemName}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={styles.thirdInput}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Qty</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    placeholder="1"
                    placeholderTextColor={colors.textSecondary}
                    value={itemQuantity}
                    onChangeText={setItemQuantity}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.twoThirdInput}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Unit Price</Text>
                  <View style={[styles.inputBox, { borderColor: colors.border }]}>
                    <Text style={[styles.currency, { color: colors.textSecondary }]}>$</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, flex: 1 }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={itemUnitPrice}
                      onChangeText={setItemUnitPrice}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              <Button
                title="Add Item"
                onPress={handleAddItem}
                variant="secondary"
                style={{ marginBottom: 12 }}
              />

              {/* Items List */}
              <FlatList
                data={items}
                keyExtractor={(_, index) => index.toString()}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <View
                    style={[
                      styles.itemRow,
                      { borderBottomColor: colors.border, backgroundColor: colors.background },
                    ]}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.itemDetails, { color: colors.textSecondary }]}>
                        {item.quantity} × {formatCurrency(item.unitPrice, 'USD')}
                      </Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={[styles.itemTotal, { color: colors.primary }]}>
                        {formatCurrency(item.quantity * item.unitPrice, 'USD')}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                        <Ionicons name="close-circle" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            </>
          )}
        </Card>

        {/* Calculations */}
        <Card style={{ marginBottom: 12, padding: 12 }}>
          <View style={styles.calcRow}>
            <Text style={[styles.calcLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.calcValue, { color: colors.text }]}>
              {formatCurrency(subtotal, 'USD')}
            </Text>
          </View>

          <View style={styles.calcRow}>
            <View style={styles.calcInput}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Tax (%)</Text>
              <TextInput
                style={[styles.smallInput, { borderColor: colors.border, color: colors.text }]}
                placeholder="0"
                value={tax}
                onChangeText={setTax}
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={[styles.calcValue, { color: colors.text }]}>
              {formatCurrency(taxAmount, 'USD')}
            </Text>
          </View>

          <View style={styles.calcRow}>
            <View style={styles.calcInput}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Discount</Text>
              <View style={[styles.inputBox, { borderColor: colors.border }]}>
                <Text style={[styles.currency, { color: colors.textSecondary }]}>$</Text>
                <TextInput
                  style={[styles.smallInput, { color: colors.text, flex: 1 }]}
                  placeholder="0"
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Text style={[styles.calcValue, { color: colors.danger }]}>
              -{formatCurrency(discountAmount, 'USD')}
            </Text>
          </View>

          <View
            style={[
              styles.calcRow,
              { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
            ]}
          >
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {formatCurrency(total, 'USD')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Valid Until (days)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="30"
              value={validDays}
              onChangeText={setValidDays}
              keyboardType="number-pad"
            />
          </View>
        </Card>

        {/* Create Button */}
        <Button
          title={creating ? 'Creating...' : 'Create Quotation'}
          onPress={handleCreateQuotation}
          disabled={creating}
          style={{ marginBottom: 20 }}
        />
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  thirdInput: {
    flex: 0.35,
  },
  twoThirdInput: {
    flex: 0.65,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 44,
  },
  smallInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 13,
    height: 36,
  },
  currency: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 6,
    marginBottom: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 11,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '600',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calcLabel: {
    fontSize: 12,
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  calcInput: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
