export const meshStatus = {
  peersNearby: 3,
  lastSynced: 'synced 12 min ago',
  offline: true,
  nodesInRange: 48,
};

export const hazardCategories = [
  { id: 'flood', label: 'Flood', icon: 'water' },
  { id: 'landslide', label: 'Landslide', icon: 'terrain' },
  { id: 'storm', label: 'Cyclone/Storm', icon: 'cyclone' },
  { id: 'fire', label: 'Fire', icon: 'local-fire-department' },
  { id: 'medical', label: 'Medical', icon: 'medical-services' },
  { id: 'damage', label: 'Structural Damage', icon: 'home-repair-service' },
  { id: 'road', label: 'Road Blocked', icon: 'block' },
  { id: 'other', label: 'Other', icon: 'more-horiz' },
];

export const urgentRequests = [
  {
    id: 'u1',
    title: 'Trapped - Building Collapse',
    distance: '~350m',
    time: '3m ago',
    description: 'Two adults trapped on 2nd floor, structure unstable near Galle Rd.',
    responders: 0,
  },
];

export const communityReports = [
  {
    id: 'r1',
    title: 'Flooding: Lower Level',
    icon: 'water-drop',
    distance: '~800m',
    time: '12m ago',
    description: 'Station B concourse is impassable. Water approx 10cm deep.',
    responders: 4,
  },
  {
    id: 'r2',
    title: 'Grid Failure',
    icon: 'power-off',
    distance: '~1.2km',
    time: '25m ago',
    description: 'Block-wide outage near Mission District. No street lights active.',
    responders: 12,
  },
];

export const resolvedReports = [
  { id: 'rs1', title: 'Exposed Cable - Main St.', icon: 'bolt', note: 'Resolved 45m ago by Unit 04' },
  { id: 'rs2', title: 'Road Obstructed - Pier 3', icon: 'block', note: 'Resolved 1h ago by Community' },
];

export const activityFeed = [
  {
    id: 'a1',
    title: 'Flood Warning Sent',
    subtitle: 'Main St. Blockage',
    icon: 'warning',
    time: '2 mins ago',
    status: 'pending',
    note: 'No responders yet',
  },
  {
    id: 'a2',
    title: 'First Aid Request',
    subtitle: 'Sector 4 Community Center',
    icon: 'medical-services',
    time: '14 mins ago',
    status: 'synced',
    note: '2+ people responding — help is on the way',
  },
  {
    id: 'a3',
    title: 'Power Outage Report',
    subtitle: 'Highland District',
    icon: 'bolt',
    time: '45 mins ago',
    status: 'synced',
    note: '1 person responding',
  },
  {
    id: 'a4',
    title: 'Offline Map Tile Downloaded',
    subtitle: 'North Basin Region',
    icon: 'map',
    time: '2 hours ago',
    status: 'synced',
    note: null,
    muted: true,
  },
];

export const meshStats = {
  packetsRelayed: 842,
  uptime: '98.2%',
};

export const profile = {
  name: 'Nuwan Perera',
  fullName: 'Nuwan S. Perera',
  nic: '199023402341',
  phone: '+94 77 123 4567',
  homeLocation: 'Maharagama',
  landmark: 'Westside Community Center',
  tempStatus: 'Away from Home',
  dataMuleReports: 42,
  version: 'MeshSync v2.4.0-stable',
};

export const radarPeers = [
  { id: 'p1', label: 'FLOOD', type: 'hazard', top: '15%', left: '25%' },
  { id: 'p2', label: 'GRID', type: 'hazard', top: null, bottom: '10%', left: null, right: '20%' },
  { id: 'p3', label: 'URGENT', type: 'urgent', top: '25%', left: '30%' },
  { id: 'p4', label: 'Peer 2', type: 'mesh', top: null, bottom: '35%', left: '25%' },
  { id: 'p5', label: 'Peer 3', type: 'mesh', top: '55%', left: null, right: '30%' },
  { id: 'p6', label: 'Peer 4', type: 'mesh', top: null, bottom: '15%', left: '60%' },
];


export const responderCredentials = {
  responderId: 'RSP-001',
  pin: '1234',
};