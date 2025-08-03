import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Tag, Space, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  WifiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { Device } from '../../types';
import { deviceAPI } from '../../services/api';
import SyncButton from '../../components/SyncButton';
import styles from './NetworkStatus.module.css';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';

interface NetworkStateConfigProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
}

interface NetworkStatusData {
  connectionStatus: 'connected' | 'disconnected';
  signalStrength: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

const NetworkStatus2Mesh: React.FC<NetworkStateConfigProps> = ({ device, onSave, loading }) => {
  const { t } = useTranslation();

  const [status, setStatus] = useState<NetworkStatusData>({
    connectionStatus: 'disconnected',
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
        // 只有在信号质量数据有效时才设置
        if (latestData.signal_quality !== undefined && latestData.signal_quality !== null) {
          signalStrength = latestData.signal_quality;
          
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
      }
      
      setStatus({
        connectionStatus: deviceStatus.status === 'Online' ? 'connected' : 'disconnected',
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
        // 收到同步事件，刷新数据
        fetchNetworkStatus();
      }
    };
    
    window.addEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    
    return () => {
      window.removeEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    };
  }, [device.id]);

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
        return '#d9d9d9';
    }
  };

  const getQualityText = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return t('Excellent');
      case 'good':
        return t('Good');
      case 'fair':
        return t('Fair');
      case 'poor':
        return t('Poor');
      default:
        return t('Unknown');
    }
  };

  const handleRefresh = () => {
    fetchNetworkStatus();
  };

  return (
    <div className={styles.container}>
      <Card 
        title={t('Network Status')} 
        className={styles.card}
        extra={
          <SyncButton
            deviceId={device.id}
            configType="network"
            configTypeName={t('Network Status')}
            onSyncSuccess={() => {
              fetchNetworkStatus();
            }}
          />
        }
      >
        <Row gutter={[16, 16]}>
          {/* 连接状态 */}
          <Col xs={24} sm={12} md={8}>
            <Card size="small">
              <Statistic
                title={t('Connection Status')}
                value={status.connectionStatus === 'connected' ? t('Connected') : t('Disconnected')}
                valueStyle={{ 
                  color: status.connectionStatus === 'connected' ? '#52c41a' : '#ff4d4f',
                  fontSize: '16px'
                }}
                prefix={
                  status.connectionStatus === 'connected' ? 
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                }
              />
            </Card>
          </Col>

          {/* 信号强度 */}
          <Col xs={24} sm={12} md={8}>
            <Card size="small">
              <Statistic
                title={t('Signal Strength')}
                value={status.signalStrength}
                suffix="%"
                valueStyle={{ 
                  color: getQualityColor(status.connectionQuality),
                  fontSize: '16px'
                }}
                prefix={<WifiOutlined style={{ color: getQualityColor(status.connectionQuality) }} />}
              />
              <Progress 
                percent={status.signalStrength} 
                size="small" 
                strokeColor={getQualityColor(status.connectionQuality)}
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>

          {/* 连接质量 */}
          <Col xs={24} sm={12} md={8}>
            <Card size="small">
              <Statistic
                title={t('Connection Quality')}
                value={getQualityText(status.connectionQuality)}
                valueStyle={{ 
                  color: getQualityColor(status.connectionQuality),
                  fontSize: '16px'
                }}
              />
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Space>
            <Button 
              type="primary" 
              icon={<SyncOutlined />} 
              onClick={handleRefresh}
              loading={fetching}
            >
              {t('Refresh Status')}
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default NetworkStatus2Mesh; 