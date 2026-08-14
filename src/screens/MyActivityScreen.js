import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import TopAppBar from '../components/TopAppBar';
import { activityFeed, meshStats } from '../data/mockData';

export default function MyActivityScreen() {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <TopAppBar title="My Activity" showBack={false} onSettingsPress={() => {}} />

      <View
        style={[
          styles.statusStrip,
          { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, paddingHorizontal: spacing.marginMobile },
        ]}
      >
        <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>Offline - Mesh Active</Text>
        <MaterialIcons name="sensors" size={20} color={colors.onSurfaceVariant} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.marginMobile, paddingTop: spacing.lg, paddingBottom: 128 }}>
        {/* Legend */}
        <View
          style={[
            styles.legendCard,
            { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant, borderRadius: radius.xl, marginBottom: spacing.lg },
          ]}
        >
          <View style={styles.legendItem}>
            <MaterialIcons name="check-circle" size={18} color={colors.onSurface} />
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Synced to Mesh</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
          <View style={styles.legendItem}>
            <MaterialIcons name="schedule" size={18} color={colors.outline} />
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Pending Sync</Text>
          </View>
        </View>

        {/* Feed */}
        <View style={{ gap: spacing.md }}>
          {activityFeed.map((item) => (
            <View
              key={item.id}
              style={[
                styles.item,
                {
                  backgroundColor: colors.surfaceContainerLowest,
                  borderColor: colors.outlineVariant,
                  borderRadius: radius.xl,
                  padding: spacing.md,
                  opacity: item.muted ? 0.5 : 1,
                },
              ]}
            >
              <View style={[styles.itemIcon, { backgroundColor: colors.surfaceVariant, borderRadius: radius.md }]}>
                <MaterialIcons name={item.icon} size={20} color={colors.onSurface} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.labelLg, { color: colors.onSurface }]}>{item.title}</Text>
                <Text style={[typography.bodyMd, { fontSize: 14, color: colors.onSurfaceVariant }]}>{item.subtitle}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.outline, marginTop: 4 }}>
                  {item.time}
                </Text>
                {item.note ? (
                  <Text
                    style={[
                      typography.labelMd,
                      { color: item.status === 'synced' ? colors.onSurface : colors.outline, marginTop: 4 },
                    ]}
                  >
                    {item.note}
                  </Text>
                ) : null}
              </View>
              <MaterialIcons
                name={item.status === 'synced' ? 'check-circle' : 'schedule'}
                size={20}
                color={item.status === 'synced' ? colors.onSurface : colors.outline}
              />
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textTransform: 'uppercase', marginBottom: spacing.md }]}>
            Mesh Sync Stats
          </Text>
          <View
            style={[
              styles.statsCard,
              { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outlineVariant, borderRadius: radius.xl },
            ]}
          >
            <View style={styles.statsRow}>
              <View>
                <Text style={[typography.headlineLgMobile, { color: colors.onSurface }]}>{meshStats.packetsRelayed}</Text>
                <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Packets Relayed</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.labelLg, { color: colors.onSurface }]}>{meshStats.uptime}</Text>
                <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Uptime</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  legendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    padding: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { width: 1, height: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1 },
  itemIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  statsCard: { height: 192, borderWidth: 1, justifyContent: 'flex-end', padding: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
});
