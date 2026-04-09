import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth, useNotification } from '@/contexts';
import { Card, Button } from '@/components/ui';
import { Quotation } from '@/types';
import { quotationService } from '@/services/dataService';
import { CURRENCIES } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';

interface QuoteItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

const CreateQuotationScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const currencyInfo = CURRENCIES.find(c => c.code === (user?.currency || 'USD')) || CURRENCIES[0];

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

  // Memoize calculations to prevent unnecessary re-renders
  const { subtotal, taxAmount, discountAmount, total } = useMemo(() => {
    const sub = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmt = (sub * parseFloat(tax || '0')) / 100;
    const discountAmt = parseFloat(discount || '0');
    const tot = sub + taxAmt - discountAmt;
    return { subtotal: sub, taxAmount: taxAmt, discountAmount: discountAmt, total: tot };
  }, [items, tax, discount]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleAddItem = useCallback(() => {
    const price = parseFloat(itemUnitPrice) || 0;
    const qty = parseFloat(itemQuantity) || 1;

    if (!itemName.trim() || price <= 0) {
      Alert.alert('Invalid Item', 'Please enter item name and unit price');
      return;
    }

    setItems(prev => [
      ...prev,
      {
        name: itemName.trim(),
        quantity: qty,
        unitPrice: price,
      },
    ]);

    setItemName('');
    setItemQuantity('1');
    setItemUnitPrice('');
  }, [itemName, itemQuantity, itemUnitPrice]);

  const handleRemoveItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreateQuotation = useCallback(async () => {
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
      await quotationService.create({
        uid: user!.uid,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || '',
        clientPhone: clientPhone.trim() || '',
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

      showSuccess('Quotation created successfully!');
      resetForm();
      navigation.goBack();
    } catch (error) {
      showError('Failed to create quotation');
    } finally {
      setCreating(false);
    }
  }, [clientName, clientEmail, clientPhone, description, validDays, items, subtotal, taxAmount, discountAmount, total, user, navigation, showSuccess, showError]);

  const resetForm = useCallback(() => {
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
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Quotation</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
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
                    <Text style={[styles.currency, { color: colors.textSecondary }]}>{currencyInfo.symbol}</Text>
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
              <View>
                {items.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.itemRow,
                      { borderBottomColor: colors.border, backgroundColor: colors.background },
                    ]}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.itemDetails, { color: colors.textSecondary }]}>
                        {item.quantity} × {currencyInfo.symbol}{item.unitPrice.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={[styles.itemTotal, { color: colors.primary }]}>
                        {currencyInfo.symbol}{(item.quantity * item.unitPrice).toFixed(2)}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                        <Ionicons name="close-circle" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </Card>

        {/* Calculations */}
        <Card style={{ marginBottom: 12, padding: 12 }}>
          <View style={styles.calcRow}>
            <Text style={[styles.calcLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.calcValue, { color: colors.text }]}>
              {currencyInfo.symbol}{subtotal.toFixed(2)}
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
              {currencyInfo.symbol}{taxAmount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.calcRow}>
            <View style={styles.calcInput}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Discount</Text>
              <View style={[styles.inputBox, { borderColor: colors.border }]}>
                <Text style={[styles.currency, { color: colors.textSecondary }]}>{currencyInfo.symbol}</Text>
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
              -{currencyInfo.symbol}{discountAmount.toFixed(2)}
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
              {currencyInfo.symbol}{total.toFixed(2)}
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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  section: {
    marginBottom: 12,
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
    flex: 1,
  },
  twoThirdInput: {
    flex: 2,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
  },
  currency: {
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  smallInput: {
    fontSize: 14,
    paddingHorizontal: 4,
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  itemTotal: {
    fontSize: 13,
    fontWeight: '600',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calcInput: {
    flex: 1,
    marginRight: 8,
  },
  calcLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  calcValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 100,
    textAlign: 'right',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default CreateQuotationScreen;
