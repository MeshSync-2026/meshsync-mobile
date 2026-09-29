import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeContext';

export default function RoleSelectionScreen({ navigation }) {
  const { colors, isDark } = useTheme();

  const handleCivilian = () => {
    navigation.navigate('CivilianLogin');
  };

  const handleResponder = () => {
  navigation.navigate('Responder');
};

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View
            style={[
              styles.logoCircle,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <MaterialIcons
              name="hub"
              size={34}
              color="#FFFFFF"
            />
          </View>

          <Text
            style={[
              styles.logoText,
              {
                color: colors.onSurface,
              },
            ]}
          >
            MeshSync
          </Text>
        </View>

        {/* Welcome */}
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: colors.onSurface,
              },
            ]}
          >
            Welcome to MeshSync
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.onSurfaceVariant,
              },
            ]}
          >
            Choose how you want to use MeshSync.
          </Text>
        </View>

        {/* Civilian */}
        <Pressable
          onPress={handleCivilian}
          style={({ pressed }) => [
            styles.roleCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.outlineVariant,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: colors.surfaceVariant,
              },
            ]}
          >
            <MaterialIcons
              name="person"
              size={30}
              color={colors.primary}
            />
          </View>

          <View style={styles.roleContent}>
            <Text
              style={[
                styles.roleTitle,
                {
                  color: colors.onSurface,
                },
              ]}
            >
              Civilian
            </Text>

            <Text
              style={[
                styles.roleDescription,
                {
                  color: colors.onSurfaceVariant,
                },
              ]}
            >
              Report emergencies, hazards and request help.
            </Text>
          </View>

          <MaterialIcons
            name="chevron-right"
            size={28}
            color={colors.onSurfaceVariant}
          />
        </Pressable>

        {/* Responder */}
        <Pressable
          onPress={handleResponder}
          style={({ pressed }) => [
            styles.roleCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.outlineVariant,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: colors.surfaceVariant,
              },
            ]}
          >
            <MaterialIcons
              name="shield"
              size={30}
              color={colors.primary}
            />
          </View>

          <View style={styles.roleContent}>
            <Text
              style={[
                styles.roleTitle,
                {
                  color: colors.onSurface,
                },
              ]}
            >
              Responder
            </Text>

            <Text
              style={[
                styles.roleDescription,
                {
                  color: colors.onSurfaceVariant,
                },
              ]}
            >
              Respond to incidents and coordinate emergency operations.
            </Text>
          </View>

          <MaterialIcons
            name="chevron-right"
            size={28}
            color={colors.onSurfaceVariant}
          />
        </Pressable>

        {/* Offline information */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.surfaceVariant,
            },
          ]}
        >
          <MaterialIcons
            name="cloud-off"
            size={22}
            color={colors.primary}
          />

          <Text
            style={[
              styles.infoText,
              {
                color: colors.onSurfaceVariant,
              },
            ]}
          >
            MeshSync is designed to keep working during network outages.
          </Text>
        </View>

        {/* Theme indicator */}
        <Text
          style={[
            styles.footer,
            {
              color: colors.onSurfaceVariant,
            },
          ]}
        >
          {isDark ? 'Dark mode' : 'Light mode'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },

  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  logoText: {
    fontSize: 26,
    fontWeight: '700',
  },

  header: {
    marginBottom: 28,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },

  roleCard: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  roleContent: {
    flex: 1,
  },

  roleTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 6,
  },

  roleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 12,
  },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});