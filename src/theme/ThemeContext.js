import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, dark } from './colors';
import { spacing, radius } from './spacing';
import { type as typography } from './typography';
import { shadows } from './shadows';

const THEME_KEY = '@meshsync_theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Dark by default (§10.7 — OLED black saves battery during emergencies)
  const [scheme, setSchemeState] = useState('dark');

  // Load persisted choice once
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        if (saved === 'dark' || saved === 'light') setSchemeState(saved);
      })
      .catch(() => {});
  }, []);

  const setScheme = (next) => {
    setSchemeState(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
  };

  const toggleScheme = (current) => {
    const from = typeof current === 'string' ? current : scheme;
    const next = from === 'dark' ? 'light' : 'dark';
    if (next === 'light') {
      // Warn before leaving dark — OLED battery guidance (§10.7)
      Alert.alert(
        'Switch to Light theme?',
        'We recommend Dark theme to conserve battery during emergencies. Light theme uses more power on OLED screens. You can switch back anytime.',
        [
          { text: 'Keep Dark', style: 'cancel' },
          { text: 'Switch anyway', style: 'destructive', onPress: () => setScheme('light') },
        ]
      );
      return;
    }
    setScheme('dark');
  };

  const value = useMemo(() => {
    const colors = scheme === 'dark' ? dark : light;
    return {
      scheme,
      colors,
      spacing,
      radius,
      typography,
      shadows,
      isDark: scheme === 'dark',
      toggleScheme,
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
