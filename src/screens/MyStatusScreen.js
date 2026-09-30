// My Status Screen — ported from the New Test design (user-fixed version):
// toggle-card UI, links the status update to the user's active SOS incident,
// and persists status + landmark so the next SOS carries severity.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useMeshSync } from '../context/MeshSyncContext';
import { getLastStatus, setLandmark, getLandmark } from '../backend/store/hotState';
import { SAFETY, WATER, INJURY } from '../backend/shared/enums';


export default function MyStatusScreen({ navigation }) {
  const { colors, spacing, radius, typography, shadows, t } = useApp();
  const { updateMyStatus, incidents, nodeId } = useMeshSync();

  const [safety, setSafety] = useState(1);      // UI value 1-3 → event code = value-1
  const [resources, setResources] = useState(1);
  const [medical, setMedical] = useState(1);
  const [peopleCount, setPeopleCount] = useState(1);
  const [landmark, setLandmarkState] = useState('');
  const [sending, setSending] = useState(false);

  // Load saved status + landmark on mount (persists across sessions)
  useEffect(() => {
    const saved = getLastStatus();
    setSafety(saved.safety + 1);
    setResources(saved.water + 1);
    setMedical(saved.injury + 1);
    setPeopleCount(saved.people || 1);
    setLandmarkState(getLandmark() || '');
  }, []);

  const SAFETY_OPTIONS = [
    { code: SAFETY.SAFE, label: t('status.safe') || 'Safe', color: colors.status.success, icon: 'checkmark-circle' },
    { code: SAFETY.NEED_HELP, label: t('status.needHelp') || 'Need Help', color: colors.status.critical, icon: 'help-circle' },
    { code: SAFETY.TRAPPED, label: t('status.trapped') || 'Trapped', color: colors.status.critical, icon: 'warning' },
  ];

  const RESOURCE_OPTIONS = [
    { code: WATER.GOOD, label: t('status.enough') || 'Enough', color: colors.status.success, icon: 'restaurant' },
    { code: WATER.LOW, label: t('status.low') || 'Low', color: colors.status.warning, icon: 'restaurant-outline' },
    { code: WATER.NONE, label: t('status.none') || 'None', color: colors.status.critical, icon: 'alert-circle' },
  ];

  const MEDICAL_OPTIONS = [
    { code: INJURY.NONE, label: t('status.uninjured') || 'Uninjured', color: colors.status.success, icon: 'fitness' },
    { code: INJURY.MINOR, label: t('status.minor') || 'Minor', color: colors.status.warning, icon: 'medkit-outline' },
    { code: INJURY.SEVERE, label: t('status.serious') || 'Severe', color: colors.status.critical, icon: 'medkit' },
  ];

  const handleSendStatus = async () => {
    if (sending) return;
    setSending(true);
    try {
      // Link to the user's active SOS incident (if any) so the status
      // updates that incident instead of creating a new one
      const activeSos = (incidents || []).find(
        (i) =>
          i.creator_node_id === nodeId &&
          (i.confidence_code === 1 || i.confidence_code === 2) &&
          i.report_type_code === 1
      );

      const result = await updateMyStatus({
        safetyCode: safety - 1,
        waterCode: resources - 1,
        injuryCode: medical - 1,
        peopleCount,
        landmarkName: landmark.trim() || undefined,
        incidentId: activeSos?.id,
      });
      console.log('[MyStatus] result:', JSON.stringify(result?.success ? { success: true, id: result.event?.id } : result));

      if (result.success) {
        setLandmark(landmark.trim()); // reuse for SOS landmark_name
        Vibration.vibrate(200);
        Alert.alert(t('status.statusSent') || 'Status sent', t('status.statusSentDesc') || 'Your update will be transmitted to the nearest mesh node automatically.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to send status. Please try again.');
      }
    } catch (e) {
      console.error('[MyStatus] send failed:', e);
      Alert.alert('Error', 'Failed to send status. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderSection = (title, options, selected, onSelect, urgent) => (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>{title}</Text>
      <View style={styles.optionsRow}>
        {options.map((opt) => {
          const isSelected = selected === opt.code;
          return (
            <TouchableOpacity
              key={opt.label}
              style={[
                styles.optionCard,
                { borderColor: colors.border.subtle },
                isSelected
                  ? { backgroundColor: opt.color, borderColor: opt.color }
                  : { backgroundColor: colors.bg.secondary },
              ]}
              onPress={() => onSelect(opt.code)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={opt.icon}
                size={20}
                color={isSelected ? '#FFFFFF' : colors.text.secondary}
              />
              <Text
                style={[
                  styles.optionLabel,
                  { color: isSelected ? '#FFFFFF' : colors.text.secondary },
                ]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} contentContainerStyle={{ paddingBottom: 48 }}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{t('status.title') || 'My Status'}</Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
        {t('status.subtitle') || 'This is sent with your SOS so responders can prioritise you.'}
      </Text>

      {renderSection(t('status.areYouSafe') || 'Are you safe?', SAFETY_OPTIONS, safety, setSafety, true)}
      {renderSection(t('status.resources') || 'Food & Water', RESOURCE_OPTIONS, resources, setResources, false)}
      {renderSection(t('incident.medical') || 'Medical', MEDICAL_OPTIONS, medical, setMedical, false)}

      {/* People */}
      <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>{t('incident.people') || 'People with you'}</Text>
      <View style={[styles.peopleCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
        <TouchableOpacity
          style={[styles.stepperBtn, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}
          onPress={() => setPeopleCount((p) => Math.max(1, p - 1))}
        >
          <Ionicons name="remove" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={[styles.peopleCount, { color: colors.text.primary }]}>{peopleCount}</Text>
        <TouchableOpacity
          style={[styles.stepperBtn, { backgroundColor: colors.accent.primary }]}
          onPress={() => setPeopleCount((p) => Math.min(99, p + 1))}
        >
          <Ionicons name="add" size={20} color={colors.accent.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Landmark */}
      <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>{t('onboarding.landmarkLabel') || 'Landmark'}</Text>
      <TextInput
        style={[styles.textInput, { backgroundColor: colors.bg.input, borderColor: colors.border.subtle, color: colors.text.primary }]}
        value={landmark}
        onChangeText={setLandmarkState}
        placeholder={t('onboarding.landmarkPlaceholder') || 'e.g. Near the temple'}
        placeholderTextColor={colors.text.tertiary}
        autoCapitalize="words"
      />

      <TouchableOpacity
        style={[styles.sendButton, { backgroundColor: colors.accent.primary }, shadows.card]}
        onPress={handleSendStatus}
        disabled={sending}
        activeOpacity={0.8}
      >
        <Ionicons name="send" size={18} color={colors.accent.onPrimary} />
        <Text style={[styles.sendButtonText, { color: colors.accent.onPrimary }]}>
          {sending ? t('common.sending') || 'Sending…' : t('status.sendStatus') || 'Send Status'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 4 },
  subtitle: { fontSize: 14, paddingHorizontal: 20, marginBottom: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8, marginTop: 16 },
  optionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  optionCard: {
    flex: 1, borderWidth: 2, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', gap: 4,
  },
  optionLabel: { fontSize: 12, fontWeight: '700' },
  peopleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16,
  },
  stepperBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  peopleCount: { fontSize: 20, fontWeight: '800', minWidth: 44, textAlign: 'center' },
  textInput: {
    marginHorizontal: 20, borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
  },
  sendButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 16, gap: 8, marginHorizontal: 20, marginTop: 24,
  },
  sendButtonText: { fontWeight: '800', fontSize: 16 },
});
