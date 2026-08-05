import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function Card({ children, style, padded = true }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderColor: colors.outlineVariant,
          borderRadius: radius.xl,
          padding: padded ? spacing.md : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
});
