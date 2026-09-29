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

export default function IncidentDetailsScreen({ route, navigation }) {
  const { incident = {}, mesh = {} } = route.params || {};

  const { colors, spacing, radius, typography, isDark, toggleScheme } =
    useTheme();

  const currentStatus = incident.status || 'EN ROUTE';

  const priority = incident.priority || 'MEDIUM';
  const confidence = incident.confidence || 'LIVE';
  const distance = incident.distance || '1.2 km';
  const direction = incident.direction || 'North East';
  const assignment = incident.assignment || 'NONE';

  const responders = [
    {
      name: 'You',
      role: 'Authorized Responder',
      status:
        currentStatus === 'ARRIVED'
          ? 'ARRIVED'
          : currentStatus === 'RESOLVED'
          ? 'COMPLETED'
          : 'EN ROUTE',
      selfAssigned: assignment === 'SELF-ASSIGNED',
    },
    {
      name: 'Responder R-07',
      role: 'Authorized Responder',
      status: 'ASSIGNED',
      selfAssigned: false,
    },
  ];

  const getTimeline = () => {
    const timeline = [
      {
        time: incident.time || '2 min ago',
        title: 'Incident reported',
        description: `${incident.type || 'Incident'} reported at ${
          incident.location || 'unknown location'
        }.`,
        icon: 'notification-important',
      },
    ];

    if (assignment === 'SELF-ASSIGNED') {
      timeline.push({
        time: '1 min ago',
        title: 'Responder self-assigned',
        description: 'You accepted this incident from the radar.',
        icon: 'person-add',
      });
    } else if (assignment === 'DISPATCHED') {
      timeline.push({
        time: '1 min ago',
        title: 'Dispatcher assignment received',
        description: 'You were assigned to this incident.',
        icon: 'assignment',
      });
    }

    if (
      currentStatus === 'ARRIVED' ||
      currentStatus === 'RESOLVED'
    ) {
      timeline.push({
        time: 'Just now',
        title: 'Responder arrived',
        description: 'You reached the incident location.',
        icon: 'location-on',
      });
    }

    if (currentStatus === 'RESOLVED') {
      timeline.push({
        time: 'Just now',
        title: 'Incident resolved',
        description: 'The incident has been marked as resolved.',
        icon: 'check-circle',
      });
    }

    return timeline;
  };

  const timeline = getTimeline();

  const getStatusIcon = () => {
    if (currentStatus === 'RESOLVED') {
      return 'check-circle';
    }

    if (currentStatus === 'ARRIVED') {
      return 'location-on';
    }

    return 'directions-car';
  };

  const getStatusDescription = () => {
    if (currentStatus === 'RESOLVED') {
      return 'This incident has been marked as resolved.';
    }

    if (currentStatus === 'ARRIVED') {
      return 'You have reached the incident location.';
    }

    return 'You are currently travelling to the incident.';
  };

  const getPriorityIcon = () => {
    if (priority === 'HIGH') {
      return 'priority-high';
    }

    if (priority === 'MEDIUM') {
      return 'remove';
    }

    return 'keyboard-arrow-down';
  };

  const getAssignmentIcon = () => {
    if (assignment === 'SELF-ASSIGNED') {
      return 'person';
    }

    if (assignment === 'DISPATCHED') {
      return 'assignment';
    }

    return 'help-outline';
  };

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
            Incident Details
          </Text>

          <Text
            style={[
              typography.labelMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            {incident.id || 'Incident'}
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
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
        }}
      >
        {/* Incident summary */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
            },
          ]}
        >
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                },
              ]}
            >
              <MaterialIcons
                name={getPriorityIcon()}
                size={16}
                color={colors.onSurface}
              />

              <Text
                style={[
                  typography.labelMd,
                  { color: colors.onSurface },
                ]}
              >
                {priority}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                },
              ]}
            >
              <MaterialIcons
                name="visibility"
                size={16}
                color={colors.onSurface}
              />

              <Text
                style={[
                  typography.labelMd,
                  { color: colors.onSurface },
                ]}
              >
                {confidence}
              </Text>
            </View>
          </View>

          <Text
            style={[
              typography.headlineLgMobile,
              {
                color: colors.onSurface,
                marginTop: spacing.sm,
              },
            ]}
          >
            {incident.title || incident.type || 'Incident'}
          </Text>

          <Text
            style={[
              typography.bodyMd,
              {
                color: colors.onSurfaceVariant,
                marginTop: spacing.xs,
              },
            ]}
          >
            {incident.type || 'Emergency incident'}
          </Text>
        </View>

        {/* Location */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        >
          <Text
            style={[
              typography.labelMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            LOCATION
          </Text>

          <View style={styles.locationMain}>
            <MaterialIcons
              name="location-on"
              size={24}
              color={colors.onSurface}
            />

            <Text
              style={[
                typography.titleLg,
                {
                  color: colors.onSurface,
                  flex: 1,
                },
              ]}
            >
              {incident.location || 'Unknown location'}
            </Text>
          </View>

          <View style={styles.distanceRow}>
            <View style={styles.smallInfo}>
              <MaterialIcons
                name="straighten"
                size={18}
                color={colors.onSurfaceVariant}
              />

              <Text
                style={[
                  typography.bodyMd,
                  { color: colors.onSurface },
                ]}
              >
                {distance}
              </Text>
            </View>

            <View style={styles.smallInfo}>
              <MaterialIcons
                name="explore"
                size={18}
                color={colors.onSurfaceVariant}
              />

              <Text
                style={[
                  typography.bodyMd,
                  { color: colors.onSurface },
                ]}
              >
                {direction}
              </Text>
            </View>
          </View>
        </View>

        {/* Incident information */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        >
          <Text
            style={[
              typography.titleLg,
              { color: colors.onSurface },
            ]}
          >
            Incident Information
          </Text>

          <View style={styles.infoRow}>
            <MaterialIcons
              name="schedule"
              size={20}
              color={colors.onSurfaceVariant}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.labelMd,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                REPORTED
              </Text>

              <Text
                style={[
                  typography.bodyMd,
                  { color: colors.onSurface },
                ]}
              >
                {incident.time || 'Unknown'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons
              name="hub"
              size={20}
              color={colors.onSurfaceVariant}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.labelMd,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                MESH
              </Text>

              <Text
                style={[
                  typography.bodyMd,
                  { color: colors.onSurface },
                ]}
              >
                {mesh.name || 'Unknown mesh'}{' '}
                {mesh.id ? `(${mesh.id})` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons
              name="verified"
              size={20}
              color={colors.onSurfaceVariant}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.labelMd,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                CONFIDENCE
              </Text>

              <Text
                style={[
                  typography.bodyMd,
                  { color: colors.onSurface },
                ]}
              >
                {confidence}
              </Text>
            </View>
          </View>
        </View>

        {/* Assignment */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        >
          <Text
            style={[
              typography.labelMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            ASSIGNMENT
          </Text>

          <View style={styles.assignmentRow}>
            <View
              style={[
                styles.assignmentIcon,
                {
                  backgroundColor:
                    assignment === 'SELF-ASSIGNED'
                      ? '#E0A800'
                      : assignment === 'DISPATCHED'
                      ? '#1976D2'
                      : colors.surfaceContainerHigh,
                },
              ]}
            >
              <MaterialIcons
                name={getAssignmentIcon()}
                size={22}
                color={
                  assignment === 'NONE'
                    ? colors.onSurface
                    : '#FFFFFF'
                }
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.titleLg,
                  { color: colors.onSurface },
                ]}
              >
                {assignment === 'SELF-ASSIGNED'
                  ? 'Self-assigned'
                  : assignment === 'DISPATCHED'
                  ? 'Dispatcher assigned'
                  : 'No assignment'}
              </Text>

              <Text
                style={[
                  typography.bodyMd,
                  {
                    color: colors.onSurfaceVariant,
                    marginTop: 3,
                  },
                ]}
              >
                {assignment === 'SELF-ASSIGNED'
                  ? 'You accepted this incident from the radar.'
                  : assignment === 'DISPATCHED'
                  ? 'This incident was assigned by a dispatcher.'
                  : 'No responder assignment recorded.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Responders */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text
              style={[
                typography.titleLg,
                { color: colors.onSurface },
              ]}
            >
              Responders
            </Text>

            <Text
              style={[
                typography.labelMd,
                { color: colors.onSurfaceVariant },
              ]}
            >
              {responders.length} assigned
            </Text>
          </View>

          {responders.map((responder, index) => (
            <View
              key={responder.name}
              style={[
                styles.responderRow,
                index < responders.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.outlineVariant,
                },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                  },
                ]}
              >
                <MaterialIcons
                  name="person"
                  size={22}
                  color={colors.onSurface}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.titleLg,
                    { color: colors.onSurface },
                  ]}
                >
                  {responder.name}
                </Text>

                <Text
                  style={[
                    typography.bodyMd,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {responder.role}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    typography.labelMd,
                    { color: colors.onSurface },
                  ]}
                >
                  {responder.status}
                </Text>

                {responder.selfAssigned && (
                  <Text
                    style={[
                      typography.labelMd,
                      {
                        color: colors.onSurfaceVariant,
                        marginTop: 2,
                      },
                    ]}
                  >
                    SELF
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Timeline */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        >
          <Text
            style={[
              typography.titleLg,
              { color: colors.onSurface },
            ]}
          >
            Event Timeline
          </Text>

          {timeline.map((event, index) => (
            <View
              key={`${event.title}-${index}`}
              style={styles.timelineRow}
            >
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineIcon,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={event.icon}
                    size={18}
                    color={colors.onSurface}
                  />
                </View>

                {index < timeline.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      {
                        backgroundColor: colors.outlineVariant,
                      },
                    ]}
                  />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.titleLg,
                    { color: colors.onSurface },
                  ]}
                >
                  {event.title}
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
                  {event.time}
                </Text>

                <Text
                  style={[
                    typography.bodyMd,
                    {
                      color: colors.onSurfaceVariant,
                      marginTop: 5,
                    },
                  ]}
                >
                  {event.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Current status */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
              padding: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        >
          <Text
            style={[
              typography.labelMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            CURRENT STATUS
          </Text>

          <View style={styles.currentStatusRow}>
            <View
              style={[
                styles.currentStatusIcon,
                {
                  backgroundColor: colors.onSurface,
                },
              ]}
            >
              <MaterialIcons
                name={getStatusIcon()}
                size={24}
                color={colors.background}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.headlineLgMobile,
                  { color: colors.onSurface },
                ]}
              >
                {currentStatus}
              </Text>

              <Text
                style={[
                  typography.bodyMd,
                  {
                    color: colors.onSurfaceVariant,
                    marginTop: 3,
                  },
                ]}
              >
                {getStatusDescription()}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        {currentStatus !== 'RESOLVED' && (
          <Pressable
            onPress={() =>
              navigation.navigate('UpdateIncidentStatus', {
                incident,
                mesh,
              })
            }
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.onSurface,
                borderRadius: radius.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <MaterialIcons
              name="edit"
              size={22}
              color={colors.background}
            />

            <Text
              style={[
                typography.titleLg,
                { color: colors.background },
              ]}
            >
              Update Status
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() =>
            navigation.navigate('ResponderRadar', {
              incident,
              mesh,
            })
          }
          style={[
            styles.secondaryButton,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outline,
              borderRadius: radius.md,
              marginTop: spacing.sm,
            },
          ]}
        >
          <MaterialIcons
            name="radar"
            size={22}
            color={colors.onSurface}
          />

          <Text
            style={[
              typography.titleLg,
              { color: colors.onSurface },
            ]}
          >
            View Radar
          </Text>
        </Pressable>
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

  card: {
    borderWidth: 1,
  },

  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },

  badge: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  locationMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },

  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 16,
  },

  smallInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },

  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },

  assignmentIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  responderRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineRow: {
    flexDirection: 'row',
    marginTop: 18,
  },

  timelineLeft: {
    width: 42,
    alignItems: 'center',
  },

  timelineIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 3,
    minHeight: 30,
  },

  currentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
  },

  currentStatusIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  secondaryButton: {
    minHeight: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  statusCard: {
    borderWidth: 1,
  },
});