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

const MOCK_INCIDENTS = {
  'MS-001': [
    {
      id: 'SOS-001',
      type: 'SOS',
      title: 'Person needs assistance',
      location: 'Batticaloa Central',
      time: '2 min ago',
    },
    {
      id: 'SOS-002',
      type: 'SOS',
      title: 'Family stranded',
      location: 'Batticaloa Central',
      time: '8 min ago',
    },
    {
      id: 'HZ-001',
      type: 'HAZARD',
      title: 'Flooded road',
      location: 'Batticaloa Central',
      time: '12 min ago',
    },
    {
      id: 'HZ-002',
      type: 'HAZARD',
      title: 'Damaged bridge',
      location: 'Batticaloa Central',
      time: '20 min ago',
    },
  ],

  'MS-002': [
    {
      id: 'SOS-003',
      type: 'SOS',
      title: 'Medical assistance required',
      location: 'Batticaloa South',
      time: '5 min ago',
    },
    {
      id: 'HZ-003',
      type: 'HAZARD',
      title: 'Blocked road',
      location: 'Batticaloa South',
      time: '15 min ago',
    },
    {
      id: 'HZ-004',
      type: 'HAZARD',
      title: 'Flooded area',
      location: 'Batticaloa South',
      time: '25 min ago',
    },
    {
      id: 'HZ-005',
      type: 'HAZARD',
      title: 'Power line down',
      location: 'Batticaloa South',
      time: '31 min ago',
    },
    {
      id: 'HZ-006',
      type: 'HAZARD',
      title: 'Road obstruction',
      location: 'Batticaloa South',
      time: '40 min ago',
    },
  ],
};

export default function IncidentListScreen({ route, navigation }) {
  const { mesh } = route.params;

  const { colors, spacing, radius, typography, isDark, toggleScheme } = useTheme();

  const incidents = MOCK_INCIDENTS[mesh.id] || [];

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
            {incidents.length} active incidents in this mesh.
          </Text>
        </View>

        {incidents.map((incident) => (
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
                borderColor: colors.outlineVariant,
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
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.labelMd,
                    { color: colors.onSurface },
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
});