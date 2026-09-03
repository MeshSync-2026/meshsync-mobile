import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ResponderLoginScreen from '../screens/responder/ResponderLoginScreen';
import AssignedMeshesScreen from '../screens/responder/AssignedMeshesScreen';
import IncidentListScreen from '../screens/responder/IncidentListScreen';
import IncidentDetailsScreen from '../screens/responder/IncidentDetailsScreen';
import ResponderRadarScreen from '../screens/responder/ResponderRadarScreen';
import UpdateIncidentStatusScreen from '../screens/responder/UpdateIncidentStatusScreen';
import { isRegistered } from '../backend/store/hotState';

const Stack = createNativeStackNavigator();

export default function ResponderNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={isRegistered() ? 'AssignedMeshes' : 'ResponderLogin'}
    >
      
      <Stack.Screen
        name="ResponderLogin"
        component={ResponderLoginScreen}
      />

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

      <Stack.Screen
        name="UpdateIncidentStatus"
        component={UpdateIncidentStatusScreen}
      />

    </Stack.Navigator>
  );
}