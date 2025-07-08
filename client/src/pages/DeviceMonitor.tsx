import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Space, Button, Select, DatePicker, message } from 'antd';
import { 
  CheckCircleOutlined, 
  WarningOutlined, 
  ReloadOutlined 
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { deviceAPI } from '../services/api';
import { useDevices } from '../store/devices';
import styles from './DeviceMonitor.module.css';

const { RangePicker } = DatePicker;

interface MonitorData {
  id: number;
  device_id: number;
  type: string;
  ip: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  temperature: number;
  signal_quality: number;
  timestamp: string;
  created_at: string;
}

interface DeviceMonitorData {
  deviceId: number;
  deviceName: string;
  deviceIP: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
  signalQuality: number;
}

const DeviceMonitor: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { devices, getDevices } = useDevices();

  // 获取设备列表
  useEffect(() => {
    getDevices();
  }, [getDevices]);

  // 过滤数据
  const filteredData = devices.filter(item => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  const columns = [
    {
      title: t('Device Name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('IP Address'),
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          online: { color: 'success', icon: <CheckCircleOutlined />, text: t('Online') },
          offline: { color: 'error', icon: <WarningOutlined />, text: t('Offline') },
          warning: { color: 'warning', icon: <WarningOutlined />, text: t('Warning') },
          'Online': { color: 'success', icon: <CheckCircleOutlined />, text: t('Online') },
          'Offline': { color: 'error', icon: <WarningOutlined />, text: t('Offline') },
          'Warning': { color: 'warning', icon: <WarningOutlined />, text: t('Warning') },
        };
        const { color, icon, text } = statusMap[status as keyof typeof statusMap] || statusMap['offline'];
        return (
          <Tag color={color} icon={icon}>
            {text}
          </Tag>
        );
      },
    },
    {
      title: t('Last Seen'),
      dataIndex: 'last_seen',
      key: 'last_seen',
      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
    },
  ];

  const handleRefresh = () => {
    getDevices();
  };

  return (
    <div className={styles.container}>
      <Card>
        <div className={styles.header}>
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              options={[
                { value: 'all', label: t('All Devices') },
                { value: 'online', label: t('Online Devices') },
                { value: 'offline', label: t('Offline Devices') },
                { value: 'warning', label: t('Warning Devices') },
              ]}
            />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              {t('Refresh')}
            </Button>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredData.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>
    </div>
  );
};

export default DeviceMonitor; 