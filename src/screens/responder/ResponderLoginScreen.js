import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../../theme/ThemeContext';
import { useMeshSync } from '../../context/MeshSyncContext';

import {
  saveResponderSession,
  clearResponderSession,
} from '../../utils/storage';


export default function ResponderLoginScreen({
  navigation,
}) {
  const {
    colors,
    spacing,
    radius,
    typography,
    isDark,
    toggleScheme,
  } = useTheme();

  const { loginResponder } = useMeshSync();

  const [responderId, setResponderId] = useState('');
  const [pin, setPin] = useState('');

  const [rememberDevice, setRememberDevice] =
    useState(true);

  const [showPin, setShowPin] =
    useState(false);

  const [loggingIn, setLoggingIn] =
    useState(false);

  const [loginError, setLoginError] =
    useState('');


  /*
   * Login button becomes enabled only when:
   *
   * Responder ID is entered
   * AND
   * PIN contains at least 4 digits
   */

  const canLogin =
    responderId.trim().length > 0 &&
    pin.trim().length >= 4;


  /*
   * =========================
   * LOGIN
   * =========================
   */

  const handleLogin = async () => {
    if (!canLogin || loggingIn) {
      return;
    }

    setLoginError('');
    setLoggingIn(true);

    try {
      const enteredId =
        responderId.trim().toUpperCase();

      const enteredPin =
        pin.trim();

      const result = await loginResponder({
        username: enteredId,
        password: enteredPin,
      });

      if (!result.success) {
        setLoginError(
          result.error || 'Invalid Responder ID or Security PIN.'
        );
        return;
      }


      /*
       * =========================
       * SUCCESSFUL LOGIN
       * =========================
       */

      if (rememberDevice) {

        const responderSession = {
          responderId: enteredId,
          pin: enteredPin,
          authorityUserId: result.authorityUserId || enteredId,
          assignedZoneId: result.assignedZoneId || 'ZONE-DEFAULT',
          token: result.token || '',

          authenticated: true,

          loginTime:
            new Date().toISOString(),
        };


        /*
         * Save responder authentication
         * locally using our storage helper.
         */

        await saveResponderSession(
          responderSession
        );


        console.log(
          'Responder session saved locally:',
          responderSession
        );

      } else {

        /*
         * User does not want the device
         * to remember the responder login.
         *
         * Remove any previous session.
         */

        await clearResponderSession();
      }


      /*
       * Mark onboarding complete for authorized responders too —
       * RootNavigator keys the initial route off this profile.
       */

      try {
        const profile = {
          name: result.user?.full_name || enteredId,
          fullName: result.user?.full_name || 'Authorized Responder',
          role: 'RESPONDER',
        };
        await AsyncStorage.setItem(
          '@meshsync_profile',
          JSON.stringify(profile)
        );
      } catch (profileErr) {
        console.log('Profile save skipped:', profileErr?.message || profileErr);
      }

      /*
       * Navigate to responder dashboard. When arriving from onboarding
       * (root stack), 'AssignedMeshes' only exists inside the Responder
       * navigator — fall back to the root 'Responder' route.
       */

      const state = navigation.getState?.();
      const routeNames = new Set((state?.routes || []).map((r) => r.name));
      if (routeNames.has('AssignedMeshes')) {
        navigation.replace('AssignedMeshes');
      } else {
        navigation.replace('Responder');
      }

    } catch (error) {

      console.error(
        'Responder authentication failed:',
        error
      );

      setLoginError(
        'Authentication error. Please try again.'
      );

    } finally {

      setLoggingIn(false);
    }
  };


  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
      edges={['top', 'bottom']}
    >

      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal:
                spacing.marginMobile,

              paddingTop:
                spacing.xl,

              paddingBottom:
                spacing.xl,
            },
          ]}
        >

          {/* =========================
              TOP ACTIONS
              ========================= */}

          <View style={styles.topActions}>

            <Pressable
              onPress={() => navigation.goBack()}
              style={[
                styles.iconBtn,
                {
                  borderColor:
                    colors.outlineVariant,

                  backgroundColor:
                    colors.surfaceContainerLowest,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >

              <MaterialIcons
                name="arrow-back"
                size={22}
                color={colors.onSurface}
              />

            </Pressable>

            <Pressable
              onPress={toggleScheme}
              style={[
                styles.iconBtn,
                {
                  borderColor:
                    colors.outlineVariant,

                  backgroundColor:
                    colors.surfaceContainerLowest,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Toggle theme"
            >

              <MaterialIcons
                name={
                  isDark
                    ? 'light-mode'
                    : 'dark-mode'
                }
                size={22}
                color={colors.onSurface}
              />

            </Pressable>

          </View>


          {/* =========================
              LOGO
              ========================= */}

          <View style={styles.brand}>

            <View
              style={[
                styles.logo,
                {
                  backgroundColor:
                    colors.onSurface,

                  borderRadius:
                    radius.lg,
                },
              ]}
            >

              <MaterialIcons
                name="hub"
                size={30}
                color={colors.background}
              />

            </View>


            <Text
              style={[
                typography.headlineMd,
                {
                  color:
                    colors.onSurface,

                  marginTop:
                    spacing.sm,
                },
              ]}
            >
              MeshSync
            </Text>

          </View>


          {/* =========================
              HEADING
              ========================= */}

          <View
            style={[
              styles.heading,
              {
                marginTop:
                  spacing.xl,
              },
            ]}
          >

            <Text
              style={[
                typography.headlineLgMobile,
                {
                  color:
                    colors.onSurface,
                },
              ]}
            >
              Responder Login
            </Text>


            <Text
              style={[
                typography.bodyMd,
                {
                  color:
                    colors.onSurfaceVariant,

                  marginTop:
                    spacing.xs,

                  textAlign:
                    'center',
                },
              ]}
            >
              Sign in to access your assigned
              emergency meshes.
            </Text>

          </View>


          {/* =========================
              LOGIN CARD
              ========================= */}

          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  colors.surfaceContainerLowest,

                borderColor:
                  colors.outlineVariant,

                borderRadius:
                  radius.xl,

                padding:
                  spacing.md,

                marginTop:
                  spacing.lg,
              },
            ]}
          >


            {/* =========================
                RESPONDER ID
                ========================= */}

            <View
              style={{
                gap: spacing.xs,
              }}
            >

              <Text
                style={[
                  typography.labelMd,
                  {
                    color:
                      colors.onSurfaceVariant,
                  },
                ]}
              >
                RESPONDER ID
              </Text>


              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor:
                      colors.surfaceContainer,

                    borderColor:
                      loginError
                        ? colors.error
                        : colors.outline,

                    borderRadius:
                      radius.md,
                  },
                ]}
              >

                <MaterialIcons
                  name="badge"
                  size={20}
                  color={
                    colors.onSurfaceVariant
                  }
                />


                <TextInput
                  value={responderId}

                  onChangeText={(text) => {
                    setResponderId(text);
                    setLoginError('');
                  }}

                  placeholder="e.g. RSP-001"

                  placeholderTextColor={
                    colors.onSurfaceVariant +
                    '80'
                  }

                  autoCapitalize="characters"

                  autoCorrect={false}

                  autoComplete="username"

                  style={[
                    styles.input,
                    {
                      color:
                        colors.onSurface,
                    },
                  ]}
                />

              </View>

            </View>


            {/* =========================
                SECURITY PIN
                ========================= */}

            <View
              style={[
                styles.field,
                {
                  marginTop:
                    spacing.md,
                },
              ]}
            >

              <Text
                style={[
                  typography.labelMd,
                  {
                    color:
                      colors.onSurfaceVariant,
                  },
                ]}
              >
                SECURITY PIN
              </Text>


              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor:
                      colors.surfaceContainer,

                    borderColor:
                      loginError
                        ? colors.error
                        : colors.outline,

                    borderRadius:
                      radius.md,
                  },
                ]}
              >

                <MaterialIcons
                  name="lock"
                  size={20}
                  color={
                    colors.onSurfaceVariant
                  }
                />


                <TextInput
                  value={pin}

                  onChangeText={(text) => {

                    /*
                     * Allow numbers only.
                     */

                    const numericValue =
                      text.replace(
                        /[^0-9]/g,
                        ''
                      );

                    setPin(numericValue);
                    setLoginError('');
                  }}

                  placeholder="Enter your PIN"

                  placeholderTextColor={
                    colors.onSurfaceVariant +
                    '80'
                  }

                  keyboardType="number-pad"

                  secureTextEntry={
                    !showPin
                  }

                  maxLength={6}

                  autoComplete="password"

                  style={[
                    styles.input,
                    {
                      color:
                        colors.onSurface,
                    },
                  ]}
                />


                {/* Show / Hide PIN */}

                <Pressable
                  onPress={() =>
                    setShowPin(
                      (current) =>
                        !current
                    )
                  }

                  hitSlop={8}

                  style={
                    styles.visibilityButton
                  }

                  accessibilityRole="button"

                  accessibilityLabel={
                    showPin
                      ? 'Hide PIN'
                      : 'Show PIN'
                  }
                >

                  <MaterialIcons
                    name={
                      showPin
                        ? 'visibility-off'
                        : 'visibility'
                    }

                    size={20}

                    color={
                      colors.onSurfaceVariant
                    }
                  />

                </Pressable>

              </View>

            </View>


            {/* =========================
                ERROR MESSAGE
                ========================= */}

            {loginError ? (

              <View
                style={[
                  styles.errorContainer,
                  {
                    backgroundColor:
                      colors.surfaceContainer,

                    borderColor:
                      colors.error,

                    borderRadius:
                      radius.md,

                    marginTop:
                      spacing.md,
                  },
                ]}
              >

                <MaterialIcons
                  name="error-outline"
                  size={20}
                  color={colors.error}
                />


                <Text
                  style={[
                    typography.bodyMd,
                    {
                      color:
                        colors.error,

                      flex: 1,
                    },
                  ]}
                >
                  {loginError}
                </Text>

              </View>

            ) : null}


            {/* =========================
                REMEMBER DEVICE
                ========================= */}

            <Pressable
              onPress={() =>
                setRememberDevice(
                  (current) =>
                    !current
                )
              }

              style={[
                styles.rememberRow,
                {
                  marginTop:
                    spacing.md,
                },
              ]}
            >

              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor:
                      rememberDevice
                        ? colors.onSurface
                        : colors.surfaceContainer,

                    borderColor:
                      rememberDevice
                        ? colors.onSurface
                        : colors.outline,

                    borderRadius: 4,
                  },
                ]}
              >

                {rememberDevice && (

                  <MaterialIcons
                    name="check"
                    size={15}
                    color={
                      colors.background
                    }
                  />

                )}

              </View>


              <Text
                style={[
                  typography.bodyMd,
                  {
                    color:
                      colors.onSurface,
                  },
                ]}
              >
                Remember this device
              </Text>

            </Pressable>


            {/* =========================
                LOGIN BUTTON
                ========================= */}

            <Pressable
              onPress={handleLogin}

              disabled={
                !canLogin ||
                loggingIn
              }

              style={({ pressed }) => [
                styles.loginButton,

                {
                  backgroundColor:
                    canLogin
                      ? colors.onSurface
                      : colors.surfaceContainer,

                  borderRadius:
                    radius.md,

                  marginTop:
                    spacing.lg,

                  opacity:
                    pressed &&
                    canLogin
                      ? 0.75
                      : 1,
                },
              ]}
            >

              {loggingIn ? (

                <Text
                  style={[
                    typography.titleLg,
                    {
                      color:
                        colors.background,
                    },
                  ]}
                >
                  Signing in...
                </Text>

              ) : (

                <>

                  <Text
                    style={[
                      typography.titleLg,
                      {
                        color:
                          canLogin
                            ? colors.background
                            : colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    Login
                  </Text>


                  <MaterialIcons
                    name="arrow-forward"
                    size={22}
                    color={
                      canLogin
                        ? colors.background
                        : colors.onSurfaceVariant
                    }
                  />

                </>

              )}

            </Pressable>

          </View>


          {/* =========================
              OFFLINE READY
              ========================= */}

          <View
            style={[
              styles.offlineCard,
              {
                backgroundColor:
                  colors.surfaceContainer,

                borderColor:
                  colors.outlineVariant,

                borderRadius:
                  radius.lg,

                marginTop:
                  spacing.md,
              },
            ]}
          >

            <View
              style={[
                styles.offlineIcon,
                {
                  backgroundColor:
                    colors.onSurface,

                  borderRadius: 20,
                },
              ]}
            >

              <MaterialIcons
                name="wifi-off"
                size={18}
                color={
                  colors.background
                }
              />

            </View>


            <View
              style={
                styles.offlineText
              }
            >

              <Text
                style={[
                  typography.labelLg,
                  {
                    color:
                      colors.onSurface,
                  },
                ]}
              >
                OFFLINE READY
              </Text>


              <Text
                style={[
                  typography.labelMd,
                  {
                    color:
                      colors.onSurfaceVariant,

                    marginTop: 2,
                  },
                ]}
              >
                Authentication can work
                without internet.
              </Text>

            </View>

          </View>


          {/* =========================
              SECURITY MESSAGE
              ========================= */}

          <Text
            style={[
              typography.labelMd,
              {
                color:
                  colors.onSurfaceVariant,

                textAlign:
                  'center',

                marginTop:
                  spacing.lg,

                paddingHorizontal:
                  spacing.md,
              },
            ]}
          >
            Your responder credentials are
            stored securely on this device.
          </Text>

        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  container: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  topActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brand: {
    alignItems: 'center',
  },

  logo: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heading: {
    alignItems: 'center',
  },

  card: {
    borderWidth: 1,
  },

  field: {
    gap: 6,
  },

  inputWrapper: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 10,
  },

  input: {
    flex: 1,
    minHeight: 50,
    fontSize: 16,
    paddingVertical: 0,
  },

  visibilityButton: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorContainer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
  },

  loginButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  offlineCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 10,
  },

  offlineIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  offlineText: {
    flex: 1,
  },

});