import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomTabBar from './CustomTabBar';
import HomeScreen from '../screens/HomeScreen';
import NearbyReportsScreen from '../screens/NearByReportsScreen';
import MyActivityScreen from '../screens/MyActivityScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Nearby" component={NearbyReportsScreen} />
      <Tab.Screen name="MyActivity" component={MyActivityScreen} />
    </Tab.Navigator>
  );
}