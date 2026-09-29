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

const HAZARD_MAP = {
  1: { label: 'Flood Hazard', icon: 'flood' },
  2: { label: 'Landslide', icon: 'terrain' },
  3: { label: 'Severe Storm', icon: 'storm' },
  4: { label: 'Fire Outbreak', icon: 'local-fire-department' },
  5: { label: 'Medical Emergency', icon: 'medical-services' },
  6: { label: 'Structural Damage', icon: 'construction' },
};

const SAFETY_MAP = {
  0: { label: 'Safe', color: '#10B981' },
  1: { label: 'Needs Assistance', color: '#F59E0B' },
  2: { label: 'Trapped / Immediate Rescue', color: '#EF4444' },
};

const WATER_MAP = { 0: 'Water Supply: Good', 1: 'Water: Low', 2: 'No Water' };
const INJURY_MAP = { 0: 'No Injuries', 1: 'Minor Injuries', 2: 'Severe Injuries' };

export default function NearbyReportsScreen() {
  const { colors, spacing, radius, typography, isDark } = useTheme();
  const { incidents, userLocation, peerCount, isOnline, nodeId } = useMeshSync();

  const cardSurface = isDark ? colors.surfaceContainerHigh : colors.surfaceContainerLowest;
  const mutedPanel = isDark ? colors.surfaceContainerHigh : '#F3F3F3';

  // Partition and sort incidents descending by latest timestamp (excluding own device's reports)
  const { urgentRequests, communityReports, resolvedReports } = useMemo(() => {
    const urgent = [];
    const community = [];
    const resolved = [];

    const otherIncidents = (incidents || []).filter((inc) => {
      const creator = inc.creator_node_id || inc.creatorNodeId || inc.origin_node_id || inc.originNodeId;
      // Exclude reports created by this device so Nearby Reports exclusively shows peer/community alerts
      if (nodeId && creator && creator === nodeId) {
        return false;
      }
      return true;
    });

    const sorted = [...otherIncidents].sort((a, b) => {
      const timeA = a.created_at || a.createdAt || 0;
      const timeB = b.created_at || b.createdAt || 0;
      return timeB - timeA;
    });

    sorted.forEach((inc) => {
      const isResolved = inc.status === STATUS.RESOLVED || inc.statusCode === STATUS.RESOLVED || inc.status_code === STATUS.RESOLVED;
      if (isResolved) {
        resolved.push(inc);
      } else if (
        inc.report_type_code === REPORT_TYPE.SOS ||
        inc.reportTypeCode === REPORT_TYPE.SOS ||
        (inc.event_type_code === 1 && !inc.report_type_code)
      ) {
        urgent.push(inc);
      } else {
        community.push(inc);
      }
    });

    return { urgentRequests: urgent, communityReports: community, resolvedReports: resolved };
  }, [incidents, nodeId]);

  const getDistanceText = (inc) => {
    const landmarkName = inc.landmark_name ?? inc.landmarkName;
    if (!userLocation || inc.latitude == null || inc.longitude == null) {
      return landmarkName || '~nearby';
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

        {/* URGENT REQUESTS (SOS) */}
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
            urgentRequests.map((r) => {
              const landmarkName = r.landmark_name ?? r.landmarkName;
              const details = r.details || r.description;
              const title = r.title;
              return (
                <View key={r.id} style={[styles.urgentCard, { backgroundColor: cardSurface, borderColor: colors.error, borderRadius: radius.xl }]}> 
                  <View style={styles.urgentHeader}>
                    <View style={[styles.urgentIconWrap, { backgroundColor: isDark ? '#3B3B3B' : '#FEE2E2' }]}>
                      <MaterialIcons name="priority-high" size={24} color={colors.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.headlineMd, { color: colors.onSurface }]}>
                        {landmarkName?.startsWith("SOS:") ? landmarkName : (title || 'Emergency Assistance Needed')}
                      </Text>
                      <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
                        {getDistanceText(r)} • {getTimeText(r)}
                      </Text>
                    </View>
                    <View style={[styles.sosBadge, { backgroundColor: colors.error, borderRadius: radius.md }]}>
                      <Text style={[typography.labelLg, { color: '#FFFFFF', fontWeight: '700' }]}>SOS</Text>
                    </View>
                  </View>

                  {landmarkName && !landmarkName.startsWith("SOS:") ? (
                    <View style={styles.locationTagRow}>
                      <MaterialIcons name="place" size={16} color={colors.error} />
                      <Text style={[typography.labelLg, { color: colors.onSurface }]}>
                        Location Tag: {landmarkName}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                    {details || 'Immediate emergency help requested by nearby mesh node.'}
                  </Text>

                  <TouchableOpacity
                    style={[styles.helpButton, { backgroundColor: isDark ? colors.surfaceContainerLowest : '#F7F7F7', borderColor: colors.outlineVariant, borderRadius: radius.md }]}
                    onPress={() => Alert.alert('Help Offer Transmitted', 'Your availability will be announced over the mesh.')}
                  >
                    <MaterialIcons name="handshake" size={18} color={colors.onSurface} />
                    <Text style={[typography.labelLg, { color: colors.onSurface }]}>I can help</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* COMMUNITY REPORTS (HAZARDS & STATUS UPDATES) */}
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
                No community hazard or status reports active.
              </Text>
            </View>
          ) : (
            communityReports.map((r) => {
              const reportTypeCode = r.report_type_code ?? r.reportTypeCode;
              const categoryCode = r.category_code ?? r.categoryCode;
              const statusSafety = r.status_safety ?? r.statusSafety;
              const statusWater = r.status_water ?? r.statusWater;
              const statusInjury = r.status_injury ?? r.statusInjury;
              const peopleCount = r.people_count ?? r.peopleCount ?? 1;
              const severityLevel = r.severity_level ?? r.severityLevel;
              const landmarkName = r.landmark_name ?? r.landmarkName;
              const creatorNodeId = r.creator_node_id ?? r.creatorNodeId;
              const details = r.details || r.description;

              const isHazard = reportTypeCode === REPORT_TYPE.HAZARD || categoryCode != null;
              const isStatus = reportTypeCode === REPORT_TYPE.STATUS || statusSafety != null;

              const hazardInfo = HAZARD_MAP[categoryCode] || { label: 'Hazard Report', icon: 'warning' };
              const safetyInfo = SAFETY_MAP[statusSafety] || { label: 'Status Update', color: colors.primary };

              const severityText = severityLevel === 3 ? 'High' : severityLevel === 2 ? 'Medium' : 'Low';
              const severityColor = severityLevel === 3 ? colors.error : severityLevel === 2 ? '#F59E0B' : colors.primary;

              return (
                <View key={r.id} style={[styles.reportCard, { backgroundColor: mutedPanel, borderColor: colors.outlineVariant, borderRadius: radius.xl }]}>
                  <View style={styles.reportRow}>
                    <View style={[styles.reportIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E9EBEB' }]}>
                      <MaterialIcons
                        name={isHazard ? hazardInfo.icon : (isStatus ? 'health-and-safety' : 'warning')}
                        size={22}
                        color={isHazard ? severityColor : safetyInfo.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <Text style={[typography.headlineMd, { color: colors.onSurface, fontSize: 16 }]}>
                          {isHazard ? (landmarkName || hazardInfo.label) : (isStatus ? `Status: ${safetyInfo.label}` : (r.title || 'Community Report'))}
                        </Text>
                        {isHazard ? (
                          <View style={[styles.badge, { backgroundColor: severityColor + '22', borderColor: severityColor }]}>
                            <Text style={[typography.labelMd, { color: severityColor, fontWeight: '700' }]}>{severityText}</Text>
                          </View>
                        ) : isStatus ? (
                          <View style={[styles.badge, { backgroundColor: safetyInfo.color + '22', borderColor: safetyInfo.color }]}>
                            <Text style={[typography.labelMd, { color: safetyInfo.color, fontWeight: '700' }]}>{safetyInfo.label}</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
                        {getDistanceText(r)} • {getTimeText(r)}
                      </Text>
                    </View>
                  </View>

                  {/* Details / Content */}
                  {isStatus ? (
                    <View style={{ gap: 4, marginTop: 4 }}>
                      <Text style={[typography.bodyMd, { color: colors.onSurface }]}>
                        {WATER_MAP[statusWater] || 'Water: Normal'} • {INJURY_MAP[statusInjury] || 'No Injuries'} • {peopleCount} People
                      </Text>
                      {landmarkName && (
                        <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
                          Location: {landmarkName}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={{ gap: 4, marginTop: 4 }}>
                      <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>
                        {details || `${hazardInfo.label} reported in this mesh sector.`}
                      </Text>
                      {landmarkName && (
                        <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
                          Location: {landmarkName}
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={styles.reportFooter}>
                    <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
                      Origin Node: {creatorNodeId ? creatorNodeId.slice(-8) : 'Nearby'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.detailsBtn, { borderColor: colors.outlineVariant, borderRadius: radius.md }]}
                      onPress={() => Alert.alert('Report Summary', `${isHazard ? hazardInfo.label : 'Status Update'}\nLocation: ${getDistanceText(r)}\nDetails: ${details || landmarkName || 'None'}`)}
                    >
                      <Text style={[typography.labelLg, { color: colors.onSurface }]}>Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* RECENTLY RESOLVED */}
        {resolvedReports.length > 0 && (
          <View style={{ gap: spacing.sm, opacity: 0.8 }}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="check-circle" size={20} color={colors.onSurfaceVariant} />
              <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textTransform: 'uppercase' }]}>Recently Resolved</Text>
            </View>
            {resolvedReports.map((r) => {
              const landmarkName = r.landmark_name ?? r.landmarkName;
              return (
                <View key={r.id} style={[styles.resolvedRow, { backgroundColor: mutedPanel, borderColor: colors.outlineVariant, borderRadius: radius.md }]}>
                  <View style={[styles.resolvedIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#EAEBEB' }]}>
                    <MaterialIcons name="check" size={18} color={colors.onSurfaceVariant} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' }]}>
                      {landmarkName || r.title || 'Resolved Incident'}
                    </Text>
                    <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
                      Resolved • {getTimeText(r)}
                    </Text>
                  </View>
                </View>
              );
            })}
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
  sosBadge: { paddingHorizontal: 12, paddingVertical: 6 },
  locationTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  helpButton: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, paddingVertical: 12 },
  reportCard: { borderWidth: 1, padding: 14 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  reportIconWrap: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  reportFooter: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailsBtn: { borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12 },
  resolvedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 1 },
  resolvedIcon: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { padding: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
