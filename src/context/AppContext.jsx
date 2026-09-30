// App-wide context shim — bridges the ported New Test screens to the
// Original infrastructure: i18n (en/si/ta) + theme tokens + role flags.
//
// Role mapping (Original hotState model → New Test 3-role model):
//   Civilian            = activeRole CIVILIAN
//   Civilian Responder  = activeRole RESPONDER, not registered
//   Authorized Responder= activeRole RESPONDER, registered (Command Center login)

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { LANGS, translations } from '../i18n/translations';
import { useTheme } from '../theme/ThemeContext';
import { useMeshSync } from './MeshSyncContext';
import { ROLE } from '../backend/store/hotState';

const LANG_KEY = '@meshsync_lang';

const AppContext = createContext(null);

function detectSystemLang() {
  try {
    const locale = Localization.getLocales?.()[0]?.languageCode || 'en';
    return LANGS.some((l) => l.code === locale) ? locale : 'en';
  } catch {
    return 'en';
  }
}

export function AppProvider({ children }) {
  const { colors, spacing, radius, typography, shadows } = useTheme();
  const { activeRole, isRegistered } = useMeshSync();

  const [lang, setLangState] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((saved) => {
        if (saved && LANGS.some((l) => l.code === saved)) setLangState(saved);
        else setLangState(detectSystemLang());
      })
      .catch(() => setLangState(detectSystemLang()));
  }, []);

  const setLang = useCallback((code) => {
    if (!LANGS.some((l) => l.code === code)) return;
    setLangState(code);
    AsyncStorage.setItem(LANG_KEY, code).catch(() => {});
  }, []);

  const t = useCallback(
    (key, vars) => {
      const table = translations[lang] || translations.en;
      let str = table[key] || translations.en[key] || key;
      if (vars) {
        for (const k of Object.keys(vars)) str = str.replace(`{${k}}`, vars[k]);
      }
      return str;
    },
    [lang]
  );

  const isCivilian = activeRole === ROLE.CIVILIAN;
  const isResponder = activeRole === ROLE.CIVILIAN_RESPONDER;
  const isAuthorized = activeRole === ROLE.RESPONDER;

  const value = useMemo(
    () => ({
      colors,
      spacing,
      radius,
      typography,
      shadows,
      lang,
      setLang,
      t,
      role: isAuthorized ? 3 : isResponder ? 2 : 1,
      isCivilian,
      isResponder,
      isAuthorized,
    }),
    [colors, spacing, radius, typography, shadows, lang, setLang, t, isCivilian, isResponder, isAuthorized]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider (inside MeshSyncProvider)');
  return ctx;
}
