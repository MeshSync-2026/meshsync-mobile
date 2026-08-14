import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import TopAppBar from '../components/TopAppBar';
import PrimaryButton from '../components/PrimaryButton';
import SegmentedGroup from '../components/SegmentedGroup';
import Stepper from '../components/Stepper';

export default function MyStatusScreen() {
  const navigation = useNavigation();
  const { colors, spacing, radius, typography } = useTheme();

  const [safety, setSafety] = useState('Safe');
  const [water, setWater] = useState('Enough');
  const [food, setFood] = useState('Enough');
  const [medical, setMedical] = useState('Uninjured');
  const [people, setPeople] = useState(1);

  const send = () => {
    Alert.alert('Status sent', 'Your update will be transmitted to the nearest mesh node automatically.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <TopAppBar title="My Status" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.marginMobile, paddingTop: spacing.lg, paddingBottom: 48, gap: spacing.lg }}>
        <View style={[styles.hero, { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.xl, padding: spacing.lg }]}>
          <Text style={[typography.labelLg, { color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6 }]}>Live Sync</Text>
          <Text style={[typography.headlineLgMobile, { color: colors.onSurface, marginTop: 4 }]}>Update mesh data</Text>
          <MaterialIcons name="podcasts" size={42} color={colors.onSurfaceVariant} style={{ position: 'absolute', right: 18, top: 24, opacity: 0.35 }} />
        </View>

        <SegmentedGroup icon="home" label="Are you safe?" options={['Safe', 'Need Help', 'Trapped']} value={safety} onChange={setSafety} />
        <SegmentedGroup icon="water-drop" label="Water supply" options={['Enough', 'Low', 'None']} value={water} onChange={setWater} />
        <SegmentedGroup icon="restaurant" label="Food supply" options={['Enough', 'Low', 'None']} value={food} onChange={setFood} />
        <SegmentedGroup icon="medical-services" label="Medical status" options={['Uninjured', 'Minor', 'Serious']} value={medical} onChange={setMedical} />

        <View style={[styles.peopleCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md }]}>
          <View>
            <Text style={[typography.labelLg, { color: colors.onSurface }]}>People with you</Text>
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Including yourself</Text>
          </View>
          <Stepper value={people} onChange={setPeople} />
        </View>

        <PrimaryButton label="Send Status" icon="play-arrow" onPress={send} style={{ backgroundColor: colors.surfaceContainerHighest }} buttonColor="#FFFFFF" textColor="#111827" iconColor="#111827" />

        <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 18 }]}>Updates will be transmitted to the nearest mesh node automatically.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', height: 96, justifyContent: 'center' },
  peopleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
});
