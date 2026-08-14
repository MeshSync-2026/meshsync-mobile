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
      <TopAppBar title="My Status" onSettingsPress={() => {}} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.marginMobile, paddingTop: spacing.lg, paddingBottom: 48, gap: spacing.lg }}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.ink, borderRadius: radius.xl, padding: spacing.lg }]}>
          <Text style={[typography.labelLg, { color: colors.onInk, opacity: 0.8, textTransform: 'uppercase' }]}>Live Sync</Text>
          <Text style={[typography.headlineMd, { color: colors.onInk }]}>Update mesh data</Text>
          <MaterialIcons
            name="podcasts"
            size={48}
            color={colors.onInk}
            style={{ position: 'absolute', right: 16, opacity: 0.12 }}
          />
        </View>

        <SegmentedGroup
          icon="home"
          label="Are you safe?"
          options={['Safe', 'Need Help', 'Trapped']}
          value={safety}
          onChange={setSafety}
        />

        <SegmentedGroup icon="water-drop" label="Water supply" options={['Enough', 'Low', 'None']} value={water} onChange={setWater} />

        <SegmentedGroup icon="restaurant" label="Food supply" options={['Enough', 'Low', 'None']} value={food} onChange={setFood} />

        <SegmentedGroup
          icon="medical-services"
          label="Medical status"
          options={['Uninjured', 'Minor', 'Serious']}
          value={medical}
          onChange={setMedical}
        />

        {/* People stepper */}
        <View
          style={[
            styles.peopleCard,
            { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radius.xl, padding: spacing.md },
          ]}
        >
          <View>
            <Text style={[typography.labelLg, { color: colors.onSurface }]}>People with you</Text>
            <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Including yourself</Text>
          </View>
          <Stepper value={people} onChange={setPeople} />
        </View>

        <PrimaryButton label="Send Status" icon="send" onPress={send} />

        <Text style={[typography.labelMd, { color: colors.onSurfaceVariant, opacity: 0.8, textAlign: 'center', paddingHorizontal: spacing.xl }]}>
          Updates will be transmitted to the nearest mesh node automatically.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', height: 96, justifyContent: 'center' },
  peopleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
});
