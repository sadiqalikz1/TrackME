import React, { ReactNode } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
  footer?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  footer,
}) => {
  const { colors, isDark } = useTheme();

  const getMaxHeight = (): number => {
    switch (size) {
      case 'sm':
        return SCREEN_HEIGHT * 0.4;
      case 'lg':
        return SCREEN_HEIGHT * 0.85;
      case 'full':
        return SCREEN_HEIGHT * 0.95;
      default:
        return SCREEN_HEIGHT * 0.7;
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[
              styles.container,
              {
                backgroundColor: colors.card,
                maxHeight: getMaxHeight(),
              },
              size === 'full' && styles.fullSize,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {title}
                </Text>
                {showCloseButton && (
                  <TouchableOpacity
                    onPress={onClose}
                    style={[styles.closeButton, { backgroundColor: colors.cardSecondary }]}
                  >
                    <Ionicons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {/* Footer */}
            {footer && (
              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                {footer}
              </View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  fullSize: {
    borderRadius: 0,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
});

export default Modal;
