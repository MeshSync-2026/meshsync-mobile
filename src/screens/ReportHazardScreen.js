import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useMeshSync } from '../context/MeshSyncContext';
import { HAZARD_CATEGORY, SEVERITY } from '../backend/shared/enums';
import TopAppBar from '../components/TopAppBar';
import PrimaryButton from '../components/PrimaryButton';
import { hazardCategories } from '../data/mockData';

const SEVERITIES = ['Low', 'Medium', 'High'];

const CATEGORY_MAP = {
  flood: HAZARD_CATEGORY.FLOOD,
  landslide: HAZARD_CATEGORY.LANDSLIDE,
  storm: HAZARD_CATEGORY.STORM,
  fire: HAZARD_CATEGORY.FIRE,
  medical: HAZARD_CATEGORY.MEDICAL,
  damage: HAZARD_CATEGORY.STRUCTURAL,
  road: HAZARD_CATEGORY.STRUCTURAL,
  other: HAZARD_CATEGORY.NONE,
};

const SEVERITY_MAP = {
  Low: SEVERITY.LOW,
  Medium: SEVERITY.MEDIUM,
  High: SEVERITY.HIGH,
};

export default function ReportHazardScreen() {
  const navigation = useNavigation();
  const { colors, spacing, radius, typography, isDark } = useTheme();
  const { reportHazard, isOnline, userProfile } = useMeshSync();

  const [category, setCategory] = useState(null);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!category) {
      Alert.alert('Select a category', 'Please choose a hazard category before sending.');
      return;
    }
    setIsSubmitting(true);
    try {
      const categoryCode = CATEGORY_MAP[category] ?? HAZARD_CATEGORY.NONE;
      const severityLevel = SEVERITY_MAP[severity] ?? SEVERITY.MEDIUM;

      const result = await reportHazard({
        categoryCode,
        title: title.trim() || undefined,
        details: details.trim() || undefined,
        severityLevel,
        landmarkName: locationTag.trim() || undefined,
      });

      if (result.success) {
        Alert.alert('Report Broadcasted', 'Your hazard report has been added to the mesh network.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <TopAppBar title="Report a Hazard" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.marginMobile, paddingTop: spacing.md, paddingBottom: 140 }}>
        <View style={[styles.offlineBanner, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.md, marginBottom: spacing.lg }]}>
          <MaterialIcons name={isOnline ? "cloud-done" : "cloud-off"} size={18} color={colors.onSurface} />
          <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>
            {isOnline ? "Online • Mesh Active" : "Offline • Mesh Active"}
          </Text>
        </View>

        <View style={{ marginBottom: spacing.xl }}>
          <View style={styles.rowBetween}>
            <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>Select Category</Text>
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Mandatory</Text>
          </View>
          <View style={[styles.grid, { marginTop: spacing.md, gap: spacing.sm }]}>
            {hazardCategories.map((cat) => {
              const active = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: active
                        ? (isDark ? '#1C2E3D' : '#E0F2FE')
                        : colors.surfaceContainerHigh,
                      borderColor: active ? colors.primary : colors.outlineVariant,
                      borderWidth: active ? 2 : 1,
                      borderRadius: radius.xl,
                      padding: spacing.md,
                      position: 'relative',
                    },
                  ]}
                >
                  {active && (
                    <View style={styles.categoryCheckBadge}>
                      <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                    </View>
                  )}
                  <MaterialIcons
                    name={cat.icon}
                    size={28}
                    color={active ? colors.primary : colors.onSurface}
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={[typography.labelLg, { color: colors.onSurface, fontWeight: active ? '700' : '400' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.locationNote, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.md, marginBottom: spacing.xl }]}>
          <MaterialIcons name="my-location" size={20} color={colors.onSurface} />
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
            Your high-precision location will be captured automatically via GPS/Mesh relay.
          </Text>
        </View>

        <View style={{ gap: spacing.lg, marginBottom: spacing.xl }}>
          <Field
            label="Location Name / Landmark (Optional)"
            value={locationTag}
            onChangeText={setLocationTag}
            placeholder="e.g. Near River Bridge, Main Street Junction"
          />
          <Field
            label="Short Title (Optional)"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Broken power line near park"
          />
          <Field
            label="Details (Optional)"
            value={details}
            onChangeText={setDetails}
            placeholder="Provide extra context for emergency responders..."
            multiline
          />
        </View>

        <View style={{ marginBottom: spacing.xl }}>
          <Text style={[typography.labelLg, { color: colors.onSurface, marginBottom: spacing.md }]}>Severity Level</Text>
          <View style={[styles.severityTrack, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: 4 }]}>
            {SEVERITIES.map((level) => {
              const active = severity === level;
              return (
                <TouchableOpacity
                  key={level}
                  onPress={() => setSeverity(level)}
                  style={[styles.severityBtn, { borderRadius: radius.md, backgroundColor: active ? (isDark ? colors.surfaceContainerHighest : '#FFFFFF') : 'transparent' }]}
                >
                  <Text style={[typography.labelLg, { color: colors.onSurface, fontWeight: active ? '700' : '400' }]}>{level}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actionArea, { paddingHorizontal: spacing.marginMobile, backgroundColor: colors.background }]}>
        <PrimaryButton label="Send Report" icon="send" onPress={submit} />
      </View>
    </SafeAreaView>
  );
}

function Field({ label, ...props }) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[typography.labelLg, { color: colors.onSurface }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.onSurfaceVariant + '80'}
        style={[
          styles.input,
          {
            borderColor: colors.outlineVariant,
            backgroundColor: colors.surfaceContainerHigh,
            borderRadius: radius.md,
            color: colors.onSurface,
            height: props.multiline ? 100 : 48,
            textAlignVertical: props.multiline ? 'top' : 'center',
          },
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, padding: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { width: '48%', borderWidth: 1, marginBottom: 8 },
  categoryCheckBadge: { position: 'absolute', top: 10, right: 10 },
  locationNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, padding: 16 },
  severityTrack: { flexDirection: 'row', borderWidth: 1 },
  severityBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  input: { borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  actionArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 16, paddingBottom: 32 },
});
