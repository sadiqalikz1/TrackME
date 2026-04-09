import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts';

interface CardContextMenuProps {
  visible: boolean;
  onDismiss: () => void;
  onToggleVisibility: () => void;
  onChangeColor: (color: string) => void;
  onMove?: (direction: 'up' | 'down') => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  currentColor?: string;
}

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CardContextMenu: React.FC<CardContextMenuProps> = ({
  visible,
  onDismiss,
  onToggleVisibility,
  onChangeColor,
  onMove,
  canMoveUp = true,
  canMoveDown = true,
  currentColor,
}) => {
  const { colors } = useTheme();
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleColorSelect = (color: string) => {
    onChangeColor(color);
    setShowColorPicker(false);
  };

  const menuActions = [
    {
      id: 'toggle',
      label: 'Hide Card',
      icon: 'eye-off',
      onPress: () => {
        onToggleVisibility();
        onDismiss();
      },
    },
    {
      id: 'color',
      label: 'Change Color',
      icon: 'palette',
      onPress: () => setShowColorPicker(true),
    },
    canMoveUp && {
      id: 'moveUp',
      label: 'Move Up',
      icon: 'arrow-up',
      onPress: () => {
        onMove?.('up');
        onDismiss();
      },
    },
    canMoveDown && {
      id: 'moveDown',
      label: 'Move Down',
      icon: 'arrow-down',
      onPress: () => {
        onMove?.('down');
        onDismiss();
      },
    },
  ].filter(Boolean) as any[];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!showColorPicker ? (
            <>
              <View style={styles.menuHeader}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Card Options</Text>
              </View>
              <FlatList
                scrollEnabled={false}
                data={menuActions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.menuItem, { borderBottomColor: colors.border }]}
                    onPress={item.onPress}
                  >
                    <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                    <Text style={[styles.menuItemText, { color: colors.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </>
          ) : (
            <>
              <View style={styles.menuHeader}>
                <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                  <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Select Color</Text>
                <View style={{ width: 24 }} />
              </View>
              <View style={styles.colorGrid}>
                {COLOR_PRESETS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color, borderColor: colors.border },
                      currentColor === color && { borderWidth: 2, borderColor: colors.primary },
                    ]}
                    onPress={() => handleColorSelect(color)}
                  >
                    {currentColor === color && (
                      <Ionicons name="checkmark" size={20} color={colors.text} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: SCREEN_HEIGHT * 0.6,
    borderWidth: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 14,
    marginLeft: 16,
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-around',
  },
  colorOption: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});

export default CardContextMenu;
