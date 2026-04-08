import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { TRANSACTION_CATEGORIES } from '@/utils/constants';
import { TransactionCategory } from '@/types';

interface CategoryPickerProps {
  selectedCategory: TransactionCategory;
  onSelect: (category: TransactionCategory) => void;
  showIncomeCategories?: boolean;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selectedCategory,
  onSelect,
  showIncomeCategories = true,
}) => {
  const { colors } = useTheme();

  const categories = Object.entries(TRANSACTION_CATEGORIES).filter(([key]) => {
    if (!showIncomeCategories) {
      return !['salary', 'investment'].includes(key);
    }
    return true;
  });

  const getIconName = (icon: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      restaurant: 'restaurant',
      car: 'car',
      home: 'home',
      'shopping-bag': 'bag',
      film: 'film',
      heart: 'heart',
      briefcase: 'briefcase',
      'trending-up': 'trending-up',
      'file-text': 'document-text',
      'more-horizontal': 'ellipsis-horizontal',
    };
    return iconMap[icon] || 'ellipsis-horizontal';
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map(([key, { label, icon, color }]) => {
          const isSelected = selectedCategory === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryItem,
                {
                  backgroundColor: isSelected ? color : colors.cardSecondary,
                  borderColor: isSelected ? color : colors.border,
                },
              ]}
              onPress={() => onSelect(key as TransactionCategory)}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : color + '20',
                  },
                ]}
              >
                <Ionicons
                  name={getIconName(icon)}
                  size={20}
                  color={isSelected ? '#fff' : color}
                />
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  { color: isSelected ? '#fff' : colors.text },
                ]}
                numberOfLines={1}
              >
                {label.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  scrollContent: {
    paddingRight: 16,
    gap: 10,
  },
  categoryItem: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default CategoryPicker;
