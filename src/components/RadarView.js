import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radarPeers } from '../data/mockData';

const SIZE = 260;

export default function RadarView() {
  const { colors, typography } = useTheme();

  const dotColor = (type) => {
    if (type === 'urgent') return colors.error;
    if (type === 'hazard') return colors.ink;
    return colors.outline;
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.radar, { width: SIZE, height: SIZE }]}>
        {/* Concentric rings */}
        <View style={[styles.ring, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderColor: colors.outlineVariant }]} />
        <View
          style={[
            styles.ring,
            { width: SIZE * 0.66, height: SIZE * 0.66, borderRadius: (SIZE * 0.66) / 2, borderColor: colors.outlineVariant },
          ]}
        />
        <View
          style={[
            styles.ring,
            { width: SIZE * 0.33, height: SIZE * 0.33, borderRadius: (SIZE * 0.33) / 2, borderColor: colors.outlineVariant },
          ]}
        />

        {/* Compass labels */}
        <Text style={[styles.compass, { top: 4, color: colors.primary }]}>N</Text>
        <Text style={[styles.compass, { bottom: 4, color: colors.primary }]}>S</Text>
        <Text style={[styles.compass, { left: 4, color: colors.primary }]}>W</Text>
        <Text style={[styles.compass, { right: 4, color: colors.primary }]}>E</Text>

        {/* Center "You" marker */}
        <View style={[styles.youDot, { backgroundColor: colors.ink, borderColor: colors.white }]} />
        <Text style={[styles.youLabel, { color: colors.onSurfaceVariant }]}>You</Text>

        {/* Plotted reports */}
        {radarPeers.map((p) => (
          <View
            key={p.id}
            style={[
              styles.peerDot,
              {
                backgroundColor: dotColor(p.type),
                borderColor: colors.white,
                top: p.top ?? undefined,
                bottom: p.bottom ?? undefined,
                left: p.left ?? undefined,
                right: p.right ?? undefined,
              },
            ]}
          >
            <Text
              style={[
                styles.peerLabel,
                { color: p.type === 'urgent' ? colors.error : colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {p.label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, fontStyle: 'italic', marginTop: 8 }]}>
        Tap a dot for details
      </Text>

      <View style={[styles.legend, { borderTopColor: colors.outlineVariant }]}>
        <LegendItem color={colors.error} label="Urgent" textColor={colors.onSurfaceVariant} />
        <LegendItem color={colors.ink} label="Hazard" textColor={colors.onSurfaceVariant} />
        <LegendItem color={colors.outline} label="Mesh" textColor={colors.onSurfaceVariant} />
      </View>
    </View>
  );
}

function LegendItem({ color, label, textColor }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  radar: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1 },
  compass: { position: 'absolute', fontSize: 10, fontWeight: '700', alignSelf: 'center' },
  youDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  youLabel: { position: 'absolute', top: '58%', fontSize: 10, fontWeight: '700' },
  peerDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2, alignItems: 'center' },
  peerLabel: { position: 'absolute', top: -16, fontSize: 8, fontWeight: '700', width: 60, textAlign: 'center' },
  legend: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
});
