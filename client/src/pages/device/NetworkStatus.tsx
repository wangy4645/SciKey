import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Descriptions, Tag, Space, Button, message } from 'antd';
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
  ipAddress: string;
  signalStrength: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

const NetworkStatus: React.FC<NetworkStateConfigProps> = ({ device, onSave, loading }) => {
  const { t } = useTranslation();
  const isMesh = device.board_type && device.board_type.toLowerCase().includes('mesh');

  // mesh专有状态
  const [meshStatus, setMeshStatus] = useState<{
    accessState: string;
    deviceType: string;
    ipAddress: string;
    loading: boolean;
  }>({ accessState: '-', deviceType: '-', ipAddress: '-', loading: false });

  // mesh本地状态
  const [meshLocal, setMeshLocal] = useState<{
    accessState: string;
    deviceType: string;
    ipAddress: string;
  }>({ accessState: '-', deviceType: '-', ipAddress: '-' });

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

  // mesh设备时获取本地状态
  const fetchMeshLocalStatus = async () => {
    try {
      // 假设本地接口为 getNetworkConfig，返回结构需适配
      const res = await deviceConfigAPI.getNetworkConfig(device.id);
      setMeshLocal({
        accessState: res.data?.config?.accessState || '-',
        deviceType: res.data?.config?.deviceType || '-',
        ipAddress: res.data?.config?.ipAddress || '-',
      });
    } catch {
      setMeshLocal({ accessState: '-', deviceType: '-', ipAddress: '-' });
    }
  };

  // mesh设备时获取专有状态（同步/刷新时）
  const fetchMeshNetworkStatus = async (showError = false) => {
    setMeshStatus(prev => ({ ...prev, loading: true }));
    try {
      // AT^DACS? 获取接入状态
      const dacsRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DACS?');
      let accessState = '-';
      const dacsMatch = /\^DACS:\s*(\d+),(\d+)/.exec(dacsRes.data?.response || '');
      if (dacsMatch) {
        accessState = dacsMatch[2] === '1' ? t('Connected') : t('Disconnected');
      }
      // AT^DDTC? 获取设备类型
      const typeRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DDTC?');
      let deviceType = '-';
      const typeMatch = /\^DDTC:\s*(\d+),(\d+)/.exec(typeRes.data?.response || '');
      if (typeMatch) {
        switch (typeMatch[1]) {
          case '0': deviceType = t('Auto'); break;
          case '1': deviceType = t('Master Node'); break;
          case '2': deviceType = t('Access Node'); break;
          default: deviceType = typeMatch[1];
        }
      }
      // AT^NETIFCFG? 获取IP地址
      const netifRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^NETIFCFG?');
      let ipAddress = '-';
      const ipMatch = /\^NETIFCFG:\s*\d+,([\d.]+)/.exec(netifRes.data?.response || '');
      if (ipMatch) {
        ipAddress = ipMatch[1];
      }
      setMeshStatus({ accessState, deviceType, ipAddress, loading: false });
      // 同步到本地（可选）
      setMeshLocal({ accessState, deviceType, ipAddress });
    } catch (err) {
      setMeshStatus({ accessState: '-', deviceType: '-', ipAddress: '-', loading: false });
      if (showError) message.error(t('Failed to fetch mesh network status'));
    }
  };

  useEffect(() => {
    if (isMesh) {
      fetchMeshLocalStatus();
    } else {
      fetchNetworkStatus();
    }
    
    // 监听设备配置同步事件
    const handleDeviceConfigSync = (event: CustomEvent) => {
      if (event.detail && event.detail.deviceId === Number(device.id)) {
        if (isMesh) {
          fetchMeshLocalStatus();
        } else {
          fetchNetworkStatus();
        }
      }
    };
    
    window.addEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    
    return () => {
      window.removeEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    };
  }, [device, isMesh]);

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

  if (isMesh) {
    // 颜色和图标映射
    const accessStateColor = meshLocal.accessState === t('Connected') ? '#52c41a' : '#ff4d4f';
    const accessStateIcon = meshLocal.accessState === t('Connected') ? <CheckCircleOutlined /> : <CloseCircleOutlined />;
    let deviceTypeColor = 'default';
    switch (meshLocal.deviceType) {
      case t('Master Node'): deviceTypeColor = 'blue'; break;
      case t('Access Node'): deviceTypeColor = 'green'; break;
      case t('Auto'): deviceTypeColor = 'orange'; break;
      default: deviceTypeColor = 'default';
    }
    return (
      <div className={styles.container}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card 
              title={t('Network Status')} 
              className={styles.card} loading={meshStatus.loading}
              extra={
                <Button
                  type="primary"
                  icon={<SyncOutlined />}
                  onClick={() => fetchMeshNetworkStatus(true)}
                  loading={meshStatus.loading}
                >
                  {t('Sync')}
                </Button>
              }
            >
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title={t('Access State')}
                    value={meshLocal.accessState}
                    valueStyle={{ color: accessStateColor }}
                    prefix={accessStateIcon}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={t('Device Type')}
                    value={meshLocal.deviceType}
                    valueStyle={{ color: deviceTypeColor === 'default' ? undefined : deviceTypeColor }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={t('IP Address')}
                    value={meshLocal.ipAddress}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card 
            title={t('Connection Status')} 
            className={styles.card}
            extra={
              <Space>
                <SyncButton
                  deviceId={device.id}
                  configType="network_status"
                  configTypeName={t('Network Status')}
                  onSyncSuccess={fetchNetworkStatus}
                />
                <Button 
                  type="primary" 
                  icon={<WifiOutlined />} 
                  onClick={handleRefresh}
                  loading={fetching}
                >
                  {t('Refresh')}
                </Button>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title={t('Status')}
                  value={status.connectionStatus === 'connected' ? t('Connected') : t('Disconnected')}
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
                  value={getQualityText(status.connectionQuality)}
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
                  {getQualityText(status.connectionQuality)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('Device Status')}>
                <Tag color={status.connectionStatus === 'connected' ? 'success' : 'error'}>
                  {status.connectionStatus === 'connected' ? t('Connected') : t('Disconnected')}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('Signal Strength')}>
                {status.signalStrength > 0 ? `${status.signalStrength.toFixed(1)}%` : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default NetworkStatus; 