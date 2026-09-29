// Home Screen — Role-aware main screen (ported from the New Test design)
//
// Civilian: Big SOS button + Report Hazard + My Status
// Civilian Responder: Active incidents nearby + Quick-Respond (no SOS button)
// Authorized Responder: Dispatch assignments + active incidents (no SOS button)
//
// Data comes from the real MeshSyncContext (sendSOS/cancelSOS/dispatchResponder/
// incidents/assignments) — the same tested pipeline that feeds the cloud.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Alert,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useMeshSync } from '../context/MeshSyncContext';
import { getLastStatus } from '../backend/store/hotState';
import { SAFETY, WATER, INJURY } from '../backend/shared/enums';
import { SEVERITY_COLOR } from '../backend/shared/severity';
import { getCurrentLocation } from '../utils/location';

const SAFETY_LABEL = { [SAFETY.SAFE]: 'Safe', [SAFETY.NEED_HELP]: 'Need Help', [SAFETY.TRAPPED]: 'Trapped' };
const WATER_LABEL = { [WATER.GOOD]: 'Enough food & water', [WATER.LOW]: 'Low food & water', [WATER.NONE]: 'No food & water' };
const INJURY_LABEL = { [INJURY.NONE]: 'No injuries', [INJURY.MINOR]: 'Minor injury', [INJURY.SEVERE]: 'Severe injury' };

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function HomeScreen({ navigation }) {
  const { colors, spacing, radius, typography, shadows, t, isCivilian, isResponder, isAuthorized } = useApp();
  const {
    peerCount,
    isOnline,
    sendSOS,
    cancelSOS,
    dispatchResponder,
    incidents,
    assignments,
    activeSosIncidentId,
    nodeId,
    assignedZoneId,
    userLocation,
  } = useMeshSync();
  const [isSending, setIsSending] = useState(false);
  const [alertBanner, setAlertBanner] = useState(null);

  // Pulse animation (civilian only)
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isCivilian) return;
    const pulse1 = Animated.loop(
      Animated.timing(pulseAnim1, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: false })
    );
    const pulse2 = Animated.loop(
      Animated.timing(pulseAnim2, { toValue: 1, duration: 2000, delay: 1000, easing: Easing.out(Easing.ease), useNativeDriver: false })
    );
    pulse1.start();
    pulse2.start();
    return () => { pulse1.stop(); pulse2.stop(); };
  }, [isCivilian]);

  const statusPreview = useMemo(() => {
    const s = getLastStatus();
    const parts = [];
    if (s.safety) parts.push(SAFETY_LABEL[s.safety] || `Safety ${s.safety}`);
    if (s.water) parts.push(WATER_LABEL[s.water] || `Water ${s.water}`);
    if (s.injury) parts.push(INJURY_LABEL[s.injury] || `Injury ${s.injury}`);
    if (!parts.length) return 'No status set yet — tap to update';
    return `${parts.join(' · ')} · ${s.people} ${s.people === 1 ? 'person' : 'people'}`;
  }, []);

  const activeIncidents = useMemo(
    () => (incidents || []).filter((i) => i.status_code !== 5 && i.confidence_code !== 3 && i.confidence_code !== 4),
    [incidents]
  );

  const myDispatch = useMemo(
    () => (assignments || []).filter((a) => a.responder_node_id === nodeId || a.zone_id === assignedZoneId),
    [assignments, nodeId, assignedZoneId]
  );

  const handleSOS = () => {
    if (activeSosIncidentId) {
      Alert.alert(t('home.sosActive'), t('home.tapToCancel'), [
        { text: t('home.keepSos') || 'Keep SOS', style: 'cancel' },
        {
          text: 'Cancel SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await cancelSOS();
              if (result.success) Alert.alert('SOS Cancelled', 'Your emergency alert has been cancelled across the mesh.');
            } catch (e) {
              Alert.alert('Could not cancel', e.message || 'Please try again.');
            }
          },
        },
      ]);
      return;
    }

    Alert.alert(t('home.sosConfirm') || 'Send Emergency SOS?', t('home.sosConfirmDesc') || 'This will broadcast an urgent emergency alert with your GPS coordinates across nearby mesh devices.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Broadcast SOS',
        style: 'destructive',
        onPress: async () => {
          Vibration.vibrate(300);
          setIsSending(true);
          try {
            const result = await sendSOS();
            if (result.success) {
              Alert.alert(t('home.sosSent') || 'SOS Broadcasted', t('home.sosSentDesc') || 'Your emergency alert is active and being relayed across all nearby mesh nodes.');
            } else if (result.error === 'no_sos_needed') {
              Alert.alert(t('home.noSosNeeded') || 'No SOS needed', t('home.noSosNeededDesc') || 'Your last status says you are safe. Update your status if your situation changed.', [
                { text: t('home.setMyStatus') || 'Update My Status', onPress: () => navigation.navigate('MyStatus') },
                { text: 'Send anyway', style: 'destructive', onPress: sendSosForced },
              ]);
            } else {
              Alert.alert('Could not send SOS', result.error || 'Please try again.');
            }
          } catch (e) {
            Alert.alert('Could not send SOS', e.message || 'Please try again.');
          } finally {
            setIsSending(false);
          }
        },
      },
    ]);
  };

  const sendSosForced = async () => {
    try {
      const result = await sendSOS({ force: true });
      if (result.success) {
        Alert.alert(t('home.sosSent') || 'SOS Broadcasted', t('home.sosSentDesc') || 'Your emergency alert is active and being relayed across all nearby mesh nodes.');
      } else {
        Alert.alert('Could not send SOS', result.error || 'Please try again.');
      }
    } catch (e) {
      Alert.alert('Could not send SOS', e.message || 'Please try again.');
    }
  };

  const handleQuickRespond = (incidentId) => {
    Alert.alert(t('incident.respondConfirm') || 'Respond to this incident?', '', [
      { text: t('common.no') || 'No', style: 'cancel' },
      {
        text: t('incident.yesRespond') || 'Yes, Respond',
        onPress: async () => {
          try {
            await dispatchResponder({ incidentId });
            Alert.alert('Responding', 'Responder en-route event broadcast to the mesh.');
          } catch (e) {
            Alert.alert('Could not respond', e.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const pulseScale1 = pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const pulseOpacity1 = pulseAnim1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.15, 0] });
  const pulseScale2 = pulseAnim2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const pulseOpacity2 = pulseAnim2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.1, 0] });

  // ─── CIVILIAN HOME ───
  const renderCivilianHome = () => (
    <View style={styles.mainContent}>
      {alertBanner && (
        <View style={[styles.alertBanner, { backgroundColor: colors.bg.tertiary, borderBottomColor: colors.border.subtle }]}>
          <View style={styles.alertContent}>
            <Ionicons name="information-circle" size={20} color={colors.text.primary} />
            <Text style={[styles.alertText, { color: colors.text.primary }]}>{alertBanner}</Text>
          </View>
          <TouchableOpacity onPress={() => setAlertBanner(null)}>
            <Ionicons name="close" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sosSection}>
        <View style={styles.ringContainer}>
          <Animated.View style={[styles.pulseRing, { borderColor: colors.status.critical, transform: [{ scale: pulseScale1 }], opacity: pulseOpacity1 }]} />
          <Animated.View style={[styles.pulseRing, { borderColor: colors.status.critical, transform: [{ scale: pulseScale2 }], opacity: pulseOpacity2 }]} />
        </View>

        <TouchableOpacity
          style={[styles.sosButton, { backgroundColor: activeSosIncidentId ? colors.status.warning : colors.status.critical }, shadows.sos]}
          onPress={handleSOS}
          disabled={isSending}
          activeOpacity={0.8}
        >
          <Ionicons name={activeSosIncidentId ? 'close' : 'medical'} size={64} color="#FFFFFF" />
          <Text style={styles.sosButtonText}>{activeSosIncidentId ? 'CANCEL' : 'SOS'}</Text>
        </TouchableOpacity>

        <View style={styles.sosLabel}>
          <Text style={[styles.sosTitle, { color: colors.text.primary }]}>
            {activeSosIncidentId ? t('home.sosActive') : t('home.emergencyHelp')}
          </Text>
          <Text style={[styles.sosSubtitle, { color: colors.text.secondary }]}>
            {activeSosIncidentId ? t('home.tapToCancel') : t('home.tapForHelp')}
          </Text>
        </View>

        {!activeSosIncidentId && (
          <TouchableOpacity
            style={[styles.statusPreview, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
            onPress={() => navigation.navigate('MyStatus')}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={14} color={colors.text.tertiary} />
            <Text style={[styles.statusPreviewText, { color: colors.text.tertiary }]}>{statusPreview}</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }, shadows.card]}
          onPress={() => navigation.navigate('ReportHazard')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
            <Ionicons name="warning" size={24} color={colors.text.primary} />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text.primary }]}>{t('home.reportHazard')}</Text>
          <Text style={[styles.actionSubtitle, { color: colors.text.tertiary }]}>{t('home.reportHazardDesc')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }, shadows.card]}
          onPress={() => navigation.navigate('MyStatus')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.text.primary} />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text.primary }]}>{t('home.myStatus')}</Text>
          <Text style={[styles.actionSubtitle, { color: colors.text.tertiary }]}>{t('home.myStatusDesc')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── RESPONDER HOME ───
  const renderResponderHome = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {alertBanner && (
        <View style={[styles.alertBanner, { backgroundColor: colors.bg.tertiary, borderBottomColor: colors.border.subtle }]}>
          <View style={styles.alertContent}>
            <Ionicons name="information-circle" size={20} color={colors.text.primary} />
            <Text style={[styles.alertText, { color: colors.text.primary }]}>{alertBanner}</Text>
          </View>
          <TouchableOpacity onPress={() => setAlertBanner(null)}>
            <Ionicons name="close" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      )}

      {isAuthorized && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('home.yourDispatch') || 'Your Dispatch'}</Text>
          {myDispatch.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
              <Ionicons name="clipboard-outline" size={32} color={colors.text.tertiary} />
              <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>{t('home.noDispatch') || 'No dispatch assignments yet'}</Text>
            </View>
          ) : (
            myDispatch.map((a) => (
              <View key={`${a.responder_node_id}|${a.zone_id}`} style={[styles.dispatchCard, { backgroundColor: colors.bg.secondary, borderColor: colors.accent.primary }, shadows.card]}>
                <View style={styles.dispatchLeft}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.accent.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.incidentLandmark, { color: colors.text.primary }]} numberOfLines={1}>
                      {a.zone_id || 'Dispatch'}
                    </Text>
                    <Text style={[styles.assignedByText, { color: colors.text.tertiary }]}>
                      {t('dispatch.assignedBy') || 'Assigned by Command Center'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('home.activeIncidents') || 'Active Incidents'}</Text>
        {activeIncidents.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
            <Ionicons name="checkmark-circle-outline" size={32} color={colors.text.tertiary} />
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>{t('home.noActiveIncidents') || 'No active incidents nearby'}</Text>
          </View>
        ) : (
          activeIncidents.slice(0, 5).map((inc) => {
            const dist =
              userLocation && inc.latitude != null && inc.longitude != null
                ? haversine(userLocation.latitude, userLocation.longitude, inc.latitude, inc.longitude)
                : null;
            const sevColor = SEVERITY_COLOR[inc.severity_level] || colors.status.critical;
            return (
              <View key={inc.id} style={[styles.incidentCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }, shadows.card]}>
                <View style={styles.incidentCardLeft}>
                  <View style={[styles.severityDot, { backgroundColor: sevColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.incidentLandmark, { color: colors.text.primary }]} numberOfLines={1}>
                      {inc.landmark_name || 'Unknown location'}
                    </Text>
                    <Text style={[styles.incidentMeta, { color: colors.text.tertiary }]}>
                      {inc.people_count || 1} {t('incident.people') || 'people'}
                      {dist != null && ` · ${formatDistance(dist)}`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.quickRespondBtn, { backgroundColor: colors.accent.primary }]}
                  onPress={() => handleQuickRespond(inc.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="hand-right" size={16} color={colors.accent.onPrimary} />
                  <Text style={[styles.quickRespondText, { color: colors.accent.onPrimary }]}>
                    {t('home.quickRespond') || 'Help Now'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
        <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('Nearby')}>
          <Text style={[styles.viewAllText, { color: colors.accent.primary }]}>
            {t('home.viewIncidents') || 'View all incidents'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.accent.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }, shadows.card]}
          onPress={() => navigation.navigate('ReportHazard')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
            <Ionicons name="warning" size={24} color={colors.text.primary} />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text.primary }]}>{t('home.reportHazard')}</Text>
          <Text style={[styles.actionSubtitle, { color: colors.text.tertiary }]}>{t('home.reportHazardDesc')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }, shadows.card]}
          onPress={() => navigation.navigate('MyStatus')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.text.primary} />
          </View>
          <Text style={[styles.actionTitle, { color: colors.text.primary }]}>{t('home.myStatus')}</Text>
          <Text style={[styles.actionSubtitle, { color: colors.text.tertiary }]}>{t('home.myStatusDesc')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.statusBar, { backgroundColor: colors.bg.primary, borderBottomColor: colors.border.subtle }]}>
        <View style={styles.statusLeft}>
          <Ionicons name="hub" size={16} color={colors.accent.primary} />
          <Text style={[styles.statusText, { color: colors.text.primary }]}>
            {peerCount} {peerCount === 1 ? 'peer' : 'peers'}
          </Text>
        </View>
        <View style={styles.statusRight}>
          <Ionicons name={isOnline ? 'cloud-online' : 'cloud-offline'} size={14} color={colors.text.tertiary} />
          <Text style={[styles.statusSub, { color: colors.text.tertiary }]}>
            {isOnline ? t('common.online') || 'Online' : t('common.offline') || 'Offline'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} accessibilityLabel="Profile">
            <Ionicons name="person-circle-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>
      {isCivilian ? renderCivilianHome() : renderResponderHome()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 13, fontWeight: '700' },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusSub: { fontSize: 11, fontWeight: '600' },
  mainContent: { flex: 1, paddingHorizontal: 20, paddingVertical: 32, justifyContent: 'space-between' },
  scrollView: { flex: 1 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, marginBottom: 16,
  },
  alertContent: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  alertText: { fontSize: 14, flex: 1 },
  sosSection: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  ringContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pulseRing: { width: 192, height: 192, borderRadius: 96, borderWidth: 3, position: 'absolute' },
  sosButton: { width: 192, height: 192, borderRadius: 96, alignItems: 'center', justifyContent: 'center' },
  sosButtonText: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 8, letterSpacing: 2 },
  sosLabel: { alignItems: 'center', marginTop: 24 },
  sosTitle: { fontSize: 24, fontWeight: '700' },
  sosSubtitle: { fontSize: 16, marginTop: 4, textAlign: 'center' },
  statusPreview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8,
    marginTop: 24, gap: 4, maxWidth: 280, borderWidth: 1,
  },
  statusPreviewText: { fontSize: 11, flexShrink: 1, textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyBox: { borderRadius: 16, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  incidentCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16,
    padding: 16, marginBottom: 8, borderWidth: 1, gap: 8,
  },
  incidentCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  incidentLandmark: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  incidentMeta: { fontSize: 12, marginTop: 2 },
  quickRespondBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 8, gap: 4, flexShrink: 1,
  },
  quickRespondText: { fontWeight: '700', fontSize: 13 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 4 },
  viewAllText: { fontSize: 14, fontWeight: '700' },
  dispatchCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16,
    padding: 16, marginBottom: 8, borderWidth: 2, gap: 8,
  },
  dispatchLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  assignedByText: { fontSize: 11, marginTop: 2 },
  actionsGrid: { flexDirection: 'row', gap: 16, paddingHorizontal: 20, marginBottom: 48 },
  actionCard: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1 },
  actionIcon: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  actionTitle: { fontSize: 14, fontWeight: '700' },
  actionSubtitle: { fontSize: 12, marginTop: 2 },
});
