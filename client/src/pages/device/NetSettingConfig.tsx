import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Typography,
  Space,
  Divider,
} from 'antd';
import {
  GlobalOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import styles from './NetSettingConfig.module.css';
import { Device } from '../../types';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { useTranslation } from 'react-i18next';
import SyncButton from '../../components/SyncButton';

const { Title, Text } = Typography;

interface NetSettingConfigProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
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
      return; // 不处理包含点号的值
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
      e.preventDefault(); // 阻止点号被输入
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

const NetSettingConfig: React.FC<NetSettingConfigProps> = ({
  device,
  onSave,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [config, setConfig] = useState<IPConfig>({
    currentIP: device.ip || '192.168.1.100',
    newIP: '',
  });

  // 获取网络设置配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        console.log('Fetching net setting config for device:', device);
        const response = await deviceConfigAPI.getNetSettingConfig(Number(device.id));
        console.log('Net setting config response:', response);
        if (response && response.data && response.data.config) {
          const configData = response.data.config;
          setConfig(prev => ({
            ...prev,
            currentIP: configData.ip || device.ip || '192.168.1.100',
          }));
        } else {
          // 使用设备信息中的IP作为默认值
          setConfig(prev => ({
            ...prev,
            currentIP: device.ip || '192.168.1.100',
          }));
        }
      } catch (error) {
        console.error('Failed to fetch net setting config:', error);
        // 使用设备信息中的IP作为默认值
        setConfig(prev => ({
          ...prev,
          currentIP: device.ip || '192.168.1.100',
        }));
      }
    };
    
    fetchConfig();
    
    // 监听设备配置同步事件
    const handleDeviceConfigSync = (event: CustomEvent) => {
      if (event.detail && event.detail.deviceId === Number(device.id)) {
        console.log('Net setting config: Received sync event, refreshing data...');
        fetchConfig();
      }
    };
    
    window.addEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    
    return () => {
      window.removeEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    };
  }, [device.id, device.ip]);

  const handleSubmit = async (values: any) => {
    try {
      console.log('Submitting new IP:', values.newIP);
      await onSave({ ip: values.newIP });
      message.success(t('IP address updated successfully'));
      // 更新当前 IP 显示
      setConfig(prev => ({
        ...prev,
        currentIP: values.newIP,
        newIP: '',
      }));
      form.resetFields();
    } catch (error) {
      console.error('Failed to update IP address:', error);
      message.error(t('Failed to update IP address'));
    }
  };

  const handleReset = () => {
    form.resetFields();
    setConfig(prev => ({
      ...prev,
      newIP: '',
    }));
  };

  const validateIP = (rule: any, value: string) => {
    if (!value) {
      return Promise.resolve();
    }
    
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(value)) {
      return Promise.reject(new Error(t('Please enter a valid IP address')));
    }
    
    return Promise.resolve();
  };

  return (
    <div className={styles.container}>
      <Card 
        title={t('Network Settings')} 
        className={styles.card}
        extra={
          <SyncButton
            deviceId={device.id}
            configType="network_settings"
            configTypeName={t('Network Settings')}
            onSyncSuccess={() => {
              // 重新获取网络设置配置
              const fetchConfig = async () => {
                try {
                  const response = await deviceConfigAPI.getNetSettingConfig(Number(device.id));
                  if (response && response.data && response.data.config) {
                    const configData = response.data.config;
                    setConfig(prev => ({
                      ...prev,
                      currentIP: configData.ip || device.ip || '192.168.1.100',
                    }));
                  }
                } catch (error) {
                  console.error('Error fetching net setting config:', error);
                }
              };
              fetchConfig();
            }}
          />
        }
      >
        <div className={styles.warningText}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          <strong>{t('NOTE')}&nbsp;&nbsp;</strong>{t('After IP changed, you need relogin.')}
        </div>
        
        <Divider />
        
        <div className={styles.currentConfig}>
          <strong>{t('Current IP')}:</strong>
          <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            {config.currentIP}
          </div>
        </div>

        <Divider />

        <div className={styles.settingValue}>
          <strong>{t('New IP Address')}:</strong>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className={styles.form}
          >
            <Form.Item
              name="newIP"
              rules={[
                { required: true, message: t('Please enter a new IP address') },
                { validator: validateIP },
              ]}
            >
              <IPInput
                value={config.newIP}
                onChange={(value) => {
                  setConfig(prev => ({ ...prev, newIP: value }));
                  form.setFieldsValue({ newIP: value });
                }}
                placeholder="192.168.1.100"
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
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

export default NetSettingConfig; 