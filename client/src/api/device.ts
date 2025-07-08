import axios from 'axios';
import { Device } from '../types';

const API_BASE_URL = '/api';

// 获取设备列表
export const getDevices = () => {
  return axios.get<Device[]>(`${API_BASE_URL}/devices`);
};

// 创建设备
export const createDevice = (device: Partial<Device>) => {
  return axios.post<Device>(`${API_BASE_URL}/devices`, device);
};

// 更新设备
export const updateDevice = (id: number, device: Partial<Device>) => {
  return axios.put<Device>(`${API_BASE_URL}/devices/${id}`, device);
};

// 删除设备
export const deleteDevice = (id: number) => {
  return axios.delete(`${API_BASE_URL}/devices/${id}`);
};

// 获取设备详情
export const getDevice = (id: number) => {
  return axios.get<Device>(`${API_BASE_URL}/devices/${id}`);
}; 