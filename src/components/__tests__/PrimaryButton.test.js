import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PrimaryButton from '../PrimaryButton';

// Mock the theme context hook matching what PrimaryButton destructured
jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007AFF',
      surfaceContainerHigh: '#E0E0E0',
      onPrimary: '#FFFFFF',
    },
    spacing: {
      md: 12,
    },
    radius: {
      md: 8,
    },
    typography: {
      button: {},
    },
  }),
}));

describe('PrimaryButton Component', () => {
  it('renders button label correctly', () => {
    const { getByText } = render(
      <PrimaryButton label="Submit Hazard" onPress={() => {}} />
    );
    expect(getByText('Submit Hazard')).toBeTruthy();
  });

  it('triggers onPress callback when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <PrimaryButton label="Submit Hazard" onPress={onPressMock} />
    );

    fireEvent.press(getByText('Submit Hazard'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});