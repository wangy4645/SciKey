export interface Device {
  id: number;
  nodeId: string;
  name: string;
  type: 'master' | 'slave';
  status: 'online' | 'offline';
  ip: string;
  location: string;
  description?: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
  lastSeen?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface DeviceState {
  devices: Device[];
  selectedDevice: Device | null;
  loading: boolean;
  error: string | null;
}

export interface RootState {
  auth: AuthState;
  device: DeviceState;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface NetworkStateConfigProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
}

export interface SecurityConfigProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
}

export interface WirelessConfigProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
}

export interface Node {
  id: string;
  name: string;
  type: 'master' | 'slave';
  ip: string;
  node_id: string;
  x?: number;
  y?: number;
}

export interface Link {
  source: string;
  target: string;
  signalStrength: number;
} 