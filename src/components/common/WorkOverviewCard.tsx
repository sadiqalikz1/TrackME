import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';
import { Card } from '@/components/ui';
import { Work } from '@/types';

interface WorkOverviewCardProps {
  works: Work[];
  customColor?: string;
  onWorkPress?: (work: Work) => void;
}

const WorkOverviewCard: React.FC<WorkOverviewCardProps> = ({ works, customColor, onWorkPress }) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const activeWorks = useMemo(() => {
    return works.filter((w) => w.status === 'in-progress' || w.status === 'pending').slice(0, isExpanded ? 10 : 3);
  }, [works, isExpanded]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'in-progress':
        return colors.info;
      case 'pending':
        return colors.warning;
      case 'cancelled':
        return colors.danger;
      default:
        return colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'in-progress':
        return 'hourglass';
      case 'pending':
        return 'clock';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const cardStyle = customColor ? { backgroundColor: customColor } : {};

  return (
    <Card style={[styles.container, cardStyle]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Work Overview</Text>
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {activeWorks.length > 0 ? (
        <FlatList
          scrollEnabled={false}
          data={activeWorks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.workItem, { borderBottomColor: colors.border }]}
              onPress={() => onWorkPress?.(item)}
            >
              <View style={styles.workContent}>
                <Text style={[styles.workTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.workCategory, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.category}
                </Text>
              </View>
              <View style={styles.workStatus}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Ionicons name={getStatusIcon(item.status) as any} size={14} color={getStatusColor(item.status)} />
                  <Text style={[styles.statusLabel, { color: getStatusColor(item.status) }]}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No active work</Text>
        </View>
      )}

      {works.filter((w) => w.status === 'in-progress' || w.status === 'pending').length > 3 && !isExpanded && (
        <Text style={[styles.viewMore, { color: colors.primary }]}>
          View {works.filter((w) => w.status === 'in-progress' || w.status === 'pending').length - 3} more
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  workItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  workContent: {
    flex: 1,
    marginRight: 12,
  },
  workTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  workCategory: {
    fontSize: 11,
  },
  workStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 8,
  },
  viewMore: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default WorkOverviewCard;
