import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../theme/ThemeContext';
import { useMeshSync } from '../context/MeshSyncContext';
import { useApp } from '../context/AppContext';
import { LANGS } from '../i18n/translations';
import { ROLE, resetAll } from '../backend/store/hotState';
import TopAppBar from '../components/TopAppBar';

const PROFILE_STORAGE_KEY = '@meshsync_profile';

const EMPTY_PROFILE = {
  fullName: '',
  homeLandmark: '',
  landmark: '',
};

export default function ProfileScreen({ navigation }) {
  const {
    colors,
    spacing,
    radius,
    typography,
    isDark,
    toggleScheme,
  } = useTheme();

  const { nodeId, isRegistered, activeRole, myEvents, relayedCount, switchRole } = useMeshSync();
  const { lang, setLang, t } = useApp();
  const [profile, setProfile] = useState(null);

  // Load the locally saved profile whenever this screen becomes active.
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const loadProfile = async () => {
        try {
          const storedProfile = await AsyncStorage.getItem(
            PROFILE_STORAGE_KEY
          );

          if (storedProfile) {
            const parsedProfile = JSON.parse(storedProfile);

            if (mounted) {
              setProfile(parsedProfile);
            }
          } else {
            if (mounted) {
              setProfile(EMPTY_PROFILE);
            }
          }
        } catch (error) {
          console.error('Failed to load profile:', error);

          if (mounted) {
            setProfile(EMPTY_PROFILE);
          }
        }
      };

      loadProfile();

      return () => {
        mounted = false;
      };
    }, [])
  );

  const resetAppData = () => {
    Alert.alert(
      t('profile.resetApp'),
      t('profile.resetConfirm'),
      [
        {
          text: t('common.no'),
          style: 'cancel',
        },
        {
          text: t('profile.resetApp'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
              await AsyncStorage.removeItem('@meshsync_responder_session');
              resetAll(); // clears role, registration, node_id, saved status/landmark

              Alert.alert(
                t('profile.resetDone'),
                t('profile.resetDoneDesc')
              );

              navigation.replace('Onboarding');
            } catch (error) {
              console.error('Failed to reset app data:', error);

              Alert.alert(
                'Error',
                'Unable to reset app data.'
              );
            }
          },
        },
      ]
    );
  };

  const handleSwitchRole = () => {
    const next = activeRole === ROLE.CIVILIAN ? ROLE.CIVILIAN_RESPONDER : ROLE.CIVILIAN;
    switchRole(next);
    Alert.alert(
      next === ROLE.CIVILIAN_RESPONDER ? t('profile.responderMode') : t('profile.civilianMode'),
      next === ROLE.CIVILIAN_RESPONDER
        ? t('profile.responderModeDesc')
        : t('profile.civilianModeDesc')
    );
  };

  const isCivilianRole = activeRole === ROLE.CIVILIAN;
  const isCivResponder = activeRole === ROLE.CIVILIAN_RESPONDER;
  const roleLabel = isRegistered
    ? t('profile.authorizedResponder')
    : isCivResponder
    ? t('profile.civilianResponder')
    : t('profile.civilian');

  // Avoid rendering profile fields before AsyncStorage finishes.
  if (!profile) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
        edges={['top']}
      >
        <TopAppBar
          title="Profile"
          rightIcon={isDark ? 'light-mode' : 'dark-mode'}
          onRightPress={toggleScheme}
        />

        <View style={styles.loadingContainer}>
          <Text
            style={[
              typography.bodyMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Onboarding collects one field: the user's name/landmark label.
  const displayName =
    profile.fullName?.trim() ||
    profile.homeLandmark?.trim() ||
    profile.landmark?.trim() ||
    t('profile.meshsyncUser');

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      edges={['top']}
    >
      <TopAppBar
        title={t('profile.title')}
        rightIcon={isDark ? 'light-mode' : 'dark-mode'}
        onRightPress={toggleScheme}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.marginMobile,
          paddingTop: spacing.sm,
          paddingBottom: 48,
          gap: spacing.lg,
        }}
      >
        {/* LANGUAGE */}
        <View
          style={[
            {
              backgroundColor: colors.surfaceContainerHigh,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
              borderWidth: 1,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MaterialIcons name="language" size={18} color={colors.onSurfaceVariant} />
            <Text style={[typography.labelLg, { color: colors.onSurface }]}>{t('profile.language')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {LANGS.map((l) => (
              <TouchableOpacity
                key={l.code}
                onPress={() => setLang(l.code)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  alignItems: 'center',
                  borderColor: lang === l.code ? colors.primary : colors.outlineVariant,
                  backgroundColor: lang === l.code ? colors.primaryContainer : colors.surfaceContainerLow,
                }}
              >
                <Text style={[typography.labelMd, { color: lang === l.code ? colors.onPrimaryContainer : colors.onSurfaceVariant }]}>
                  {l.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* PROFILE SUMMARY */}
        <View
          style={[
            styles.summary,
            {
              backgroundColor: colors.surfaceContainerHigh,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
            },
          ]}
        >
          <View style={styles.summaryLeft}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.surfaceContainerHigh,
                },
              ]}
            >
              <MaterialIcons
                name="person"
                size={36}
                color={colors.onSurfaceVariant}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.headlineLgMobile,
                  { color: colors.onSurface },
                ]}
                numberOfLines={2}
              >
                {displayName}
              </Text>
            </View>
          </View>
        </View>

        {/* ROLE SWITCH — Civilian ↔ Civilian Responder (authorized users see their badge only) */}
        {!isRegistered && (
          <View
            style={[
              styles.responderCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.outlineVariant,
                borderRadius: radius.xl,
                padding: spacing.md,
              },
            ]}
          >
            <View style={styles.rowGap}>
              <MaterialIcons
                name={isCivilianRole ? 'person' : 'pan-tool'}
                size={20}
                color={colors.primary}
              />

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.labelLg,
                    { color: colors.onSurface },
                  ]}
                >
                  {t('profile.role')}: {roleLabel}
                </Text>

                <Text
                  style={[
                    typography.bodyMd,
                    {
                      color: colors.onSurfaceVariant,
                      marginTop: 4,
                    },
                  ]}
                >
                  {isCivilianRole
                    ? t('profile.civilianModeDesc')
                    : t('profile.responderModeDesc')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.responderButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                },
              ]}
              onPress={handleSwitchRole}
            >
              <Text
                style={[
                  typography.labelLg,
                  { color: colors.onPrimary },
                ]}
              >
                {isCivilianRole ? t('profile.switchToResponder') : t('profile.switchToCivilian')}
              </Text>

              <MaterialIcons
                name="swap-horiz"
                size={18}
                color={colors.onPrimary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* RESPONDER */}
        <View
          style={[
            styles.responderCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
            },
          ]}
        >
          <View style={styles.rowGap}>
            <MaterialIcons
              name="verified-user"
              size={20}
              color={colors.primary}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.labelLg,
                  { color: colors.onSurface },
                ]}
              >
                {t('profile.authorizedResponder')}
              </Text>

              <Text
                style={[
                  typography.bodyMd,
                  {
                    color: colors.onSurfaceVariant,
                    marginTop: 4,
                  },
                ]}
              >
                {isRegistered
                  ? t('profile.authDescActive')
                  : t('profile.authDescSignIn')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.responderButton,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.md,
              },
            ]}
            onPress={() => navigation.navigate('Responder')}
          >
            <Text
              style={[
                typography.labelLg,
                { color: colors.onPrimary },
              ]}
            >
              {isRegistered ? t('profile.openDashboard') : t('profile.authenticate')}
            </Text>

            <MaterialIcons
              name="arrow-forward"
              size={18}
              color={colors.onPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* PERSONAL DETAILS */}
        <SectionLabel text={t('profile.personalDetails')} />

        <View
          style={[
            styles.listCard,
            {
              backgroundColor: colors.surfaceContainerHigh,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
            },
          ]}
        >
          <Row
            label={t('profile.nodeId')}
            value={nodeId || 'Initializing...'}
            icon="hub"
            border
          />

          <Row
            label={t('profile.nameLandmark')}
            value={displayName || profile.homeLandmark || profile.landmark || t('profile.configuredSetup')}
            icon="home"
          />
        </View>

        {/* MESH CONTRIBUTION */}
        <SectionLabel text={t('profile.meshContribution')} />

        <View
          style={[
            styles.listCard,
            {
              backgroundColor: colors.surfaceContainerHigh,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <View style={styles.rowGap}>
              <MaterialIcons
                name="volunteer-activism"
                size={20}
                color={colors.primary}
              />

              <Text
                style={[
                  typography.bodyMd,
                  { color: colors.onSurface },
                ]}
              >
                {t('profile.relayedMule')}
              </Text>
            </View>

            <Text
              style={[
                typography.headlineMd,
                { color: colors.onSurface },
              ]}
            >
              {relayedCount ?? 0}
            </Text>
          </View>
        </View>

        {/* RESET */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: spacing.lg,
          }}
        >
          <TouchableOpacity onPress={resetAppData}>
            <Text
              style={[
                typography.labelMd,
                {
                  color: colors.onSurfaceVariant,
                  opacity: 0.7,
                },
              ]}
            >
              {t('profile.resetApp')}
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 10,
              color: colors.onSurfaceVariant,
              marginTop: 4,
            }}
          >
            MeshSync v2.4.0-stable
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================
   SECTION LABEL
========================= */

function SectionLabel({ text }) {
  const { colors, typography } = useTheme();

  return (
    <Text
      style={[
        typography.labelLg,
        {
          color: colors.onSurfaceVariant,
          marginBottom: 8,
          textTransform: 'uppercase',
        },
      ]}
    >
      {text}
    </Text>
  );
}

/* =========================
   PERSONAL DETAIL ROW
========================= */

function Row({ label, value, icon, border }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.row,
        border && {
          borderBottomWidth: 1,
          borderBottomColor: colors.outlineVariant,
        },
        {
          padding: spacing.md,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[
            typography.labelMd,
            { color: colors.onSurfaceVariant },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            typography.bodyMd,
            {
              color: colors.onSurface,
              marginTop: 2,
            },
          ]}
        >
          {value}
        </Text>
      </View>

      <MaterialIcons
        name={icon}
        size={20}
        color={colors.onSurfaceVariant}
      />
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },

  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  locationCard: {
    borderWidth: 1,
  },

  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  },

  responderCard: {
    borderWidth: 1,
    gap: 16,
  },

  responderButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});