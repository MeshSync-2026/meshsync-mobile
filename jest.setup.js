/* eslint-undef */
// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialIcons: (props) => <View {...props} />,
    Ionicons: (props) => <View {...props} />,
    FontAwesome: (props) => <View {...props} />,
  };
});

// Mock Expo Modules Core
jest.mock('expo-modules-core', () => ({
  NativeModule: {},
  requireNativeModule: jest.fn(() => ({})),
  requireOptionalNativeModule: jest.fn(() => ({})),
}));