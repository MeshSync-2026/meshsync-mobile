import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

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
  const { colors, spacing, radius, typography } = useTheme();

  // Responder duty state
  const [isOnDuty, setIsOnDuty] = useState(true);

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
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.outlineVariant,
            paddingHorizontal: spacing.marginMobile,
          },
        ]}
      >
        {/* Header title */}
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

        {/* Active Duty Toggle */}
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

      {/* Main content */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.marginMobile,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
      >
        {/* Page title */}
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

        {/* Off-duty information */}
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
                You are currently off duty. Turn on duty to access and manage
                incidents assigned to your meshes.
              </Text>
            </View>
          </View>
        )}

        {/* Mesh cards */}
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

                // Disabled when off duty
                opacity: !isOnDuty
                  ? 0.45
                  : pressed
                    ? 0.75
                    : 1,
              },
            ]}
          >
            {/* Mesh header */}
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

            {/* Divider */}
            <View
              style={[
                styles.divider,
                {
                  backgroundColor: colors.outlineVariant,
                },
              ]}
            />

            {/* Mesh statistics */}
            <View style={styles.statsRow}>
              {/* SOS */}
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

              {/* Hazards */}
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
});