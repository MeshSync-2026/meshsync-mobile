import React from 'react';
import { render } from '@testing-library/react-native';
import RadarView from '../RadarView';

jest.mock('../../context/MeshSyncContext', () => ({
  useMeshSync: () => ({
    incidents: [],
    userLocation: null,
    nodeId: '',
  }),
}));

// Mock theme context
jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007AFF',
      surface: '#FFFFFF',
      border: '#E0E0E0',
      text: '#000000',
      danger: '#FF3B30',
      warning: '#FF9500',
      error: '#FF3B30',
      outline: '#808080',
      outlineVariant: '#E0E0E0',
      ink: '#000000',
      white: '#FFFFFF',
      onSurfaceVariant: '#666666',
    },
    spacing: { md: 12 },
    radius: { md: 8 },
    typography: { labelMd: {} },
  }),
}));

describe('RadarView Component', () => {
  it('renders the default radar, compass, and legend', () => {
    const { getByText } = render(<RadarView />);
    expect(getByText('N')).toBeTruthy();
    expect(getByText('S')).toBeTruthy();
    expect(getByText('E')).toBeTruthy();
    expect(getByText('W')).toBeTruthy();
    expect(getByText('You')).toBeTruthy();
    expect(getByText('Urgent')).toBeTruthy();
    expect(getByText('Hazard')).toBeTruthy();
    expect(getByText('Mesh')).toBeTruthy();
  });

  it('shows the scanning message when the mesh has no incidents', () => {
    const { getByText } = render(<RadarView />);
    expect(getByText('Scanning local mesh...')).toBeTruthy();
  });
});