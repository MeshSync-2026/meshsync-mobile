import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

export default function TopAppBar({
  title,
  showBack = true,
  onSettingsPress,
  rightIcon = 'settings',
  onRightPress,
}) {
  const navigation = useNavigation();
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.outlineVariant,
          paddingHorizontal: spacing.marginMobile,
        },
      ]}
    >
      <View style={styles.left}>
        {showBack && navigation.canGoBack() ? (
          <TouchableOpacity
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        ) : null}
        <Text style={[typography.headlineMd, { color: colors.onSurface }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {(onSettingsPress || onRightPress) && (
        <TouchableOpacity
          accessibilityLabel="Settings"
          onPress={onRightPress || onSettingsPress}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name={rightIcon} size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
});
