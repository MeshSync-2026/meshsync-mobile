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

const RADAR_SIZE = 300;

const INITIAL_INCIDENTS = [
  {
    id: 'INC-1042',
    title: 'Medical Emergency',
    type: 'Medical',
    location: 'Batticaloa Central',
    distance: '1.2 km',
    direction: 'North East',
    confidence: 'LIVE',
    assignment: 'DISPATCHED',
    priority: 'HIGH',
    time: '2 min ago',
    angle: 45,
    radarDistance: 0.14,
  },
  {
    id: 'INC-1039',
    title: 'Trapped Person',
    type: 'Rescue',
    location: 'Kallady Bridge',
    distance: '3.8 km',
    direction: 'South East',
    confidence: 'UNCONFIRMED',
    assignment: 'NONE',
    priority: 'MEDIUM',
    time: '8 min ago',
    angle: 135,
    radarDistance: 0.34,
  },
  {
    id: 'INC-1035',
    title: 'Flooding',
    type: 'Flood',
    location: 'Iruthayapuram',
    distance: '6.4 km',
    direction: 'North West',
    confidence: 'LIVE',
    assignment: 'NONE',
    priority: 'LOW',
    time: '15 min ago',
    angle: 315,
    radarDistance: 0.52,
  },
  {
    id: 'INC-1028',
    title: 'Road Blockage',
    type: 'Hazard',
    location: 'Puliyanthivu',
    distance: '9.7 km',
    direction: 'South West',
    confidence: 'RESOLVED',
    assignment: 'NONE',
    priority: 'LOW',
    time: '24 min ago',
    angle: 225,
    radarDistance: 0.72,
  },
  {
    id: 'INC-1021',
    title: 'Fire Report',
    type: 'Fire',
    location: 'Kokkaddicholai',
    distance: '12.5 km',
    direction: 'East',
    confidence: 'CANCELLED',
    assignment: 'NONE',
    priority: 'MEDIUM',
    time: '31 min ago',
    angle: 90,
    radarDistance: 0.88,
  },
];

export default function ResponderRadarScreen({ route, navigation }) {
  const params = route.params || {};

  const { colors, spacing, radius, typography, isDark, toggleScheme } =
    useTheme();

  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [selectedIncident, setSelectedIncident] = useState(
    params.incident || INITIAL_INCIDENTS[0]
  );

  const getVisibleIncidents = () => {
    return incidents.filter(
      (incident) => incident.confidence !== 'CANCELLED'
    );
  };

  const getPinPosition = (incident) => {
    const center = RADAR_SIZE / 2;

    const distance =
      (RADAR_SIZE / 2 - 28) * incident.radarDistance;

    const angleInRadians =
      (incident.angle * Math.PI) / 180;

    const x =
      center +
      Math.sin(angleInRadians) * distance;

    const y =
      center -
      Math.cos(angleInRadians) * distance;

    return {
      left: x - 11,
      top: y - 11,
    };
  };

  const handleSelectIncident = (incident) => {
    setSelectedIncident(incident);
  };

  const handleSelfAssign = () => {
    if (!selectedIncident) {
      return;
    }

    if (
      selectedIncident.assignment === 'SELF-ASSIGNED' ||
      selectedIncident.assignment === 'DISPATCHED'
    ) {
      return;
    }

    const updatedIncident = {
      ...selectedIncident,
      assignment: 'SELF-ASSIGNED',
      status: 'EN ROUTE',
    };

    setIncidents((current) =>
      current.map((item) =>
        item.id === selectedIncident.id
          ? updatedIncident
          : item
      )
    );

    setSelectedIncident(updatedIncident);
  };

  const isSelfAssigned =
    selectedIncident?.assignment === 'SELF-ASSIGNED';

  const isDispatched =
    selectedIncident?.assignment === 'DISPATCHED';

  const canSelfAssign =
    selectedIncident &&
    selectedIncident.confidence !== 'RESOLVED' &&
    selectedIncident.confidence !== 'CANCELLED' &&
    !isSelfAssigned &&
    !isDispatched;

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
            Nearby incidents · 25 km
          </Text>
        </View>

        <Pressable
          onPress={toggleScheme}
          style={[
            styles.iconButton,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <MaterialIcons
            name={isDark ? 'light-mode' : 'dark-mode'}
            size={22}
            color={colors.onSurface}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.marginMobile,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
        }}
      >
        {/* Mesh status */}
        <View
          style={[
            styles.meshCard,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
            },
          ]}
        >
          <View style={styles.meshIcon}>
            <MaterialIcons
              name="hub"
              size={22}
              color={colors.onSurface}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.labelMd,
                { color: colors.onSurfaceVariant },
              ]}
            >
              MESH ACTIVE
            </Text>

            <Text
              style={[
                typography.bodyMd,
                { color: colors.onSurface },
              ]}
            >
              4 nearby responders · Last sync 12 sec ago
            </Text>
          </View>
        </View>

        {/* Radar title */}
        <View style={styles.titleRow}>
          <View>
            <Text
              style={[
                typography.headlineLgMobile,
                { color: colors.onSurface },
              ]}
            >
              Nearby incidents
            </Text>

            <Text
              style={[
                typography.bodyMd,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Tap a pin to inspect and self-assign
            </Text>
          </View>

          <View
            style={[
              styles.rangeBadge,
              {
                backgroundColor: colors.surfaceContainerHigh,
              },
            ]}
          >
            <Text
              style={[
                typography.labelMd,
                { color: colors.onSurface },
              ]}
            >
              25 KM
            </Text>
          </View>
        </View>

        {/* Radar */}
        <View
          style={[
            styles.radarContainer,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
            },
          ]}
        >
          <View
            style={[
              styles.radar,
              {
                width: RADAR_SIZE,
                height: RADAR_SIZE,
                borderColor: colors.outline,
              },
            ]}
          >
            {/* Rings */}
            <View
              style={[
                styles.radarRing,
                {
                  width: 220,
                  height: 220,
                  left: 40,
                  top: 40,
                  borderColor: colors.outlineVariant,
                },
              ]}
            />

            <View
              style={[
                styles.radarRing,
                {
                  width: 140,
                  height: 140,
                  left: 80,
                  top: 80,
                  borderColor: colors.outlineVariant,
                },
              ]}
            />

            <View
              style={[
                styles.radarRing,
                {
                  width: 60,
                  height: 60,
                  left: 120,
                  top: 120,
                  borderColor: colors.outlineVariant,
                },
              ]}
            />

            {/* Crosshair */}
            <View
              style={[
                styles.horizontalLine,
                {
                  backgroundColor: colors.outlineVariant,
                },
              ]}
            />

            <View
              style={[
                styles.verticalLine,
                {
                  backgroundColor: colors.outlineVariant,
                },
              ]}
            />

            {/* Directions */}
            <Text
              style={[
                styles.direction,
                styles.north,
                { color: colors.onSurface },
              ]}
            >
              N
            </Text>

            <Text
              style={[
                styles.direction,
                styles.east,
                { color: colors.onSurface },
              ]}
            >
              E
            </Text>

            <Text
              style={[
                styles.direction,
                styles.south,
                { color: colors.onSurface },
              ]}
            >
              S
            </Text>

            <Text
              style={[
                styles.direction,
                styles.west,
                { color: colors.onSurface },
              ]}
            >
              W
            </Text>

            {/* You */}
            <View
              style={[
                styles.youMarker,
                {
                  backgroundColor: colors.onSurface,
                },
              ]}
            >
              <Text
                style={[
                  styles.youText,
                  { color: colors.background },
                ]}
              >
                YOU
              </Text>
            </View>

            {/* Incident pins */}
            {getVisibleIncidents().map((incident) => {
              const position = getPinPosition(incident);

              const isSelected =
                selectedIncident?.id === incident.id;

              const isSelf =
                incident.assignment === 'SELF-ASSIGNED';

              const isDispatchedIncident =
                incident.assignment === 'DISPATCHED';

              const isResolved =
                incident.confidence === 'RESOLVED';

              return (
                <Pressable
                  key={incident.id}
                  onPress={() => handleSelectIncident(incident)}
                  style={[
                    styles.pin,
                    position,
                    {
                      backgroundColor:
                        isSelf
                          ? '#E0A800'
                          : isDispatchedIncident
                          ? '#1976D2'
                          : isResolved
                          ? 'transparent'
                          : colors.onSurface,

                      borderColor:
                        isSelected
                          ? colors.onSurface
                          : isSelf
                          ? '#E0A800'
                          : colors.background,

                      borderWidth: isSelected ? 3 : 2,

                      opacity:
                        incident.confidence === 'UNCONFIRMED'
                          ? 0.65
                          : incident.confidence === 'RESOLVED'
                          ? 0.35
                          : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pinDot,
                      {
                        backgroundColor:
                          incident.confidence === 'UNCONFIRMED'
                            ? 'transparent'
                            : colors.background,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Radar guide */}
        <View
          style={[
            styles.guideCard,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
            },
          ]}
        >
          <Text
            style={[
              typography.titleLg,
              { color: colors.onSurface },
            ]}
          >
            Radar guide
          </Text>

          <View style={styles.guideRow}>
            <View
              style={[
                styles.guideDot,
                { backgroundColor: colors.onSurface },
              ]}
            />

            <Text
              style={[
                typography.bodyMd,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Live incident
            </Text>
          </View>

          <View style={styles.guideRow}>
            <View
              style={[
                styles.guideDot,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.onSurface,
                  borderWidth: 2,
                },
              ]}
            />

            <Text
              style={[
                typography.bodyMd,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Unconfirmed incident
            </Text>
          </View>

          <View style={styles.guideRow}>
            <View
              style={[
                styles.guideDot,
                { backgroundColor: '#E0A800' },
              ]}
            />

            <Text
              style={[
                typography.bodyMd,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Yellow = self-assigned
            </Text>
          </View>

          <View style={styles.guideRow}>
            <View
              style={[
                styles.guideDot,
                { backgroundColor: '#1976D2' },
              ]}
            />

            <Text
              style={[
                typography.bodyMd,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Blue = dispatcher assignment
            </Text>
          </View>
        </View>

        {/* Selected incident */}
        {selectedIncident && (
          <View
            style={[
              styles.selectedCard,
              {
                backgroundColor: colors.surfaceContainerLowest,
                borderColor: colors.outlineVariant,
                borderRadius: radius.xl,
              },
            ]}
          >
            <View style={styles.selectedHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.labelMd,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  SELECTED INCIDENT
                </Text>

                <Text
                  style={[
                    typography.headlineLgMobile,
                    {
                      color: colors.onSurface,
                      marginTop: 4,
                    },
                  ]}
                >
                  {selectedIncident.title}
                </Text>
              </View>

              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.labelMd,
                    { color: colors.onSurface },
                  ]}
                >
                  {selectedIncident.priority}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons
                name="location-on"
                size={20}
                color={colors.onSurfaceVariant}
              />

              <Text
                style={[
                  typography.bodyMd,
                  {
                    color: colors.onSurface,
                    flex: 1,
                  },
                ]}
              >
                {selectedIncident.location}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons
                name="explore"
                size={20}
                color={colors.onSurfaceVariant}
              />

              <Text
                style={[
                  typography.bodyMd,
                  { color: colors.onSurface },
                ]}
              >
                {selectedIncident.distance} ·{' '}
                {selectedIncident.direction}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons
                name="verified"
                size={20}
                color={colors.onSurfaceVariant}
              />

              <Text
                style={[
                  typography.bodyMd,
                  { color: colors.onSurface },
                ]}
              >
                Confidence: {selectedIncident.confidence}
              </Text>
            </View>

            {/* Assignment state */}
            {isSelfAssigned && (
              <View
                style={[
                  styles.assignmentNotice,
                  {
                    backgroundColor: '#E0A800',
                  },
                ]}
              >
                <MaterialIcons
                  name="person"
                  size={21}
                  color="#FFFFFF"
                />

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      typography.titleLg,
                      { color: '#FFFFFF' },
                    ]}
                  >
                    Self-assigned
                  </Text>

                  <Text
                    style={[
                      typography.bodyMd,
                      {
                        color: '#FFFFFF',
                        marginTop: 2,
                      },
                    ]}
                  >
                    You are now EN ROUTE to this incident.
                  </Text>
                </View>
              </View>
            )}

            {isDispatched && (
              <View
                style={[
                  styles.assignmentNotice,
                  {
                    backgroundColor: '#1976D2',
                  },
                ]}
              >
                <MaterialIcons
                  name="assignment"
                  size={21}
                  color="#FFFFFF"
                />

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      typography.titleLg,
                      { color: '#FFFFFF' },
                    ]}
                  >
                    Dispatcher assigned
                  </Text>

                  <Text
                    style={[
                      typography.bodyMd,
                      {
                        color: '#FFFFFF',
                        marginTop: 2,
                      },
                    ]}
                  >
                    Follow the dispatcher assignment.
                  </Text>
                </View>
              </View>
            )}

            {/* Self assign button */}
            {canSelfAssign && (
              <Pressable
                onPress={handleSelfAssign}
                style={[
                  styles.selfAssignButton,
                  {
                    backgroundColor: colors.onSurface,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <MaterialIcons
                  name="person-add"
                  size={22}
                  color={colors.background}
                />

                <Text
                  style={[
                    typography.titleLg,
                    { color: colors.background },
                  ]}
                >
                  Self-Assign Incident
                </Text>
              </Pressable>
            )}

            {/* View details */}
            <Pressable
              onPress={() =>
                navigation.navigate('IncidentDetails', {
                  incident: selectedIncident,
                  mesh: params.mesh,
                })
              }
              style={[
                styles.detailsButton,
                {
                  borderColor: colors.outline,
                  borderRadius: radius.md,
                },
              ]}
            >
              <MaterialIcons
                name="description"
                size={21}
                color={colors.onSurface}
              />

              <Text
                style={[
                  typography.titleLg,
                  { color: colors.onSurface },
                ]}
              >
                View Incident Details
              </Text>
            </Pressable>
          </View>
        )}

        {/* Nearby reports */}
        <Text
          style={[
            typography.titleLg,
            {
              color: colors.onSurface,
              marginTop: spacing.lg,
              marginBottom: spacing.sm,
            },
          ]}
        >
          Nearby reports
        </Text>

        {incidents.map((incident) => {
          if (incident.confidence === 'CANCELLED') {
            return null;
          }

          return (
            <Pressable
              key={incident.id}
              onPress={() => handleSelectIncident(incident)}
              style={[
                styles.reportRow,
                {
                  backgroundColor:
                    selectedIncident?.id === incident.id
                      ? colors.surfaceContainerHigh
                      : colors.surfaceContainerLowest,
                  borderColor: colors.outlineVariant,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <View
                style={[
                  styles.reportPin,
                  {
                    backgroundColor:
                      incident.assignment === 'SELF-ASSIGNED'
                        ? '#E0A800'
                        : incident.assignment === 'DISPATCHED'
                        ? '#1976D2'
                        : colors.onSurface,
                  },
                ]}
              />

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.titleLg,
                    { color: colors.onSurface },
                  ]}
                >
                  {incident.title}
                </Text>

                <Text
                  style={[
                    typography.bodyMd,
                    {
                      color: colors.onSurfaceVariant,
                      marginTop: 2,
                    },
                  ]}
                >
                  {incident.location}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    typography.labelMd,
                    { color: colors.onSurface },
                  ]}
                >
                  {incident.distance}
                </Text>

                <Text
                  style={[
                    typography.labelMd,
                    {
                      color: colors.onSurfaceVariant,
                      marginTop: 2,
                    },
                  ]}
                >
                  {incident.direction}
                </Text>
              </View>
            </Pressable>
          );
        })}
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

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  meshCard: {
    minHeight: 68,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  meshIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rangeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
  },

  radarContainer: {
    marginTop: 14,
    borderWidth: 1,
    paddingVertical: 20,
    alignItems: 'center',
  },

  radar: {
    borderWidth: 2,
    borderRadius: RADAR_SIZE / 2,
    position: 'relative',
    overflow: 'hidden',
  },

  radarRing: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },

  horizontalLine: {
    position: 'absolute',
    height: 1,
    width: RADAR_SIZE,
    top: RADAR_SIZE / 2,
    left: 0,
  },

  verticalLine: {
    position: 'absolute',
    width: 1,
    height: RADAR_SIZE,
    left: RADAR_SIZE / 2,
    top: 0,
  },

  direction: {
    position: 'absolute',
    fontWeight: '700',
    fontSize: 13,
  },

  north: {
    top: 8,
    left: RADAR_SIZE / 2 - 5,
  },

  east: {
    right: 8,
    top: RADAR_SIZE / 2 - 8,
  },

  south: {
    bottom: 8,
    left: RADAR_SIZE / 2 - 5,
  },

  west: {
    left: 8,
    top: RADAR_SIZE / 2 - 8,
  },

  youMarker: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    left: RADAR_SIZE / 2 - 21,
    top: RADAR_SIZE / 2 - 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  youText: {
    fontSize: 9,
    fontWeight: '800',
  },

  pin: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pinDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  guideCard: {
    marginTop: 14,
    borderWidth: 1,
    padding: 16,
  },

  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 11,
  },

  guideDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },

  selectedCard: {
    marginTop: 14,
    borderWidth: 1,
    padding: 16,
  },

  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 13,
  },

  assignmentNotice: {
    minHeight: 68,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 16,
  },

  selfAssignButton: {
    minHeight: 54,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  detailsButton: {
    minHeight: 52,
    marginTop: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  reportRow: {
    minHeight: 70,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 9,
  },

  reportPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});