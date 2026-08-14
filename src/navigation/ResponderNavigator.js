import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AssignedMeshesScreen from '../screens/responder/AssignedMeshesScreen';
import IncidentListScreen from '../screens/responder/IncidentListScreen';
import IncidentDetailsScreen from '../screens/responder/IncidentDetailsScreen';
import ResponderRadarScreen from '../screens/responder/ResponderRadarScreen';

const Stack = createNativeStackNavigator();

export default function ResponderNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="AssignedMeshes"
        component={AssignedMeshesScreen}
      />

      <Stack.Screen
        name="IncidentList"
        component={IncidentListScreen}
      />

      <Stack.Screen
        name="IncidentDetails"
        component={IncidentDetailsScreen}
      />

      <Stack.Screen
        name="ResponderRadar"
        component={ResponderRadarScreen}
      />
    </Stack.Navigator>
  );
}