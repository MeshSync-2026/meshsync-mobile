import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useMeshSync } from '../context/MeshSyncContext';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors, spacing, radius, typography, isDark, toggleScheme } = useTheme();
  const { peerCount, isOnline, sendSOS, cancelSOS, activeSosIncidentId, userProfile } = useMeshSync();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const triggerSOS = () => {
    // If an SOS is already active, offer to cancel it instead
    if (activeSosIncidentId) {
      Alert.alert(
        'Cancel active SOS?',
        'Your emergency alert is currently broadcasting. Cancel it if you are safe now.',
        [
          { text: 'Keep SOS', style: 'cancel' },
          {
            text: 'Cancel SOS',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await cancelSOS();
                if (result.success) {
                  Alert.alert('SOS Cancelled', 'Your emergency alert has been cancelled across the mesh.');
                }
              } catch (e) {
                Alert.alert('Could not cancel', e.message || 'Please try again.');
              }
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      'Send Emergency SOS?',
      'This will broadcast an urgent emergency alert with your high-precision GPS coordinates across nearby mesh devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Broadcast SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await sendSOS();
              if (result.success) {
                Alert.alert(
                  'SOS Broadcasted',
                  'Your emergency alert is active and being relayed across all nearby mesh nodes.'
                );
              } else if (result.error === 'no_sos_needed') {
                Alert.alert(
                  'No SOS needed',
                  'Your last status says you are safe with enough supplies and no injuries. Update your status if your situation changed.',
                  [
                    { text: 'Update My Status', onPress: () => navigation.navigate('MyStatus') },
                    { text: 'Send anyway', style: 'destructive', onPress: sendSosForced },
                  ]
                );
              } else {
                Alert.alert('Could not send SOS', result.error || 'Please try again.');
              }
            } catch (e) {
              Alert.alert('Could not send SOS', e.message || 'Please try again.');
            }
          },
        },
      ],
    );
  };

  // Send SOS even when My Status says all-clear (user explicitly confirmed)
  const sendSosForced = async () => {
    try {
      const result = await sendSOS({ force: true });
      if (result.success) {
        Alert.alert('SOS Broadcasted', 'Your emergency alert is active and being relayed across all nearby mesh nodes.');
      } else {
        Alert.alert('Could not send SOS', result.error || 'Please try again.');
      }
    } catch (e) {
      Alert.alert('Could not send SOS', e.message || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.outlineVariant, paddingHorizontal: spacing.marginMobile }]}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="hub" size={18} color={colors.onSurface} />
          <View>
            <Text style={[typography.labelLg, { color: colors.onSurface }]}>
              {peerCount} {peerCount === 1 ? 'peer' : 'peers'} nearby
            </Text>
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
              {isOnline ? 'Online • Mesh Active' : 'Offline • Mesh Active'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Go to profile"
          >
            <MaterialIcons name="account-circle" size={24} color={colors.onSurface} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={toggleScheme}
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
          >
            <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.main, { paddingHorizontal: spacing.marginMobile }]}>
        <View style={styles.sosWrap}>
          <View style={[styles.ring, { width: 224, height: 224, borderColor: colors.secondary + '33' }]} />
          <View style={[styles.ring, { width: 256, height: 256, borderColor: colors.secondary + '1a' }]} />

          <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={pressIn}
              onPressOut={pressOut}
              onPress={triggerSOS}
              style={[styles.sosButton, { backgroundColor: colors.secondary, borderColor: colors.secondaryDark }]}
            >
              <MaterialIcons name={activeSosIncidentId ? "cancel" : "priority-high"} size={48} color={colors.onSecondary} />
              <Text style={[typography.headlineMd, { color: colors.onSecondary, marginTop: 6, letterSpacing: 2 }]}>
                {activeSosIncidentId ? 'ACTIVE' : 'SOS'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
            <Text style={[typography.headlineMd, { color: colors.onSurface }]}>Emergency Help</Text>
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'center', maxWidth: 240 }]}>Tap for immediate local assistance</Text>
          </View>
        </View>

        <View style={[styles.grid, { gap: spacing.md, marginTop: spacing.xl }]}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md }]} onPress={() => navigation.navigate('ReportHazard')}>
            <View style={[styles.actionIcon, { borderColor: colors.outlineVariant, borderRadius: radius.md }]}>
              <MaterialIcons name="warning" size={22} color={colors.onSurface} />
            </View>
            <Text style={[typography.labelLg, { color: colors.onSurface }]}>Report Hazard</Text>
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, marginTop: 4 }]}>Flood, fire, or blocked roads</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md }]} onPress={() => navigation.navigate('MyStatus')}>
            <View style={[styles.actionIcon, { borderColor: colors.outlineVariant, borderRadius: radius.md }]}>
              <MaterialIcons name="check-circle" size={22} color={colors.onSurface} />
            </View>
            <Text style={[typography.labelLg, { color: colors.onSurface }]}>My Status</Text>
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, marginTop: 4 }]}>Let others know you're safe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9999 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  main: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sosWrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: 9999, borderWidth: 1, alignSelf: 'center' },
  sosButton: {
    width: 192,
    height: 192,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  grid: { flexDirection: 'row', width: '100%' },
  actionCard: { flex: 1, borderWidth: 1 },
  actionIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 8 },
});
