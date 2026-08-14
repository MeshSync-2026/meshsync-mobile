import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/PrimaryButton';

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const { colors, spacing, radius, typography } = useTheme();

  const [fullName, setFullName] = useState('');
  const [nic, setNic] = useState('');
  const [phone, setPhone] = useState('');
  const [landmark, setLandmark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const continueSetup = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      navigation.replace('Main');
    }, 900);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <Text style={[typography.headlineMd, { color: colors.onSurface }]}>MeshSync</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.marginMobile, paddingTop: spacing.lg, gap: spacing.lg, paddingBottom: 48 }}>
        <View>
          <Text style={[typography.headlineLgMobile, { color: colors.onSurface }]}>Let's set you up</Text>
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
            Your details help us build a local safety network. Only your name is required.
          </Text>
        </View>

        {/* Profile basics */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md, gap: spacing.md },
          ]}
        >
          <View style={styles.rowGap}>
            <MaterialIcons name="person" size={20} color={colors.onSurface} />
            <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textTransform: 'uppercase' }]}>Profile Basics</Text>
          </View>

          <Field label="Full Name" required value={fullName} onChangeText={setFullName} placeholder="John Doe" />
          <Field label="NIC Number (Optional)" value={nic} onChangeText={setNic} placeholder="000000000V" />
          <Field label="Phone Number (Optional)" value={phone} onChangeText={setPhone} placeholder="+00 00 000 0000" keyboardType="phone-pad" />
        </View>

        {/* Home location */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md, gap: spacing.md },
          ]}
        >
          <View style={styles.rowGap}>
            <MaterialIcons name="location-on" size={20} color={colors.onSurface} />
            <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textTransform: 'uppercase' }]}>Your Home Location</Text>
          </View>
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>
            Identify your location to receive relevant local alerts.
          </Text>

          <TouchableOpacity
            style={[styles.mapPlaceholder, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant, borderRadius: radius.md }]}
          >
            <MaterialIcons name="location-pin" size={36} color={colors.onSurface} />
            <TouchableOpacity style={[styles.locateBtn, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
              <MaterialIcons name="my-location" size={18} color={colors.onSurface} />
            </TouchableOpacity>
          </TouchableOpacity>

          <Field
            label="Local Landmark / Village Name"
            value={landmark}
            onChangeText={setLandmark}
            placeholder="e.g. Near the Old Banyan Tree"
          />
          <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, fontStyle: 'italic' }]}>
            Helps neighbors identify your area without precise GPS.
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <PrimaryButton label="Continue" icon="arrow-forward" onPress={continueSetup} loading={submitting} disabled={!fullName} />
          <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
            Your data is stored locally and encrypted before mesh sync.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, required, ...props }) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
        {label} {required ? <Text style={{ color: colors.onSurface, fontWeight: '700' }}>*</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={colors.onSurfaceVariant + '80'}
        style={[
          styles.input,
          { borderColor: colors.outline, backgroundColor: colors.surfaceContainer, borderRadius: radius.md, color: colors.onSurface },
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  card: { borderWidth: 1 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { height: 48, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  mapPlaceholder: { height: 140, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  locateBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
