// Onboarding — Step 0: language, Step 1: location + landmark, Step 2: role
// Ported from the New Test design: no NIC/phone/fullName — only what the
// mesh actually uses (landmark + role). Authorized responders continue to
// the Command Center login screen.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useApp } from '../context/AppContext';
import { LANGS } from '../i18n/translations';
import { setLandmark, setActiveRole, ROLE } from '../backend/store/hotState';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_STORAGE_KEY = '@meshsync_profile';

export default function OnboardingScreen({ navigation }) {
  const { colors, spacing, t, lang, setLang } = useApp();
  const [step, setStep] = useState('lang');
  const [location, setLocation] = useState(null);
  const [landmark, setLandmarkText] = useState('');
  const [locating, setLocating] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const handleGetLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('onboarding.locationRequired'), 'Location permission is required to receive nearby alerts.');
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setLocation(pos.coords);
    } catch (err) {
      Alert.alert('Location Error', err?.message || 'Could not get current location.');
    } finally {
      setLocating(false);
    }
  };

  const handleLocationContinue = () => {
    if (!location) {
      Alert.alert(t('onboarding.locationRequired'), t('onboarding.locationRequiredDesc'));
      return;
    }
    if (!landmark.trim()) {
      Alert.alert(t('onboarding.landmarkRequired'), t('onboarding.landmarkRequiredDesc'));
      return;
    }
    setLandmark(landmark.trim());
    setStep('role');
  };

  const finishOnboarding = (role) => {
    setActiveRole(role);
    const profile = {
      name: landmark.trim() || 'MeshSync User',
      fullName: landmark.trim() || 'MeshSync User',
      landmark: landmark.trim(),
      homeLandmark: landmark.trim(),
      role,
    };
    AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
    Alert.alert(t('onboarding.setupComplete'), t('onboarding.setupCompleteDesc'), [{ text: 'OK' }]);
  };

  // ─── Step 0: Language ───
  if (step === 'lang') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Text style={[styles.title, { color: colors.text.primary }]}>{t('onboarding.welcome')}</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{t('onboarding.subtitle')}</Text>

        <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>{t('profile.language')}</Text>
        {LANGS.map((l) => (
          <TouchableOpacity
            key={l.code}
            style={[
              styles.langCard,
              { backgroundColor: colors.bg.secondary, borderColor: lang === l.code ? colors.accent.primary : colors.border.subtle },
            ]}
            onPress={() => setLang(l.code)}
            activeOpacity={0.7}
          >
            <View style={[styles.langBadge, { backgroundColor: colors.accent.primary }]}>
              <Text style={[styles.langBadgeText, { color: colors.accent.onPrimary }]}>{l.label}</Text>
            </View>
            <Text style={[styles.langName, { color: colors.text.primary }]}>{l.name}</Text>
            {lang === l.code && <Ionicons name="checkmark-circle" size={22} color={colors.accent.primary} />}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.accent.primary }]}
          onPress={() => setStep('location')}
          activeOpacity={0.8}
        >
          <Text style={[styles.continueText, { color: colors.accent.onPrimary }]}>{t('common.continue')}</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.accent.onPrimary} />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Step 1: Location + landmark ───
  if (step === 'location') {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg.primary }]}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text.primary }]}>{t('onboarding.locationTitle')}</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{t('onboarding.locationSubtitle')}</Text>

        <View style={[styles.mapPlaceholder, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
          <Animated.View style={[styles.pulseRing, { borderColor: colors.accent.primary, transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.pinContainer}>
            <Ionicons name="location" size={48} color={colors.accent.primary} />
          </View>

          <TouchableOpacity
            style={[styles.myLocationButton, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
            onPress={handleGetLocation}
            disabled={locating}
          >
            <Ionicons name={locating ? 'sync-circle-outline' : 'locate'} size={20} color={colors.accent.primary} />
            <Text style={[styles.myLocationText, { color: colors.accent.primary }]}>
              {locating ? t('onboarding.locating') : t('onboarding.myLocation')}
            </Text>
          </TouchableOpacity>
        </View>

        {location && (
          <Text style={[styles.locationStatus, { color: colors.status.success }]}>
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        )}

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text.primary }]}>{t('onboarding.landmarkLabel')}</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.bg.input, borderColor: colors.border.subtle, color: colors.text.primary }]}
            value={landmark}
            onChangeText={setLandmarkText}
            placeholder={t('onboarding.landmarkPlaceholder')}
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.accent.primary }]}
          onPress={handleLocationContinue}
          activeOpacity={0.8}
        >
          <Text style={[styles.continueText, { color: colors.accent.onPrimary }]}>{t('common.continue')}</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.accent.onPrimary} />
        </TouchableOpacity>

        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.text.tertiary} />
          <Text style={[styles.privacyText, { color: colors.text.tertiary }]}>{t('onboarding.privacyNote')}</Text>
        </View>
      </ScrollView>
    );
  }

  // ─── Step 2: Role selection ───
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text.primary }]}>{t('role.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{t('role.subtitle')}</Text>

      <TouchableOpacity
        style={[styles.roleCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
        onPress={() => finishOnboarding(ROLE.CIVILIAN)}
        activeOpacity={0.7}
      >
        <View style={[styles.roleIconWrap, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
          <Ionicons name="person" size={28} color={colors.accent.primary} />
        </View>
        <View style={styles.roleTextWrap}>
          <Text style={[styles.roleTitle, { color: colors.text.primary }]}>{t('role.civilian')}</Text>
          <Text style={[styles.roleDesc, { color: colors.text.secondary }]}>{t('role.civilianDesc')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.roleCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
        onPress={() => finishOnboarding(ROLE.CIVILIAN_RESPONDER)}
        activeOpacity={0.7}
      >
        <View style={[styles.roleIconWrap, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
          <Ionicons name="hand-right" size={28} color={colors.accent.primary} />
        </View>
        <View style={styles.roleTextWrap}>
          <Text style={[styles.roleTitle, { color: colors.text.primary }]}>{t('role.responder')}</Text>
          <Text style={[styles.roleDesc, { color: colors.text.secondary }]}>{t('role.responderDesc')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.roleCard, styles.roleCardAuthorized, { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('ResponderLogin')}
        activeOpacity={0.7}
      >
        <View style={[styles.roleIconWrap, styles.roleIconWrapAuthorized, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="shield-checkmark" size={28} color={colors.accent.onPrimary} />
        </View>
        <View style={styles.roleTextWrap}>
          <Text style={[styles.roleTitle, { color: colors.accent.onPrimary }]}>{t('role.authorized')}</Text>
          <Text style={[styles.roleDesc, { color: colors.accent.onPrimary }]}>{t('role.authorizedDesc')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.accent.onPrimary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  langCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 2,
    padding: 16, marginBottom: 12, gap: 12,
  },
  langBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  langBadgeText: { fontWeight: '800', fontSize: 13 },
  langName: { fontSize: 16, fontWeight: '600', flex: 1 },
  continueButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 16, gap: 8, marginTop: 16,
  },
  continueText: { fontWeight: '800', fontSize: 16 },
  mapPlaceholder: {
    height: 220, borderRadius: 20, borderWidth: 1, alignItems: 'center',
    justifyContent: 'center', marginBottom: 20, overflow: 'hidden',
  },
  pulseRing: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, position: 'absolute' },
  pinContainer: { alignItems: 'center', justifyContent: 'center' },
  myLocationButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16,
    paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: 12,
  },
  myLocationText: { fontWeight: '700', fontSize: 14 },
  locationStatus: { fontSize: 13, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  inputGroup: { marginBottom: 8 },
  inputLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  textInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  privacyText: { fontSize: 12, flex: 1, lineHeight: 18 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1,
    padding: 16, marginBottom: 12, gap: 12,
  },
  roleCardAuthorized: { borderWidth: 2 },
  roleIconWrap: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  roleIconWrapAuthorized: { borderWidth: 0 },
  roleTextWrap: { flex: 1 },
  roleTitle: { fontSize: 16, fontWeight: '700' },
  roleDesc: { fontSize: 13, lineHeight: 18, marginTop: 2 },
});
