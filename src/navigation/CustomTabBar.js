import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

const ICONS = {
  Home: 'home',
  Nearby: 'social-distance',
  MyActivity: 'sync',
};

const LABELS = {
  Home: 'Home',
  Nearby: 'Nearby',
  MyActivity: 'My Activity',
};

export default function CustomTabBar({ state, navigation }) {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderTopColor: colors.outlineVariant,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            activeOpacity={0.85}
            style={[
              styles.tab,
              {
                borderRadius: radius.full,
                backgroundColor: focused ? colors.ink : 'transparent',
                paddingHorizontal: spacing.lg,
              },
            ]}
          >
            <MaterialIcons
              name={ICONS[route.name]}
              size={22}
              color={focused ? colors.onInk : colors.onSurfaceVariant}
            />
            <Text
              style={[
                typography.labelLg,
                { color: focused ? colors.onInk : colors.onSurfaceVariant, marginTop: 2 },
              ]}
            >
              {LABELS[route.name]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});
