import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import MeshStatusBar from '../components/MeshStatusBar';
import TopAppBar from '../components/TopAppBar';
import { urgentRequests, communityReports, resolvedReports } from '../data/mockData';

export default function NearbyReportsScreen() {
  const { colors, spacing, radius, typography, isDark } = useTheme();
  const cardSurface = isDark ? colors.surfaceContainerHigh : colors.surfaceContainerLowest;
  const mutedPanel = isDark ? colors.surfaceContainerHigh : '#F3F3F3';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <MeshStatusBar />
      <TopAppBar title="Nearby Reports" showBack={false} />

      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: spacing.marginMobile, gap: spacing.md }]}>
        <View style={[styles.radarCard, { backgroundColor: isDark ? colors.surfaceContainerHigh : '#F4F5F5', borderColor: colors.outlineVariant, borderRadius: radius.xl }]}>
          <View style={styles.radarHeader}>
            <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>Local Mesh Radar</Text>
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, opacity: 0.8 }]}>Live View</Text>
          </View>

          <View style={styles.radarArea}>
            <View style={[styles.ringOne, { borderColor: colors.outlineVariant }]} />
            <View style={[styles.ringTwo, { borderColor: colors.outlineVariant }]} />
            <View style={[styles.ringThree, { borderColor: colors.outlineVariant }]} />
            <View style={[styles.dot, { left: '45%', top: '42%', backgroundColor: colors.onSurface }]} />
            <View style={[styles.dot, { left: '24%', top: '55%', backgroundColor: colors.onSurfaceVariant }]} />
            <View style={[styles.dot, { right: '18%', top: '60%', backgroundColor: colors.onSurfaceVariant }]} />
            <View style={[styles.dot, { left: '64%', bottom: '20%', backgroundColor: colors.onSurfaceVariant }]} />
            <View style={[styles.dot, { left: '48%', top: '30%', backgroundColor: colors.error }]} />
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, position: 'absolute', bottom: 10, alignSelf: 'center' }]}>Tap a dot for details</Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="warning" size={20} color={colors.error} />
            <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>Urgent Requests</Text>
          </View>

          {urgentRequests.map((r) => (
            <View key={r.id} style={[styles.urgentCard, { backgroundColor: cardSurface, borderColor: colors.error, borderRadius: radius.xl }]}> 
              <View style={styles.urgentHeader}>
                <View style={[styles.urgentIconWrap, { backgroundColor: isDark ? '#3B3B3B' : '#EAEAEA' }]}><MaterialIcons name="medical-services" size={24} color={colors.error} /></View>
                <Text style={[typography.headlineMd, { color: colors.onSurface, flex: 1 }]}>First Aid Needed</Text>
                <View style={[styles.sosBadge, { backgroundColor: colors.error, borderRadius: radius.md }]}><Text style={[typography.labelLg, { color: colors.onPrimary }]}>SOS</Text></View>
              </View>
              <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>~350m • 2m ago</Text>
              <Text style={[typography.bodyMd, { color: colors.onSurface, marginTop: 4 }]}>Near Ferry Building North Entrance. Individual with minor injury, needs antiseptic and bandages.</Text>
              <TouchableOpacity style={[styles.helpButton, { backgroundColor: isDark ? colors.surfaceContainerLowest : '#F7F7F7', borderColor: colors.outlineVariant, borderRadius: radius.md }]}>
                <MaterialIcons name="handshake" size={18} color={colors.onSurface} />
                <Text style={[typography.labelLg, { color: colors.onSurface }]}>I can help</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="groups" size={20} color={colors.onSurface} />
            <Text style={[typography.labelLg, { color: colors.onSurface, textTransform: 'uppercase' }]}>Community Reports</Text>
          </View>
          {communityReports.map((r) => (
            <View key={r.id} style={[styles.reportCard, { backgroundColor: mutedPanel, borderColor: colors.outlineVariant, borderRadius: radius.xl }]}>
              <View style={styles.reportRow}>
                <View style={[styles.reportIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#E9EBEB' }]}><MaterialIcons name={r.icon} size={20} color={colors.onSurface} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.labelLg, { color: colors.onSurface }]}>{r.title}</Text>
                  <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>{r.distance} • {r.time}</Text>
                </View>
              </View>
              <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>{r.description}</Text>
              <View style={styles.reportFooter}>
                <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>{r.responders} people responding</Text>
                <TouchableOpacity style={[styles.detailsBtn, { borderColor: colors.outlineVariant, borderRadius: radius.md }]}><Text style={[typography.labelLg, { color: colors.onSurface }]}>Details</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.sm, opacity: 0.8 }}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="check-circle" size={20} color={colors.onSurfaceVariant} />
            <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textTransform: 'uppercase' }]}>Recently Resolved</Text>
          </View>
          {resolvedReports.map((r) => (
            <View key={r.id} style={[styles.resolvedRow, { backgroundColor: mutedPanel, borderColor: colors.outlineVariant, borderRadius: radius.md }]}>
              <View style={[styles.resolvedIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#EAEBEB' }]}><MaterialIcons name={r.icon} size={18} color={colors.onSurfaceVariant} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' }]}>{r.title}</Text>
                <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>{r.note}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 128 },
  radarCard: { borderWidth: 1, padding: 12 },
  radarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  radarArea: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 1,
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.01)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringOne: { position: 'absolute', width: '82%', height: '82%', borderWidth: 1, borderRadius: 999 },
  ringTwo: { position: 'absolute', width: '58%', height: '58%', borderWidth: 1, borderRadius: 999 },
  ringThree: { position: 'absolute', width: '38%', height: '38%', borderWidth: 1, borderRadius: 999 },
  dot: { position: 'absolute', width: 12, height: 12, borderRadius: 999 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgentCard: { borderWidth: 2, padding: 16 },
  urgentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  urgentIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#3B3B3B', alignItems: 'center', justifyContent: 'center' },
  sosBadge: { paddingHorizontal: 12, paddingVertical: 8 },
  helpButton: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, paddingVertical: 12 },
  reportCard: { borderWidth: 1, padding: 14 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  reportIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  reportFooter: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailsBtn: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12 },
  resolvedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 1 },
  resolvedIcon: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
});
