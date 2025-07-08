import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, message } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ClusterOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { deviceAPI } from '../services/api';
import styles from './Dashboard.module.css';
import PieChart from '../components/PieChart';
import Table from '../components/Table';

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
}

interface Alert {
  id: number;
  device_id: number;
  type: string;
  level: string;
  message: string;
  value: number;
  threshold: number;
  status: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DeviceStats>({
    total: 0,
    online: 0,
    offline: 0
  });
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取设备统计数据
  const fetchDeviceStats = async () => {
    try {
      setLoading(true);
      const response = await deviceAPI.getDevices();
      const devices = response.data.devices;
      
      const total = devices.length;
      const online = devices.filter((device: any) => device.status === 'Online').length;
      const offline = total - online;
      
      setStats({ total, online, offline });
    } catch (error) {
      message.error(t('Failed to fetch device statistics'));
    } finally {
      setLoading(false);
    }
  };

  // 获取最近告警
  const fetchRecentAlerts = async () => {
    try {
      // 获取所有设备
      const devicesResponse = await deviceAPI.getDevices();
      const devices = devicesResponse.data.devices;
      
      const allAlerts: Alert[] = [];
      
      // 为每个设备获取告警数据
      for (const device of devices) {
        try {
          const alertsResponse = await deviceAPI.getAlerts(device.id, 'active');
          if (alertsResponse.data && Array.isArray(alertsResponse.data)) {
            allAlerts.push(...alertsResponse.data);
          }
        } catch (error) {
          console.error(`Failed to fetch alerts for device ${device.id}:`, error);
        }
      }
      
      // 按时间排序，取最近的10个告警
      const sortedAlerts = allAlerts
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      
      setRecentAlerts(sortedAlerts);
    } catch (error) {
      message.error(t('Failed to fetch recent alerts'));
    }
  };

  useEffect(() => {
    fetchDeviceStats();
    fetchRecentAlerts();
  }, []);

  const deviceStatusData = [
    { name: t('Online'), value: stats.online },
    { name: t('Offline'), value: stats.offline }
  ];

  const alertColumns = [
    {
      title: t('Alert ID'),
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: t('Device ID'),
      dataIndex: 'device_id',
      key: 'device_id'
    },
    {
      title: t('Type'),
      dataIndex: 'type',
      key: 'type'
    },
    {
      title: t('Level'),
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => {
        const color = level === 'critical' ? 'red' : level === 'warning' ? 'orange' : 'blue';
        return <span style={{ color }}>{level.toUpperCase()}</span>;
      }
    },
    {
      title: t('Message'),
      dataIndex: 'message',
      key: 'message'
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'active' ? 'red' : status === 'acknowledged' ? 'orange' : 'green';
        return <span style={{ color }}>{status.toUpperCase()}</span>;
      }
    },
    {
      title: t('Time'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (timestamp: string) => new Date(timestamp).toLocaleString()
    }
  ];

  return (
    <div className={styles.container}>
      <h1>{t('Dashboard')}</h1>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('Total Devices')}
              value={stats.total}
              prefix={<ClusterOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('Online Devices')}
              value={stats.online}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('Offline Devices')}
              value={stats.offline}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title={t('Device Status Distribution')}>
            <PieChart data={deviceStatusData} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('System Overview')}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              <p style={{ marginTop: '16px', color: '#666' }}>
                {t('Network traffic monitoring is not available for this system.')}
              </p>
            </div>
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title={t('Recent Alerts')}>
            <Table
              columns={alertColumns}
              dataSource={recentAlerts}
              pagination={false}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 