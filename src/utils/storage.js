import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@meshsync_profile';
const RESPONDER_SESSION_KEY = '@meshsync_responder_session';

/*
 * =========================
 * USER PROFILE
 * =========================
 */

export async function saveProfile(profile) {
  try {
    await AsyncStorage.setItem(
      PROFILE_KEY,
      JSON.stringify(profile)
    );
  } catch (error) {
    console.error('Failed to save profile:', error);
    throw error;
  }
}

export async function getProfile() {
  try {
    const data = await AsyncStorage.getItem(PROFILE_KEY);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load profile:', error);
    return null;
  }
}

export async function clearProfile() {
  try {
    await AsyncStorage.removeItem(PROFILE_KEY);
  } catch (error) {
    console.error('Failed to clear profile:', error);
  }
}


/*
 * =========================
 * RESPONDER SESSION
 * =========================
 */

// Salted cyrb53 hash — responder PINs are never persisted in plaintext.
// Not a cryptographic credential; only a local offline-login check.
const PIN_SALT = 'meshsync-rsp-pin-v1';
export function hashPin(pin) {
  const str = `${PIN_SALT}:${pin}`;
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}

export async function saveResponderSession(session) {
  try {
    await AsyncStorage.setItem(
      RESPONDER_SESSION_KEY,
      JSON.stringify(session)
    );
  } catch (error) {
    console.error(
      'Failed to save responder session:',
      error
    );

    throw error;
  }
}

export async function getResponderSession() {
  try {
    const data = await AsyncStorage.getItem(
      RESPONDER_SESSION_KEY
    );

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error(
      'Failed to load responder session:',
      error
    );

    return null;
  }
}

export async function clearResponderSession() {
  try {
    await AsyncStorage.removeItem(
      RESPONDER_SESSION_KEY
    );
  } catch (error) {
    console.error(
      'Failed to clear responder session:',
      error
    );
  }
}