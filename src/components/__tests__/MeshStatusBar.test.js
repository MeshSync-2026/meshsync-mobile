import React from 'react';
import { render } from '@testing-library/react-native';
import MeshStatusBar from '../MeshStatusBar';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { MaterialIcons: (props) => <View {...props} /> };
});

jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      outlineVariant: '#E0E0E0',
      onSurfaceVariant: '#666666',
      onSurface: '#000000',
    },
    spacing: { marginMobile: 16 },
    radius: {},
    typography: { labelLg: {} },
  }),
}));

describe('MeshStatusBar', () => {
  it('renders its default offline status', () => {
    const { getByText } = render(<MeshStatusBar />);

    expect(getByText('Offline - Mesh Active (48 nodes)')).toBeTruthy();
  });

  it('renders a custom label and node count', () => {
    const { getByText, queryByText } = render(<MeshStatusBar nodesInRange={7} label="Connected" />);

    expect(getByText('Connected')).toBeTruthy();
    expect(queryByText('Offline - Mesh Active (7 nodes)')).toBeNull();
  });
});