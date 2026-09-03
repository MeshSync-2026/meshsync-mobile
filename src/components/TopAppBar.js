import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

export default function TopAppBar({
  title,
  showBack = true,
  onSettingsPress,
  rightIcon,
  onRightPress,
}) {
  const navigation = useNavigation();
  const { colors, spacing, typography, isDark, toggleScheme } = useTheme();

  const resolvedRightIcon = rightIcon || (isDark ? 'light-mode' : 'dark-mode');
  const resolvedOnRightPress = onRightPress || onSettingsPress || toggleScheme;

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
            <MaterialIcons name="arrow-back" size={26} color={colors.onSurface} />
          </TouchableOpacity>
        ) : null}
        <Text style={[typography.headlineMd, { color: colors.onSurface }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <TouchableOpacity
        accessibilityLabel="Toggle theme"
        onPress={resolvedOnRightPress}
        style={styles.iconBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name={resolvedRightIcon} size={22} color={colors.onSurface} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 58,
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
});
