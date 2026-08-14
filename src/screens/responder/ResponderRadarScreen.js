import React from 'react';
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

const RADAR_SIZE = 280;

export default function ResponderRadarScreen({ route, navigation }) {
  const { incident, mesh } = route.params;
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
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
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={colors.onSurface}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.titleLg,
              { color: colors.onSurface },
            ]}
          >
            Responder Radar
          </Text>

          <Text
            style={[
              typography.labelMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            {mesh.name} · {incident.id}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.marginMobile,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
      >
        {/* Incident summary */}
        <View style={{ gap: spacing.xs }}>
          <Text
            style={[
              typography.headlineLgMobile,
              { color: colors.onSurface },
            ]}
          >
            Navigate to incident
          </Text>

          <Text
            style={[
              typography.bodyMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            Follow the relative direction shown below.
          </Text>
        </View>

        {/* Radar */}
        <View
          style={[
            styles.radarCard,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
            },
          ]}
        >
          <View
            style={[
              styles.radar,
              {
                width: RADAR_SIZE,
                height: RADAR_SIZE,
              },
            ]}
          >
            {/* Rings */}
            <View
              style={[
                styles.ring,
                {
                  width: RADAR_SIZE,
                  height: RADAR_SIZE,
                  borderRadius: RADAR_SIZE / 2,
                  borderColor: colors.outlineVariant,
                },
              ]}
            />

            <View
              style={[
                styles.ring,
                {
                  width: RADAR_SIZE * 0.66,
                  height: RADAR_SIZE * 0.66,
                  borderRadius: (RADAR_SIZE * 0.66) / 2,
                  borderColor: colors.outlineVariant,
                },
              ]}
            />

            <View
              style={[
                styles.ring,
                {
                  width: RADAR_SIZE * 0.33,
                  height: RADAR_SIZE * 0.33,
                  borderRadius: (RADAR_SIZE * 0.33) / 2,
                  borderColor: colors.outlineVariant,
                },
              ]}
            />

            {/* Crosshair */}
            <View
              style={[
                styles.verticalLine,
                { backgroundColor: colors.outlineVariant },
              ]}
            />

            <View
              style={[
                styles.horizontalLine,
                { backgroundColor: colors.outlineVariant },
              ]}
            />

            {/* Compass */}
            <Text
              style={[
                styles.compass,
                styles.north,
                { color: colors.onSurface },
              ]}
            >
              N
            </Text>

            <Text
              style={[
                styles.compass,
                styles.south,
                { color: colors.onSurfaceVariant },
              ]}
            >
              S
            </Text>

            <Text
              style={[
                styles.compass,
                styles.west,
                { color: colors.onSurfaceVariant },
              ]}
            >
              W
            </Text>

            <Text
              style={[
                styles.compass,
                styles.east,
                { color: colors.onSurfaceVariant },
              ]}
            >
              E
            </Text>

            {/* Responder */}
            <View
              style={[
                styles.responderMarker,
                {
                  backgroundColor: colors.onSurface,
                  borderColor: colors.background,
                },
              ]}
            />

            <Text
              style={[
                styles.responderLabel,
                { color: colors.onSurface },
              ]}
            >
              YOU
            </Text>

            {/* Incident marker */}
            <View
              style={[
                styles.incidentMarker,
                {
                  backgroundColor: colors.onSurface,
                  borderColor: colors.background,
                },
              ]}
            />

            <Text
              style={[
                styles.incidentLabel,
                { color: colors.onSurface },
              ]}
            >
              INCIDENT
            </Text>
          </View>

          <Text
            style={[
              typography.labelMd,
              {
                color: colors.onSurfaceVariant,
                textAlign: 'center',
                marginTop: spacing.md,
              },
            ]}
          >
            Relative position · Offline radar
          </Text>
        </View>

        {/* Incident information */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
            },
          ]}
        >
          <Text
            style={[
              typography.titleLg,
              { color: colors.onSurface },
            ]}
          >
            {incident.title}
          </Text>

          <View style={styles.infoRow}>
            <MaterialIcons
              name="location-on"
              size={20}
              color={colors.onSurface}
            />

            <Text
              style={[
                typography.bodyMd,
                { color: colors.onSurfaceVariant },
              ]}
            >
              {incident.location}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons
              name="schedule"
              size={20}
              color={colors.onSurface}
            />

            <Text
              style={[
                typography.bodyMd,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Reported {incident.time}
            </Text>
          </View>
        </View>

        {/* Navigation information */}
        <View
          style={[
            styles.navigationCard,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
            },
          ]}
        >
          <View style={styles.navigationRow}>
            <View>
              <Text
                style={[
                  typography.labelMd,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                DIRECTION
              </Text>

              <Text
                style={[
                  typography.titleLg,
                  { color: colors.onSurface },
                ]}
              >
                North-East
              </Text>
            </View>

            <View>
              <Text
                style={[
                  typography.labelMd,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                DISTANCE
              </Text>

              <Text
                style={[
                  typography.titleLg,
                  { color: colors.onSurface },
                ]}
              >
                ~850 m
              </Text>
            </View>
          </View>

          <Text
            style={[
              typography.labelMd,
              {
                color: colors.onSurfaceVariant,
                marginTop: spacing.sm,
              },
            ]}
          >
            Last position update: 12 seconds ago
          </Text>
        </View>
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
    borderBottomWidth: 1,
    gap: 12,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarCard: {
    borderWidth: 1,
    alignItems: 'center',
  },

  radar: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  ring: {
    position: 'absolute',
    borderWidth: 1,
  },

  verticalLine: {
    position: 'absolute',
    width: 1,
    height: '100%',
  },

  horizontalLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
  },

  compass: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '700',
  },

  north: {
    top: 4,
  },

  south: {
    bottom: 4,
  },

  west: {
    left: 5,
  },

  east: {
    right: 5,
  },

  responderMarker: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    left: '48%',
    top: '48%',
  },

  responderLabel: {
    position: 'absolute',
    top: '54%',
    fontSize: 9,
    fontWeight: '700',
  },

  incidentMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    right: '23%',
    top: '24%',
  },

  incidentLabel: {
    position: 'absolute',
    right: '14%',
    top: '16%',
    fontSize: 8,
    fontWeight: '700',
  },

  infoCard: {
    borderWidth: 1,
    gap: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  navigationCard: {
    borderWidth: 1,
  },

  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});