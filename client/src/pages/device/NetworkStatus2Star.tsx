import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Descriptions, Tag, Space, Button, message, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  WifiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { Device } from '../../types';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import styles from './NetworkStatus.module.css';

interface NetworkStatus2StarProps {
  device: Device;
}

interface NetworkStatusData2Star {
  connectionStatus: 'connected' | 'disconnected';
  ipAddress: string;
  signalStrength: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

const NetworkStatus2Star: React.FC<NetworkStatus2StarProps> = ({ device }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<NetworkStatusData2Star>({
    connectionStatus: 'disconnected',
    ipAddress: device.ip || '',
    signalStrength: 0,
    connectionQuality: 'poor',
  });
  const [fetching, setFetching] = useState(false);

  // 解析2.0 AT指令返回，适配1.0 UI结构
  const fetchNetworkStatus = async () => {
    setFetching(true);
    try {
      // 获取网络接口配置
      const netRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^NETIFCFG?');
      // 假设返回格式: IP:xxx.xxx.xxx.xxx ...
      const ipMatch = /IP:([\d.]+)/.exec(netRes.data?.response || '');
      const ipAddress = ipMatch ? ipMatch[1] : '';

      // 获取接入状态
      const accessRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DACS?');
      // 假设返回: 1=connected, 0=disconnected
      let connectionStatus: 'connected' | 'disconnected' = 'disconnected';
      if (/1/.test(accessRes.data?.response || '')) connectionStatus = 'connected';

      // 获取信号强度（假设AT^DRPC?返回有RSSI:xx）
      const radioRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DRPC?');
      // 假设返回格式: ... RSSI:xx ...
      const rssiMatch = /RSSI:(\d+)/.exec(radioRes.data?.response || '');
      const signalStrength = rssiMatch ? Math.min(Number(rssiMatch[1]), 100) : 0;

      // 计算连接质量
      let connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
      if (signalStrength >= 80) connectionQuality = 'excellent';
      else if (signalStrength >= 60) connectionQuality = 'good';
      else if (signalStrength >= 40) connectionQuality = 'fair';
      else connectionQuality = 'poor';

      setStatus({
        connectionStatus,
        ipAddress,
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
              <Space>
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
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default NetworkStatus2Star; 