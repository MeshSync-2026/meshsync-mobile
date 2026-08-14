import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function ReportCard({ report, onPressDetails, urgent = false }) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderColor: urgent ? colors.error : colors.outlineVariant,
          borderRadius: radius.xl,
          padding: spacing.md,
          gap: spacing.sm,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant, borderRadius: radius.md },
            ]}
          >
            <MaterialIcons name={report.icon} size={20} color={urgent ? colors.error : colors.onSurface} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={[typography.labelLg, { color: colors.onSurface, fontWeight: '700' }]}>{report.title}</Text>
            <View style={styles.metaRow}>
              <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>{report.distance}</Text>
              <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}> • {report.time}</Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>{report.description}</Text>
      <View style={styles.footerRow}>
        <View style={styles.metaRow}>
          <MaterialIcons name="groups" size={16} color={colors.onSurface} />
          <Text style={[typography.labelMd, { color: colors.onSurface }]}>
            {report.responders > 0 ? `${report.responders} people responding` : 'No responders yet'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onPressDetails}
          style={[styles.detailsBtn, { borderColor: colors.ink, borderRadius: radius.md }]}
        >
          <Text style={[typography.labelLg, { color: colors.onSurface, fontWeight: '700' }]}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailsBtn: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1 },
});
