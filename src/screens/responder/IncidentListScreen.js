import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { incidents as allIncidents } from '../../data/mockData';

export default function IncidentListScreen({ route, navigation }) {
  const { selectedMeshId, selectedMeshName } = route?.params || {};

  const incidents = selectedMeshId
    ? allIncidents.filter((item) => item.meshId === selectedMeshId)
    : allIncidents;

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        {selectedMeshId && (
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
        )}

        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.eyebrow}>
            {selectedMeshId ? `MESH: ${selectedMeshId}` : 'RESPONDER OPERATIONS'}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {selectedMeshName ? selectedMeshName : 'Good afternoon'}
          </Text>
          <Text style={styles.subtitle}>
            {selectedMeshId
              ? `Showing active incidents in ${selectedMeshName}`
              : 'Stay aware. Stay connected.'}
          </Text>
        </View>

        <View style={styles.statusCircle}>
          <Text style={styles.statusIcon}>✓</Text>
        </View>
      </View>

      {/* Mesh status */}
      <View style={styles.meshCard}>
        <View style={styles.meshLeft}>
          <View style={styles.onlineDot} />

          <View>
            <Text style={styles.meshTitle}>
              MESH ACTIVE
            </Text>
            <Text style={styles.meshSubtitle}>
              4 nearby responders
            </Text>
          </View>
        </View>

        <View>
          <Text style={styles.syncLabel}>
            LAST SYNC
          </Text>
          <Text style={styles.syncValue}>
            12 sec ago
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* Emergency summary */}
        <View style={styles.summaryRow}>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{incidents.length}</Text>
            <Text style={styles.summaryLabel}>
              ACTIVE
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {incidents.filter((item) => item.assignment !== 'NONE').length}
            </Text>
            <Text style={styles.summaryLabel}>
              MY TASKS
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>7</Text>
            <Text style={styles.summaryLabel}>
              NEARBY
            </Text>
          </View>

        </View>

        {/* Radar button */}
        <Pressable
          style={styles.radarButton}
          onPress={() => navigation.navigate('ResponderRadar')}
        >
          <View>
            <Text style={styles.radarEyebrow}>
              EMERGENCY RADAR
            </Text>

            <Text style={styles.radarTitle}>
              View nearby incidents
            </Text>

            <Text style={styles.radarDescription}>
              Scan the surrounding area for active SOS reports.
            </Text>
          </View>

          <View style={styles.radarArrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </Pressable>

        {/* My assignments */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedMeshName ? `${selectedMeshName} Incidents` : 'My assignments'}
          </Text>

          {selectedMeshId ? (
            <Pressable
              onPress={() =>
                navigation.setParams({ selectedMeshId: undefined, selectedMeshName: undefined })
              }
            >
              <Text style={styles.viewAll}>
                Show all
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() =>
                navigation.navigate('AssignedMeshes')
              }
            >
              <Text style={styles.viewAll}>
                View all
              </Text>
            </Pressable>
          )}
        </View>

        {/* Incident cards */}
        {incidents.length > 0 ? (
          incidents.map((incident) => (
            <Pressable
              key={incident.id}
              style={styles.incidentCard}
              onPress={() =>
                navigation.navigate(
                  'IncidentDetails',
                  {
                    incident,
                  }
                )
              }
            >

              <View style={styles.cardTop}>

                <View style={styles.incidentTitleArea}>
                  <View
                    style={[
                      styles.assignmentDot,
                      incident.assignment === 'DISPATCHED'
                        ? styles.blueDot
                        : incident.assignment === 'SELF-ASSIGNED'
                        ? styles.yellowDot
                        : styles.grayDot,
                    ]}
                  />

                  <View>
                    <Text style={styles.incidentType}>
                      {incident.type}
                    </Text>

                    <Text style={styles.incidentId}>
                      {incident.id}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.severityBadge,
                    incident.severity === 'HIGH'
                      ? styles.highBadge
                      : incident.severity === 'MEDIUM'
                      ? styles.mediumBadge
                      : styles.lowBadge,
                  ]}
                >
                  <Text style={styles.severityText}>
                    {incident.severity}
                  </Text>
                </View>

              </View>

              <View style={styles.divider} />

              <View style={styles.cardInfoRow}>

                <Text style={styles.location}>
                  {incident.location}
                </Text>

                <Text style={styles.distance}>
                  {incident.distance}
                </Text>

              </View>

              <View style={styles.cardBottom}>

                <Text
                  style={[
                    styles.statusText,
                    incident.status === 'LIVE'
                      ? styles.liveText
                      : styles.unconfirmedText,
                  ]}
                >
                  ● {incident.status}
                </Text>

                <Text style={styles.time}>
                  {incident.time}
                </Text>

              </View>

            </Pressable>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No active incidents reported in this mesh area.
            </Text>
          </View>
        )}

        <View style={{ height: 30 }} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  header: {
    paddingTop: 55,
    paddingHorizontal: 22,
    paddingBottom: 20,
    backgroundColor: '#111827',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  backButton: {
    marginRight: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  eyebrow: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  title: {
    marginTop: 5,
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#D1D5DB',
  },

  statusCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusIcon: {
    color: '#34D399',
    fontSize: 20,
    fontWeight: '800',
  },

  meshCard: {
    marginHorizontal: 18,
    marginTop: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  meshLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  onlineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    marginRight: 10,
  },

  meshTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },

  meshSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#6B7280',
  },

  syncLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    textAlign: 'right',
  },

  syncValue: {
    marginTop: 2,
    fontSize: 11,
    color: '#374151',
    textAlign: 'right',
  },

  content: {
    padding: 18,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },

  summaryNumber: {
    fontSize: 23,
    fontWeight: '800',
    color: '#111827',
  },

  summaryLabel: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.7,
  },

  radarButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  radarEyebrow: {
    color: '#BFDBFE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  radarTitle: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },

  radarDescription: {
    marginTop: 5,
    color: '#DBEAFE',
    fontSize: 11,
    maxWidth: 220,
    lineHeight: 16,
  },

  radarArrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowText: {
    color: '#1D4ED8',
    fontSize: 23,
    fontWeight: '700',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  viewAll: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
  },

  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  incidentTitleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  assignmentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },

  blueDot: {
    backgroundColor: '#2563EB',
  },

  yellowDot: {
    backgroundColor: '#FACC15',
  },

  grayDot: {
    backgroundColor: '#9CA3AF',
  },

  incidentType: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  incidentId: {
    marginTop: 2,
    fontSize: 10,
    color: '#9CA3AF',
  },

  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  highBadge: {
    backgroundColor: '#FEE2E2',
  },

  mediumBadge: {
    backgroundColor: '#FEF3C7',
  },

  lowBadge: {
    backgroundColor: '#DCFCE7',
  },

  severityText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#374151',
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },

  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  location: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },

  distance: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
  },

  cardBottom: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  liveText: {
    color: '#16A34A',
  },

  unconfirmedText: {
    color: '#D97706',
  },

  time: {
    fontSize: 10,
    color: '#9CA3AF',
  },

  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 10,
  },

  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
});