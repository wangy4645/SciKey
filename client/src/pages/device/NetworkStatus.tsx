import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Descriptions, Tag, Space, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  WifiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { Device } from '../../types';
import { deviceAPI } from '../../services/api';
import styles from './NetworkStatus.module.css';

interface NetworkStateConfigProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
}

interface NetworkStatusData {
  connectionStatus: 'connected' | 'disconnected';
  ipAddress: string;
  signalStrength: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

const NetworkStatus: React.FC<NetworkStateConfigProps> = ({ device, onSave, loading }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<NetworkStatusData>({
    connectionStatus: 'disconnected',
    ipAddress: device.ip || '',
    signalStrength: 0,
    connectionQuality: 'poor',
  });
  const [fetching, setFetching] = useState(false);

  // 获取网络状态数据
  const fetchNetworkStatus = async () => {
    if (!device.id) return;
    
    setFetching(true);
    try {
      // 获取设备状态
      const deviceStatus = await deviceAPI.getDevice(device.id);
      
      // 获取监控数据中的信号质量
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const monitorResponse = await deviceAPI.getMonitorData(device.id, startTime, endTime);
      
      let signalStrength = 0;
      let connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
      
      if (monitorResponse.data && monitorResponse.data.length > 0) {
        const latestData = monitorResponse.data[0];
        signalStrength = latestData.signal_quality || 0;
        
        // 根据信号强度确定连接质量
        if (signalStrength >= 80) {
          connectionQuality = 'excellent';
        } else if (signalStrength >= 60) {
          connectionQuality = 'good';
        } else if (signalStrength >= 40) {
          connectionQuality = 'fair';
        } else {
          connectionQuality = 'poor';
        }
      }
      
      setStatus({
        connectionStatus: deviceStatus.status === 'Online' ? 'connected' : 'disconnected',
        ipAddress: deviceStatus.ip || device.ip || '',
        signalStrength,
        connectionQuality,
      });
    } catch (error) {
      message.error(t('Failed to fetch network status'));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchNetworkStatus();
    
    // 监听设备配置同步事件
    const handleDeviceConfigSync = (event: CustomEvent) => {
      if (event.detail && event.detail.deviceId === Number(device.id)) {
        console.log('Network status: Received sync event, refreshing data...');
        fetchNetworkStatus();
      }
    };
    
    window.addEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    
    return () => {
      window.removeEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    };
  }, [device]);

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return '#52c41a';
      case 'good':
        return '#1890ff';
      case 'fair':
        return '#faad14';
      case 'poor':
        return '#ff4d4f';
      default:
        return '#1890ff';
    }
  };

  const handleRefresh = () => {
    fetchNetworkStatus();
  };

  return (
    <div className={styles.container}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card 
            title={t('Connection Status')} 
            className={styles.card}
            extra={
              <Button 
                type="primary" 
                icon={<WifiOutlined />} 
                onClick={handleRefresh}
                loading={fetching}
              >
                {t('Refresh')}
              </Button>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title={t('Status')}
                  value={status.connectionStatus}
                  valueStyle={{
                    color: status.connectionStatus === 'connected' ? '#52c41a' : '#ff4d4f',
                  }}
                  prefix={status.connectionStatus === 'connected' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={t('Signal Strength')}
                  value={status.signalStrength}
                  suffix="%"
                  valueStyle={{ color: getQualityColor(status.connectionQuality) }}
                />
                <Progress
                  percent={status.signalStrength}
                  showInfo={false}
                  strokeColor={getQualityColor(status.connectionQuality)}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={t('Connection Quality')}
                  value={status.connectionQuality}
                  valueStyle={{ color: getQualityColor(status.connectionQuality) }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card title={t('Network Details')} className={styles.card}>
            <Descriptions column={2}>
              <Descriptions.Item label={t('IP Address')}>
                {status.ipAddress || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('Connection Quality')}>
                <Tag color={getQualityColor(status.connectionQuality)}>
                  {status.connectionQuality.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('Device Status')}>
                <Tag color={status.connectionStatus === 'connected' ? 'success' : 'error'}>
                  {status.connectionStatus.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('Signal Strength')}>
                {status.signalStrength > 0 ? `${status.signalStrength.toFixed(1)}%` : '-'}
              </Descriptions.Item>
            </Descriptions>
            <Button 
              type="primary" 
              onClick={() => onSave(status)} 
              loading={loading} 
              style={{ marginTop: 16 }}
            >
              {t('Save')}
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default NetworkStatus; 