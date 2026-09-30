import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Stepper from '../Stepper';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { MaterialIcons: (props) => <View {...props} /> };
});

jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      outlineVariant: '#E0E0E0',
      surfaceContainerLowest: '#FFFFFF',
      onSurface: '#000000',
      primary: '#007AFF',
      onPrimary: '#FFFFFF',
    },
    spacing: { xs: 4, md: 12 },
    radius: { full: 9999 },
    typography: { headlineMd: {} },
  }),
}));

describe('Stepper', () => {
  it('renders the current value', () => {
    const { getByText } = render(<Stepper value={3} onChange={() => {}} />);

    expect(getByText('3')).toBeTruthy();
  });

  it('increments and decrements within its limits', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <Stepper value={3} min={1} max={4} onChange={onChange} />
    );

    fireEvent.press(getByLabelText('Increase'));
    expect(onChange).toHaveBeenLastCalledWith(4);

    fireEvent.press(getByLabelText('Decrease'));
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('does not change the value beyond min or max', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <Stepper value={1} min={1} max={1} onChange={onChange} />
    );

    fireEvent.press(getByLabelText('Decrease'));
    fireEvent.press(getByLabelText('Increase'));
    expect(onChange).not.toHaveBeenCalled();
  });
});