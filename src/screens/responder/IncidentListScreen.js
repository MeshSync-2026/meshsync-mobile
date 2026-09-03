import React, { useMemo } from 'react';
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
import { useMeshSync } from '../../context/MeshSyncContext';
import { REPORT_TYPE, SEVERITY, STATUS } from '../../backend/shared/enums';
import { calculateDistance, formatDistance } from '../../backend/shared/radarGeo';

export default function IncidentListScreen({ route, navigation }) {
  const { mesh } = route.params || { mesh: { id: 'MS-001', name: 'Batticaloa Central' } };
  const { colors, spacing, radius, typography, isDark, toggleScheme } = useTheme();
  const { incidents: liveIncidents, userLocation } = useMeshSync();

  const formattedIncidents = useMemo(() => {
    return (liveIncidents || [])
      .filter((inc) => inc.status !== STATUS.RESOLVED)
      .map((inc) => {
        const isSos =
          inc.report_type_code === REPORT_TYPE.SOS ||
          inc.event_type_code === 1 ||
          inc.severity_level === SEVERITY.HIGH;

        const distanceText =
          userLocation && inc.latitude && inc.longitude
            ? formatDistance(calculateDistance(userLocation.latitude, userLocation.longitude, inc.latitude, inc.longitude))
            : inc.landmark_name || inc.location || 'Local Sector';

        const createdAt = inc.createdAt || inc.created_at || Date.now();
        const diffMins = Math.max(1, Math.round((Date.now() - createdAt) / 60000));
        const timeText = diffMins < 60 ? `${diffMins} min ago` : `${Math.round(diffMins / 60)}h ago`;

        return {
          id: inc.id,
          type: isSos ? 'SOS' : 'HAZARD',
          title: inc.title || (isSos ? 'Emergency Assistance Needed' : 'Reported Hazard'),
          location: distanceText,
          time: timeText,
          raw: inc,
        };
      });
  }, [liveIncidents, userLocation]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
      edges={['top', 'bottom']}
    >
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
            {mesh.name}
          </Text>

          <Text
            style={[
              typography.labelMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            Mesh {mesh.id}
          </Text>
        </View>

        <Pressable
          onPress={toggleScheme}
          style={[styles.iconBtn, { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest }]}
          accessibilityRole="button"
          accessibilityLabel="Toggle theme"
        >
          <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={22} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.marginMobile,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
      >
        <View style={{ gap: spacing.xs }}>
          <Text
            style={[
              typography.headlineLgMobile,
              { color: colors.onSurface },
            ]}
          >
            Incidents
          </Text>

          <Text
            style={[
              typography.bodyMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            {formattedIncidents.length} active incidents in this mesh.
          </Text>
        </View>

        {formattedIncidents.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.xl }]}>
            <MaterialIcons name="check-circle" size={32} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              No active incidents assigned to this mesh sector.
            </Text>
          </View>
        ) : (
          formattedIncidents.map((incident) => (
            <Pressable
              key={incident.id}
              onPress={() => {
                navigation.navigate('IncidentDetails', {
                  incident,
                  mesh,
                });
              }}
              style={({ pressed }) => [
                styles.incidentCard,
                {
                  backgroundColor: colors.surfaceContainerLowest,
                  borderColor: incident.type === 'SOS' ? colors.error : colors.outlineVariant,
                  borderRadius: radius.xl,
                  padding: spacing.md,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={styles.incidentHeader}>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor: incident.type === 'SOS' ? colors.error : colors.surfaceContainer,
                      borderColor: incident.type === 'SOS' ? colors.error : colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.labelMd,
                      { color: incident.type === 'SOS' ? colors.onPrimary : colors.onSurface },
                    ]}
                  >
                    {incident.type}
                  </Text>
                </View>

                <Text
                  style={[
                    typography.labelMd,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {incident.time}
                </Text>
              </View>

              <Text
                style={[
                  typography.titleLg,
                  {
                    color: colors.onSurface,
                    marginTop: spacing.sm,
                  },
                ]}
              >
                {incident.title}
              </Text>

              <View
                style={[
                  styles.locationRow,
                  { marginTop: spacing.sm },
                ]}
              >
                <MaterialIcons
                  name="location-on"
                  size={18}
                  color={colors.onSurfaceVariant}
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
            </Pressable>
          ))
        )}
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentCard: {
    borderWidth: 1,
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyCard: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});