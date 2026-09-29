import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { profile } from '../../data/mockData';

const MOCK_MESHES = [
  {
    id: 'MS-001',
    name: 'Batticaloa Central',
    sos: 3,
    hazards: 2,
  },
  {
    id: 'MS-002',
    name: 'Batticaloa South',
    sos: 1,
    hazards: 4,
  },
];

export default function AssignedMeshesScreen({ navigation }) {
  const {
    colors,
    spacing,
    radius,
    typography,
    isDark,
    toggleScheme,
  } = useTheme();

  const [isOnDuty, setIsOnDuty] = useState(true);
  const [isProfileVisible, setIsProfileVisible] = useState(false);

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'bottom']}
    >
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.outlineVariant,
            paddingHorizontal: spacing.marginMobile,
          },
        ]}
      >
        <View>
          <Text
            style={[
              typography.headlineMd,
              {
                color: colors.onSurface,
              },
            ]}
          >
            Responder
          </Text>

          <Text
            style={[
              typography.bodyMd,
              {
                color: colors.onSurfaceVariant,
              },
            ]}
          >
            Assigned meshes
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* PROFILE BUTTON */}
          <Pressable
            onPress={() => setIsProfileVisible(true)}
            style={[
              styles.iconBtn,
              {
                borderColor: colors.outlineVariant,
                backgroundColor: colors.surfaceContainerLowest,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="View Profile"
          >
            <MaterialIcons
              name="account-circle"
              size={22}
              color={colors.onSurface}
            />
          </Pressable>

          {/* THEME BUTTON */}
          <Pressable
            onPress={toggleScheme}
            style={[
              styles.iconBtn,
              {
                borderColor: colors.outlineVariant,
                backgroundColor: colors.surfaceContainerLowest,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
          >
            <MaterialIcons
              name={isDark ? 'light-mode' : 'dark-mode'}
              size={22}
              color={colors.onSurface}
            />
          </Pressable>

          {/* DUTY STATUS */}
          <Pressable
            onPress={() => setIsOnDuty((current) => !current)}
            style={({ pressed }) => [
              styles.statusBadge,
              {
                backgroundColor: isOnDuty
                  ? colors.onSurface
                  : colors.surfaceContainer,
                borderColor: colors.outlineVariant,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isOnDuty
                    ? colors.background
                    : colors.onSurfaceVariant,
                },
              ]}
            />

            <Text
              style={[
                typography.labelMd,
                {
                  color: isOnDuty
                    ? colors.background
                    : colors.onSurface,
                },
              ]}
            >
              {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.marginMobile,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
      >
        {/* TITLE */}
        <View style={{ gap: spacing.xs }}>
          <Text
            style={[
              typography.headlineLgMobile,
              {
                color: colors.onSurface,
              },
            ]}
          >
            {isOnDuty ? 'Your active meshes' : 'You are off duty'}
          </Text>

          <Text
            style={[
              typography.bodyMd,
              {
                color: colors.onSurfaceVariant,
              },
            ]}
          >
            {isOnDuty
              ? 'Select a mesh to view the incidents assigned to you.'
              : 'Turn on duty status to receive and manage assigned incidents.'}
          </Text>
        </View>

        {/* OFF DUTY MESSAGE */}
        {!isOnDuty && (
          <View
            style={[
              styles.offDutyCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.outlineVariant,
                borderRadius: radius.xl,
                padding: spacing.md,
              },
            ]}
          >
            <MaterialIcons
              name="pause-circle-outline"
              size={24}
              color={colors.onSurface}
            />

            <View
              style={{
                flex: 1,
                gap: spacing.xs,
              }}
            >
              <Text
                style={[
                  typography.titleLg,
                  {
                    color: colors.onSurface,
                  },
                ]}
              >
                Not receiving incidents
              </Text>

              <Text
                style={[
                  typography.bodyMd,
                  {
                    color: colors.onSurfaceVariant,
                  },
                ]}
              >
                You are currently off duty. Turn on duty to access and
                manage incidents assigned to your meshes.
              </Text>
            </View>
          </View>
        )}

        {/* MESHES */}
        {MOCK_MESHES.map((mesh) => (
          <Pressable
            key={mesh.id}
            disabled={!isOnDuty}
            onPress={() => {
              if (!isOnDuty) return;

              navigation.navigate('IncidentList', {
                mesh,
              });
            }}
            style={({ pressed }) => [
              styles.meshCard,
              {
                backgroundColor: colors.surfaceContainerLowest,
                borderColor: colors.outlineVariant,
                borderRadius: radius.xl,
                padding: spacing.md,

                opacity: !isOnDuty
                  ? 0.45
                  : pressed
                    ? 0.75
                    : 1,
              },
            ]}
          >
            {/* MESH HEADER */}
            <View style={styles.meshHeader}>
              <View
                style={{
                  flex: 1,
                  gap: spacing.xs,
                }}
              >
                <Text
                  style={[
                    typography.titleLg,
                    {
                      color: colors.onSurface,
                    },
                  ]}
                >
                  {mesh.name}
                </Text>

                <Text
                  style={[
                    typography.labelMd,
                    {
                      color: colors.onSurfaceVariant,
                    },
                  ]}
                >
                  Mesh {mesh.id}
                </Text>
              </View>

              <MaterialIcons
                name="chevron-right"
                size={28}
                color={colors.onSurface}
              />
            </View>

            {/* DIVIDER */}
            <View
              style={[
                styles.divider,
                {
                  backgroundColor: colors.outlineVariant,
                },
              ]}
            />

            {/* STATS */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text
                  style={[
                    typography.headlineMd,
                    {
                      color: colors.onSurface,
                    },
                  ]}
                >
                  {mesh.sos}
                </Text>

                <Text
                  style={[
                    typography.labelMd,
                    {
                      color: colors.onSurfaceVariant,
                    },
                  ]}
                >
                  SOS
                </Text>
              </View>

              <View style={styles.stat}>
                <Text
                  style={[
                    typography.headlineMd,
                    {
                      color: colors.onSurface,
                    },
                  ]}
                >
                  {mesh.hazards}
                </Text>

                <Text
                  style={[
                    typography.labelMd,
                    {
                      color: colors.onSurfaceVariant,
                    },
                  ]}
                >
                  Hazards
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* PROFILE MODAL */}
      <Modal
        visible={isProfileVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surfaceContainerLow,
                borderColor: colors.outlineVariant,
                borderRadius: radius.xl,
              },
            ]}
          >
            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <MaterialIcons
                  name="badge"
                  size={22}
                  color={colors.primary}
                />

                <Text
                  style={[
                    typography.headlineMd,
                    {
                      color: colors.onSurface,
                    },
                  ]}
                >
                  Responder Profile
                </Text>
              </View>

              <Pressable
                onPress={() => setIsProfileVisible(false)}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            {/* PROFILE SUMMARY */}
            <View style={styles.modalInfoSummary}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                <MaterialIcons
                  name="person"
                  size={32}
                  color={colors.onSurfaceVariant}
                />
              </View>

              <View>
                <Text
                  style={[
                    typography.headlineLgMobile,
                    {
                      color: colors.onSurface,
                    },
                  ]}
                >
                  {profile.name}
                </Text>

                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.labelMd,
                      {
                        color: colors.onPrimary,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    AUTHORIZED RESPONDER
                  </Text>
                </View>
              </View>
            </View>

            {/* PROFILE DETAILS */}
            <View
              style={[
                styles.detailsSection,
                {
                  borderColor: colors.outlineVariant,
                },
              ]}
            >
              <View style={styles.detailRow}>
                <MaterialIcons
                  name="person-outline"
                  size={18}
                  color={colors.onSurfaceVariant}
                  style={styles.detailIcon}
                />

                <View>
                  <Text
                    style={[
                      typography.labelMd,
                      {
                        color: colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    Full Name
                  </Text>

                  <Text
                    style={[
                      typography.bodyMd,
                      {
                        color: colors.onSurface,
                      },
                    ]}
                  >
                    {profile.fullName}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons
                  name="credit-card"
                  size={18}
                  color={colors.onSurfaceVariant}
                  style={styles.detailIcon}
                />

                <View>
                  <Text
                    style={[
                      typography.labelMd,
                      {
                        color: colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    NIC Number
                  </Text>

                  <Text
                    style={[
                      typography.bodyMd,
                      {
                        color: colors.onSurface,
                      },
                    ]}
                  >
                    {profile.nic}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons
                  name="phone"
                  size={18}
                  color={colors.onSurfaceVariant}
                  style={styles.detailIcon}
                />

                <View>
                  <Text
                    style={[
                      typography.labelMd,
                      {
                        color: colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    Phone Number
                  </Text>

                  <Text
                    style={[
                      typography.bodyMd,
                      {
                        color: colors.onSurface,
                      },
                    ]}
                  >
                    {profile.phone}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons
                  name="home"
                  size={18}
                  color={colors.onSurfaceVariant}
                  style={styles.detailIcon}
                />

                <View>
                  <Text
                    style={[
                      typography.labelMd,
                      {
                        color: colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    Saved Home
                  </Text>

                  <Text
                    style={[
                      typography.bodyMd,
                      {
                        color: colors.onSurface,
                      },
                    ]}
                  >
                    {profile.homeLocation}
                  </Text>
                </View>
              </View>
            </View>

            {/* ACTIONS */}
            <View style={styles.actionSection}>
              <Text
                style={[
                  typography.bodyMd,
                  {
                    color: colors.onSurfaceVariant,
                    textAlign: 'center',
                    marginBottom: 12,
                  },
                ]}
              >
                Switch to Citizen (Civilian) role to view local hazard
                reports and request community assistance.
              </Text>

              {/* SWITCH TO CITIZEN */}
              <Pressable
                onPress={() => {
                  setIsProfileVisible(false);
                  navigation.getParent()?.navigate('Main');
                }}
                style={({ pressed }) => [
                  styles.switchRoleBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Switch role to Citizen"
              >
                <MaterialIcons
                  name="swap-horiz"
                  size={20}
                  color={colors.onPrimary}
                />

                <Text
                  style={[
                    typography.labelLg,
                    {
                      color: colors.onPrimary,
                    },
                  ]}
                >
                  Switch to Citizen Mode
                </Text>
              </Pressable>

              {/* LOG OUT */}
              <Pressable
                onPress={() => {
                  setIsProfileVisible(false);

                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'ResponderLogin' }],
                  });
                }}
                style={({ pressed }) => [
                  styles.switchRoleBtn,
                  {
                    backgroundColor: colors.error,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.9 : 1,
                    marginTop: 12,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Log out of Responder account"
              >
                <MaterialIcons
                  name="logout"
                  size={20}
                  color={colors.onError}
                />

                <Text
                  style={[
                    typography.labelLg,
                    {
                      color: colors.onError,
                    },
                  ]}
                >
                  Log Out (End of Shift)
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 20,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  offDutyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
  },

  meshCard: {
    borderWidth: 1,
  },

  meshHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  divider: {
    height: 1,
    marginVertical: 16,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 40,
  },

  stat: {
    gap: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },

  modalInfoSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },

  detailsSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 12,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  detailIcon: {
    width: 24,
  },

  actionSection: {
    alignItems: 'center',
  },

  switchRoleBtn: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});