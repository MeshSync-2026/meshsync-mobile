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

const STATUSES = [
  {
    id: 'active',
    label: 'ACTIVE',
    description: 'Incident is waiting for responder action.',
    icon: 'warning',
  },
  {
    id: 'responding',
    label: 'RESPONDING',
    description: 'A responder is currently handling this incident.',
    icon: 'directions-run',
  },
  {
    id: 'resolved',
    label: 'RESOLVED',
    description: 'The incident has been successfully handled.',
    icon: 'check-circle',
  },
];

export default function UpdateIncidentStatusScreen({
  route,
  navigation,
}) {
  const { incident, mesh } = route.params;
  const { colors, spacing, radius, typography } = useTheme();

  const [selectedStatus, setSelectedStatus] = useState(
    incident.status || 'active'
  );

  const saveStatus = () => {
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
        {/* Incident summary */}
        <View style={{ gap: spacing.xs }}>
          <Text
            style={[
              typography.headlineLgMobile,
              { color: colors.onSurface },
            ]}
          >
            Incident status
          </Text>

          <Text
            style={[
              typography.bodyMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            Update the current response state for this incident.
          </Text>
        </View>

        {/* Incident card */}
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
              typography.titleLg,
              { color: colors.onSurface },
            ]}
          >
            {incident.title}
          </Text>

          <View style={styles.infoRow}>
            <MaterialIcons
              name="hub"
              size={20}
              color={colors.onSurfaceVariant}
            />

            <Text
              style={[
                typography.bodyMd,
                { color: colors.onSurfaceVariant },
              ]}
            >
              {mesh.name} · {mesh.id}
            </Text>
          </View>
        </View>

        {/* Status selection */}
        <View style={{ gap: spacing.sm }}>
          <Text
            style={[
              typography.labelMd,
              { color: colors.onSurfaceVariant },
            ]}
          >
            SELECT STATUS
          </Text>

          {STATUSES.map((status) => {
            const selected = selectedStatus === status.id;

            return (
              <Pressable
                key={status.id}
                onPress={() => setSelectedStatus(status.id)}
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    borderColor: selected
                      ? colors.onSurface
                      : colors.outlineVariant,
                    borderRadius: radius.xl,
                    padding: spacing.md,
                  },
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: selected
                        ? colors.onSurface
                        : colors.outline,
                    },
                  ]}
                >
                  {selected && (
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

                <MaterialIcons
                  name={status.icon}
                  size={24}
                  color={colors.onSurface}
                />

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
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    {status.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Save */}
        <Pressable
          onPress={saveStatus}
          style={[
            styles.saveButton,
            {
              backgroundColor: colors.onSurface,
              borderRadius: radius.md,
            },
          ]}
        >
          <MaterialIcons
            name="save"
            size={22}
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
    gap: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  statusCard: {
    minHeight: 82,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  saveButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});