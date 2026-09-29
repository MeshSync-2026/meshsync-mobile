// Nearby Screen — radar visualization + incident cards
// Ported from the New Test design: circular SVG radar with compass rotation,
// filter chips (All/SOS/Hazards/Resolved), 25 km radius for responders,
// 4-level severity badges, and Urgent/Community/Resolved sections.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Svg, { Circle, Line, G, Path, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useApp } from '../context/AppContext';
import { useMeshSync } from '../context/MeshSyncContext';
import { getNodeId } from '../backend/store/hotState';
import { getCurrentLocation } from '../utils/location';

const RADAR_SIZE_DEFAULT = 200;
const RADAR_SIZE_RESPONDER = 280;
const MAX_RANGE_METERS = 25000; // 25km radar geofence (§7.3, §12.5)

const CATEGORY_ICON = {
  0: 'alert-circle',
  1: 'water',
  2: 'earth',
  3: 'thunderstorm',
  4: 'flame',
  5: 'medkit',
  6: 'home',
};

const CATEGORY_LABEL = {
  0: 'General',
  1: 'Flood',
  2: 'Landslide',
  3: 'Storm',
  4: 'Fire',
  5: 'Medical',
  6: 'Structural',
};

function calcDistance(lat1, lng1, lat2, lng2) {
  const latDiff = (lat2 - lat1) * 111000;
  const lngDiff = (lng2 - lng1) * 111000 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

function calcBearing(lat1, lng1, lat2, lng2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

function formatDistance(meters) {
  if (meters == null) return '—';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '—';
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Severity badge config — 4 levels, individual colors
function getSeverityConfig(level) {
  switch (level) {
    case 4: return { label: 'VERY HIGH', color: '#FF1744' };
    case 3: return { label: 'HIGH', color: '#FF5252' };
    case 2: return { label: 'MEDIUM', color: '#FFAB40' };
    case 1: return { label: 'LOW', color: '#FFD54F' };
    default: return { label: 'MEDIUM', color: '#FFAB40' };
  }
}

// Pin color by incident state
function getPinColor(incident, colors) {
  if (incident.confidence_code === 3 || incident.confidence_code === 4) {
    return colors.status.success;
  }
  if (incident.report_type_code === 1) {
    const sev = incident.severity_level || 2;
    if (sev >= 3) return colors.status.critical;
    return colors.status.warning;
  }
  return colors.status.warning;
}

function getIncidentTitle(incident) {
  if (incident.report_type_code === 1) return 'SOS - Need Help';
  const catLabel = CATEGORY_LABEL[incident.category_code] || 'Hazard';
  return `${catLabel} Hazard`;
}

export default function NearbyScreen({ navigation }) {
  const { colors, spacing, t, isResponder } = useApp();
  const { incidents: contextIncidents, userLocation, refreshLocation } = useMeshSync();

  const [location, setLocation] = useState(userLocation || null);
  const [refreshing, setRefreshing] = useState(false);
  const [sweepAngle, setSweepAngle] = useState(0);
  const [heading, setHeading] = useState(0);
  const [filter, setFilter] = useState('all'); // all | sos | hazard | resolved
  const [radarZoomed, setRadarZoomed] = useState(false);

  const RADAR_SIZE = radarZoomed && isResponder ? RADAR_SIZE_RESPONDER : RADAR_SIZE_DEFAULT;
  const RADAR_CENTER = RADAR_SIZE / 2;
  const RADAR_RADIUS = RADAR_CENTER - 15;

  // Location + compass heading
  useEffect(() => {
    let headingSub = null;
    (async () => {
      const loc = await getCurrentLocation({ showAlertOnDenied: false });
      if (loc) setLocation(loc);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          headingSub = await Location.watchHeadingAsync((h) => {
            setHeading(typeof h.trueHeading === 'number' ? h.trueHeading : h.magHeading || 0);
          });
        }
      } catch {}
    })();
    return () => {
      if (headingSub && headingSub.remove) headingSub.remove();
    };
  }, []);

  // Radar sweep animation
  useEffect(() => {
    const timer = setInterval(() => setSweepAngle((a) => (a + 6) % 360), 50);
    return () => clearInterval(timer);
  }, []);

  const withDistance = useMemo(
    () =>
      (contextIncidents || []).map((inc) => {
        if (location && inc.latitude != null && inc.longitude != null) {
          return { ...inc, _distance: calcDistance(location.latitude, location.longitude, inc.latitude, inc.longitude) };
        }
        return { ...inc, _distance: null };
      }),
    [contextIncidents, location]
  );

  // If no GPS fix, show all incidents (don't filter by distance)
  const hasGps = withDistance.some((i) => i._distance != null);
  const inRange = (i) => !hasGps || (i._distance != null && i._distance <= MAX_RANGE_METERS);

  const urgentRequests = useMemo(
    () =>
      withDistance
        .filter((i) => i.confidence_code <= 2 && i.report_type_code === 1 && inRange(i))
        .sort((a, b) => {
          if (b.severity_level !== a.severity_level) return (b.severity_level || 0) - (a.severity_level || 0);
          return (a._distance || 0) - (b._distance || 0);
        }),
    [withDistance]
  );

  const communityReports = useMemo(
    () => withDistance.filter((i) => i.confidence_code <= 2 && i.report_type_code !== 1 && inRange(i)),
    [withDistance]
  );

  const recentlyResolved = useMemo(
    () => withDistance.filter((i) => i.confidence_code === 3 || i.confidence_code === 4),
    [withDistance]
  );

  const radarIncidents = useMemo(
    () =>
      withDistance.filter(
        (i) => i.latitude != null && i.longitude != null && i._distance != null && i._distance <= MAX_RANGE_METERS
      ),
    [withDistance]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const loc = await getCurrentLocation({ showAlertOnDenied: false });
    if (loc) setLocation(loc);
    setRefreshing(false);
  };

  // Project an incident onto the radar plane
  const projectToRadar = (incident) => {
    const myLat = location?.latitude || 6.9271;
    const myLng = location?.longitude || 79.8612;
    const dist = calcDistance(myLat, myLng, incident.latitude, incident.longitude);
    const bearing = calcBearing(myLat, myLng, incident.latitude, incident.longitude);
    const scaledDist = Math.min(dist / MAX_RANGE_METERS, 1) * RADAR_RADIUS;
    const angleRad = (bearing * Math.PI) / 180;
    return {
      x: RADAR_CENTER + scaledDist * Math.sin(angleRad),
      y: RADAR_CENTER - scaledDist * Math.cos(angleRad),
      distance: dist,
      bearing,
    };
  };

  const handleCardPress = (item) => {
    navigation.navigate('IncidentDetail', { incidentId: item.id });
  };

  const renderCard = (item, isUrgent, isResolved) => {
    const iconName = CATEGORY_ICON[item.category_code] || 'alert-circle';
    const pinColor = getPinColor(item, colors);
    const title = getIncidentTitle(item);
    const isOwn = item.creator_node_id === getNodeId();
    const sevConfig = getSeverityConfig(item.severity_level || 2);

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.card,
          { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
          isResolved && styles.cardResolved,
          isUrgent && !isResolved && { borderLeftWidth: 3, borderLeftColor: sevConfig.color },
        ]}
        activeOpacity={0.7}
        onPress={() => handleCardPress(item)}
      >
        <View style={styles.cardBody}>
          <View style={[styles.iconWrap, { backgroundColor: pinColor + '1A' }, isResolved && { backgroundColor: colors.bg.tertiary }]}>
            <Ionicons name={iconName} size={22} color={isResolved ? colors.text.tertiary : pinColor} />
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: isResolved ? colors.text.tertiary : colors.text.primary }]} numberOfLines={1}>
                {title}
              </Text>
              {isUrgent && !isResolved && (
                <View style={[styles.severityBadge, { backgroundColor: sevConfig.color }]}>
                  <Text style={styles.severityBadgeText}>{sevConfig.label}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="navigate-outline" size={12} color={colors.text.tertiary} />
                <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
                  {item._distance != null ? formatDistance(item._distance) : '—'}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
                <Text style={[styles.metaText, { color: colors.text.tertiary }]}>{formatTimeAgo(item.created_at)}</Text>
              </View>
              {item.people_count > 1 && (
                <View style={styles.metaItem}>
                  <Ionicons name="people" size={12} color={colors.text.tertiary} />
                  <Text style={[styles.metaText, { color: colors.text.tertiary }]}>{item.people_count}</Text>
                </View>
              )}
            </View>
            {isUrgent && !isResolved && (item.status_safety >= 1 || item.status_water >= 1 || item.status_injury >= 1) && (
              <View style={styles.needsRow}>
                {item.status_safety === 2 && (
                  <View style={[styles.needChip, { backgroundColor: colors.status.critical + '33' }]}>
                    <Ionicons name="warning" size={10} color={colors.status.critical} />
                    <Text style={[styles.needText, { color: colors.status.critical }]}>Trapped</Text>
                  </View>
                )}
                {item.status_safety === 1 && (
                  <View style={[styles.needChip, { backgroundColor: colors.status.warning + '33' }]}>
                    <Ionicons name="help-circle" size={10} color={colors.status.warning} />
                    <Text style={[styles.needText, { color: colors.status.warning }]}>Need Help</Text>
                  </View>
                )}
                {item.status_water === 2 && (
                  <View style={[styles.needChip, { backgroundColor: colors.status.critical + '33' }]}>
                    <Ionicons name="water" size={10} color={colors.status.critical} />
                    <Text style={[styles.needText, { color: colors.status.critical }]}>No water</Text>
                  </View>
                )}
                {item.status_water === 1 && (
                  <View style={[styles.needChip, { backgroundColor: colors.status.warning + '33' }]}>
                    <Ionicons name="water" size={10} color={colors.status.warning} />
                    <Text style={[styles.needText, { color: colors.status.warning }]}>Low water</Text>
                  </View>
                )}
                {item.status_injury === 2 && (
                  <View style={[styles.needChip, { backgroundColor: colors.status.critical + '33' }]}>
                    <Ionicons name="medkit" size={10} color={colors.status.critical} />
                    <Text style={[styles.needText, { color: colors.status.critical }]}>Severe injury</Text>
                  </View>
                )}
                {item.status_injury === 1 && (
                  <View style={[styles.needChip, { backgroundColor: colors.status.warning + '33' }]}>
                    <Ionicons name="medkit" size={10} color={colors.status.warning} />
                    <Text style={[styles.needText, { color: colors.status.warning }]}>Minor injury</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Respond action */}
          {isResponder && isUrgent && !isResolved && !isOwn && (
            <TouchableOpacity style={[styles.helpBtn, { backgroundColor: colors.accent.primary }]} onPress={() => handleCardPress(item)}>
              <Text style={[styles.helpBtnText, { color: colors.accent.onPrimary }]}>Help</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Radar section */}
        <View style={styles.radarSection}>
          <View style={styles.radarHeader}>
            {isResponder && (
              <TouchableOpacity
                style={[styles.zoomBtn, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
                onPress={() => setRadarZoomed((z) => !z)}
              >
                <Ionicons name={radarZoomed ? 'contract' : 'expand'} size={14} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.radarContainer}>
            <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
              <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={RADAR_RADIUS} fill={colors.radar.bg} />

              <G rotation={-heading} origin={`${RADAR_CENTER}, ${RADAR_CENTER}`}>
                <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={RADAR_RADIUS * 0.33} fill="none" stroke={colors.radar.ringNear} strokeWidth={1} />
                <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={RADAR_RADIUS * 0.66} fill="none" stroke={colors.radar.ringMid} strokeWidth={1} />
                <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={RADAR_RADIUS} fill="none" stroke={colors.radar.ringMid} strokeWidth={1} />

                <Line x1={RADAR_CENTER} y1={RADAR_CENTER - RADAR_RADIUS} x2={RADAR_CENTER} y2={RADAR_CENTER + RADAR_RADIUS} stroke={colors.radar.grid} strokeWidth={1} />
                <Line x1={RADAR_CENTER - RADAR_RADIUS} y1={RADAR_CENTER} x2={RADAR_CENTER + RADAR_RADIUS} y2={RADAR_CENTER} stroke={colors.radar.grid} strokeWidth={1} />

                <SvgText x={RADAR_CENTER} y={12} fontSize={10} fontWeight="700" fill={colors.text.tertiary} textAnchor="middle">N</SvgText>
                <SvgText x={RADAR_CENTER} y={RADAR_SIZE - 4} fontSize={10} fontWeight="700" fill={colors.text.tertiary} textAnchor="middle">S</SvgText>
                <SvgText x={8} y={RADAR_CENTER + 3} fontSize={10} fontWeight="700" fill={colors.text.tertiary} textAnchor="middle">W</SvgText>
                <SvgText x={RADAR_SIZE - 8} y={RADAR_CENTER + 3} fontSize={10} fontWeight="700" fill={colors.text.tertiary} textAnchor="middle">E</SvgText>

                {radarIncidents.map((inc, idx) => {
                  const pos = projectToRadar(inc);
                  const pinColor = getPinColor(inc, colors);
                  return (
                    <G key={inc.id || idx}>
                      <Circle cx={pos.x} cy={pos.y} r={5} fill={pinColor} />
                      <Circle cx={pos.x} cy={pos.y} r={8} fill="none" stroke={pinColor} strokeWidth={1} opacity={0.4} />
                      <SvgText x={pos.x} y={pos.y + 18} fontSize={7} fill={colors.text.tertiary} textAnchor="middle">
                        {formatDistance(pos.distance)}
                      </SvgText>
                    </G>
                  );
                })}
              </G>

              <G rotation={sweepAngle} origin={`${RADAR_CENTER}, ${RADAR_CENTER}`}>
                <Line x1={RADAR_CENTER} y1={RADAR_CENTER} x2={RADAR_CENTER} y2={RADAR_CENTER - RADAR_RADIUS} stroke={colors.radar.sweep} strokeWidth={2} />
                <Path
                  d={`M ${RADAR_CENTER} ${RADAR_CENTER} L ${RADAR_CENTER} ${RADAR_CENTER - RADAR_RADIUS} A ${RADAR_RADIUS} ${RADAR_RADIUS} 0 0 1 ${RADAR_CENTER + 12} ${RADAR_CENTER - RADAR_RADIUS + 3} Z`}
                  fill={colors.radar.sweep}
                  opacity={0.3}
                />
              </G>

              <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={5} fill={colors.radar.pinSelf} />
              <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={9} fill="none" stroke={colors.radar.pinSelf} strokeWidth={1.5} opacity={0.5} />
            </Svg>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.status.critical }]} />
              <Text style={[styles.legendText, { color: colors.text.secondary }]}>{t('nearby.legendUrgent')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.status.warning }]} />
              <Text style={[styles.legendText, { color: colors.text.secondary }]}>{t('nearby.legendHazard')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.status.success }]} />
              <Text style={[styles.legendText, { color: colors.text.secondary }]}>{t('nearby.legendResolved')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.radar.pinSelf }]} />
              <Text style={[styles.legendText, { color: colors.text.secondary }]}>{t('nearby.legendYou')}</Text>
            </View>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: t('nearby.filterAll'), icon: 'list' },
            { key: 'sos', label: t('nearby.filterSos'), icon: 'medical' },
            { key: 'hazard', label: t('nearby.filterHazard'), icon: 'warning' },
            { key: 'resolved', label: t('nearby.filterResolved'), icon: 'checkmark-circle' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterBtn,
                { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                filter === f.key && { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Ionicons name={f.icon} size={12} color={filter === f.key ? colors.accent.onPrimary : colors.text.secondary} />
              <Text style={[styles.filterText, { color: colors.text.secondary }, filter === f.key && { color: colors.accent.onPrimary, fontWeight: '700' }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Urgent Requests */}
        {urgentRequests.length > 0 && (filter === 'all' || filter === 'sos') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="alert-circle" size={18} color={colors.status.critical} />
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('nearby.urgentRequests')}</Text>
              </View>
              <Text style={[styles.sectionCount, { color: colors.text.tertiary }]}>{urgentRequests.length}</Text>
            </View>
            {urgentRequests.map((item) => renderCard(item, true, false))}
          </View>
        )}

        {/* Community Reports */}
        {communityReports.length > 0 && (filter === 'all' || filter === 'hazard') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="people-circle-outline" size={18} color={colors.status.warning} />
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('nearby.communityReports')}</Text>
              </View>
              <Text style={[styles.sectionCount, { color: colors.text.tertiary }]}>{communityReports.length}</Text>
            </View>
            {communityReports.map((item) => renderCard(item, false, false))}
          </View>
        )}

        {/* Recently Resolved */}
        {recentlyResolved.length > 0 && (filter === 'all' || filter === 'resolved') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.status.success} />
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('nearby.recentlyResolved')}</Text>
              </View>
              <Text style={[styles.sectionCount, { color: colors.text.tertiary }]}>{recentlyResolved.length}</Text>
            </View>
            {recentlyResolved.map((item) => renderCard(item, false, true))}
          </View>
        )}

        {/* Empty state */}
        {(contextIncidents || []).length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="navigate-outline" size={48} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('nearby.noIncidents')}</Text>
            <Text style={[styles.emptySubtext, { color: colors.text.tertiary }]}>{t('nearby.noIncidentsDesc')}</Text>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  radarSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  radarHeader: { alignItems: 'center', marginBottom: 8, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  zoomBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  radarContainer: { alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  filterRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 999, borderWidth: 1,
  },
  filterText: { fontSize: 11, fontWeight: '600' },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionCount: { fontSize: 12, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 8 },
  cardResolved: { opacity: 0.55 },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  severityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  severityBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  cardMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },
  needsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  needChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  needText: { fontSize: 10, fontWeight: '700' },
  helpBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  helpBtnText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtext: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
