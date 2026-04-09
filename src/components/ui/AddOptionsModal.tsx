import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AddOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface AddOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  options: AddOption[];
}

export const AddOptionsModal: React.FC<AddOptionsModalProps> = ({
  visible,
  onClose,
  options,
}) => {
  const { colors } = useTheme();
  const [scaleAnim] = useState(new Animated.Value(0));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleOptionPress = (option: AddOption) => {
    option.onPress();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Create New
            </Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: pressed ? colors.primary + '20' : 'transparent' },
              ]}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.optionsGrid}>
            {options.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => handleOptionPress(option)}
                style={({ pressed }) => [
                  styles.optionItem,
                  {
                    backgroundColor: pressed ? option.color + '20' : colors.background,
                    borderColor: option.color,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: option.color + '15' },
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={28}
                    color={option.color}
                  />
                </View>
                <Text
                  style={[styles.optionLabel, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 90,
  },
  container: {
    width: SCREEN_WIDTH - 40,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
    borderRadius: 6,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionItem: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
