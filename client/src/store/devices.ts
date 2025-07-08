import { create } from 'zustand';
import { Device } from '../types';
import { deviceAPI } from '../services/api';

interface DeviceStore {
  devices: Device[];
  currentDevice: Device | null;
  loading: boolean;
  error: string | null;
  getDevices: () => Promise<void>;
  fetchDevice: (id: number) => Promise<void>;
  createDevice: (data: Partial<Device>) => Promise<void>;
  updateDevice: (id: number, data: Partial<Device>) => Promise<void>;
  deleteDevice: (id: number) => Promise<void>;
}

export const useDevices = create<DeviceStore>((set) => ({
  devices: [],
  currentDevice: null,
  loading: false,
  error: null,

  getDevices: async () => {
    try {
      set({ loading: true, error: null });
      const response = await deviceAPI.getDevices();
      set({ devices: response.data.devices, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch devices', loading: false });
    }
  },

  createDevice: async (data) => {
    try {
      set({ loading: true, error: null });
      const response = await deviceAPI.createDevice(data);
      set(state => ({
        devices: [...state.devices, response.data.device],
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to create device', loading: false });
    }
  },

  updateDevice: async (id, data) => {
    try {
      set({ loading: true, error: null });
      const response = await deviceAPI.updateDevice(id, data);
      set(state => ({
        devices: state.devices.map(device =>
          device.id === id ? response.data.device : device
        ),
        currentDevice: state.currentDevice?.id === id ? response.data.device : state.currentDevice,
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to update device', loading: false });
    }
  },

  deleteDevice: async (id) => {
    try {
      set({ loading: true, error: null });
      await deviceAPI.deleteDevice(id);
      set(state => ({
        devices: state.devices.filter(device => device.id !== id),
        currentDevice: state.currentDevice?.id === id ? null : state.currentDevice,
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to delete device', loading: false });
    }
  },

  fetchDevice: async (id: number) => {
    try {
      set({ loading: true, error: null });
      const device = await deviceAPI.getDevice(id);
      set({ currentDevice: device, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch device', loading: false });
    }
  },
})); 