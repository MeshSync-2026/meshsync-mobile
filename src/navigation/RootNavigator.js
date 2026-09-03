import React, { useEffect, useState } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../theme/ThemeContext';
import { getActiveRole, ROLE, initHotState } from '../backend/store/hotState';

import OnboardingScreen from '../screens/OnboardingScreen';
import BottomTabs from './BottomTabs';
import ReportHazardScreen from '../screens/ReportHazardScreen';
import MyStatusScreen from '../screens/MyStatusScreen';
import ProfileScreen from '../screens/ProfileScreen';

import ResponderNavigator from './ResponderNavigator';

const Stack = createNativeStackNavigator();

const PROFILE_STORAGE_KEY = '@meshsync_profile';

export default function RootNavigator() {
  const { colors, isDark } = useTheme();

  const [initialRoute, setInitialRoute] = useState(null);

  /*
   * Check whether the user has already completed onboarding and their active role.
   */
  useEffect(() => {
    initHotState();
    const checkProfile = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem(
          PROFILE_STORAGE_KEY
        );

        if (!storedProfile) {
          setInitialRoute('Onboarding');
          return;
        }
        setInitialRoute(getActiveRole() === ROLE.RESPONDER ? 'Responder' : 'Main');
      } catch (error) {
        console.error(
          'Failed to check saved profile:',
          error
        );

        // If something goes wrong, safely show onboarding
        setInitialRoute('Onboarding');
      }
    };

    checkProfile();
  }, []);

  /*
   * Wait until AsyncStorage check is complete.
   */
  if (!initialRoute) {
    return null;
  }

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
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