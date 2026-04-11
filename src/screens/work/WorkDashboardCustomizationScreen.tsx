import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useWorkDashboard } from '@/contexts';
import { Card, Button } from '@/components/ui';
import { WorkDashboardCard } from '@/types';

const WorkDashboardCustomizationScreen: React.FC = () => {
  const { colors } = useTheme();
  const { config, toggleCardVisibility, reorderCards, updateCardColor, resetToDefault } = useWorkDashboard();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [cards, setCards] = useState<WorkDashboardCard[]>(config.cards);
  const [editingColor, setEditingColor] = useState<string | null>(null);

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => a.position - b.position);
  }, [cards]);

  const handleToggle = async (cardId: string) => {
    const updatedCards = cards.map((c) =>
      c.id === cardId ? { ...c, enabled: !c.enabled } : c
    );
    setCards(updatedCards);
    await toggleCardVisibility(cardId as any);
  };

  const handleColorChange = async (cardId: string, color: string) => {
    const updatedCards = cards.map((c) =>
      c.id === cardId ? { ...c, customColor: color } : c
    );
    setCards(updatedCards);
    await updateCardColor(cardId as any, color);
    setEditingColor(null);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newCards = [...sortedCards];
    [newCards[index - 1], newCards[index]] = [newCards[index], newCards[index - 1]];
    setCards(newCards);
    await reorderCards(newCards);
  };

  const handleMoveDown = async (index: number) => {
    if (index === sortedCards.length - 1) return;
    const newCards = [...sortedCards];
    [newCards[index], newCards[index + 1]] = [newCards[index + 1], newCards[index]];
    setCards(newCards);
    await reorderCards(newCards);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Work Dashboard',
      'Are you sure you want to reset all cards to default settings?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Reset',
          onPress: async () => {
            await resetToDefault();
            setCards(config.cards);
            setEditingColor(null);
          },
          style: 'destructive',
        },
      ]
    );
  };

  const enabledCount = cards.filter((c) => c.enabled).length;

  const COLOR_PRESETS = [
    '#ffffff',
    '#eef2ff',
    '#fef3c7',
    '#dbeafe',
    '#fce7f3',
    '#dcfce7',
    '#f0fdf4',
    '#fef2f2',
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Work Dashboard Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Cards Enabled</Text>
          <Text style={[styles.summaryCount, { color: colors.primary }]}>
            {enabledCount} / {cards.length}
          </Text>
        </Card>

        {/* Cards List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Customize Cards</Text>

        {sortedCards.map((card, index) => (
          <View key={card.id} style={[styles.cardItem, { backgroundColor: card.customColor || colors.card, borderColor: colors.border }]}>
            <View style={styles.cardLeft}>
              {/* Visibility Toggle */}
              <Switch
                value={card.enabled}
                onValueChange={() => handleToggle(card.id)}
                thumbColor={card.enabled ? colors.primary : colors.border}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
              />
              {/* Card Name */}
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.text }]}>{card.name}</Text>
                {!card.enabled && (
                  <Text style={[styles.disabledLabel, { color: colors.danger }]}>Hidden</Text>
                )}
              </View>
            </View>

            <View style={styles.cardRight}>
              {/* Color Picker Button */}
              <TouchableOpacity
                style={[styles.colorButton, { backgroundColor: colors.primaryLight }]}
                onPress={() => setEditingColor(editingColor === card.id ? null : card.id)}
              >
                <Ionicons name="brush" size={18} color={colors.primary} />
              </TouchableOpacity>

              {/* Move Up Button */}
              <TouchableOpacity
                onPress={() => handleMoveUp(index)}
                disabled={index === 0}
                style={{ opacity: index === 0 ? 0.3 : 1 }}
              >
                <Ionicons name="arrow-up" size={20} color={index === 0 ? colors.textMuted : colors.primary} />
              </TouchableOpacity>

              {/* Move Down Button */}
              <TouchableOpacity
                onPress={() => handleMoveDown(index)}
                disabled={index === sortedCards.length - 1}
                style={{ opacity: index === sortedCards.length - 1 ? 0.3 : 1 }}
              >
                <Ionicons
                  name="arrow-down"
                  size={20}
                  color={index === sortedCards.length - 1 ? colors.textMuted : colors.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Color Picker Dropdown */}
            {editingColor === card.id && (
              <View style={[styles.colorPickerContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <Text style={[styles.colorPickerTitle, { color: colors.text }]}>Select Color</Text>
                <View style={styles.colorGrid}>
                  {COLOR_PRESETS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color, borderColor: colors.border },
                        card.customColor === color && {
                          borderWidth: 3,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => handleColorChange(card.id as any, color)}
                    >
                      {card.customColor === color && (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Reset Button */}
        <Button
          title="Reset to Default"
          onPress={handleReset}
          variant="outline"
          style={styles.resetButton}
        />

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.info + '10' }]}>
          <Ionicons name="information-circle" size={18} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Customize which cards appear on your work dashboard and in what order.
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  disabledLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 12,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  colorPickerTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
});

export default WorkDashboardCustomizationScreen;
