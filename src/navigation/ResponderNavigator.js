import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ResponderLoginScreen from '../screens/responder/ResponderLoginScreen';
import AssignedMeshesScreen from '../screens/responder/AssignedMeshesScreen';
import IncidentListScreen from '../screens/responder/IncidentListScreen';
import IncidentDetailsScreen from '../screens/responder/IncidentDetailsScreen';
import ResponderRadarScreen from '../screens/responder/ResponderRadarScreen';
import UpdateIncidentStatusScreen from '../screens/responder/UpdateIncidentStatusScreen';

const Stack = createNativeStackNavigator();

export default function ResponderNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="ResponderLogin"
    >
      {/* Responder authentication */}
      <Stack.Screen
        name="ResponderLogin"
        component={ResponderLoginScreen}
      />

      {/* Main responder operations screen */}
      <Stack.Screen
        name="AssignedMeshes"
        component={AssignedMeshesScreen}
      />

      {/* Incidents inside a selected mesh */}
      <Stack.Screen
        name="IncidentList"
        component={IncidentListScreen}
      />

      {/* Individual incident */}
      <Stack.Screen
        name="IncidentDetails"
        component={IncidentDetailsScreen}
      />

      {/* Offline radar */}
      <Stack.Screen
        name="ResponderRadar"
        component={ResponderRadarScreen}
      />

      {/* Update incident status */}
      <Stack.Screen
        name="UpdateIncidentStatus"
        component={UpdateIncidentStatusScreen}
      />
    </Stack.Navigator>
  );
}

