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
import { useTheme } from '../../theme/ThemeContext';

export default function ResponderLoginScreen({ navigation }) {
  const { colors, spacing, radius, typography } = useTheme();

  const [responderId, setResponderId] = useState('');
  const [pin, setPin] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const canLogin = responderId.trim().length > 0 && pin.length >= 4;

  const handleLogin = () => {
    if (!canLogin || loggingIn) return;

    setLoggingIn(true);

    // Temporary local authentication.
    // Replace this later with real offline authentication.
    setTimeout(() => {
      setLoggingIn(false);

      navigation.replace('Responder');
    }, 700);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: spacing.marginMobile,
              paddingTop: spacing.xl,
              paddingBottom: spacing.xl,
            },
          ]}
        >
          {/* Logo / App identity */}
          <View style={styles.brand}>
            <View
              style={[
                styles.logo,
                {
                  backgroundColor: colors.onSurface,
                  borderRadius: radius.lg,
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
                  color: colors.onSurface,
                  marginTop: spacing.sm,
                },
              ]}
            >
              MeshSync
            </Text>
          </View>

          {/* Heading */}
          <View
            style={[
              styles.heading,
              { marginTop: spacing.xl },
            ]}
          >
            <Text
              style={[
                typography.headlineLgMobile,
                { color: colors.onSurface },
              ]}
            >
              Responder Login
            </Text>

            <Text
              style={[
                typography.bodyMd,
                {
                  color: colors.onSurfaceVariant,
                  marginTop: spacing.xs,
                },
              ]}
            >
              Sign in to access your assigned emergency meshes.
            </Text>
          </View>

          {/* Login card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surfaceContainerLowest,
                borderColor: colors.outlineVariant,
                borderRadius: radius.xl,
                padding: spacing.md,
                marginTop: spacing.lg,
              },
            ]}
          >
            {/* Responder ID */}
            <View style={{ gap: spacing.xs }}>
              <Text
                style={[
                  typography.labelMd,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                RESPONDER ID
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.outline,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <MaterialIcons
                  name="badge"
                  size={20}
                  color={colors.onSurfaceVariant}
                />

                <TextInput
                  value={responderId}
                  onChangeText={setResponderId}
                  placeholder="e.g. RSP-001"
                  placeholderTextColor={
                    colors.onSurfaceVariant + '80'
                  }
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    { color: colors.onSurface },
                  ]}
                />
              </View>
            </View>

            {/* PIN */}
            <View
              style={[
                styles.field,
                { marginTop: spacing.md },
              ]}
            >
              <Text
                style={[
                  typography.labelMd,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                SECURITY PIN
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.outline,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={colors.onSurfaceVariant}
                />

                <TextInput
                  value={pin}
                  onChangeText={setPin}
                  placeholder="Enter your PIN"
                  placeholderTextColor={
                    colors.onSurfaceVariant + '80'
                  }
                  keyboardType="number-pad"
                  secureTextEntry={!showPin}
                  maxLength={6}
                  style={[
                    styles.input,
                    { color: colors.onSurface },
                  ]}
                />

                <Pressable
                  onPress={() => setShowPin((current) => !current)}
                  hitSlop={8}
                  style={styles.visibilityButton}
                >
                  <MaterialIcons
                    name={
                      showPin
                        ? 'visibility-off'
                        : 'visibility'
                    }
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                </Pressable>
              </View>
            </View>

            {/* Remember device */}
            <Pressable
              onPress={() =>
                setRememberDevice((current) => !current)
              }
              style={[
                styles.rememberRow,
                { marginTop: spacing.md },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: rememberDevice
                      ? colors.onSurface
                      : colors.surfaceContainer,
                    borderColor: rememberDevice
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
                    color={colors.background}
                  />
                )}
              </View>

              <Text
                style={[
                  typography.bodyMd,
                  { color: colors.onSurface },
                ]}
              >
                Remember this device
              </Text>
            </Pressable>

            {/* Login button */}
            <Pressable
              onPress={handleLogin}
              disabled={!canLogin || loggingIn}
              style={({ pressed }) => [
                styles.loginButton,
                {
                  backgroundColor: canLogin
                    ? colors.onSurface
                    : colors.surfaceContainer,
                  borderRadius: radius.md,
                  marginTop: spacing.lg,
                  opacity:
                    pressed && canLogin
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
                      color: colors.background,
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
                        color: canLogin
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

          {/* Offline status */}
          <View
            style={[
              styles.offlineCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.outlineVariant,
                borderRadius: radius.lg,
                marginTop: spacing.md,
              },
            ]}
          >
            <View
              style={[
                styles.offlineIcon,
                {
                  backgroundColor: colors.onSurface,
                  borderRadius: 20,
                },
              ]}
            >
              <MaterialIcons
                name="wifi-off"
                size={18}
                color={colors.background}
              />
            </View>

            <View style={styles.offlineText}>
              <Text
                style={[
                  typography.labelLg,
                  { color: colors.onSurface },
                ]}
              >
                OFFLINE READY
              </Text>

              <Text
                style={[
                  typography.labelMd,
                  {
                    color: colors.onSurfaceVariant,
                    marginTop: 2,
                  },
                ]}
              >
                Authentication can work without internet.
              </Text>
            </View>
          </View>

          {/* Security note */}
          <Text
            style={[
              typography.labelMd,
              {
                color: colors.onSurfaceVariant,
                textAlign: 'center',
                marginTop: spacing.lg,
                paddingHorizontal: spacing.md,
              },
            ]}
          >
            Your responder credentials are stored securely
            on this device.
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