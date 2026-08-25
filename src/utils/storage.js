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