import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function Stepper({ value, onChange, min = 1, max = 99 }) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderColor: colors.outlineVariant, borderRadius: radius.md, padding: spacing.xs, gap: spacing.md },
      ]}
    >
      <TouchableOpacity
        accessibilityLabel="Decrease"
        onPress={() => value > min && onChange(value - 1)}
        style={[styles.circle, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}
      >
        <MaterialIcons name="remove" size={20} color={colors.onSurface} />
      </TouchableOpacity>
      <Text style={[typography.headlineMd, { color: colors.onSurface, width: 28, textAlign: 'center' }]}>{value}</Text>
      <TouchableOpacity
        accessibilityLabel="Increase"
        onPress={() => value < max && onChange(value + 1)}
        style={[styles.circle, { backgroundColor: colors.ink }]}
      >
        <MaterialIcons name="add" size={20} color={colors.onInk} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
