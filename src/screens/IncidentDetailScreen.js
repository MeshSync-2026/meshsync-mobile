// Incident Detail Screen — full incident info + status rows + compass + timeline
// Ported from the New Test design; data/actions come from MeshSyncContext.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Text as SvgText, G, Line } from 'react-native-svg';
import * as Location from 'expo-location';
import { useApp } from '../context/AppContext';
import { useMeshSync } from '../context/MeshSyncContext';
import { getNodeId } from '../backend/store/hotState';
import { getCurrentLocation } from '../utils/location';

const EVENT_TYPE_LABEL = {
  1: 'SOS Created', 2: 'Responder En Route', 3: 'Status Update',
  4: 'SOS Alive', 5: 'SOS Resolved', 6: 'SOS Cancelled', 7: 'Tombstone', 8: 'Assign',
};
const SEVERITY_LABEL = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High' };
const CONFIDENCE_LABEL = { 1: 'Live', 2: 'Unconfirmed', 3: 'Resolved', 4: 'Cancelled' };
const STATUS_LABEL = { 1: 'Open', 2: 'Assigned', 3: 'En Route', 4: 'On Scene', 5: 'Resolved' };
const SAFETY_LABEL = { 0: 'Safe', 1: 'Need Help', 2: 'Trapped' };
const WATER_LABEL = { 0: 'Enough Food & Water', 1: 'Low Food & Water', 2: 'No Food & Water' };
const INJURY_LABEL = { 0: 'No Injuries', 1: 'Minor Injury', 2: 'Severe Injury' };

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
  return `${(meters / 1000).toFixed(2)}km`;
}

function bearingToLabel(bearing) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(bearing / 45) % 8];
}

function getConfidenceColor(code, colors) {
  if (code === 3) return colors.status.success;
  if (code === 4) return colors.text.tertiary;
  if (code === 2) return colors.status.warning;
  return colors.status.critical;
}

const COMPASS_SIZE = 200;
const COMPASS_CENTER = COMPASS_SIZE / 2;
const COMPASS_RADIUS = COMPASS_CENTER - 15;

export default function IncidentDetailScreen({ route, navigation }) {
  const { colors, spacing, t, isResponder } = useApp();
  const { incidents, responders, history, dispatchResponder, resolveIncident, userLocation } = useMeshSync();
  const incidentId = route?.params?.incidentId;

  const [myLocation, setMyLocation] = useState(userLocation || null);
  const [myHeading, setMyHeading] = useState(0);
  const [isEnRoute, setIsEnRoute] = useState(false);

  useEffect(() => {
    let headingSub = null;
    (async () => {
      const loc = await getCurrentLocation({ showAlertOnDenied: false });
      if (loc) setMyLocation(loc);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          headingSub = await Location.watchHeadingAsync((h) => {
            setMyHeading(typeof h.trueHeading === 'number' ? h.trueHeading : h.magHeading || 0);
          });
        }
      } catch {}
    })();
    return () => {
      if (headingSub && headingSub.remove) headingSub.remove();
    };
  }, []);

  const incident = useMemo(
    () => (incidents || []).find((i) => i.id === incidentId) || null,
    [incidents, incidentId]
  );

  const incidentResponders = useMemo(
    () => (responders || []).filter((r) => r.incident_id === incidentId),
    [responders, incidentId]
  );

  const incidentEvents = useMemo(
    () => (history || []).filter((h) => h.incident_id === incidentId),
    [history, incidentId]
  );

  useEffect(() => {
    const myNodeId = getNodeId();
    const mine = incidentResponders.some((r) => r.responder_node_id === myNodeId);
    if (mine) setIsEnRoute(true);
  }, [incidentResponders]);

  const handleRespond = () => {
    Alert.alert('Respond to Incident', t('incident.respondConfirm'), [
      { text: t('common.no') || 'No', style: 'cancel' },
      {
        text: t('incident.yesRespond') || 'Yes, Respond',
        onPress: async () => {
          try {
            await dispatchResponder({ incidentId });
            setIsEnRoute(true);
          } catch (e) {
            Alert.alert('Could not respond', e.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const handleResolve = () => {
    Alert.alert('Resolve Incident', t('incident.resolveConfirm') || 'Mark this incident as resolved?', [
      { text: t('common.no') || 'No', style: 'cancel' },
      {
        text: t('incident.yesResolve') || 'Yes, Resolve',
        style: 'destructive',
        onPress: async () => {
          try {
            await resolveIncident(incidentId);
            Alert.alert(t('incident.resolved') || 'Resolved', t('incident.resolvedDesc') || 'The incident has been marked resolved across the mesh.');
          } catch (e) {
            Alert.alert('Could not resolve', e.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  if (!incident) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <Text style={styles.notFound}>Incident not found</Text>
      </View>
    );
  }

  const isActive = incident.confidence_code === 1 || incident.confidence_code === 2;
  const hasCoords = incident.latitude != null && incident.longitude != null;

  let distance = null;
  let bearing = null;
  let relativeBearing = null;
  if (hasCoords && myLocation) {
    distance = calcDistance(myLocation.latitude, myLocation.longitude, incident.latitude, incident.longitude);
    bearing = calcBearing(myLocation.latitude, myLocation.longitude, incident.latitude, incident.longitude);
    relativeBearing = (bearing - myHeading + 360) % 360;
  }

  const arrowRotation = relativeBearing != null ? relativeBearing : bearing ?? 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {incident.landmark_name || `Incident ${(incident.id || '').substring(0, 12)}`}
        </Text>
        <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(incident.confidence_code, colors) + '22' }]}>
          <Text style={[styles.confidenceText, { color: getConfidenceColor(incident.confidence_code, colors) }]}>
            {CONFIDENCE_LABEL[incident.confidence_code] || '—'}
          </Text>
        </View>
      </View>

      {/* Compass */}
      {isEnRoute && hasCoords && (
        <View style={styles.compassContainer}>
          <Text style={[styles.compassTitle, { color: colors.text.secondary }]}>{t('incident.navigationCompass') || 'Navigation'}</Text>
          <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
            <Circle cx={COMPASS_CENTER} cy={COMPASS_CENTER} r={COMPASS_RADIUS} fill={colors.bg.tertiary} stroke={colors.accent.primary} strokeWidth={2} />
            <Circle cx={COMPASS_CENTER} cy={COMPASS_CENTER} r={COMPASS_RADIUS * 0.7} fill="none" stroke={colors.border.subtle} strokeWidth={1} />

            <SvgText x={COMPASS_CENTER} y={18} fontSize={12} fontWeight="700" fill={colors.text.secondary} textAnchor="middle">N</SvgText>
            <SvgText x={COMPASS_SIZE - 12} y={COMPASS_CENTER + 4} fontSize={12} fontWeight="700" fill={colors.text.tertiary} textAnchor="middle">E</SvgText>
            <SvgText x={COMPASS_CENTER} y={COMPASS_SIZE - 8} fontSize={12} fontWeight="700" fill={colors.text.tertiary} textAnchor="middle">S</SvgText>
            <SvgText x={12} y={COMPASS_CENTER + 4} fontSize={12} fontWeight="700" fill={colors.text.tertiary} textAnchor="middle">W</SvgText>

            {Array.from({ length: 12 }).map((_, i) => {
              const angle = i * 30 * Math.PI / 180;
              return (
                <Line
                  key={i}
                  x1={COMPASS_CENTER + (COMPASS_RADIUS - 5) * Math.sin(angle)}
                  y1={COMPASS_CENTER - (COMPASS_RADIUS - 5) * Math.cos(angle)}
                  x2={COMPASS_CENTER + COMPASS_RADIUS * Math.sin(angle)}
                  y2={COMPASS_CENTER - COMPASS_RADIUS * Math.cos(angle)}
                  stroke={colors.border.subtle}
                  strokeWidth={1}
                />
              );
            })}

            <G rotation={arrowRotation} origin={`${COMPASS_CENTER}, ${COMPASS_CENTER}`}>
              <Line x1={COMPASS_CENTER} y1={COMPASS_CENTER} x2={COMPASS_CENTER} y2={COMPASS_CENTER - COMPASS_RADIUS + 20} stroke={colors.status.critical} strokeWidth={3} />
              <Path
                d={`M ${COMPASS_CENTER} ${COMPASS_CENTER - COMPASS_RADIUS + 10} L ${COMPASS_CENTER - 10} ${COMPASS_CENTER - COMPASS_RADIUS + 25} L ${COMPASS_CENTER + 10} ${COMPASS_CENTER - COMPASS_RADIUS + 25} Z`}
                fill={colors.status.critical}
              />
            </G>

            <Circle cx={COMPASS_CENTER} cy={COMPASS_CENTER} r={6} fill={colors.accent.primary} />
            <Circle cx={COMPASS_CENTER} cy={COMPASS_CENTER} r={10} fill="none" stroke={colors.accent.primary} strokeWidth={1.5} opacity={0.4} />
          </Svg>
          {distance != null && (
            <Text style={[styles.compassDistance, { color: colors.text.primary }]}>
              {formatDistance(distance)} away · {bearing != null ? bearingToLabel(bearing) : ''}
            </Text>
          )}
          {!myLocation && <Text style={[styles.compassWaiting, { color: colors.text.tertiary }]}>{t('incident.waitingGps') || 'Waiting for GPS…'}</Text>}
          {distance != null && distance < 50 && (
            <Text style={[styles.compassArrived, { color: colors.status.success }]}>{t('incident.arrived') || 'You have arrived'}</Text>
          )}
        </View>
      )}

      {/* Details card */}
      <View style={[styles.card, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
        <DetailRow label={t('incident.status') || 'Status'} value={STATUS_LABEL[incident.status_code] || '—'} color={colors.text.primary} />
        <DetailRow label={t('incident.severity') || 'Severity'} value={SEVERITY_LABEL[incident.severity_level] || '—'} color={colors.text.primary} />
        <DetailRow label={t('incident.people') || 'People'} value={String(incident.people_count || 1)} color={colors.text.primary} />
        {incident.report_type_code === 1 && (
          <>
            <DetailRow label={t('incident.safety') || 'Safety'} value={SAFETY_LABEL[incident.status_safety] || 'Safe'} color={colors.text.primary} />
            <DetailRow label={t('incident.foodWater') || 'Food & Water'} value={WATER_LABEL[incident.status_water] || 'Enough'} color={colors.text.primary} />
            <DetailRow label={t('incident.medical') || 'Medical'} value={INJURY_LABEL[incident.status_injury] || 'None'} color={colors.text.primary} />
          </>
        )}
        {hasCoords && (
          <DetailRow label={t('incident.coordinates') || 'Coordinates'} value={`${incident.latitude?.toFixed(6)}, ${incident.longitude?.toFixed(6)}`} color={colors.text.primary} />
        )}
        {incident.landmark_name && <DetailRow label={t('incident.landmark') || 'Landmark'} value={incident.landmark_name} color={colors.text.primary} />}
        <DetailRow label={t('incident.created') || 'Created'} value={new Date(incident.created_at).toLocaleString()} color={colors.text.primary} />
      </View>

      {/* Responders */}
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
        {t('incident.responders') || 'Responders'} ({incidentResponders.length})
      </Text>
      <View style={[styles.card, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
        {incidentResponders.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>{t('incident.noResponders') || 'No responders yet'}</Text>
        ) : (
          incidentResponders.map((r, idx) => (
            <View key={idx} style={styles.responderRow}>
              <View style={[styles.responderDot, { backgroundColor: colors.status.success }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.responderText, { color: colors.text.primary }]}>
                  {r.responder_node_id?.substring(0, 12) || 'Unknown'}
                </Text>
                <Text style={[styles.responderSubtext, { color: colors.text.tertiary }]}>
                  {t('incident.enRoute') || 'En route'} · {r.joined_at ? new Date(r.joined_at).toLocaleTimeString() : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Timeline */}
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
        {t('incident.timeline') || 'Timeline'} ({incidentEvents.length} events)
      </Text>
      <View style={[styles.card, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
        {incidentEvents.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No events yet</Text>
        ) : (
          incidentEvents
            .slice()
            .reverse()
            .map((evt, idx) => (
              <View key={evt.source_mesh_event_id || idx} style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: colors.accent.primary }]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineEvent, { color: colors.text.primary }]}>
                    {EVENT_TYPE_LABEL[evt.action_type_code] || `Action ${evt.action_type_code}`}
                  </Text>
                  <Text style={[styles.timelineTime, { color: colors.text.tertiary }]}>
                    {new Date(evt.created_at).toLocaleString()}
                  </Text>
                  <Text style={[styles.timelineNode, { color: colors.text.tertiary }]}>from {(evt.actor_node_id || '').substring(0, 12)}</Text>
                </View>
              </View>
            ))
        )}
      </View>

      {/* Actions */}
      {isActive && (
        <View style={styles.actions}>
          {isResponder ? (
            !isEnRoute ? (
              <TouchableOpacity style={[styles.respondButton, { backgroundColor: colors.accent.primary }]} onPress={handleRespond}>
                <Text style={[styles.respondText, { color: colors.accent.onPrimary }]}>{t('incident.respond') || 'Respond'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.enRouteBadge, { backgroundColor: colors.status.critical + '22', borderColor: colors.status.critical }]}>
                <Text style={[styles.enRouteText, { color: colors.status.critical }]}>{t('incident.enRouteFollow') || 'En route'}</Text>
              </View>
            )
          ) : (
            <View style={styles.civilianPrompt}>
              <Ionicons name="information-circle-outline" size={20} color={colors.text.tertiary} />
              <Text style={[styles.civilianPromptText, { color: colors.text.tertiary }]}>
                {t('nearby.loginToRespondDesc') || 'Switch to a responder role to respond to incidents'}
              </Text>
            </View>
          )}
          {(isResponder || incident.creator_node_id === getNodeId()) && (
            <TouchableOpacity style={[styles.resolveButton, { backgroundColor: colors.bg.tertiary, borderColor: colors.status.success }]} onPress={handleResolve}>
              <Text style={[styles.resolveText, { color: colors.status.success }]}>{t('incident.markResolved') || 'Mark Resolved'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function DetailRow({ label, value, color }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { padding: 40, textAlign: 'center', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 } ,
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  confidenceText: { fontSize: 11, fontWeight: '700' },
  compassContainer: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  compassTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.4 },
  compassDistance: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  compassWaiting: { fontSize: 12, marginTop: 4 },
  compassArrived: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 13, color: '#8E9192', fontWeight: '600' },
  detailValue: { fontSize: 13, fontWeight: '700', flexShrink: 1, marginLeft: 12, textAlign: 'right' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginHorizontal: 20, marginBottom: 8 },
  emptyText: { fontSize: 13 },
  responderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  responderDot: { width: 8, height: 8, borderRadius: 4 },
  responderText: { fontSize: 13, fontWeight: '600' },
  responderSubtext: { fontSize: 11, marginTop: 1 },
  timelineRow: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  timelineContent: { flex: 1 },
  timelineEvent: { fontSize: 13, fontWeight: '600' },
  timelineTime: { fontSize: 11, marginTop: 2 },
  timelineNode: { fontSize: 11 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingHorizontal: 20, marginTop: 8 },
  respondButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  respondText: { fontWeight: '700', fontSize: 13, textAlign: 'center', flexShrink: 1 },
  enRouteBadge: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  enRouteText: { fontWeight: '700', fontSize: 14 },
  resolveButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  resolveText: { fontWeight: '700', fontSize: 13 },
  civilianPrompt: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  civilianPromptText: { fontSize: 12, flex: 1 },
});
