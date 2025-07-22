import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Device } from '../../types';
import { deviceAPI } from '../../services/api';

interface DeviceState {
  devices: Device[];
  selectedDevice: Device | null;
  loading: boolean;
  error: string | null;
}

const initialState: DeviceState = {
  devices: [],
  selectedDevice: null,
  loading: false,
  error: null,
};

// 辅助函数：将API响应转换为Device类型
const mapApiResponseToDevice = (apiDevice: any): Device => {
  // 检查必要的字段
  if (!apiDevice) {
    throw new Error('Invalid device data: null or undefined');
  }

  // 检查并转换 ID（支持大写和小写）
  let deviceId: number;
  if (typeof apiDevice.ID === 'string') {
    deviceId = parseInt(apiDevice.ID, 10);
    if (isNaN(deviceId)) {
      throw new Error('Invalid device ID format');
    }
  } else if (typeof apiDevice.ID === 'number') {
    deviceId = apiDevice.ID;
  } else if (typeof apiDevice.id === 'string') {
    deviceId = parseInt(apiDevice.id, 10);
    if (isNaN(deviceId)) {
      throw new Error('Invalid device ID format');
    }
  } else if (typeof apiDevice.id === 'number') {
    deviceId = apiDevice.id;
  } else {
    throw new Error('Device ID is missing or invalid');
  }

  const device: Device = {
    id: deviceId,
    node_id: apiDevice.node_id || '',
    name: apiDevice.name || '',
    type: apiDevice.type || '',
    board_type: apiDevice.board_type || '',
    ip: apiDevice.ip || '',
    status: apiDevice.status ? apiDevice.status.toLowerCase() : 'offline',
    location: apiDevice.location,
    description: apiDevice.description,
    last_seen: apiDevice.last_seen || new Date().toISOString(),
    created_at: apiDevice.CreatedAt || apiDevice.created_at || new Date().toISOString(),
    updated_at: apiDevice.UpdatedAt || apiDevice.updated_at || new Date().toISOString(),
  };

  return device;
};

export const fetchDevices = createAsyncThunk(
  'devices/fetchDevices',
  async () => {
    try {
      const response = await deviceAPI.getDevices();
      
      if (!response.data || !Array.isArray(response.data.devices)) {
        throw new Error('Invalid API response format');
      }

      const devices = response.data.devices.map((device: any, index: number) => {
        try {
          return mapApiResponseToDevice(device);
        } catch (error) {
          console.error(`Error mapping device at index ${index}:`, error);
          console.error('Problematic device data:', device);
          throw error;
        }
      });

      return devices;
    } catch (error) {
      throw error;
    }
  }
);

export const fetchDevice = createAsyncThunk(
  'devices/fetchDevice',
  async (id: number) => {
    try {
      const device = await deviceAPI.getDevice(id);
      
      if (!device) {
        throw new Error('Invalid API response format');
      }

      const mappedDevice = mapApiResponseToDevice(device);
      return mappedDevice;
    } catch (error) {
      throw error;
    }
  }
);

export const createDevice = createAsyncThunk(
  'devices/createDevice',
  async (data: Partial<Device>) => {
    try {
      const response = await deviceAPI.createDevice(data);
      
      if (!response.data || !response.data.device) {
        throw new Error('Invalid API response format');
      }

      const device = mapApiResponseToDevice(response.data.device);
      return device;
    } catch (error) {
      throw error;
    }
  }
);

export const updateDevice = createAsyncThunk(
  'devices/updateDevice',
  async ({ id, ...data }: Partial<Device> & { id: number }) => {
    const response = await deviceAPI.updateDevice(id, data);
    return mapApiResponseToDevice(response.data.device);
  }
);

export const deleteDevice = createAsyncThunk(
  'devices/deleteDevice',
  async (id: number) => {
    try {
      await deviceAPI.deleteDevice(id);
      return id;
    } catch (error) {
      throw error;
    }
  }
);

export const rebootDevice = createAsyncThunk(
  'devices/rebootDevice',
  async (id: number) => {
    const response = await deviceAPI.rebootDevice(id);
    return response.data;
  }
);

export const saveDeviceConfigs = createAsyncThunk(
  'devices/saveDeviceConfigs',
  async ({ deviceId, configs }: { deviceId: number; configs: any }) => {
    try {
      const response = await deviceAPI.saveDeviceConfigs(deviceId, configs);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
);

const deviceSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    setSelectedDevice: (state, action: PayloadAction<Device | null>) => {
      state.selectedDevice = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDevices.fulfilled, (state, action) => {
        state.devices = action.payload;
        state.loading = false;
      })
      .addCase(fetchDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch devices';
      })
      .addCase(fetchDevice.fulfilled, (state, action) => {
        state.selectedDevice = action.payload;
      })
      .addCase(createDevice.fulfilled, (state, action) => {
        state.devices.push(action.payload);
      })
      .addCase(updateDevice.fulfilled, (state, action) => {
        const index = state.devices.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.devices[index] = action.payload;
        }
        if (state.selectedDevice?.id === action.payload.id) {
          state.selectedDevice = action.payload;
        }
      })
      .addCase(deleteDevice.fulfilled, (state, action: PayloadAction<number>) => {
        state.devices = state.devices.filter((d) => d.id !== action.payload);
        if (state.selectedDevice?.id === action.payload) {
          state.selectedDevice = null;
        }
      });
  },
});

export const { setSelectedDevice } = deviceSlice.actions;
export default deviceSlice.reducer; 