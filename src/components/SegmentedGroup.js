import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function SegmentedGroup({ icon, label, options, value, onChange }) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.labelRow}>
        <MaterialIcons name={icon} size={20} color={colors.onSurface} />
        <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, fontFamily: typography.bodyMd?.fontFamily }]}>
          {label}
        </Text>
      </View>
      <View style={[styles.track, { gap: spacing.sm }]}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              activeOpacity={0.8}
              onPress={() => onChange(opt)}
              style={[
                styles.segment,
                {
                  borderRadius: radius.md,
                  borderColor: colors.outlineVariant,
                  backgroundColor: active ? colors.ink : colors.surfaceContainerLowest,
                },
              ]}
            >
              <Text
                style={[
                  typography.labelLg,
                  {
                    color: active ? colors.onInk : colors.onSurface,
                    fontWeight: active ? '700' : '400',
                  },
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  track: {
    flexDirection: 'row',
    width: '100%',
  },
  segment: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
