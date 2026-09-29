import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useMeshSync } from '../context/MeshSyncContext';
import MeshDiagnosticsModal from '../components/MeshDiagnosticsModal';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors, spacing, radius, typography, isDark, toggleScheme } = useTheme();
  const { peerCount, isOnline, sendSOS, userProfile } = useMeshSync();
  const [showDiag, setShowDiag] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const triggerSOS = () => {
    Alert.alert(
      'Send Emergency SOS?',
      'This will broadcast an urgent emergency alert with your high-precision GPS coordinates across nearby mesh devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Broadcast SOS',
          style: 'destructive',
          onPress: async () => {
            const result = await sendSOS();
            if (result.success) {
              Alert.alert(
                'SOS Broadcasted',
                'Your emergency alert is active and being relayed across all nearby mesh nodes.'
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.outlineVariant, paddingHorizontal: spacing.marginMobile }]}>
        <TouchableOpacity
          style={styles.headerLeft}
          activeOpacity={0.7}
          onPress={() => setShowDiag(true)}
          accessibilityRole="button"
          accessibilityLabel="Open mesh diagnostics"
        >
          <MaterialIcons name="hub" size={18} color={colors.onSurface} />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[typography.labelLg, { color: colors.onSurface }]}>
                {peerCount} {peerCount === 1 ? 'peer' : 'peers'} nearby
              </Text>
              <View style={styles.debugPill}>
                <MaterialIcons name="bug-report" size={10} color="#3B82F6" />
                <Text style={styles.debugText}>DEBUG</Text>
              </View>
            </View>
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>
              {isOnline ? 'Online • Mesh Active' : 'Offline • Mesh Active'}
            </Text>
          </View>
        </TouchableOpacity>
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
              <MaterialIcons name="priority-high" size={48} color={colors.onSecondary} />
              <Text style={[typography.headlineMd, { color: colors.onSecondary, marginTop: 6, letterSpacing: 2 }]}>SOS</Text>
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

      <MeshDiagnosticsModal visible={showDiag} onClose={() => setShowDiag(false)} />
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
  debugPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  debugText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.4,
  },
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
