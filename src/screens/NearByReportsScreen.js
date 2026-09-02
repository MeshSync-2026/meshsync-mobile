import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useMeshSync } from '../context/MeshSyncContext';
import { REPORT_TYPE, SEVERITY, STATUS } from '../backend/shared/enums';
import { calculateDistance, formatDistance } from '../backend/shared/radarGeo';
import MeshStatusBar from '../components/MeshStatusBar';
import TopAppBar from '../components/TopAppBar';
import RadarView from '../components/RadarView';

export default function NearbyReportsScreen() {
  const { colors, spacing, radius, typography, isDark } = useTheme();
  const { incidents, userLocation, peerCount, isOnline } = useMeshSync();

  const cardSurface = isDark ? colors.surfaceContainerHigh : colors.surfaceContainerLowest;
  const mutedPanel = isDark ? colors.surfaceContainerHigh : '#F3F3F3';

  // Partition incidents into Urgent, Community Reports, and Resolved
  const { urgentRequests, communityReports, resolvedReports } = useMemo(() => {
    const urgent = [];
    const community = [];
    const resolved = [];

    (incidents || []).forEach((inc) => {
      const isResolved = inc.status === STATUS.RESOLVED || inc.statusCode === STATUS.RESOLVED;
      if (isResolved) {
        resolved.push(inc);
      } else if (
        inc.report_type_code === REPORT_TYPE.SOS ||
        inc.reportTypeCode === REPORT_TYPE.SOS ||
        inc.event_type_code === 1 ||
        inc.severity_level === SEVERITY.HIGH ||
        inc.severity === 'high'
      ) {
        urgent.push(inc);
      } else {
        community.push(inc);
      }
    });

    return { urgentRequests: urgent, communityReports: community, resolvedReports: resolved };
  }, [incidents]);

  const getDistanceText = (inc) => {
    if (!userLocation || inc.latitude == null || inc.longitude == null) {
      return inc.landmark_name || inc.location || '~nearby';
    }
    const dist = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      inc.latitude,
      inc.longitude
    );
    return formatDistance(dist);
  };

  const getTimeText = (inc) => {
    const timestamp = inc.createdAt || inc.created_at || Date.now();
    const diffMins = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    return `${diffHours}h ago`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <MeshStatusBar nodesInRange={peerCount} label={isOnline ? `Online • Mesh Active (${peerCount} nodes)` : undefined} />
      <TopAppBar title="Nearby Reports" showBack={false} />

      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: spacing.marginMobile, gap: spacing.md }]}>
        {/* RADAR VIEW */}
        <View style={[styles.radarCard, { backgroundColor: isDark ? colors.surfaceContainerHigh : '#F4F5F5', borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md }]}>
          <View style={styles.radarHeader}>
            <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>Local Mesh Radar</Text>
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, opacity: 0.8 }]}>Live View</Text>
          </View>
          <RadarView />
        </View>

        {/* URGENT REQUESTS */}
        <View style={{ gap: spacing.sm }}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="warning" size={20} color={colors.error} />
            <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>
              Urgent Requests ({urgentRequests.length})
            </Text>
          </View>

          {urgentRequests.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: mutedPanel, borderRadius: radius.xl, borderColor: colors.outlineVariant }]}>
              <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                No active SOS alerts nearby.
              </Text>
            </View>
          ) : (
            urgentRequests.map((r) => (
              <View key={r.id} style={[styles.urgentCard, { backgroundColor: cardSurface, borderColor: colors.error, borderRadius: radius.xl }]}> 
                <View style={styles.urgentHeader}>
                  <View style={[styles.urgentIconWrap, { backgroundColor: isDark ? '#3B3B3B' : '#EAEAEA' }]}>
                    <MaterialIcons name="medical-services" size={24} color={colors.error} />
                  </View>
                  <Text style={[typography.headlineMd, { color: colors.onSurface, flex: 1 }]}>
                    {r.title || 'Emergency Assistance Needed'}
                  </Text>
                  <View style={[styles.sosBadge, { backgroundColor: colors.error, borderRadius: radius.md }]}>
                    <Text style={[typography.labelLg, { color: colors.onPrimary }]}>SOS</Text>
                  </View>
                </View>
                <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
                  {getDistanceText(r)} • {getTimeText(r)}
                </Text>
                <Text style={[typography.bodyMd, { color: colors.onSurface, marginTop: 4 }]}>
                  {r.details || r.description || r.landmark_name || 'Immediate local emergency reported over mesh.'}
                </Text>
                <TouchableOpacity
                  style={[styles.helpButton, { backgroundColor: isDark ? colors.surfaceContainerLowest : '#F7F7F7', borderColor: colors.outlineVariant, borderRadius: radius.md }]}
                  onPress={() => Alert.alert('Help Offer Transmitted', 'Your responder availability will be announced to the sender.')}
                >
                  <MaterialIcons name="handshake" size={18} color={colors.onSurface} />
                  <Text style={[typography.labelLg, { color: colors.onSurface }]}>I can help</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* COMMUNITY REPORTS */}
        <View style={{ gap: spacing.sm }}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="groups" size={20} color={colors.onSurface} />
            <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>
              Community Reports ({communityReports.length})
            </Text>
          </View>

          {communityReports.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: mutedPanel, borderRadius: radius.xl, borderColor: colors.outlineVariant }]}>
              <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                No community hazard reports active.
              </Text>
            </View>
          ) : (
            communityReports.map((r) => (
              <View key={r.id} style={[styles.reportCard, { backgroundColor: mutedPanel, borderColor: colors.outlineVariant, borderRadius: radius.xl }]}>
                <View style={styles.reportRow}>
                  <View style={[styles.reportIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#E9EBEB' }]}>
                    <MaterialIcons name={r.icon || 'warning'} size={20} color={colors.onSurface} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.labelLg, { color: colors.onSurface }]}>
                      {r.title || 'Hazard Report'}
                    </Text>
                    <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
                      {getDistanceText(r)} • {getTimeText(r)}
                    </Text>
                  </View>
                </View>
                <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>
                  {r.details || r.description || r.landmark_name || 'Reported hazard in sector.'}
                </Text>
                <View style={styles.reportFooter}>
                  <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
                    {r.respondersCount || 0} responders active
                  </Text>
                  <TouchableOpacity
                    style={[styles.detailsBtn, { borderColor: colors.outlineVariant, borderRadius: radius.md }]}
                    onPress={() => Alert.alert('Incident Details', `${r.title || 'Hazard'}\nLocation: ${getDistanceText(r)}\nDetails: ${r.details || 'None'}`)}
                  >
                    <Text style={[typography.labelLg, { color: colors.onSurface }]}>Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* RECENTLY RESOLVED */}
        {resolvedReports.length > 0 && (
          <View style={{ gap: spacing.sm, opacity: 0.8 }}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="check-circle" size={20} color={colors.onSurfaceVariant} />
              <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textTransform: 'uppercase' }]}>Recently Resolved</Text>
            </View>
            {resolvedReports.map((r) => (
              <View key={r.id} style={[styles.resolvedRow, { backgroundColor: mutedPanel, borderColor: colors.outlineVariant, borderRadius: radius.md }]}>
                <View style={[styles.resolvedIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#EAEBEB' }]}>
                  <MaterialIcons name="check" size={18} color={colors.onSurfaceVariant} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' }]}>
                    {r.title || 'Resolved Incident'}
                  </Text>
                  <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
                    Resolved • {getTimeText(r)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 128 },
  radarCard: { borderWidth: 1 },
  radarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgentCard: { borderWidth: 2, padding: 16 },
  urgentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  urgentIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sosBadge: { paddingHorizontal: 12, paddingVertical: 8 },
  helpButton: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, paddingVertical: 12 },
  reportCard: { borderWidth: 1, padding: 14 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  reportIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reportFooter: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailsBtn: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12 },
  resolvedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 1 },
  resolvedIcon: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { padding: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
