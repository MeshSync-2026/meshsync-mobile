import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';

import OnboardingScreen from '../screens/OnboardingScreen';
import BottomTabs from './BottomTabs';
import ReportHazardScreen from '../screens/ReportHazardScreen';
import MyStatusScreen from '../screens/MyStatusScreen';
import ProfileScreen from '../screens/ProfileScreen';

import ResponderNavigator from './ResponderNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { colors, isDark } = useTheme();

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
      <Stack.Navigator initialRouteName="Responder"screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={BottomTabs} />
        <Stack.Screen name="Responder" component={ResponderNavigator}/>
        <Stack.Screen name="ReportHazard" component={ReportHazardScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="MyStatus" component={MyStatusScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
