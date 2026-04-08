import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { TransactionCategory, WorkCategory } from '@/types';
import { TRANSACTION_CATEGORIES, WORK_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/utils/constants';

type CategoryType = 'transaction' | 'work' | 'income' | 'expense';
type Category = TransactionCategory | WorkCategory;

interface CategoryPickerProps {
  type?: CategoryType;
  selected?: Category;
  onSelect?: (category: Category) => void;
  filter?: 'income' | 'expense' | 'all';
  // Alternative interface
  label?: string;
  value?: Category;
  onChange?: (category: Category) => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  type = 'transaction',
  selected,
  onSelect,
  filter = 'all',
  label,
  value,
  onChange,
}) => {
  const { colors } = useTheme();
  
  // Support both interfaces
  const selectedValue = value || selected;
  const handleSelect = onChange || onSelect;

  const getCategories = () => {
    if (type === 'work') {
      return Object.entries(WORK_CATEGORIES);
    }

    const categories = Object.entries(TRANSACTION_CATEGORIES);
    
    if (type === 'income' || filter === 'income') {
      return categories.filter(([key]) => 
        INCOME_CATEGORIES.includes(key as TransactionCategory)
      );
    }
    
    if (type === 'expense' || filter === 'expense') {
      return categories.filter(([key]) => 
        EXPENSE_CATEGORIES.includes(key as TransactionCategory)
      );
    }
    
    return categories;
  };

  const categories = getCategories();

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map(([key, category]) => {
          const isSelected = selectedValue === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => handleSelect?.(key as Category)}
              style={[
                styles.categoryItem,
                {
                  backgroundColor: isSelected ? category.color : colors.inputBackground,
                  borderColor: isSelected ? category.color : colors.border,
                },
              ]}
            >
              <Ionicons
                name={category.icon as any}
                size={20}
                color={isSelected ? '#ffffff' : category.color}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  { color: isSelected ? '#ffffff' : colors.text },
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export const CategoryGrid: React.FC<CategoryPickerProps> = ({
  type = 'transaction',
  selected,
  onSelect,
  filter = 'all',
  label,
  value,
  onChange,
}) => {
  const { colors } = useTheme();
  
  // Support both interfaces
  const selectedValue = value || selected;
  const handleSelect = onChange || onSelect;

  const getCategories = () => {
    if (type === 'work') {
      return Object.entries(WORK_CATEGORIES);
    }

    const categories = Object.entries(TRANSACTION_CATEGORIES);
    
    if (type === 'income' || filter === 'income') {
      return categories.filter(([key]) => 
        INCOME_CATEGORIES.includes(key as TransactionCategory)
      );
    }
    
    if (type === 'expense' || filter === 'expense') {
      return categories.filter(([key]) => 
        EXPENSE_CATEGORIES.includes(key as TransactionCategory)
      );
    }
    
    return categories;
  };

  const categories = getCategories();

  return (
    <View>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={styles.grid}>
        {categories.map(([key, category]) => {
          const isSelected = selectedValue === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => handleSelect?.(key as Category)}
              style={[
                styles.gridItem,
                {
                  backgroundColor: isSelected ? category.color : colors.inputBackground,
                  borderColor: isSelected ? category.color : colors.border,
                },
              ]}
            >
              <Ionicons
                name={category.icon as any}
                size={24}
                color={isSelected ? '#ffffff' : category.color}
              />
              <Text
                style={[
                  styles.gridLabel,
                  { color: isSelected ? '#ffffff' : colors.text },
                ]}
                numberOfLines={1}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default CategoryPicker;
