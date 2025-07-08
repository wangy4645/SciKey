import axios from 'axios';
import { LoginRequest, RegisterRequest, User, Device, NetState, Security, Wireless, NetSetting, UpDownSetting, Debug, SystemManager, NetworkConfig, SecurityConfig, WirelessConfig, SystemConfig, TDDConfig, DebugConfig } from '../types';
import type { SecurityConfig as SecurityConfigType } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      // 只有在不是登录页面时才重定向
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(new Error('Authentication required'));
    }

    // Handle not found errors
    if (error.response?.status === 404) {
      return Promise.reject(new Error('Resource not found'));
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (data: LoginRequest) => {
    try {
      const response = await api.post<{ token: string; user: User }>(`${API_BASE_URL}/auth/login`, {
        username: data.username,
        password: data.password
      });
      return response;
    } catch (error: any) {
      throw error;
    }
  },
  register: async (data: RegisterRequest) => {
    try {
      const response = await api.post<{ token: string; user: User }>(`${API_BASE_URL}/auth/register`, {
        username: data.username,
        password: data.password
      });
      return response;
    } catch (error: any) {
      throw error;
    }
  },
  validateToken: async () => {
    try {
      const response = await api.get<{ valid: boolean; user: User }>(`${API_BASE_URL}/auth/validate`);
      return response;
    } catch (error: any) {
      throw error;
    }
  },
  logout: () => {
    localStorage.removeItem('token');
  },
};

// Device API
export const deviceAPI = {
  getDevices: () => {
    return api.get<{ devices: Device[] }>(`${API_BASE_URL}/devices`)
      .then(response => {
        if (!response.data || !response.data.devices) {
          throw new Error('Invalid response format');
        }
        return response;
      })
      .catch(error => {
        throw error;
      });
  },
  getDevice: async (id: number): Promise<Device> => {
    try {
      const response = await api.get<{ device: any }>(`${API_BASE_URL}/devices/${id}`);

      if (!response.data || !response.data.device) {
        throw new Error('Invalid API response format');
      }

      const apiDevice = response.data.device;
      // 检查大写和小写的 ID 字段
      if (!apiDevice.id && !apiDevice.ID) {
        throw new Error('Device ID is missing');
      }

      // 如果只有大写的 ID，将其转换为小写
      const device: Device = {
        ...apiDevice,
        id: apiDevice.id || apiDevice.ID,
        created_at: apiDevice.CreatedAt || apiDevice.created_at || new Date().toISOString(),
        updated_at: apiDevice.UpdatedAt || apiDevice.updated_at || new Date().toISOString(),
      };

      return device;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Device not found');
        }
        if (error.response?.status === 401) {
          throw new Error('Authentication required');
        }
      }
      throw error;
    }
  },
  createDevice: async (device: Partial<Device>) => {
    try {
      const response = await api.post<{ device: Device }>(`${API_BASE_URL}/devices`, device);

      if (!response.data || !response.data.device) {
        throw new Error('Invalid API response format');
      }

      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          throw new Error('Invalid device data');
        }
        if (error.response?.status === 401) {
          throw new Error('Authentication required');
        }
        if (error.response?.status === 500) {
          throw new Error('Server error: ' + (error.response?.data?.message || 'Unknown error'));
        }
      }
      throw error;
    }
  },
  updateDevice: (id: number, device: Partial<Device>) => {
    return api.put<{ device: Device }>(`${API_BASE_URL}/devices/${id}`, device);
  },
  deleteDevice: (id: number) => {
    return api.delete(`${API_BASE_URL}/devices/${id}`);
  },
  rebootDevice: (id: number) => {
    return api.post<{ message: string }>(`${API_BASE_URL}/devices/${id}/reboot`);
  },
  saveDeviceConfigs: (deviceId: number, configs: any) => {
    if (!deviceId || isNaN(deviceId)) {
      throw new Error('Invalid device ID');
    }
    return api.post(`${API_BASE_URL}/devices/${deviceId}/configs`, configs)
      .then(response => {
        if (!response.data) {
          throw new Error('Invalid response format');
        }
        return response;
      })
      .catch(error => {
        throw error;
      });
  },
  // 设备状态检测
  checkDeviceStatus: (deviceId: number) =>
    api.get(`${API_BASE_URL}/devices/${deviceId}/check-status`),
  
  checkAllDevicesStatus: () =>
    api.get(`${API_BASE_URL}/devices/check-all-status`),

  // 设备监控
  getMonitorData: (deviceId: number, startTime?: string, endTime?: string) => {
    const params = new URLSearchParams();
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);
    return api.get(`${API_BASE_URL}/devices/${deviceId}/monitor?${params.toString()}`);
  },

  addMonitorData: (deviceId: number, data: any) =>
    api.post(`${API_BASE_URL}/devices/${deviceId}/monitor`, data),

  getMonitorConfig: (deviceId: number) =>
    api.get(`${API_BASE_URL}/devices/${deviceId}/monitor/config`),

  updateMonitorConfig: (deviceId: number, config: any) =>
    api.put(`${API_BASE_URL}/devices/${deviceId}/monitor/config`, config),

  getAlerts: (deviceId: number, status?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return api.get(`${API_BASE_URL}/devices/${deviceId}/alerts?${params.toString()}`);
  },

  updateAlertStatus: (alertId: number, status: string) =>
    api.put(`${API_BASE_URL}/alerts/${alertId}/status`, { status }),

  // 批量获取所有设备监控数据
  getAllDevicesMonitorData: (startTime?: string, endTime?: string) => {
    const params = new URLSearchParams();
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);
    return api.get(`${API_BASE_URL}/devices/monitor/all?${params.toString()}`);
  },
};

// Device Configuration API
export const deviceConfigAPI = {
  // Network State Configuration
  getNetworkConfig: (deviceId: number) =>
    api.get<{ config: NetworkConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/net_state`),
  updateNetworkConfig: (deviceId: number, data: Partial<NetworkConfig>) =>
    api.put<{ config: NetworkConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/net_state`, data),

  // Network Settings Configuration
  getNetSettingConfig: (deviceId: number) =>
    api.get<{ config: NetworkConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/net_setting`),
  updateNetSettingConfig: (deviceId: number, data: Partial<NetworkConfig>) =>
    api.put<{ config: NetworkConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/net_setting`, data),

  // Security Configuration
  getSecurityConfig: (deviceId: number) => 
    api.get<{ config: SecurityConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/security`),
  updateSecurityConfig: (deviceId: number, data: SecurityConfig) => 
    api.put<{ config: SecurityConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/security`, data),

  // Wireless Configuration
  getWirelessConfig: (deviceId: number) =>
    api.get<{ config: WirelessConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/wireless`),
  updateWirelessConfig: (deviceId: number, data: Partial<WirelessConfig>) =>
    api.put<{ config: WirelessConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/wireless`, data),

  // System Configuration
  getSystemConfig: (deviceId: number) =>
    api.get<{ config: SystemConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/system`),
  updateSystemConfig: (deviceId: number, data: Partial<SystemConfig>) =>
    api.put<{ config: SystemConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/system`, data),

  // UP-DOWN Configuration
  getUpDownConfig: (deviceId: number) =>
    api.get<{ config: TDDConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/up_down`),
  updateUpDownConfig: (deviceId: number, data: Partial<TDDConfig>) =>
    api.put<{ config: TDDConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/up_down`, data),

  // Debug Configuration
  getDebugConfig: (deviceId: number) =>
    api.get<{ config: DebugConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/debug`),
  updateDebugConfig: (deviceId: number, data: Partial<DebugConfig>) =>
    api.put<{ config: DebugConfig }>(`${API_BASE_URL}/devices/${deviceId}/configs/debug`, data),

  // Backup and Restore
  backupConfig: (deviceId: number) =>
    api.get(`${API_BASE_URL}/devices/${deviceId}/config/backup`, { responseType: 'blob' }),
  restoreConfig: (deviceId: number, configFile: File) => {
    const formData = new FormData();
    formData.append('config', configFile);
    return api.post<{ message: string }>(`${API_BASE_URL}/devices/${deviceId}/config/restore`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Factory Reset
  factoryReset: (deviceId: number) =>
    api.post<{ message: string }>(`${API_BASE_URL}/devices/${deviceId}/config/reset`),
};

// Net State API
export const netStateAPI = {
  getNetState: (deviceId: number) => api.get<{ state: NetState }>(`${API_BASE_URL}/net-state/device/${deviceId}`),
  updateNetState: (deviceId: number, data: Partial<NetState>) => api.put<{ state: NetState }>(`${API_BASE_URL}/net-state/device/${deviceId}`, data),
};

// Security API
export const securityAPI = {
  getSecurity: (deviceId: number) => api.get<{ security: Security }>(`${API_BASE_URL}/security/device/${deviceId}`),
  updateSecurity: (deviceId: number, data: Partial<Security>) => api.put<{ security: Security }>(`${API_BASE_URL}/security/device/${deviceId}`, data),
  updateEncryption: (deviceId: number, data: { enabled: boolean; encryptionType: string; password: string }) =>
    api.put<{ message: string }>(`${API_BASE_URL}/security/device/${deviceId}/encryption`, data),
  updateMACFiltering: (deviceId: number, data: { enabled: boolean; allowedMACs: string }) =>
    api.put<{ message: string }>(`${API_BASE_URL}/security/device/${deviceId}/mac-filtering`, data),
};

// Wireless API
export const wirelessAPI = {
  getWireless: (deviceId: number) => api.get<{ wireless: Wireless }>(`${API_BASE_URL}/wireless/device/${deviceId}`),
  updateWireless: (deviceId: number, data: Partial<Wireless>) => api.put<{ wireless: Wireless }>(`${API_BASE_URL}/wireless/device/${deviceId}`, data),
  updateFrequencyBand: (deviceId: number, data: { setting: '800M' | '1.4G' | '2.4G' }) =>
    api.put<{ message: string }>(`${API_BASE_URL}/wireless/device/${deviceId}/frequency-band`, data),
  updateBandwidth: (deviceId: number, data: { setting: '1.4M' | '3M' | '5M' | '10M' | '30M' }) =>
    api.put<{ message: string }>(`${API_BASE_URL}/wireless/device/${deviceId}/bandwidth`, data),
  updateBuildingChain: (deviceId: number, data: { setting: string }) =>
    api.put<{ message: string }>(`${API_BASE_URL}/wireless/device/${deviceId}/building-chain`, data),
  updateFrequencyHopping: (deviceId: number, data: { status: 'OPEN' | 'CLOSE' }) =>
    api.put<{ message: string }>(`${API_BASE_URL}/wireless/device/${deviceId}/frequency-hopping`, data),
};

// Net Setting API
export const netSettingAPI = {
  getNetSetting: (deviceId: number) => api.get<{ setting: NetSetting }>(`${API_BASE_URL}/net-setting/device/${deviceId}`),
  updateNetSetting: (deviceId: number, data: Partial<NetSetting>) => api.put<{ setting: NetSetting }>(`${API_BASE_URL}/net-setting/device/${deviceId}`, data),
};

// UP-DOWN Setting API
export const upDownSettingAPI = {
  getUpDownSetting: (deviceId: number) => api.get<{ setting: UpDownSetting }>(`${API_BASE_URL}/up-down-setting/device/${deviceId}`),
  updateUpDownSetting: (deviceId: number, data: { setting: 'config0' | 'config1' | 'config2' | 'config3' }) =>
    api.put<{ setting: UpDownSetting }>(`${API_BASE_URL}/up-down-setting/device/${deviceId}`, data),
};

// Debug API
export const debugAPI = {
  getDebug: (deviceId: number) => api.get<{ debug: Debug }>(`${API_BASE_URL}/debug/device/${deviceId}`),
  updateDebugSwitch: (deviceId: number, data: { status: 'OPEN' | 'CLOSE' }) =>
    api.put<{ message: string }>(`${API_BASE_URL}/debug/device/${deviceId}/switch`, data),
  updateActiveEscalation: (deviceId: number, data: { status: 'START' | 'STOP' }) =>
    api.put<{ message: string }>(`${API_BASE_URL}/debug/device/${deviceId}/active-escalation`, data),
  executeATCommand: (deviceId: number, data: { command: string }) =>
    api.post<{ message: string }>(`${API_BASE_URL}/debug/device/${deviceId}/at`, data),
  executeShellCommand: (deviceId: number, data: { command: string }) =>
    api.post<{ message: string }>(`${API_BASE_URL}/debug/device/${deviceId}/shell`, data),
};

// System Manager API
export const systemManagerAPI = {
  getSystemManager: (deviceId: number) => api.get<{ manager: SystemManager }>(`${API_BASE_URL}/system-manager/device/${deviceId}`),
  updatePassword: (deviceId: number, data: { oldUsername: string; oldPassword: string; newPassword: string }) =>
    api.put<{ message: string }>(`${API_BASE_URL}/system-manager/device/${deviceId}/password`, data),
  restartDevice: (deviceId: number) => api.post<{ message: string }>(`${API_BASE_URL}/system-manager/device/${deviceId}/restart`),
};

export default api; 