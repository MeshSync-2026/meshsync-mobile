import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { diagLog } from '../backend/utils/diagnosticLogger';
import { useMeshSync } from '../context/MeshSyncContext';

export default function MeshDiagnosticsModal({ visible, onClose }) {
  const { colors, typography, isDark } = useTheme();
  const { nodeId, peerCount, isOnline } = useMeshSync();
  const [snapshot, setSnapshot] = useState(diagLog.getSnapshot());

  useEffect(() => {
    if (!visible) return;
    setSnapshot(diagLog.getSnapshot());
    const unsubscribe = diagLog.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });
    return unsubscribe;
  }, [visible]);

  const { state, logs } = snapshot;

  const handleShareLogs = async () => {
    try {
      const dump = diagLog.exportLogsAsText();
      await Share.share({
        title: 'MeshSync Diagnostic Logs',
        message: dump,
      });
    } catch (err) {
      Alert.alert('Error sharing logs', err.message);
    }
  };

  const handleClearLogs = () => {
    diagLog.clearLogs();
  };

  const getStatusColor = (isGood) => (isGood ? '#10B981' : '#EF4444');

  const isAdapterGood = state.adapterState === 'PoweredOn';
  const isPeripheralGood = state.peripheralStatus && state.peripheralStatus.startsWith('Advertising');
  const isScannerGood = state.scannerStatus === 'Scanning';
  const isPermGood =
    state.permissions &&
    (state.permissions['android.permission.BLUETOOTH_SCAN'] === 'granted' ||
      state.permissions.hasScan === true);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F9FAFB' }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#27272A' : '#E5E7EB' }]}>
          <View>
            <Text style={[typography.titleMd, { color: isDark ? '#F3F4F6' : '#111827', fontWeight: 'bold' }]}>
              BLE Mesh Diagnostics
            </Text>
            <Text style={[typography.bodySm, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Node: {nodeId || state.nodeId || 'unknown'} • Build v2.4.1
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialIcons name="close" size={24} color={isDark ? '#F3F4F6' : '#111827'} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Quick Hardware & Stack Health Cards */}
          <Text style={[typography.labelLg, styles.sectionTitle, { color: isDark ? '#D1D5DB' : '#374151' }]}>
            HARDWARE & STACK STATUS
          </Text>
          <View style={styles.grid}>
            <View style={[styles.statusCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="bluetooth" size={18} color={getStatusColor(isAdapterGood)} />
                <Text style={[typography.labelMd, { color: isDark ? '#E5E7EB' : '#374151', fontWeight: '600' }]}>
                  Adapter
                </Text>
              </View>
              <Text style={[typography.bodySm, { color: getStatusColor(isAdapterGood), fontWeight: 'bold' }]}>
                {state.adapterState || 'Unknown'}
              </Text>
            </View>

            <View style={[styles.statusCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="podcasts" size={18} color={getStatusColor(isPeripheralGood)} />
                <Text style={[typography.labelMd, { color: isDark ? '#E5E7EB' : '#374151', fontWeight: '600' }]}>
                  Peripheral (Adv)
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[typography.bodySm, { color: getStatusColor(isPeripheralGood), fontWeight: 'bold' }]}
              >
                {state.peripheralStatus || 'Stopped'}
              </Text>
            </View>

            <View style={[styles.statusCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="radar" size={18} color={getStatusColor(isScannerGood)} />
                <Text style={[typography.labelMd, { color: isDark ? '#E5E7EB' : '#374151', fontWeight: '600' }]}>
                  Central (Scan)
                </Text>
              </View>
              <Text style={[typography.bodySm, { color: getStatusColor(isScannerGood), fontWeight: 'bold' }]}>
                {state.scannerStatus || 'Stopped'}
              </Text>
            </View>

            <View style={[styles.statusCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="verified-user" size={18} color={getStatusColor(isPermGood)} />
                <Text style={[typography.labelMd, { color: isDark ? '#E5E7EB' : '#374151', fontWeight: '600' }]}>
                  Permissions
                </Text>
              </View>
              <Text style={[typography.bodySm, { color: getStatusColor(isPermGood), fontWeight: 'bold' }]}>
                {isPermGood ? 'Granted' : 'Checking...'}
              </Text>
            </View>
          </View>

          {/* Errors banner if any */}
          {(state.peripheralError || state.scannerError) && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="warning" size={20} color="#EF4444" />
              <View style={{ flex: 1 }}>
                {state.peripheralError ? (
                  <Text style={styles.errorText}>Peripheral: {state.peripheralError}</Text>
                ) : null}
                {state.scannerError ? (
                  <Text style={styles.errorText}>Scanner: {state.scannerError}</Text>
                ) : null}
              </View>
            </View>
          )}

          {/* Active Peers */}
          <Text style={[typography.labelLg, styles.sectionTitle, { color: isDark ? '#D1D5DB' : '#374151' }]}>
            DISCOVERED PEERS ({state.discoveredPeers?.length || 0})
          </Text>
          <View style={[styles.peersContainer, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
            {state.discoveredPeers && state.discoveredPeers.length > 0 ? (
              state.discoveredPeers.map((peer, idx) => (
                <View key={idx} style={styles.peerItem}>
                  <MaterialIcons name="devices" size={16} color="#3B82F6" />
                  <Text style={[typography.bodySm, { color: isDark ? '#F3F4F6' : '#111827', fontWeight: '600' }]}>
                    {peer}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[typography.bodySm, { color: isDark ? '#9CA3AF' : '#6B7280', fontStyle: 'italic' }]}>
                No peers discovered yet. Ensure both phones have Bluetooth and Location (GPS) turned ON.
              </Text>
            )}
          </View>

          {/* Action Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2563EB' }]} onPress={handleShareLogs}>
              <MaterialIcons name="share" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Copy / Share Logs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
              onPress={handleClearLogs}
            >
              <MaterialIcons name="delete-outline" size={16} color={isDark ? '#F3F4F6' : '#374151'} />
              <Text style={[styles.actionBtnText, { color: isDark ? '#F3F4F6' : '#374151' }]}>Clear Logs</Text>
            </TouchableOpacity>
          </View>

          {/* Live Log Stream */}
          <Text style={[typography.labelLg, styles.sectionTitle, { color: isDark ? '#D1D5DB' : '#374151' }]}>
            REAL-TIME LOG STREAM ({logs.length})
          </Text>
          <View style={[styles.logConsole, { backgroundColor: isDark ? '#0A0A0C' : '#1F2937' }]}>
            {logs.length > 0 ? (
              logs.map((item) => {
                let badgeColor = '#9CA3AF';
                if (item.level === 'SUCCESS') badgeColor = '#10B981';
                else if (item.level === 'ERROR') badgeColor = '#EF4444';
                else if (item.level === 'WARN') badgeColor = '#F59E0B';

                return (
                  <View key={item.id} style={styles.logRow}>
                    <Text style={styles.logTime}>{item.time}</Text>
                    <Text style={[styles.logBadge, { color: badgeColor }]}>[{item.level}]</Text>
                    <Text style={styles.logTag}>[{item.tag}]</Text>
                    <Text style={styles.logMsg}>
                      {item.message}
                      {item.details ? ` (${item.details})` : ''}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={{ color: '#6B7280', fontStyle: 'italic', padding: 8 }}>Awaiting events...</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusCard: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  peersContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
    minHeight: 44,
    justifyContent: 'center',
  },
  peerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  logConsole: {
    borderRadius: 8,
    padding: 10,
    minHeight: 220,
    maxHeight: 380,
  },
  logRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  logTime: {
    color: '#6B7280',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logTag: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logMsg: {
    color: '#D1D5DB',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
});
