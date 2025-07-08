import { deviceAPI } from './api';

export interface DeviceStatusResult {
  device_id: number;
  ip: string;
  name: string;
  status: 'Online' | 'Offline' | 'Unknown';
  last_seen: string;
  error?: string;
}

export interface BulkStatusResult {
  devices: DeviceStatusResult[];
  total: number;
  online: number;
  offline: number;
  unknown: number;
  checked_at: string;
}

class DeviceStatusService {
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking = false;

  // 批量检测所有设备状态（用于自动检测）
  async checkAllDevicesStatus(): Promise<BulkStatusResult> {
    try {
      const response = await deviceAPI.checkAllDevicesStatus();
      return response.data;
    } catch (error) {
      throw new Error(`Failed to check all devices status: ${error}`);
    }
  }

  // 开始自动检测
  startAutoCheck(intervalMs: number = 30000, callback?: (result: BulkStatusResult) => void) {
    if (this.checkInterval) {
      this.stopAutoCheck();
    }

    this.checkInterval = setInterval(async () => {
      if (this.isChecking) return;
      
      this.isChecking = true;
      try {
        const result = await this.checkAllDevicesStatus();
        if (callback) {
          callback(result);
        }
      } catch (error) {
        console.error('Auto status check failed:', error);
      } finally {
        this.isChecking = false;
      }
    }, intervalMs);
  }

  // 停止自动检测
  stopAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // 获取状态统计
  getStatusStats(devices: DeviceStatusResult[]) {
    const stats = {
      total: devices.length,
      online: 0,
      offline: 0,
      unknown: 0,
    };

    devices.forEach(device => {
      switch (device.status) {
        case 'Online':
          stats.online++;
          break;
        case 'Offline':
          stats.offline++;
          break;
        default:
          stats.unknown++;
      }
    });

    return stats;
  }

  // 格式化状态显示
  formatStatus(status: string): { text: string; color: string; icon: string } {
    switch (status) {
      case 'Online':
        return { text: 'Online', color: 'success', icon: 'check-circle' };
      case 'Offline':
        return { text: 'Offline', color: 'error', icon: 'close-circle' };
      default:
        return { text: 'Unknown', color: 'warning', icon: 'question-circle' };
    }
  }
}

export const deviceStatusService = new DeviceStatusService(); 