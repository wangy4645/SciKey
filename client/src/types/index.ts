// User related types
export interface User {
  id: number;
  username: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

// Device related types
export interface Device {
  id: number;
  node_id: string;
  name: string;
  type: string;
  board_type: string;
  ip: string;
  status: string;
  location?: string;
  description?: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

// Network State types
export interface NetState {
  id: number;
  deviceId: number;
  netType: string;
  masterSlaveConfig: {
    nowType: string;
    activeType: string;
    configuration: string;
  };
  monitor: {
    type: string;
    ip: string;
    earfcn: number;
    rsrp: number;
    snr: number;
    distance: number;
  };
}

// Security types
export interface Security {
  id: number;
  deviceId: number;
  algorithm: {
    old: string;
    new: string;
  };
  keySetting: {
    now: string;
    new: string;
  };
}

// Wireless types
export interface Wireless {
  id: number;
  deviceId: number;
  frequencyBand: {
    now: string;
    setting: '800M' | '1.4G' | '2.4G';
  };
  bandwidth: {
    now: string;
    setting: '1.4M' | '3M' | '5M' | '10M' | '30M';
  };
  buildingChain: {
    now: string;
    setting: string;
  };
  frequencyHopping: {
    status: 'OPEN' | 'CLOSE';
  };
}

// Net Setting types
export interface NetSetting {
  id: number;
  deviceId: number;
  ip: string;
}

// UP-DOWN Setting types
export interface UpDownSetting {
  id: number;
  deviceId: number;
  currentSetting: string;
  setting: '2D3U' | '3D2U' | '4D1U' | '1D4U';
}

// Debug types
export interface Debug {
  id: number;
  deviceId: number;
  debugSwitch: {
    status: 'OPEN' | 'CLOSE';
  };
  activeEscalation: {
    status: 'START' | 'STOP';
  };
  atDebug: {
    command: string;
    result: string;
  };
  shellDebug: {
    command: string;
    result: string;
  };
}

// System Manager types
export interface SystemManager {
  id: number;
  deviceId: number;
  password: {
    oldUsername: string;
    oldPassword: string;
    newPassword: string;
  };
  version: string;
}

export interface NetworkConfig {
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  dns: string[];
  mtu: number;
  enableDhcp: boolean;
  packetLoss: number;
  latency: number;
  bandwidth: number;
}

export interface SecurityConfig {
  device_id: number;
  encryption_algorithm: number;
  firewall_enabled: boolean;
  ssh_enabled: boolean;
  ssh_port: number;
  ssh_key_auth: boolean;
  ssh_password_auth: boolean;
  vpn_enabled: boolean;
  vpn_type: string;
  vpn_config: string;
  access_control_list: string;
  security_log_level: string;
  security_alerts: boolean;
  security_updates: boolean;
  security_scan_period: number;
}

export interface WirelessConfig {
  enableWireless: boolean;
  ssid: string;
  hideSsid: boolean;
  securityMode: 'none' | 'wep' | 'wpa' | 'wpa2' | 'wpa3';
  password: string;
  band: '2.4' | '5' | '6';
  channel: number;
  channelWidth: '20' | '40' | '80' | '160';
  txPower: number;
  enableBeamforming: boolean;
  enableMimo: boolean;
  enableQos: boolean;
  enableWmm: boolean;
}

export interface SystemConfig {
  hostname: string;
  timezone: string;
  ntpServer: string;
  enableNtp: boolean;
  language: string;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warning' | 'error';
  maxLogSize: number;
  enableAutoUpdate: boolean;
  updateChannel: 'stable' | 'beta' | 'alpha';
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

export interface MonitorData {
  id: number;
  device_id: number;
  type: string;
  ip: string;
  earfcn: number;
  rsrp: number;
  snr: number;
  distance: number;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_usage: number;
  temperature: number;
  signal_quality: number;
  created_at: string;
}

export interface MonitorConfig {
  id: number;
  device_id: number;
  enable_monitoring: boolean;
  monitor_interval: number;
  retention_period: number;
  alert_thresholds: string;
  created_at: string;
  updated_at: string;
}

export interface MonitorAlert {
  id: number;
  device_id: number;
  type: string;
  level: 'warning' | 'error' | 'critical';
  message: string;
  value: number;
  threshold: number;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

// UP-DOWN Configuration types
export interface TDDConfig {
  currentSetting: string;
  setting: '2D3U' | '3D2U' | '4D1U' | '1D4U';
}

// Debug Configuration types
export interface DebugConfig {
  debugSwitch: {
    status: 'OPEN' | 'CLOSE';
  };
  activeEscalation: {
    status: 'START' | 'STOP';
  };
  atDebug: {
    command: string;
    result: string;
  };
  shellDebug: {
    command: string;
    result: string;
  };
  systemLogs: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warning' | 'error';
    retention: number;
    maxSize: number;
  };
  networkDebug: {
    enabled: boolean;
    packetCapture: boolean;
    protocolAnalysis: boolean;
    trafficMonitor: boolean;
  };
  performanceMonitor: {
    enabled: boolean;
    metrics: Array<{
      name: string;
      type: 'cpu' | 'memory' | 'disk' | 'network';
      threshold: number;
      interval: number;
    }>;
  };
} 