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
} from 'antd';
import {
  SwapOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import styles from './UpDownConfig.module.css';
import { Device } from '../../types';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { useTranslation } from 'react-i18next';
import SyncButton from '../../components/SyncButton';

const { Option } = Select;

interface UpDownConfigProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
}

interface TDDConfig {
  currentSetting: string;
  setting: string;
}

const UpDownConfig: React.FC<UpDownConfigProps> = ({
  device,
  onSave,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [config, setConfig] = useState<TDDConfig>({
    currentSetting: '',
    setting: '',
  });

  // TDD 配置选项
  const tddOptions = [
    { value: '2D3U', label: '2D3U' },
    { value: '3D2U', label: '3D2U' },
    { value: '4D1U', label: '4D1U' },
    { value: '1D4U', label: '1D4U' },
  ];

  // 获取当前配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await deviceConfigAPI.getUpDownConfig(Number(device.id));
        if (response && response.data && response.data.config) {
          const configData = response.data.config;
          setConfig({
            currentSetting: String(configData.current_setting || configData.setting || ''),
            setting: String(configData.setting || ''),
          });
        }
      } catch (error) {
        // 获取UP-DOWN配置失败
      }
    };
    
    fetchConfig();
    
    // 监听设备配置同步事件
    const handleDeviceConfigSync = (event: CustomEvent) => {
      if (event.detail && event.detail.deviceId === Number(device.id)) {
        // 收到同步事件，刷新数据
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
      
      const response = await deviceConfigAPI.updateUpDownConfig(Number(device.id), { setting: values.setting });
      
      // 检查响应状态
      if (response && response.status === 200) {
        // 保存成功后更新当前配置状态
        setConfig(prev => ({
          ...prev,
          currentSetting: values.setting,
        }));
        message.success(t('TimeSlot configuration saved successfully'));
      } else {
                  message.error(t('Failed to save TimeSlot configuration: Invalid response'));
      }
    } catch (error: any) {
      if (error.response) {
        // 服务器响应了错误状态码
        message.error(t(`Failed to save TimeSlot configuration: ${error.response.data?.error || error.response.statusText}`));
      } else if (error.request) {
        // 请求已发出但没有收到响应
                  message.error(t('Failed to save TimeSlot configuration: No response from server'));
      } else {
        // 其他错误
                  message.error(t(`Failed to save TimeSlot configuration: ${error.message || 'Unknown error'}`));
      }
    }
  };

  const handleReset = () => {
    setConfig(prev => ({
      ...prev,
      setting: '',
    }));
    form.resetFields();
            message.info(t('TimeSlot configuration reset'));
  };

  return (
    <div className={styles.container}>
      <Card 
        title={t('TimeSlot Configuration')} 
        className={styles.card}
        extra={
          <SyncButton
            deviceId={device.id}
            configType="up_down"
            configTypeName={t('TimeSlot Configuration')}
            onSyncSuccess={() => {
              // 重新获取TDD配置
              const fetchConfig = async () => {
                try {
                  const response = await deviceConfigAPI.getUpDownConfig(Number(device.id));
                  if (response && response.data && response.data.config) {
                    const configData = response.data.config;
                    setConfig({
                      currentSetting: String(configData.current_setting || configData.setting || ''),
                      setting: String(configData.setting || ''),
                    });
                  }
                } catch (error) {
                  // 获取UP-DOWN配置失败
                }
              };
              fetchConfig();
            }}
          />
        }
      >
        <div className={styles.warningText}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          <strong>{t('NOTE')}:&nbsp;&nbsp;</strong>{t('Please restart device when setup is completed')}
        </div>

        <Alert
          message={t('Note: uplink/downlink configuration can be enabled in master mode')}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Divider />
        
        <div className={styles.currentConfig}>
          <strong>{t('Now Configuration')}:</strong>
          <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            {config.currentSetting || t('Not set')}
          </div>
        </div>

        <Divider />

        <div className={styles.settingValue}>
                      <strong>{t('TimeSlot Configuration')}:</strong>
          <Form
            form={form}
            layout="vertical"
            className={styles.form}
          >
            <Form.Item
              name="setting"
              style={{ marginTop: 16 }}
            >
              <Select
                value={config.setting}
                onChange={(value) => {
                  setConfig(prev => ({ ...prev, setting: value }));
                  form.setFieldsValue({ setting: value });
                }}
                placeholder={t('Select TimeSlot configuration')}
                style={{ width: '100%' }}
              >
                {tddOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" onClick={handleSubmit} loading={loading}>
                  {t('Save')}
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

export default UpDownConfig; 