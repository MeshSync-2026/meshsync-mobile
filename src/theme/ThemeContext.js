import React, { createContext, useContext, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import { light, dark } from './colors';
import { spacing, radius } from './spacing';
import { type as typography } from './typography';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [scheme, setScheme] = useState(Appearance.getColorScheme() || 'light');

  const value = useMemo(() => {
    const colors = scheme === 'dark' ? dark : light;
    return {
      scheme,
      colors,
      spacing,
      radius,
      typography,
      isDark: scheme === 'dark',
      toggleScheme: () => setScheme((s) => (s === 'dark' ? 'light' : 'dark')),
      setScheme,
    };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
