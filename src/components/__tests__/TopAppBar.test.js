import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TopAppBar from '../TopAppBar';

const mockGoBack = jest.fn();

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { MaterialIcons: (props) => <View {...props} /> };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: mockGoBack }),
}));

jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      outlineVariant: '#E0E0E0',
      onSurface: '#000000',
    },
    spacing: { marginMobile: 16 },
    radius: {},
    typography: { headlineMd: {} },
    isDark: false,
    toggleScheme: jest.fn(),
  }),
}));

describe('TopAppBar', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('renders the title and default navigation controls', () => {
    const { getByText, getByLabelText } = render(<TopAppBar title="My Activity" />);

    expect(getByText('My Activity')).toBeTruthy();
    expect(getByLabelText('Go back')).toBeTruthy();
    expect(getByLabelText('Toggle theme')).toBeTruthy();
  });

  it('calls navigation and the provided right-button handler', () => {
    const onRightPress = jest.fn();
    const { getByLabelText } = render(
      <TopAppBar title="My Activity" onRightPress={onRightPress} />
    );

    fireEvent.press(getByLabelText('Go back'));
    fireEvent.press(getByLabelText('Toggle theme'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(onRightPress).toHaveBeenCalledTimes(1);
  });

  it('can hide the back button', () => {
    const { queryByLabelText } = render(<TopAppBar title="Home" showBack={false} />);

    expect(queryByLabelText('Go back')).toBeNull();
  });
});