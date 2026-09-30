import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function MeshStatusBar({ nodesInRange = 0, label }) {
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
      <MaterialIcons name="wifi-off" size={14} color={colors.onSurfaceVariant} />
      <Text style={[typography.labelLg, styles.label, { color: colors.onSurface }]}>
        {label || `Offline - Mesh Active (${nodesInRange} nodes)`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
