export interface SecurityConfigProps {
  deviceId: string;
}

export interface SecurityConfig {
  device_id: number;
  encryption_algorithm: number;
  encryption_key: string;
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
  // 同步状态相关字段
  status?: string;
  note?: string;
}

export interface KeyConfig {
  key: string;
}

export interface WirelessConfig {
  frequencyBand: string[];
  bandwidth: string;
  buildingChain: string;
  frequencyHopping: boolean;
  // 同步状态相关字段
  status?: string;
  note?: string;
} 