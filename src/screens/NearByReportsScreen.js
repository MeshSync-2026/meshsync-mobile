import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import MeshStatusBar from '../components/MeshStatusBar';
import TopAppBar from '../components/TopAppBar';
import Card from '../components/Card';
import RadarView from '../components/RadarView';
import ReportCard from '../components/ReportCard';
import { urgentRequests, communityReports, resolvedReports } from '../data/mockData';

export default function NearbyReportsScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <MeshStatusBar />
      <TopAppBar title="Nearby Reports" showBack={false} onSettingsPress={() => {}} />

      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: spacing.marginMobile, gap: spacing.md }]}>
        <Card>
          <View style={styles.radarHeader}>
            <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textTransform: 'uppercase' }]}>
              Local Mesh Radar
            </Text>
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, opacity: 0.6 }]}>Live View</Text>
          </View>
          <RadarView />
        </Card>

        <Section icon="emergency" label="Urgent Requests" color={colors.error}>
          {urgentRequests.map((r) => (
            <ReportCard key={r.id} report={r} urgent />
          ))}
        </Section>

        <Section icon="groups" label="Community Reports">
          {communityReports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </Section>

        <View style={{ opacity: 0.6, gap: spacing.sm }}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="check-circle" size={20} color={colors.onSurfaceVariant} />
            <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textTransform: 'uppercase' }]}>
              Recently Resolved
            </Text>
          </View>
          {resolvedReports.map((r) => (
            <View
              key={r.id}
              style={[styles.resolvedRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
            >
              <MaterialIcons name={r.icon} size={20} color={colors.onSurfaceVariant} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' }]}>
                  {r.title}
                </Text>
                <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>{r.note}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ icon, label, color, children }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name={icon} size={20} color={color || colors.onSurface} />
        <Text style={[typography.labelLg, { color: color || colors.onSurface, textTransform: 'uppercase' }]}>{label}</Text>
      </View>
      <View style={{ gap: spacing.md }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 128 },
  radarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resolvedRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 8, borderWidth: 1, borderRadius: 8 },
});
