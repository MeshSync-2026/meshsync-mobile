import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Image, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import TopAppBar from '../components/TopAppBar';
import { profile } from '../data/mockData';

export default function ProfileScreen() {
  const { colors, spacing, radius, typography, isDark, toggleScheme } = useTheme();
  const [relayAuto, setRelayAuto] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <TopAppBar
        title="Profile"
        rightIcon={isDark ? 'light-mode' : 'dark-mode'}
        onRightPress={toggleScheme}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.marginMobile, paddingTop: spacing.sm, paddingBottom: 48, gap: spacing.lg }}>
        {/* Summary */}
        <View
          style={[
            styles.summary,
            { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md },
          ]}
        >
          <View style={styles.summaryLeft}>
            <View style={[styles.avatar, { backgroundColor: colors.surfaceVariant, borderColor: colors.surfaceContainerHigh }]}>
              <MaterialIcons name="person" size={32} color={colors.onSurfaceVariant} />
            </View>
            <Text style={[typography.headlineLgMobile, { color: colors.onSurface }]}>{profile.name}</Text>
          </View>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.surfaceContainer }]}>
            <MaterialIcons name="edit" size={20} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Personal details */}
        <SectionLabel text="Personal Details" />
        <View style={[styles.listCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radius.xl }]}>
          <Row label="Full Name" value={profile.fullName} icon="chevron-right" border />
          <Row label="NIC Number" value={profile.nic} icon="lock" border />
          <Row label="Phone Number" value={profile.phone} icon="chevron-right" />
        </View>

        {/* Locations */}
        <View style={{ gap: spacing.md }}>
          <View>
            <SectionLabel text="Home Location" />
            <View
              style={[
                styles.locationCard,
                { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md },
              ]}
            >
              <View style={styles.rowGap}>
                <MaterialIcons name="home" size={18} color={colors.onSurface} />
                <Text style={[typography.labelLg, { color: colors.onSurface }]}>Saved Home</Text>
              </View>
              <Text style={[typography.bodyMd, { color: colors.onSurface, marginTop: 8 }]}>{profile.homeLocation}</Text>
              <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                Landmark: {profile.landmark}
              </Text>
              <TouchableOpacity style={styles.linkRow}>
                <Text style={[typography.labelLg, { color: colors.primary }]}>Edit</Text>
                <MaterialIcons name="open-in-new" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <SectionLabel text="Temporary Location" />
            <View
              style={[
                styles.locationCard,
                { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md },
              ]}
            >
              <View style={styles.rowGap}>
                <MaterialIcons name="wrong-location" size={18} color={colors.onSurface} />
                <Text style={[typography.labelLg, { color: colors.onSurface }]}>Current Status</Text>
              </View>
              <View style={[styles.chip, { borderColor: colors.ink }]}>
                <Text style={[typography.labelMd, { color: colors.onSurface }]}>{profile.tempStatus}</Text>
              </View>
              <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: 8 }]}>Relay priority increased.</Text>
              <TouchableOpacity style={styles.linkRow}>
                <Text style={[typography.labelLg, { color: colors.primary }]}>Manage</Text>
                <MaterialIcons name="near-me" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Data sharing */}
        <SectionLabel text="Data Sharing" />
        <View style={[styles.listCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radius.xl }]}>
          <ToggleRow
            label="Relay mesh data automatically when I have internet"
            value={relayAuto}
            onValueChange={setRelayAuto}
            border
          />
          <ToggleRow label="Only relay over Wi-Fi (not mobile data)" value={wifiOnly} onValueChange={setWifiOnly} indented border />
          <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, opacity: 0.6, fontStyle: 'italic', padding: spacing.md }]}>
            When your device reconnects, it may upload reports from nearby mesh devices, not just your own, to help reach authorities faster.
          </Text>
        </View>

        {/* Mesh contribution */}
        <SectionLabel text="Mesh Contribution" />
        <View
          style={[
            styles.listCard,
            { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md },
          ]}
        >
          <View style={styles.rowBetween}>
            <View style={styles.rowGap}>
              <MaterialIcons name="volunteer-activism" size={20} color={colors.primary} />
              <Text style={[typography.bodyMd, { color: colors.onSurface }]}>Reports relayed as data mule</Text>
            </View>
            <Text style={[typography.headlineMd, { color: colors.primary }]}>{profile.dataMuleReports}</Text>
          </View>
        </View>

        <View style={{ alignItems: 'center', paddingTop: spacing.lg }}>
          <TouchableOpacity onPress={() => Alert.alert('Reset App Data', 'This will erase all local data on this device.')}>
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, opacity: 0.6 }]}>Reset App Data</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 10, color: colors.outlineVariant, marginTop: 4 }}>{profile.version}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ text }) {
  const { colors, typography } = useTheme();
  return <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>{text}</Text>;
}

function Row({ label, value, icon, border }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.row, border && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }, { padding: spacing.md }]}>
      <View>
        <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[typography.bodyMd, { color: colors.onSurface }]}>{value}</Text>
      </View>
      <MaterialIcons name={icon} size={20} color={colors.outline} />
    </View>
  );
}

function ToggleRow({ label, value, onValueChange, border, indented }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View
      style={[
        styles.row,
        border && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
        { padding: spacing.md, paddingLeft: indented ? spacing.xl : spacing.md },
      ]}
    >
      <Text style={[typography.bodyMd, { color: colors.onSurface, flex: 1, marginRight: 12 }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.primary, false: colors.outlineVariant }} />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  listCard: { borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationCard: { borderWidth: 1 },
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16 },
});
