import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { Button } from './Button';
import { useTheme } from '@/contexts';

export type SyncStrategy = 'cloud_only' | 'merge' | 'push_local';

interface DataSyncStrategyModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectStrategy: (strategy: SyncStrategy) => Promise<void>;
  localDataCount?: number;
  cloudDataExists?: boolean;
}

interface StrategyOption {
  id: SyncStrategy;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  recommended?: boolean;
  warning?: string;
}

export const DataSyncStrategyModal: React.FC<DataSyncStrategyModalProps> = ({
  visible,
  onClose,
  onSelectStrategy,
  localDataCount = 0,
  cloudDataExists = true,
}) => {
  const { colors } = useTheme();
  const [selectedStrategy, setSelectedStrategy] = useState<SyncStrategy>('cloud_only');
  const [isLoading, setIsLoading] = useState(false);

  const strategies: StrategyOption[] = [
    {
      id: 'cloud_only',
      title: 'Use Cloud Data Only',
      description: 'Download your data from the cloud. Local data will be cleared.',
      icon: 'cloud-download-outline',
      iconColor: colors.primary,
      recommended: true,
    },
    {
      id: 'merge',
      title: 'Merge Data',
      description: 'Combine local and cloud data. Newer changes win conflicts.',
      icon: 'git-merge-outline',
      iconColor: colors.warning,
    },
    {
      id: 'push_local',
      title: 'Push Local to Cloud',
      description: 'Upload local data to cloud. Cloud data will be replaced.',
      icon: 'cloud-upload-outline',
      iconColor: colors.danger,
      warning: 'This will overwrite your cloud data!',
    },
  ];

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onSelectStrategy(selectedStrategy);
    } catch (error) {
      console.error('Error applying sync strategy:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStrategyOption = (strategy: StrategyOption) => {
    const isSelected = selectedStrategy === strategy.id;

    return (
      <TouchableOpacity
        key={strategy.id}
        style={[
          styles.optionContainer,
          {
            backgroundColor: isSelected ? colors.primaryLight : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => setSelectedStrategy(strategy.id)}
        disabled={isLoading}
      >
        <View style={styles.optionContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${strategy.iconColor}20` },
            ]}
          >
            <Ionicons
              name={strategy.icon}
              size={28}
              color={strategy.iconColor}
            />
          </View>

          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                {strategy.title}
              </Text>
              {strategy.recommended && (
                <View style={[styles.recommendedBadge, { backgroundColor: colors.success }]}>
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              )}
            </View>
            <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
              {strategy.description}
            </Text>
            {strategy.warning && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning-outline" size={14} color={colors.danger} />
                <Text style={[styles.warningText, { color: colors.danger }]}>
                  {strategy.warning}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.radioContainer}>
            <View
              style={[
                styles.radioOuter,
                { borderColor: isSelected ? colors.primary : colors.border },
              ]}
            >
              {isSelected && (
                <View
                  style={[styles.radioInner, { backgroundColor: colors.primary }]}
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Data Sync Options"
      size="large"
      showCloseButton={!isLoading}
    >
      <View style={styles.container}>
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            {localDataCount > 0
              ? `You have ${localDataCount} items stored locally.`
              : 'Choose how to sync your data with the cloud.'}
            {cloudDataExists && ' Your cloud account also has existing data.'}
          </Text>
        </View>

        {/* Strategy Options */}
        <View style={styles.optionsContainer}>
          {strategies.map(renderStrategyOption)}
        </View>

        {/* Confirm Button */}
        <View style={styles.buttonContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Syncing your data...
              </Text>
            </View>
          ) : (
            <>
              <Button
                title="Continue"
                onPress={handleConfirm}
                style={styles.confirmButton}
              />
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onClose}
              >
                <Text style={[styles.skipText, { color: colors.textMuted }]}>
                  Skip for now
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionContainer: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
  },
  radioContainer: {
    marginLeft: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  buttonContainer: {
    marginTop: 8,
  },
  confirmButton: {
    marginBottom: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
});

export default DataSyncStrategyModal;
