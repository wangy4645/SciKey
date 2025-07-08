import api from './api';
const API_BASE_URL = 'http://localhost:8080/api';

export const deviceConfigAPI = {
  // Network Configuration
  getNetworkConfig: (deviceId: number) => 
    api.get(`${API_BASE_URL}/devices/${deviceId}/configs/network`),
  updateNetworkConfig: (deviceId: number, config: any) =>
    api.put(`${API_BASE_URL}/devices/${deviceId}/configs/network`, config),

  // Security Configuration
  getSecurityConfig: (deviceId: number) =>
    api.get(`${API_BASE_URL}/devices/${deviceId}/configs/security`),
  updateSecurityConfig: (deviceId: number, config: any) =>
    api.put(`${API_BASE_URL}/devices/${deviceId}/configs/security`, config),

  // Wireless Configuration
  getWirelessConfig: (deviceId: number) =>
    api.get(`${API_BASE_URL}/devices/${deviceId}/configs/wireless`),
  updateWirelessConfig: (deviceId: number, config: any) =>
    api.put(`${API_BASE_URL}/devices/${deviceId}/configs/wireless`, config),
  setFrequencyBand: (deviceId: number, bands: string[]) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/wireless/frequency-band`, { bands }),
  setBandwidth: (deviceId: number, bandwidth: string) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/wireless/bandwidth`, { bandwidth }),
  setBuildingChain: (deviceId: number, frequencyPoint: string) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/wireless/building-chain`, { frequencyPoint }),
  setFrequencyHopping: (deviceId: number, enabled: boolean) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/wireless/frequency-hopping`, { enabled }),

  // Network Settings Configuration
  getNetSettingConfig: (deviceId: number) =>
    api.get(`${API_BASE_URL}/devices/${deviceId}/configs/net_setting`),
  updateNetSettingConfig: (deviceId: number, config: any) =>
    api.put(`${API_BASE_URL}/devices/${deviceId}/configs/net_setting`, config),

  // UP-DOWN Configuration
  getUpDownConfig: (deviceId: number) =>
    api.get(`${API_BASE_URL}/devices/${deviceId}/configs/up_down`),
  updateUpDownConfig: (deviceId: number, config: any) =>
    api.put(`${API_BASE_URL}/devices/${deviceId}/configs/up_down`, config),

  // Debug Configuration
  getDebugConfig: (deviceId: number) =>
    api.get(`${API_BASE_URL}/devices/${deviceId}/configs/debug`),
  updateDebugConfig: (deviceId: number, config: any) =>
    api.put(`${API_BASE_URL}/devices/${deviceId}/configs/debug`, config),
  setDebugSwitch: (deviceId: number, enabled: boolean) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/debug/switch`, { enabled }),
  setDrprReporting: (deviceId: number, enabled: boolean) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/debug/drpr`, { enabled }),
  executeAtCommand: (deviceId: number, command: string) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/debug/at`, { command }),
  executeShellCommand: (deviceId: number, command: string) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/debug/shell`, { command }),

  // System Configuration
  getSystemConfig: (deviceId: number) =>
    api.get(`${API_BASE_URL}/devices/${deviceId}/configs/system`),
  updateSystemConfig: (deviceId: number, config: any) =>
    api.put(`${API_BASE_URL}/devices/${deviceId}/configs/system`, config),

  // 发送 AT 指令
  sendATCommand: (deviceId: number, command: string) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/at`, { command }),

  // 同步设备配置
  syncDeviceConfig: (deviceId: number) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/sync-config`),

  // Key Management
  getKey: (deviceId: number) =>
    api.get(`${API_BASE_URL}/devices/${deviceId}/key`),
  setKey: (deviceId: number, key: string) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/key`, { key }),
}; 