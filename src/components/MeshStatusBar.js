import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

// Full-bleed horizontal bar used for system-wide sync status, e.g.
// "Offline - Mesh Active". Matches the "Status Bars" component spec.
export default function MeshStatusBar({ nodesInRange = 48, label }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant, paddingHorizontal: spacing.marginMobile },
      ]}
    >
      <MaterialIcons name="wifi-off" size={16} color={colors.onSurfaceVariant} />
      <Text style={[typography.labelLg, styles.label, { color: colors.onSurfaceVariant }]}>
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
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  label: {
    textTransform: 'uppercase',
  },
});
