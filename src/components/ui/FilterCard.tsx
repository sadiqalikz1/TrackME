import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Card, Button, Input } from '@/components/ui';

export interface FilterConfig {
  searchQuery: string;
  startDate: string;
  endDate: string;
  filterType?: string;
}

interface FilterCardProps {
  config: FilterConfig;
  onConfigChange: (config: FilterConfig) => void;
  filterLabel?: string;
  showFilterType?: boolean;
  filterTypeOptions?: { value: string; label: string }[];
  onFilterTypeChange?: (type: string) => void;
  selectedFilterType?: string;
  resultCount?: number;
}

const FilterCard: React.FC<FilterCardProps> = ({
  config,
  onConfigChange,
  filterLabel = 'Filters',
  showFilterType = false,
  filterTypeOptions = [],
  onFilterTypeChange,
  selectedFilterType,
  resultCount,
}) => {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(config.startDate);
  const [tempEndDate, setTempEndDate] = useState(config.endDate);

  const handleResetDates = () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    onConfigChange({ ...config, startDate, endDate });
  };

  const isDefaultRange = () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return config.startDate === startDate && config.endDate === endDate;
  };

  const handleApplyFilters = () => {
    onConfigChange({ ...config, startDate: tempStartDate, endDate: tempEndDate });
    setModalVisible(false);
  };

  return (
    <>
      {/* Filter Card */}
      <Card style={[styles.filterCard, { backgroundColor: colors.card, borderColor: colors.border }] as any}>
        <TouchableOpacity
          onPress={() => {
            setTempStartDate(config.startDate);
            setTempEndDate(config.endDate);
            setModalVisible(true);
          }}
          style={styles.filterCardHeader as any}
        >
          <View style={styles.filterInfo as any}>
            <Ionicons name="funnel" size={18} color={colors.primary} />
            <Text style={[styles.filterLabel, { color: colors.text }] as any}>{filterLabel}</Text>
            {resultCount !== undefined && (
              <Text style={[styles.resultCount, { color: colors.textSecondary }] as any}>
                {resultCount}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Quick View */}
        <View style={styles.quickView as any}>
          {/* Search Input */}
          <View style={{ marginBottom: 8 }}>
            <Input
              placeholder="Search..."
              value={config.searchQuery}
              onChangeText={(text) => onConfigChange({ ...config, searchQuery: text })}
              style={{ height: 36 }}
            />
          </View>

          {/* Date Range Display */}
          <View style={styles.dateDisplay as any}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }] as any}>
              {config.startDate} → {config.endDate}
            </Text>
            {!isDefaultRange() && (
              <TouchableOpacity onPress={handleResetDates}>
                <Text style={[styles.resetLink, { color: colors.primary }] as any}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>

      {/* Filter Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.background + 'e6' }] as any}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }] as any}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }] as any}>
              <Text style={[styles.modalTitle, { color: colors.text }] as any}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Search Section */}
              <View style={styles.section as any}>
                <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Search</Text>
                <Input
                  placeholder="Search..."
                  value={config.searchQuery}
                  onChangeText={(text) => onConfigChange({ ...config, searchQuery: text })}
                />
              </View>

              {/* Filter Type Section */}
              {showFilterType && filterTypeOptions.length > 0 && (
                <View style={styles.section as any}>
                  <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Type</Text>
                  <View style={styles.filterTypeGrid as any}>
                    {filterTypeOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.typeButton,
                          {
                            backgroundColor:
                              selectedFilterType === option.value
                                ? colors.primary + '20'
                                : colors.background,
                            borderColor: selectedFilterType === option.value ? colors.primary : colors.border,
                          },
                        ] as any}
                        onPress={() => {
                          onFilterTypeChange?.(option.value);
                        }}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            {
                              color: selectedFilterType === option.value ? colors.primary : colors.text,
                            },
                          ] as any}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Date Range Section */}
              <View style={styles.section as any}>
                <View style={styles.sectionHeader as any}>
                  <Text style={[styles.sectionTitle, { color: colors.text }] as any}>Date Range</Text>
                  <TouchableOpacity
                    onPress={handleResetDates}
                    style={[styles.quickRangeButton, { backgroundColor: colors.primaryLight }] as any}
                  >
                    <Text style={[styles.quickRangeText, { color: colors.primary }] as any}>Last 30 Days</Text>
                  </TouchableOpacity>
                </View>

                {/* Start Date Input */}
                <Input
                  placeholder="From Date (YYYY-MM-DD)"
                  value={tempStartDate}
                  onChangeText={setTempStartDate}
                  style={{ marginBottom: 10 }}
                />

                {/* End Date Input */}
                <Input
                  placeholder="To Date (YYYY-MM-DD)"
                  value={tempEndDate}
                  onChangeText={setTempEndDate}
                />
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }] as any}>
              <Button
                title="Clear All"
                variant="outline"
                onPress={() => {
                  onConfigChange({
                    searchQuery: '',
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                  });
                  setModalVisible(false);
                }}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Apply"
                onPress={handleApplyFilters}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  filterCard: {
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filterCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  quickView: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  dateDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  resetLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxHeight: '70%',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  quickRangeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickRangeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '30%',
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FilterCard;
