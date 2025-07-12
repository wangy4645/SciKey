import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  message,
  Divider,
  Alert,
  Space,
  Descriptions,
  Tag,
} from 'antd';
import {
  ClusterOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import styles from './DeviceTypeConfig.module.css';
import { Device } from '../../types';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { useTranslation } from 'react-i18next';
import SyncButton from '../../components/SyncButton';

const { Option } = Select;

interface DeviceTypeConfigProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
}

interface DeviceTypeConfig {
  currentType: string;
  currentWorkingType: string;
  setting: string;
}

const DeviceTypeConfig: React.FC<DeviceTypeConfigProps> = ({
  device,
  onSave,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [config, setConfig] = useState<DeviceTypeConfig>({
    currentType: '',
    currentWorkingType: '',
    setting: '',
  });

  // 网络角色选项
  const deviceTypeOptions = [
    { value: '0', label: t('Auto Mode') },
    { value: '1', label: t('Master Node') },
    { value: '2', label: t('Slave Node') },
  ];

  // 获取当前配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await deviceConfigAPI.getDeviceTypeConfig(Number(device.id));
        if (response && response.data && response.data.config) {
          const configData = response.data.config;
          setConfig({
            currentType: configData.device_type || '',
            currentWorkingType: configData.working_type || '',
            setting: configData.device_type || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch device type config:', error);
      }
    };
    
    fetchConfig();
    
    // 监听设备配置同步事件
    const handleDeviceConfigSync = (event: CustomEvent) => {
      if (event.detail && event.detail.deviceId === Number(device.id)) {
        console.log('Device type config: Received sync event, refreshing data...');
        fetchConfig();
      }
    };
    
    window.addEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    
    return () => {
      window.removeEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    };
  }, [device.id]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSave(values);
    } catch (error) {
      console.error('Failed to save device type config:', error);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setConfig(prev => ({ ...prev, setting: prev.currentType }));
  };

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case '0':
        return t('Auto Mode');
      case '1':
        return t('Master Node');
      case '2':
        return t('Slave Node');
      default:
        return type || t('Unknown');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case '0':
        return 'default';
      case '1':
        return 'blue';
      case '2':
        return 'green';
      default:
        return 'default';
    }
  };

  return (
    <div className={styles.container}>
      <Card 
        title={t('Network Role Configuration')} 
        className={styles.card}
        extra={
          <SyncButton
            deviceId={device.id}
            configType="device_type"
            configTypeName={t('Network Role Configuration')}
            onSyncSuccess={() => {
              // 重新获取设备类型配置
              const fetchConfig = async () => {
                try {
                  const response = await deviceConfigAPI.getDeviceTypeConfig(Number(device.id));
                  if (response && response.data && response.data.config) {
                    const configData = response.data.config;
                    setConfig({
                      currentType: configData.device_type || '',
                      currentWorkingType: configData.working_type || '',
                      setting: configData.device_type || '',
                    });
                  }
                } catch (error) {
                  console.error('Error fetching network role config:', error);
                }
              };
              fetchConfig();
            }}
          />
        }
      >
        <div className={styles.warningText}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          <strong>NOTE:&nbsp;&nbsp;</strong>{t('Network role change requires restart to take effect')}
        </div>

        <Alert
          message={t('Network role determines whether this device acts as a master or slave node in the network')}
          description={
            <div>
              <p><strong>{t('Auto Mode')}:</strong> {t('Device automatically determines its role based on network conditions')}</p>
              <p><strong>{t('Master Node')}:</strong> {t('Device acts as the central control node in the network')}</p>
              <p><strong>{t('Slave Node')}:</strong> {t('Device acts as an access node that connects to the master node')}</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Divider />
        
        <div className={styles.currentConfig}>
          <strong>{t('Current Configuration:')}</strong>
          <div style={{ marginTop: 8 }}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label={t('Network Role')}>
                <Tag color={getTypeColor(config.currentType)}>
                  {getTypeDisplayName(config.currentType)}
                </Tag>
              </Descriptions.Item>
              {config.currentWorkingType && (
                <Descriptions.Item label={t('Working Mode')}>
                  <Tag color="orange">
                    {config.currentWorkingType}
                  </Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        </div>

        <Divider />

        <div className={styles.settingValue}>
          <strong>{t('Network Role Setting:')}</strong>
          <Form
            form={form}
            layout="vertical"
            className={styles.form}
            initialValues={{ device_type: config.setting }}
          >
            <Form.Item
              name="device_type"
              label={t('Select Network Role')}
              rules={[{ required: true, message: t('Please select network role') }]}
              style={{ marginTop: 16 }}
            >
              <Select
                value={config.setting}
                onChange={(value) => {
                  setConfig(prev => ({ ...prev, setting: value }));
                  form.setFieldsValue({ device_type: value });
                }}
                placeholder={t('Select network role')}
                style={{ width: '100%' }}
              >
                {deviceTypeOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" onClick={handleSubmit} loading={loading}>
                  {t('Save Configuration')}
                </Button>
                <Button onClick={handleReset}>
                  {t('Reset')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Card>
    </div>
  );
};

export default DeviceTypeConfig; 