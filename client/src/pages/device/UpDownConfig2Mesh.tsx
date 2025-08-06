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

interface UpDownConfig2MeshProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
}

interface TDDConfig {
  currentSetting: string;
  setting: string;
}

const UpDownConfig2Mesh: React.FC<UpDownConfig2MeshProps> = ({
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
    { value: '0', label: '2D3U' },
    { value: '1', label: '3D2U' },
    { value: '2', label: '4D1U' },
    { value: '3', label: '1D4U' },
  ];

  // 获取当前配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // 使用2.0mesh的AT命令获取TDD配置
        const response = await deviceConfigAPI.sendATCommand(device.id, 'AT^DSTC?');
        let currentSetting = '';
        let setting = '';
        
        // 只有在成功获取到有效响应时才设置配置
        if (response.data?.response) {
          const match = response.data.response.match(/\^DSTC:\s*(\d+)/);
          if (match && match[1] !== undefined && match[1] !== '') {
            currentSetting = match[1];
            // 不设置setting，保持为空字符串，这样placeholder能显示
            setting = '';
          } else {
            // 如果响应格式不正确或没有有效数据，保持为空
            currentSetting = '';
            setting = '';
          }
        } else {
          // 如果没有响应数据，保持为空
          currentSetting = '';
          setting = '';
        }
        
        setConfig({
          currentSetting,
          setting,
        });
        
        form.setFieldsValue({ setting: undefined });
      } catch (error) {
        // 获取失败时，不更新配置，保持初始状态
        // 这样可以避免显示错误的数据
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
      
      // 使用2.0mesh的AT命令设置TDD配置
      await deviceConfigAPI.sendATCommand(device.id, `AT^DSTC=${values.setting}`);
      
      // 更新当前配置状态
      setConfig(prev => ({
        ...prev,
        currentSetting: values.setting,
        // 不更新setting，保持为空字符串，这样placeholder能显示
      }));
      
              message.success(t('TimeSlot configuration saved successfully'));
      await onSave(values);
    } catch (error) {
              message.error(t('Failed to save TimeSlot configuration'));
    }
  };

  const handleReset = () => {
    setConfig(prev => ({
      ...prev,
      setting: '',
    }));
    form.setFieldsValue({ setting: undefined });
            message.info(t('TimeSlot configuration reset'));
  };

  const getTDDDisplayName = (value: string) => {
    const tddMap: { [key: string]: string } = {
      '0': '2D3U',
      '1': '3D2U',
      '2': '4D1U',
      '3': '1D4U',
    };
    return tddMap[value] || value;
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
            onSyncSuccess={async () => {
              // 同步后刷新本地配置
              try {
                const response = await deviceConfigAPI.sendATCommand(device.id, 'AT^DSTC?');
                let currentSetting = '';
                
                // 只有在成功获取到有效响应时才更新配置
                if (response.data?.response) {
                  const match = response.data.response.match(/\^DSTC:\s*(\d+)/);
                  if (match && match[1] !== undefined && match[1] !== '') {
                    currentSetting = match[1];
                  } else {
                    // 如果响应格式不正确或没有有效数据，保持为空
                    currentSetting = '';
                  }
                } else {
                  // 如果没有响应数据，保持为空
                  currentSetting = '';
                }
                
                setConfig(prev => ({
                  ...prev,
                  currentSetting,
                  setting: '', // 保持setting为空，显示placeholder
                }));
                form.setFieldsValue({ setting: undefined });
              } catch (error) {
                // 同步失败时，不更新配置，保持当前状态
                // 这样可以避免显示错误的数据
              }
            }}
          />
        }
      >
        <div className={styles.warningText}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
                      <strong>{t('NOTE')}:&nbsp;&nbsp;</strong>{t('TimeSlot configuration change requires restart to take effect')}
        </div>


        
        <Divider />
        
        <div className={styles.currentKeySection}>
          <div className={styles.currentKeyLabel}>
            <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
            <span style={{ fontWeight: 600 }}>{t('Now TimeSlot Configuration')}:</span>
          </div>
          <div className={styles.currentKeyValue}>
            {getTDDDisplayName(config.currentSetting) || t('None')}
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

export default UpDownConfig2Mesh; 