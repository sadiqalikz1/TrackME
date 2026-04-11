import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
}) => {
  const { colors } = useTheme();

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <View style={[styles.paginationContainer, { backgroundColor: colors.card, borderColor: colors.border }] as any}>
      {/* Info Section */}
      <View style={styles.infoSection as any}>
        <Text style={[styles.infoText, { color: colors.textSecondary }] as any}>
          Showing {startItem}-{endItem} of {totalItems}
        </Text>
      </View>

      {/* Navigation Section */}
      <View style={styles.navSection as any}>
        {/* Previous Button */}
        <TouchableOpacity
          onPress={handlePrevious}
          disabled={currentPage === 1}
          style={[
            styles.navButton,
            {
              backgroundColor: currentPage === 1 ? colors.background : colors.primaryLight,
              opacity: currentPage === 1 ? 0.5 : 1,
            },
          ] as any}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={currentPage === 1 ? colors.textMuted : colors.primary}
          />
        </TouchableOpacity>

        {/* Page Indicator */}
        <View style={styles.pageIndicator as any}>
          <Text style={[styles.currentPage, { color: colors.text }] as any}>{currentPage}</Text>
          <Text style={[styles.separator, { color: colors.textSecondary }] as any}>/</Text>
          <Text style={[styles.totalPages, { color: colors.textSecondary }] as any}>{totalPages}</Text>
        </View>

        {/* Next Button */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={currentPage === totalPages}
          style={[
            styles.navButton,
            {
              backgroundColor: currentPage === totalPages ? colors.background : colors.primaryLight,
              opacity: currentPage === totalPages ? 0.5 : 1,
            },
          ] as any}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={currentPage === totalPages ? colors.textMuted : colors.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginHorizontal: 0,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoSection: {
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  navSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
  },
  currentPage: {
    fontSize: 13,
    fontWeight: '700',
  },
  separator: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  totalPages: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Pagination;
