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
        <TouchableOpacity activeOpacity={0.8} style={styles.headerAction}>
          <MaterialIcons name="settings" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.marginMobile,
          paddingTop: spacing.lg,
          paddingBottom: 52,
          gap: spacing.lg,
        }}
      >
        <View>
          <Text style={[typography.headlineLgMobile, { color: colors.onSurface, fontSize: 38, lineHeight: 44 }]}>Let's set you up</Text>
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: 6 }] }>
            Your details help us build a local safety network.
            {'\n'}Only your name is required.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md, gap: spacing.md }]}>
          <View style={styles.rowGap}>
            <MaterialIcons name="person" size={20} color={colors.onSurface} />
            <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textTransform: 'uppercase' }]}>Profile Basics</Text>
          </View>

          <Field label="Full Name" required value={fullName} onChangeText={setFullName} placeholder="John Doe" />
          <Field label="NIC Number (Optional)" value={nic} onChangeText={setNic} placeholder="000000000V" />
          <Field label="Phone Number (Optional)" value={phone} onChangeText={setPhone} placeholder="+00 00 000 0000" keyboardType="phone-pad" />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md, gap: spacing.md }]}>
          <View style={styles.rowGap}>
            <MaterialIcons name="location-on" size={20} color={colors.onSurface} />
            <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textTransform: 'uppercase' }]}>Your Home Location</Text>
          </View>

          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>Your home location is your current location and is fetched automatically to receive relevant local alerts.</Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <PrimaryButton
            label="Continue"
            icon="arrow-forward"
            onPress={continueSetup}
            loading={submitting}
            buttonColor="#FFFFFF"
            textColor="#111827"
            iconColor="#111827"
            style={{
              width: '100%',
              alignSelf: 'center',
              shadowOpacity: 0.12,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          />
          <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 }]}>
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
        {label}
        {required ? <Text style={{ color: colors.onSurface, fontWeight: '700' }}> *</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={colors.onSurfaceVariant + '80'}
        style={[
          styles.input,
          {
            borderColor: colors.outlineVariant,
            backgroundColor: colors.surfaceContainerHighest,
            borderRadius: radius.md,
            color: colors.onSurface,
          },
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerAction: {
    position: 'absolute',
    right: 20,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderWidth: 1 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
});
