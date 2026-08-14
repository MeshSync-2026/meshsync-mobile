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
  const { incident, mesh } = route.params;
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
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
            style={[typography.titleLg, { color: colors.onSurface }]}
          >
            Incident Details
          </Text>

          <Text
            style={[typography.labelMd, { color: colors.onSurfaceVariant }]}
          >
            {incident.id}
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
        {/* Incident type */}
        <View
          style={[
            styles.typeCard,
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
              typography.labelMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            INCIDENT TYPE
          </Text>

          <Text
            style={[
              typography.headlineLgMobile,
              {
                color: colors.onSurface,
                marginTop: spacing.xs,
              },
            ]}
          >
            {incident.type}
          </Text>
        </View>

        {/* Main information */}
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
          <Text
            style={[
              typography.headlineLgMobile,
              { color: colors.onSurface },
            ]}
          >
            {incident.title}
          </Text>

          <View style={[styles.infoRow, { marginTop: spacing.md }]}>
            <MaterialIcons
              name="location-on"
              size={20}
              color={colors.onSurface}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.labelMd,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                LOCATION
              </Text>

              <Text
                style={[
                  typography.bodyMd,
                  { color: colors.onSurface },
                ]}
              >
                {incident.location}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { marginTop: spacing.md }]}>
            <MaterialIcons
              name="schedule"
              size={20}
              color={colors.onSurface}
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
                {incident.time}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { marginTop: spacing.md }]}>
            <MaterialIcons
              name="hub"
              size={20}
              color={colors.onSurface}
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
                {mesh.name} ({mesh.id})
              </Text>
            </View>
          </View>
        </View>

        {/* Status */}
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
  <Text
    style={[
      typography.labelMd,
      { color: colors.onSurfaceVariant },
    ]}
  >
    CURRENT STATUS
  </Text>

  <View style={styles.statusRow}>
    <View
      style={[
        styles.statusDot,
        { backgroundColor: colors.onSurface },
      ]}
    />

    <Text
      style={[
        typography.titleLg,
        { color: colors.onSurface },
      ]}
    >
      {(incident.status || 'active').toUpperCase()}
    </Text>
  </View>
</View>
        {/* Actions */}
        <Pressable
          onPress={() => {
  navigation.navigate('ResponderRadar', {
    incident,
    mesh,
  });
}}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.onSurface,
              borderRadius: radius.md,
            },
          ]}
        >
          <MaterialIcons
            name="radar"
            size={22}
            color={colors.background}
          />

          <Text
            style={[
              typography.titleLg,
              { color: colors.background },
            ]}
          >
            View Radar
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
  navigation.navigate('UpdateIncidentStatus', {
    incident,
    mesh,
  });
}}
          style={[
            styles.secondaryButton,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outline,
              borderRadius: radius.md,
            },
          ]}
        >
          <MaterialIcons
            name="edit"
            size={22}
            color={colors.onSurface}
          />

          <Text
            style={[
              typography.titleLg,
              { color: colors.onSurface },
            ]}
          >
            Update Status
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

  card: {
    borderWidth: 1,
  },

  typeCard: {
    borderWidth: 1,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  actionButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  secondaryButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
  },
});