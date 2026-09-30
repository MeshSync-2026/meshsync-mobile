import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';

const ICONS = {
  Home: 'home',
  Nearby: 'my-location',
  MyActivity: 'check-circle',
};

const LABEL_KEYS = {
  Home: 'home.title',
  Nearby: 'nearby.title',
  MyActivity: 'activity.title',
};

export default function CustomTabBar({ state, navigation }) {
  const { colors, spacing, radius, typography } = useTheme();
  const { t } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
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
                backgroundColor: focused ? colors.surfaceContainerHighest : 'transparent',
                width: '28%',
              },
            ]}
          >
            <MaterialIcons
              name={ICONS[route.name]}
              size={24}
              color={focused ? colors.onSurface : colors.onSurfaceVariant}
            />
            <Text
              style={[
                typography.labelLg,
                { color: focused ? colors.onSurface : colors.onSurfaceVariant, marginTop: 2 },
              ]}
            >
              {t(LABEL_KEYS[route.name] || route.name)}
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
    paddingHorizontal: 12,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 64,
  },
});
