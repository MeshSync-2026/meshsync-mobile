import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useMeshSync } from '../context/MeshSyncContext';
import { buildRadarBlips } from '../backend/shared/radarGeo';

const SIZE = 260;

export default function RadarView() {
  const { colors, typography } = useTheme();
  const { incidents, userLocation } = useMeshSync();

  const blips = useMemo(() => {
    if (!userLocation || !incidents || incidents.length === 0) {
      return [];
    }
    return buildRadarBlips(userLocation, incidents, {
      maxRangeMeters: 3000,
      radarSize: SIZE,
    });
  }, [userLocation, incidents]);

  const dotColor = (type) => {
    if (type === 'urgent') return colors.error;
    if (type === 'hazard') return colors.ink;
    return colors.outline;
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.radar, { width: SIZE, height: SIZE }]}>
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

        <Text style={[styles.compass, { top: 4, color: colors.primary }]}>N</Text>
        <Text style={[styles.compass, { bottom: 4, color: colors.primary }]}>S</Text>
        <Text style={[styles.compass, { left: 4, color: colors.primary }]}>W</Text>
        <Text style={[styles.compass, { right: 4, color: colors.primary }]}>E</Text>

        <View style={[styles.youDot, { backgroundColor: colors.ink, borderColor: colors.white }]} />
        <Text style={[styles.youLabel, { color: colors.onSurfaceVariant }]}>You</Text>

        {blips.map((b) => (
          <View
            key={b.id}
            style={[
              styles.peerDot,
              {
                backgroundColor: dotColor(b.type),
                borderColor: colors.white,
                left: b.x - 5,
                top: b.y - 5,
              },
            ]}
          >
            <Text
              style={[
                styles.peerLabel,
                { color: b.type === 'urgent' ? colors.error : colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {b.label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, fontStyle: 'italic', marginTop: 8 }]}>
        {blips.length > 0 ? `${blips.length} active emergency points in range` : 'Scanning local mesh...'}
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
