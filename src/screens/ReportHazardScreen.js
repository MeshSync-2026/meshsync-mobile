import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import TopAppBar from '../components/TopAppBar';
import PrimaryButton from '../components/PrimaryButton';
import { hazardCategories } from '../data/mockData';

const SEVERITIES = ['Low', 'Medium', 'High'];

export default function ReportHazardScreen() {
  const navigation = useNavigation();
  const { colors, spacing, radius, typography } = useTheme();

  const [category, setCategory] = useState(null);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [severity, setSeverity] = useState('Medium');

  const submit = () => {
    if (!category) {
      Alert.alert('Select a category', 'Please choose a hazard category before sending.');
      return;
    }
    Alert.alert('Report queued', 'Your report will sync as soon as a mesh peer is in range.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <TopAppBar title="Report a Hazard" onSettingsPress={() => {}} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.marginMobile, paddingTop: spacing.md, paddingBottom: 140 }}>
        {/* Offline banner */}
        <View
          style={[
            styles.offlineBanner,
            { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outlineVariant, borderRadius: radius.md, marginBottom: spacing.lg },
          ]}
        >
          <MaterialIcons name="cloud-off" size={20} color={colors.onSurface} />
          <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>Offline - Mesh Active</Text>
        </View>

        {/* Category grid */}
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
                      backgroundColor: active ? colors.ink : colors.surfaceContainerLowest,
                      borderColor: active ? colors.ink : colors.outlineVariant,
                      borderRadius: radius.xl,
                      padding: spacing.md,
                    },
                  ]}
                >
                  <MaterialIcons name={cat.icon} size={30} color={active ? colors.onInk : colors.onSurface} style={{ marginBottom: 8 }} />
                  <Text style={[typography.labelLg, { color: active ? colors.onInk : colors.onSurface }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Location note */}
        <View
          style={[
            styles.locationNote,
            { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant, borderRadius: radius.md, marginBottom: spacing.xl },
          ]}
        >
          <MaterialIcons name="my-location" size={20} color={colors.onSurface} />
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, flex: 1 }]}>
            Your high-precision location will be captured automatically via GPS/Mesh relay.
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: spacing.lg, marginBottom: spacing.xl }}>
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

        {/* Severity */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={[typography.labelLg, { color: colors.onSurface, marginBottom: spacing.md }]}>Severity Level</Text>
          <View
            style={[
              styles.severityTrack,
              { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: 4 },
            ]}
          >
            {SEVERITIES.map((level) => {
              const active = severity === level;
              return (
                <TouchableOpacity
                  key={level}
                  onPress={() => setSeverity(level)}
                  style={[styles.severityBtn, { borderRadius: radius.md, backgroundColor: active ? colors.surfaceContainerLowest : 'transparent' }]}
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
        placeholderTextColor={colors.outline}
        style={[
          styles.input,
          {
            borderColor: colors.outlineVariant,
            backgroundColor: colors.surfaceContainerLowest,
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
  locationNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, padding: 16 },
  severityTrack: { flexDirection: 'row', borderWidth: 1 },
  severityBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  input: { borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  actionArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 16, paddingBottom: 32 },
});
