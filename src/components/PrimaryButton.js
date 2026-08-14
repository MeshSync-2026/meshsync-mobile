import React from 'react';
import { ActivityIndicator, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function PrimaryButton({
  label,
  icon,
  onPress,
  loading = false,
  disabled = false,
  style,
  buttonColor,
  textColor,
  iconColor,
  labelStyle,
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const isDisabled = disabled || loading;
  const resolvedButtonColor = buttonColor || (isDisabled ? colors.surfaceContainerHigh : colors.primary);
  const resolvedTextColor = textColor || colors.onPrimary;
  const resolvedIconColor = iconColor || colors.onPrimary;

  return (
    <TouchableOpacity
      activeOpacity={isDisabled ? 1 : 0.9}
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
      style={[
        styles.button,
        {
          backgroundColor: resolvedButtonColor,
          borderRadius: radius.full,
          paddingVertical: spacing.md,
          minHeight: 52,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={resolvedTextColor} />
        ) : icon ? (
          <MaterialIcons name={icon} size={20} color={resolvedIconColor} />
        ) : null}

        <Text style={[typography.labelLg, styles.label, { color: resolvedTextColor }, labelStyle]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
