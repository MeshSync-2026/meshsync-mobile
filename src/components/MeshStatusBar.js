import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import MeshDiagnosticsModal from './MeshDiagnosticsModal';

export default function MeshStatusBar({ nodesInRange = 48, label }) {
  const { colors, spacing, typography } = useTheme();
  const [showDiag, setShowDiag] = useState(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowDiag(true)}
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
        <View style={styles.debugPill}>
          <MaterialIcons name="bug-report" size={12} color="#3B82F6" />
          <Text style={styles.debugText}>DEBUG</Text>
        </View>
      </TouchableOpacity>

      <MeshDiagnosticsModal visible={showDiag} onClose={() => setShowDiag(false)} />
    </>
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
  debugPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  debugText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
});
