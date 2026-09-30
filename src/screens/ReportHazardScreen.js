// Report Hazard Screen — ported from the New Test design (user-fixed version):
// cached location, auto-generated landmark ("Flood near temple", ≤30 chars),
// category grid + severity pills, vibration feedback, fixed send button.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Vibration,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useMeshSync } from '../context/MeshSyncContext';
import { getLandmark } from '../backend/store/hotState';
import { HAZARD_CATEGORY, SEVERITY, REPORT_TYPE } from '../backend/shared/enums';
import { getCurrentLocation } from '../utils/location';

const CATEGORIES = [
  { code: 1, labelKey: 'hazard.flood', icon: 'water' },
  { code: 2, labelKey: 'hazard.landslide', icon: 'earth' },
  { code: 3, label: 'Storm', labelKey: 'hazard.cyclone', icon: 'thunderstorm' },
  { code: 4, labelKey: 'hazard.fire', icon: 'flame' },
  { code: 5, labelKey: 'hazard.medical', icon: 'medkit' },
  { code: 6, labelKey: 'hazard.structural', icon: 'business' },
  { code: 7, labelKey: 'hazard.road', icon: 'car' },
  { code: 0, labelKey: 'hazard.other', icon: 'ellipsis-horizontal' },
];

const SEVERITIES = [
  { level: 1, labelKey: 'hazard.low', colorKey: 'success' },
  { level: 2, labelKey: 'hazard.medium', colorKey: 'warning' },
  { level: 3, labelKey: 'hazard.high', colorKey: 'critical' },
];

const CATEGORY_MAP = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 6, // road block → structural
};

export default function ReportHazardScreen({ navigation }) {
  const { colors, spacing, radius, typography, t } = useApp();
  const { reportHazard, userProfile } = useMeshSync();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSeverity, setSelectedSeverity] = useState(2);
  const [location, setLocation] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // Grab cached location on mount (fast); refresh silently
  useEffect(() => {
    (async () => {
      try {
        const loc = await getCurrentLocation({ showAlertOnDenied: false });
        if (loc) setLocation(loc);
      } catch {}
    })();
  }, []);

  const handleSend = async () => {
    if (selectedCategory === null) {
      Alert.alert(t('hazard.category') || 'Category', t('hazard.selectCategory') || 'Please choose a hazard category before sending.');
      return;
    }

    setIsSending(true);
    try {
      // Auto-generate landmark from category + saved landmark: "Flood near temple" (§3, ≤30 chars)
      const cat = CATEGORIES.find((c) => c.code === selectedCategory);
      const userLandmark = getLandmark();
      const catLabel = cat ? t(cat.labelKey) : t('hazard.title') || 'Hazard';
      const landmarkName = userLandmark
        ? `${catLabel} ${userLandmark}`.substring(0, 30)
        : catLabel;

      const result = await reportHazard({
        // Map UI category codes (0-7, incl. Road Block=7) to event codes (0-6)
        categoryCode: CATEGORY_MAP[selectedCategory] ?? 0,
        severityLevel: selectedSeverity,
        latitude: location?.latitude,
        longitude: location?.longitude,
        landmarkName,
      });

      if (result.success) {
        Vibration.vibrate(200);
        Alert.alert(t('hazard.reportSent') || 'Report Broadcasted', t('hazard.reportSentDesc') || 'Your hazard report has been added to the mesh network.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to send hazard report. Please try again.');
      }
    } catch (err) {
      console.error('[ReportHazard] send failed:', err);
      Alert.alert('Error', 'Failed to send hazard report. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const locationText = location
    ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
    : t('hazard.gettingLocation') || 'Getting location…';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      {/* Offline mesh status bar */}
      <View style={[styles.offlineBar, { backgroundColor: colors.status.infoDim }]}>
        <Ionicons name="hardware-chip" size={16} color={colors.accent.primary} />
        <Text style={[styles.offlineText, { color: colors.accent.primary }]}>{t('hazard.offlineMesh') || 'Offline • Mesh Active'}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.screenTitle, { color: colors.text.primary }]}>{t('hazard.title') || 'Report a Hazard'}</Text>
        <Text style={[styles.screenSubtitle, { color: colors.text.secondary }]}>{t('hazard.subtitle') || 'Warn others about dangers in your area'}</Text>

        {/* Category grid */}
        <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>{t('hazard.category') || 'Category'}</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.code;
            return (
              <TouchableOpacity
                key={cat.code}
                style={[
                  styles.categoryCard,
                  { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                  isSelected && { borderColor: colors.accent.primary, borderWidth: 2 },
                ]}
                onPress={() => setSelectedCategory(cat.code)}
                activeOpacity={0.7}
              >
                <Ionicons name={cat.icon} size={28} color={isSelected ? colors.accent.primary : colors.text.tertiary} />
                <Text style={[styles.categoryLabel, { color: isSelected ? colors.accent.primary : colors.text.secondary }]}>
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Location note */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.text.tertiary} />
          <Text style={[styles.locationText, { color: colors.text.tertiary }]}>
            {location ? `${t('hazard.reportingFrom') || 'Reporting from'}: ${locationText}` : t('hazard.gettingLocation') || 'Getting location…'}
          </Text>
        </View>

        {/* Severity */}
        <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>{t('hazard.severity') || 'Severity'}</Text>
        <View style={styles.severityRow}>
          {SEVERITIES.map((sev) => {
            const isSelected = selectedSeverity === sev.level;
            const sevColor = colors.status[sev.colorKey];
            const sevDimColor = colors.status[`${sev.colorKey}Dim`];
            return (
              <TouchableOpacity
                key={sev.level}
                style={[
                  styles.severityPill,
                  {
                    backgroundColor: isSelected ? sevDimColor : colors.bg.secondary,
                    borderColor: isSelected ? sevColor : colors.border.subtle,
                  },
                ]}
                onPress={() => setSelectedSeverity(sev.level)}
                activeOpacity={0.7}
              >
                <Text style={[styles.severityText, { color: isSelected ? sevColor : colors.text.secondary }]}>
                  {t(sev.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Send button — fixed at bottom */}
      <View style={[styles.sendContainer, { backgroundColor: colors.bg.primary, borderTopColor: colors.border.subtle }]}>
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.accent.primary }, isSending && { opacity: 0.6 }]}
          onPress={handleSend}
          disabled={isSending}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={20} color={colors.accent.onPrimary} />
          <Text style={[styles.sendButtonText, { color: colors.accent.onPrimary }]}>
            {isSending ? t('common.sending') || 'Sending…' : t('hazard.sendReport') || 'Send Report'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  offlineBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 16, gap: 8,
  },
  offlineText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  screenTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  screenSubtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: {
    width: '48%', aspectRatio: 1.1, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10,
  },
  categoryLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16 },
  locationText: { fontSize: 12 },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityPill: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2, alignItems: 'center',
  },
  severityText: { fontSize: 13, fontWeight: '700' },
  sendContainer: {
    paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1,
  },
  sendButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 16, gap: 8,
  },
  sendButtonText: { fontWeight: '800', fontSize: 16 },
});
