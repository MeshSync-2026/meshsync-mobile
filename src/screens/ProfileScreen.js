import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../theme/ThemeContext';
import { useMeshSync } from '../context/MeshSyncContext';
import { ROLE } from '../backend/store/hotState';
import TopAppBar from '../components/TopAppBar';
import { profile as mockProfile } from '../data/mockData';

const PROFILE_STORAGE_KEY = '@meshsync_profile';

export default function ProfileScreen({ navigation }) {
  const {
    colors,
    spacing,
    radius,
    typography,
    isDark,
    toggleScheme,
  } = useTheme();

  const { nodeId, isRegistered, activeRole, myEvents } = useMeshSync();
  const [profile, setProfile] = useState(null);
  const [relayAuto, setRelayAuto] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);

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
            // Temporary fallback for users who haven't completed onboarding.
            if (mounted) {
              setProfile(mockProfile);
            }
          }
        } catch (error) {
          console.error('Failed to load profile:', error);

          if (mounted) {
            setProfile(mockProfile);
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
      'Reset App Data',
      'This will erase all local data on this device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);

              Alert.alert(
                'Data Reset',
                'Your local profile has been removed.'
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

  /*
   * Values saved during onboarding:
   *
   * profile.fullName
   * profile.nic
   * profile.phone
   *
   * These are now used instead of hardcoded Nuwan Perera data.
   */

  const displayName =
    profile.fullName?.trim() || 'MeshSync User';

  const nic =
    profile.nic?.trim() || 'Not provided';

  const phone =
    profile.phone?.trim() || 'Not provided';

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.marginMobile,
          paddingTop: spacing.sm,
          paddingBottom: 48,
          gap: spacing.lg,
        }}
      >
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

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.surfaceContainer,
              },
            ]}
          >
            <MaterialIcons
              name="edit"
              size={20}
              color={colors.onSurface}
            />
          </TouchableOpacity>
        </View>

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
                Authorized Responder
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
                  ? 'Active responder session. Access assigned disaster zones and incident navigation.'
                  : 'Sign in to access assigned meshes and offline maps.'}
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
              {isRegistered ? 'Open Responder Dashboard' : 'Authenticate as Responder'}
            </Text>

            <MaterialIcons
              name="arrow-forward"
              size={18}
              color={colors.onPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* PERSONAL DETAILS */}
        <SectionLabel text="Personal Details" />

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
            label="Mesh Node ID"
            value={nodeId || 'Initializing...'}
            icon="hub"
            border
          />

          <Row
            label="Full Name"
            value={displayName}
            icon="chevron-right"
            border
          />

          <Row
            label="NIC Number"
            value={nic}
            icon="lock"
            border
          />

          <Row
            label="Phone Number"
            value={phone}
            icon="chevron-right"
          />
        </View>

        {/* HOME LOCATION */}
        <View style={{ gap: spacing.md }}>
          <SectionLabel text="Home Location" />

          <View
            style={[
              styles.locationCard,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.outlineVariant,
                borderRadius: radius.xl,
                padding: spacing.md,
              },
            ]}
          >
            <View style={styles.rowGap}>
              <MaterialIcons
                name="home"
                size={18}
                color={colors.onSurface}
              />

              <Text
                style={[
                  typography.labelLg,
                  { color: colors.onSurface },
                ]}
              >
                Saved Home
              </Text>
            </View>

            <Text
              style={[
                typography.bodyMd,
                {
                  color: colors.onSurface,
                  marginTop: 8,
                },
              ]}
            >
              Location not yet saved
            </Text>

            <TouchableOpacity style={styles.linkRow}>
              <Text
                style={[
                  typography.labelLg,
                  { color: colors.primary },
                ]}
              >
                Add Location
              </Text>

              <MaterialIcons
                name="open-in-new"
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* TEMPORARY LOCATION */}
          <SectionLabel text="Temporary Location" />

          <View
            style={[
              styles.locationCard,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.outlineVariant,
                borderRadius: radius.xl,
                padding: spacing.md,
              },
            ]}
          >
            <View style={styles.rowGap}>
              <MaterialIcons
                name="location-on"
                size={18}
                color={colors.onSurface}
              />

              <Text
                style={[
                  typography.labelLg,
                  { color: colors.onSurface },
                ]}
              >
                Current Status
              </Text>
            </View>

            <View
              style={[
                styles.chip,
                {
                  borderColor: colors.outlineVariant,
                  backgroundColor: colors.surfaceContainer,
                },
              ]}
            >
              <Text
                style={[
                  typography.labelMd,
                  { color: colors.onSurface },
                ]}
              >
                At Home
              </Text>
            </View>

            <Text
              style={[
                typography.bodyMd,
                {
                  color: colors.onSurfaceVariant,
                  marginTop: 8,
                },
              ]}
            >
              Location status will be updated automatically.
            </Text>

            <TouchableOpacity style={styles.linkRow}>
              <Text
                style={[
                  typography.labelLg,
                  { color: colors.primary },
                ]}
              >
                Manage
              </Text>

              <MaterialIcons
                name="near-me"
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* DATA SHARING */}
        <SectionLabel text="Data Sharing" />

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
          <ToggleRow
            label="Relay mesh data automatically when I have internet"
            value={relayAuto}
            onValueChange={setRelayAuto}
            border
          />

          <ToggleRow
            label="Only relay over Wi-Fi (not mobile data)"
            value={wifiOnly}
            onValueChange={setWifiOnly}
            border
          />

          <Text
            style={[
              typography.labelMd,
              {
                color: colors.onSurfaceVariant,
                opacity: 0.7,
                padding: spacing.md,
                lineHeight: 18,
              },
            ]}
          >
            When your device reconnects, it may upload reports
            from nearby mesh devices, not just your own, to help
            reach authorities faster.
          </Text>
        </View>

        {/* MESH CONTRIBUTION */}
        <SectionLabel text="Mesh Contribution" />

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
                Reports relayed as data mule
              </Text>
            </View>

            <Text
              style={[
                typography.headlineMd,
                { color: colors.onSurface },
              ]}
            >
              {mockProfile.dataMuleReports}
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
              Reset App Data
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
   TOGGLE ROW
========================= */

function ToggleRow({
  label,
  value,
  onValueChange,
  border,
}) {
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
      <Text
        style={[
          typography.bodyMd,
          {
            color: colors.onSurface,
            flex: 1,
            marginRight: 12,
            lineHeight: 22,
          },
        ]}
      >
        {label}
      </Text>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          true: '#5ED9D9',
          false: colors.surfaceContainerLowest,
        }}
        thumbColor={
          value ? '#0B1D1E' : '#EAEAEA'
        }
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