import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SegmentedGroup from '../SegmentedGroup';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { MaterialIcons: (props) => <View {...props} /> };
});

jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      onSurface: '#000000',
      onSurfaceVariant: '#666666',
      outlineVariant: '#E0E0E0',
      surfaceContainerHighest: '#EEEEEE',
      surfaceContainer: '#FFFFFF',
    },
    spacing: { sm: 8 },
    radius: { md: 8 },
    typography: { labelLg: {} },
  }),
}));

describe('SegmentedGroup', () => {
  it('renders its label, options, and selected value', () => {
    const { getByText } = render(
      <SegmentedGroup
        icon="water-drop"
        label="Water"
        options={['Enough', 'Low']}
        value="Enough"
        onChange={() => {}}
      />
    );

    expect(getByText('Water')).toBeTruthy();
    expect(getByText('Enough')).toBeTruthy();
    expect(getByText('Low')).toBeTruthy();
  });

  it('calls onChange with the pressed option', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SegmentedGroup
        icon="water-drop"
        label="Water"
        options={['Enough', 'Low']}
        value="Enough"
        onChange={onChange}
      />
    );

    fireEvent.press(getByText('Low'));
    expect(onChange).toHaveBeenCalledWith('Low');
  });
});