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
      <TopAppBar title="My Activity" showBack={false} />

      <View style={[styles.statusStrip, { backgroundColor: colors.background, borderColor: colors.outlineVariant, paddingHorizontal: spacing.marginMobile }]}>
        <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>Offline - Mesh Active</Text>
        <MaterialIcons name="signal-cellular-4-bar" size={18} color={colors.onSurfaceVariant} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.marginMobile, paddingTop: spacing.lg, paddingBottom: 128 }}>
        <View style={[styles.legendCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.xl, marginBottom: spacing.lg }]}>
          <View style={styles.legendItem}>
            <MaterialIcons name="check-circle" size={18} color={colors.onSurface} />
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Synced to Mesh</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
          <View style={styles.legendItem}>
            <MaterialIcons name="schedule" size={18} color={colors.onSurfaceVariant} />
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Pending Sync</Text>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          {activityFeed.map((item) => (
            <View key={item.id} style={[styles.item, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md, opacity: item.muted ? 0.7 : 1 }]}>
              <View style={[styles.itemIcon, { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.md }]}>
                <MaterialIcons name={item.icon} size={20} color={colors.onSurface} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.labelLg, { color: colors.onSurface }]}>{item.title}</Text>
                <Text style={[typography.bodyMd, { fontSize: 14, color: colors.onSurfaceVariant }]}>{item.subtitle}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.onSurfaceVariant, marginTop: 4 }}>{item.time}</Text>
                {item.note ? <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, marginTop: 4 }]}>{item.note}</Text> : null}
              </View>
              <MaterialIcons name={item.status === 'synced' ? 'check-circle' : 'schedule'} size={20} color={item.status === 'synced' ? colors.onSurface : colors.onSurfaceVariant} />
            </View>
          ))}
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase', marginBottom: spacing.md }]}>Mesh Sync Stats</Text>
          <View style={[styles.statsCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.xl }]}>
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
  itemIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  statsCard: { height: 160, borderWidth: 1, justifyContent: 'flex-end', padding: 18 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
});
