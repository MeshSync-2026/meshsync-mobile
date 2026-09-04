import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useMeshSync } from '../context/MeshSyncContext';
import { EVENT_TYPE, EVENT_TYPE_LABEL } from '../backend/shared/enums';
import TopAppBar from '../components/TopAppBar';

export default function MyActivityScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { myEvents, relayedCount, peerCount, isOnline } = useMeshSync();

  const formattedFeed = useMemo(() => {
    const sorted = [...(myEvents || [])].sort((a, b) => {
      const timeA = a.created_at || a.createdAt || 0;
      const timeB = b.created_at || b.createdAt || 0;
      return timeB - timeA;
    });

    return sorted.map((evt) => {
      const typeCode = evt.event_type_code || evt.eventTypeCode;
      const reportTypeCode = evt.report_type_code || evt.reportTypeCode;

      let icon = 'podcasts';
      let title = EVENT_TYPE_LABEL[typeCode] || 'Mesh Broadcast';

      if (typeCode === EVENT_TYPE.SOS_CREATED) {
        icon = 'priority-high';
        title = 'Emergency SOS Alert';
      } else if (typeCode === EVENT_TYPE.STATUS_UPDATE) {
        if (reportTypeCode === 2 || evt.category_code != null) {
          icon = 'warning';
          title = evt.landmark_name ? `Hazard: ${evt.landmark_name}` : 'Hazard Report';
        } else {
          icon = 'health-and-safety';
          title = 'Life Safety Status Update';
        }
      } else if (typeCode === EVENT_TYPE.RESPONDER_EN_ROUTE) {
        icon = 'directions-run';
        title = 'Responder En Route';
      } else if (typeCode === EVENT_TYPE.SOS_RESOLVED) {
        icon = 'check-circle';
        title = 'Incident Resolved';
      }

      const createdAt = evt.created_at || evt.createdAt || Date.now();
      const diffMins = Math.max(1, Math.round((Date.now() - createdAt) / 60000));
      const timeText = diffMins < 60 ? `${diffMins} mins ago` : `${Math.round(diffMins / 60)} hours ago`;

      const isSynced = evt.is_cloud_synced ?? evt.isCloudSynced ?? false;

      return {
        id: evt.id,
        title,
        subtitle: evt.landmark_name || `Seq #${evt.seq}`,
        time: timeText,
        status: isSynced ? 'synced' : 'pending',
        icon,
        note: isSynced ? 'Synced to Cloud & Command Center' : 'Relayed via local BLE mesh',
      };
    });
  }, [myEvents]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <TopAppBar title="My Activity" showBack={false} />

      <View style={[styles.statusStrip, { backgroundColor: colors.background, borderColor: colors.outlineVariant, paddingHorizontal: spacing.marginMobile }]}>
        <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>
          {isOnline ? `Online • Mesh Active (${peerCount} peers)` : `Offline • Mesh Active (${peerCount} peers)`}
        </Text>
        <MaterialIcons name={isOnline ? 'cloud-done' : 'signal-cellular-4-bar'} size={18} color={colors.onSurfaceVariant} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.marginMobile, paddingTop: spacing.lg, paddingBottom: 128 }}>
        <View style={[styles.legendCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.xl, marginBottom: spacing.lg }]}>
          <View style={styles.legendItem}>
            <MaterialIcons name="check-circle" size={18} color={colors.primary} />
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Synced to Cloud</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
          <View style={styles.legendItem}>
            <MaterialIcons name="schedule" size={18} color={colors.onSurfaceVariant} />
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Pending Cloud Sync</Text>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          {formattedFeed.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.xl }]}>
              <MaterialIcons name="history" size={32} color={colors.onSurfaceVariant} style={{ alignSelf: 'center', marginBottom: 8 }} />
              <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                No local events created yet. SOS alerts and hazard reports from this device will appear here.
              </Text>
            </View>
          ) : (
            formattedFeed.map((item) => (
              <View key={item.id} style={[styles.item, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md }]}>
                <View style={[styles.itemIcon, { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.md }]}>
                  <MaterialIcons name={item.icon} size={20} color={colors.onSurface} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelLg, { color: colors.onSurface }]}>{item.title}</Text>
                  <Text style={[typography.bodyMd, { fontSize: 14, color: colors.onSurfaceVariant }]}>{item.subtitle}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.onSurfaceVariant, marginTop: 4 }}>{item.time}</Text>
                  {item.note ? <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, marginTop: 4 }]}>{item.note}</Text> : null}
                </View>
                <MaterialIcons
                  name={item.status === 'synced' ? 'check-circle' : 'schedule'}
                  size={20}
                  color={item.status === 'synced' ? colors.primary : colors.onSurfaceVariant}
                />
              </View>
            ))
          )}
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase', marginBottom: spacing.md }]}>Mesh Sync Stats</Text>
          <View style={[styles.statsCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.xl }]}>
            <View style={styles.statsRow}>
              <View>
                <Text style={[typography.headlineLgMobile, { color: colors.onSurface }]}>{myEvents.length}</Text>
                <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>My Transmitted Events</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[typography.headlineLgMobile, { color: colors.onSurface }]}>{relayedCount ?? 0}</Text>
                <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Relayed for Peers</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.labelLg, { color: colors.onSurface }]}>{peerCount} Nodes</Text>
                <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Direct BLE Peers</Text>
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
  statsCard: { height: 120, borderWidth: 1, justifyContent: 'center', padding: 18 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyCard: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
