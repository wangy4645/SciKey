import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Descriptions, Tag, Space, Button, message, Form, Input, Typography, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  WifiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GlobalOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { Device } from '../../types';
import { deviceAPI } from '../../services/api';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import styles from './NetworkSettings.module.css';

const { Title, Text } = Typography;

interface NetworkSettingsProps {
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

interface IPConfig {
  currentIP: string;
  newIP: string;
}

// IP 输入组件
const IPInput: React.FC<{
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}> = ({ value = '', onChange, placeholder = '192.168.1.100' }) => {
  const [ipParts, setIpParts] = useState(['', '', '', '']);

  useEffect(() => {
    if (value) {
      const parts = value.split('.');
      setIpParts([
        parts[0] || '',
        parts[1] || '',
        parts[2] || '',
        parts[3] || '',
      ]);
    }
  }, [value]);

  const handlePartChange = (index: number, partValue: string) => {
    // 检查是否包含点号，如果包含则自动跳转到下一个输入框
    if (partValue.includes('.') && index < 3) {
      const nextInput = document.getElementById(`ip-part-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
      return;
    }

    // 只允许数字
    const numericValue = partValue.replace(/[^0-9]/g, '');
    
    // 限制每个部分最大为 255
    let finalValue = numericValue;
    if (numericValue !== '') {
      const num = parseInt(numericValue, 10);
      if (num > 255) {
        finalValue = '255';
      }
    }

    const newParts = [...ipParts];
    newParts[index] = finalValue;
    setIpParts(newParts);

    // 自动跳转到下一个输入框
    if (finalValue.length === 3 && index < 3) {
      const nextInput = document.getElementById(`ip-part-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }

    // 通知父组件值变化
    const fullIP = newParts.join('.');
    onChange?.(fullIP);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // 处理点号键，跳转到下一个输入框
    if (e.key === '.' && index < 3) {
      e.preventDefault();
      const nextInput = document.getElementById(`ip-part-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
      return;
    }

    // 处理退格键，当当前输入框为空时跳转到上一个输入框
    if (e.key === 'Backspace' && ipParts[index] === '' && index > 0) {
      const prevInput = document.getElementById(`ip-part-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  return (
    <div className={styles.ipInputContainer}>
      <div className={styles.ipInputGroup}>
        {ipParts.map((part, index) => (
          <React.Fragment key={index}>
            <Input
              id={`ip-part-${index}`}
              className={styles.ipPartInput}
              value={part}
              onChange={(e) => handlePartChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              maxLength={3}
              placeholder={placeholder.split('.')[index] || ''}
            />
            {index < 3 && <span className={styles.ipDot}>.</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const NetworkSettings: React.FC<NetworkSettingsProps> = ({ device, onSave, loading }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [status, setStatus] = useState<NetworkStatusData>({
    connectionStatus: 'disconnected',
    ipAddress: device.ip || '',
    signalStrength: 0,
    connectionQuality: 'poor',
  });
  const [config, setConfig] = useState<IPConfig>({
    currentIP: device.ip || '192.168.1.100',
    newIP: '',
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

  // 获取网络设置配置
  const fetchConfig = async () => {
    try {
      const response = await deviceConfigAPI.getNetSettingConfig(Number(device.id));
      if (response && response.data && response.data.config) {
        const configData = response.data.config;
        setConfig(prev => ({
          ...prev,
          currentIP: configData.ip || device.ip || '192.168.1.100',
        }));
      } else {
        setConfig(prev => ({
          ...prev,
          currentIP: device.ip || '192.168.1.100',
        }));
      }
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        currentIP: device.ip || '192.168.1.100',
      }));
    }
  };

  useEffect(() => {
    fetchNetworkStatus();
    fetchConfig();
    
    // 监听设备配置同步事件
    const handleDeviceConfigSync = (event: CustomEvent) => {
      if (event.detail && event.detail.deviceId === Number(device.id)) {
        fetchNetworkStatus();
        fetchConfig();
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
    fetchConfig();
  };

  const handleSubmit = async (values: any) => {
    try {
      await onSave({ ip: values.newIP });
      message.success(t('IP address updated successfully'));
      form.resetFields();
      fetchConfig();
    } catch (error) {
      message.error(t('Failed to update IP address'));
    }
  };

  const handleReset = () => {
    form.resetFields();
    setConfig(prev => ({ ...prev, newIP: '' }));
  };

  const validateIP = (rule: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error(t('Please enter IP address')));
    }
    
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(value)) {
      return Promise.reject(new Error(t('Please enter a valid IP address')));
    }
    
    const parts = value.split('.');
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (num < 0 || num > 255) {
        return Promise.reject(new Error(t('IP address parts must be between 0 and 255')));
      }
    }
    
    return Promise.resolve();
  };

  return (
    <div className={styles.container}>
      <Row gutter={[16, 16]}>
        {/* 网络状态卡片 */}
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

        {/* 网络详情卡片 */}
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

        {/* IP配置卡片 */}
        <Col span={24}>
          <Card 
            title={
              <Space>
                <GlobalOutlined />
                <span>{t('IP Configuration')}</span>
              </Space>
            } 
            className={styles.card}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                currentIP: config.currentIP,
                newIP: config.newIP,
              }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label={t('Current IP Address')}
                    name="currentIP"
                  >
                    <Input 
                      disabled 
                      prefix={<GlobalOutlined />}
                      placeholder="192.168.1.100"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={t('New IP Address')}
                    name="newIP"
                    rules={[
                      { validator: validateIP }
                    ]}
                  >
                    <IPInput placeholder="192.168.1.100" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <div className={styles.actions}>
                <Space>
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={handleReset}
                  >
                    {t('Reset')}
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    htmlType="submit"
                    loading={loading}
                  >
                    {t('Save Configuration')}
                  </Button>
                </Space>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default NetworkSettings; 