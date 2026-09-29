import React, { useEffect, useState } from 'react';

import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../theme/ThemeContext';

import OnboardingScreen from '../screens/OnboardingScreen';
import BottomTabs from './BottomTabs';

import ReportHazardScreen from '../screens/ReportHazardScreen';
import MyStatusScreen from '../screens/MyStatusScreen';
import ProfileScreen from '../screens/ProfileScreen';

import RoleSelectionScreen from '../screens/RoleSelectionScreen';

import ResponderNavigator from './ResponderNavigator';

const Stack = createNativeStackNavigator();

const PROFILE_STORAGE_KEY = '@meshsync_profile';

export default function RootNavigator() {
  const { colors, isDark } = useTheme();

  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const storedProfile =
          await AsyncStorage.getItem(
            PROFILE_STORAGE_KEY
          );

        /*
         * No profile means the user
         * needs to complete onboarding.
         */

        if (!storedProfile) {
          setInitialRoute('Onboarding');
          return;
        }

        /*
         * Profile exists.
         * Let the user choose their role.
         */

        setInitialRoute('RoleSelection');

      } catch (error) {
        console.error(
          'Failed to check saved profile:',
          error
        );

        setInitialRoute('Onboarding');
      }
    };

    checkProfile();
  }, []);

  /*
   * Wait until profile check finishes.
   */

  if (!initialRoute) {
    return null;
  }

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),

    colors: {
      ...(isDark
        ? DarkTheme.colors
        : DefaultTheme.colors),

      background: colors.background,
      card: colors.background,
      text: colors.onSurface,
      border: colors.outlineVariant,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
        }}
      >

        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
        />

        <Stack.Screen
          name="RoleSelection"
          component={RoleSelectionScreen}
        />

        <Stack.Screen
          name="Main"
          component={BottomTabs}
        />

        <Stack.Screen
          name="Responder"
          component={ResponderNavigator}
        />

        <Stack.Screen
          name="ReportHazard"
          component={ReportHazardScreen}
          options={{
            presentation: 'modal',
          }}
        />

        <Stack.Screen
          name="MyStatus"
          component={MyStatusScreen}
          options={{
            presentation: 'modal',
          }}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}