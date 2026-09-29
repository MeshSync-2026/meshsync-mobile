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

export default function UpdateIncidentStatusScreen({ route, navigation }) {
  const { incident = {}, mesh = {} } = route.params || {};

  const { colors, spacing, radius, typography, isDark, toggleScheme } =
    useTheme();

  const [selectedStatus, setSelectedStatus] = useState(
    incident.status || 'EN ROUTE'
  );

  const statuses = [
    {
      id: 'EN ROUTE',
      label: 'En Route',
      icon: 'directions-car',
      description: 'I am travelling to the incident location.',
    },
    {
      id: 'ARRIVED',
      label: 'Arrived',
      icon: 'location-on',
      description: 'I have reached the incident location.',
    },
    {
      id: 'RESOLVED',
      label: 'Resolved',
      icon: 'check-circle',
      description: 'The incident has been handled.',
    },
  ];

  const handleSave = () => {
    navigation.navigate('IncidentDetails', {
      incident: {
        ...incident,
        status: selectedStatus,
      },
      mesh,
    });
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
            Update Status
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
          <Text
            style={[
              typography.labelMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            INCIDENT
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
            {incident.title || incident.type || 'Incident'}
          </Text>

          <View style={styles.locationRow}>
            <MaterialIcons
              name="location-on"
              size={20}
              color={colors.onSurfaceVariant}
            />

            <Text
              style={[
                typography.bodyMd,
                {
                  color: colors.onSurfaceVariant,
                  flex: 1,
                },
              ]}
            >
              {incident.location || 'Unknown location'}
            </Text>
          </View>
        </View>

        {/* Status selection */}
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
          Select current status
        </Text>

        {statuses.map((status) => {
          const isSelected = selectedStatus === status.id;

          return (
            <Pressable
              key={status.id}
              onPress={() => setSelectedStatus(status.id)}
              style={[
                styles.statusCard,
                {
                  backgroundColor: isSelected
                    ? colors.surfaceContainerHigh
                    : colors.surfaceContainerLowest,
                  borderColor: isSelected
                    ? colors.onSurface
                    : colors.outlineVariant,
                  borderRadius: radius.xl,
                },
              ]}
            >
              <View
                style={[
                  styles.statusIcon,
                  {
                    backgroundColor: isSelected
                      ? colors.onSurface
                      : colors.surfaceContainerHigh,
                  },
                ]}
              >
                <MaterialIcons
                  name={status.icon}
                  size={24}
                  color={
                    isSelected
                      ? colors.background
                      : colors.onSurface
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
                  {status.label}
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
                  {status.description}
                </Text>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  {
                    borderColor: isSelected
                      ? colors.onSurface
                      : colors.outline,
                  },
                ]}
              >
                {isSelected && (
                  <View
                    style={[
                      styles.radioInner,
                      {
                        backgroundColor: colors.onSurface,
                      },
                    ]}
                  />
                )}
              </View>
            </Pressable>
          );
        })}

        {/* Offline notice */}
        <View
          style={[
            styles.offlineCard,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              borderRadius: radius.xl,
            },
          ]}
        >
          <MaterialIcons
            name="cloud-off"
            size={22}
            color={colors.onSurface}
          />

          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.titleLg,
                { color: colors.onSurface },
              ]}
            >
              Offline update
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
              Your status can be recorded while offline and
              synchronized with the mesh later.
            </Text>
          </View>
        </View>

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          style={[
            styles.saveButton,
            {
              backgroundColor: colors.onSurface,
              borderRadius: radius.md,
              marginTop: spacing.lg,
            },
          ]}
        >
          <MaterialIcons
            name="check"
            size={23}
            color={colors.background}
          />

          <Text
            style={[
              typography.titleLg,
              { color: colors.background },
            ]}
          >
            Save Status
          </Text>
        </Pressable>

        {/* Cancel */}
        <Pressable
          onPress={() => navigation.goBack()}
          style={[
            styles.cancelButton,
            {
              borderColor: colors.outline,
              borderRadius: radius.md,
              marginTop: spacing.sm,
            },
          ]}
        >
          <Text
            style={[
              typography.titleLg,
              { color: colors.onSurface },
            ]}
          >
            Cancel
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

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },

  statusCard: {
    minHeight: 96,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  offlineCard: {
    minHeight: 82,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  saveButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  cancelButton: {
    minHeight: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});