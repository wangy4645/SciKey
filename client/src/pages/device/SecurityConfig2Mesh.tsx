import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Divider,
  message,
  Tabs,
  Space,
  Select,
  Tooltip,
} from 'antd';
import { useTranslation } from 'react-i18next';
import {
  LockOutlined,
  InfoCircleOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import styles from './SecurityConfig.module.css';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import SyncButton from '../../components/SyncButton';
import { Device } from '../../types';

const { TabPane } = Tabs;
const { Option } = Select;

enum EncryptionAlgorithm {
  NONE = 0,
  SNOW3G = 1,
  AES = 2,
  ZUC = 3
}

const ENCRYPTION_ALGORITHM_LABELS: { [key: number]: string } = {
  0: "None",
  1: "SNOW3G",
  2: "AES",
  3: "ZUC",
};

interface SecurityConfig2MeshProps {
  device: Device;
  onConfigUpdate?: () => void;
}

const SecurityConfig2Mesh: React.FC<SecurityConfig2MeshProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    device_id: Number(device.id),
    encryption_algorithm: EncryptionAlgorithm.NONE,
    encryption_key: '',
  });

  const [key, setKey] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [currentKey, setCurrentKey] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const algRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DCIAC?');
        let algorithm = EncryptionAlgorithm.NONE;
        if (algRes.data?.response) {
          const match = algRes.data.response.match(/\^DCIAC:\s*(\d+)/);
          if (match && match[1]) {
            algorithm = Number(match[1]) as EncryptionAlgorithm;
          }
        }
        
        setConfig(prev => ({
          ...prev,
          encryption_algorithm: algorithm,
        }));
        form.setFieldsValue({
          encryption_algorithm: algorithm,
        });
      } catch (e) {
        // 安全配置获取失败
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [device.id]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(device.id, `AT^DCIAC=${values.encryption_algorithm}`);
      setConfig(prev => ({
        ...prev,
        encryption_algorithm: values.encryption_algorithm
      }));
      form.setFieldsValue({
        encryption_algorithm: values.encryption_algorithm
      });
      message.success(t('Security configuration updated successfully'));
      // 不调用onConfigUpdate以避免页面跳转，让用户停留在当前页面
    } catch (error) {
      message.error(t('Failed to update security configuration'));
    } finally {
      setLoading(false);
    }
  };

  const validateKey = (value: string) => {
    if (!value) return t('Key is required');
    if (!/^[0-9a-fA-F]+$/.test(value)) return t('Key must be hex (0-9, a-f, A-F)');
    if (value.length % 2 !== 0) return t('Key length must be even');
    if (value.length > 64) return t('Key must be no more than 32 bytes (64 hex chars)');
    return '';
  };

  const handleKeySubmit = async () => {
    const err = validateKey(key);
    setKeyError(err);
    if (err) return;
    setKeyLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(device.id, `AT^DAPI=${key}`);
      message.success(t('Key updated successfully'));
      setCurrentKey(key);
      setKey('');
    } catch (e) {
      message.error(t('Failed to update key'));
    } finally {
      setKeyLoading(false);
    }
  };

  const handleKeyReset = async () => {
    setKeyLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(device.id, 'AT^DAPI=');
      message.success(t('Key reset successfully. NOTE: After reset key, You need to restart the device.'));
      setCurrentKey('');
      setKey('');
    } catch (e) {
      message.error(t('Failed to reset key'));
    } finally {
      setKeyLoading(false);
    }
  };

  const renderEncryptionSettings = () => (
    <Card title={t('Encryption Settings')} className={styles.card}>
      <div className={styles.currentKeySection}>
        <div className={styles.currentKeyLabel}>
          <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          <span style={{ fontWeight: 600 }}>{t('Now Algorithm')}:</span>
        </div>
        <div className={styles.currentKeyValue}>
          {ENCRYPTION_ALGORITHM_LABELS[Number(config.encryption_algorithm) ?? 0]}
        </div>
      </div>
      <Divider />
      <Form.Item label={t('Encryption Algorithm')} name="encryption_algorithm">
        <Select>
          <Select.Option value={0}>{t('None')}</Select.Option>
          <Select.Option value={1}>SNOW3G</Select.Option>
          <Select.Option value={2}>AES</Select.Option>
          <Select.Option value={3}>ZUC</Select.Option>
        </Select>
      </Form.Item>
    </Card>
  );

  const renderKeySettings = () => (
    <Card title={<span><KeyOutlined /> {t('Key Setting')}</span>} className={styles.card}>
      <div className={styles.currentKeySection}>
        <div className={styles.currentKeyLabel}>
          <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          <strong>{t('Now Key')}:</strong>
        </div>
        <div className={styles.currentKeyValue}>
          {currentKey || t('(empty)')}
        </div>
      </div>
      
      <div className={styles.helpText}>
        <strong>{t('Key Setting')}</strong> {t('(Must be even in HexNumber 0~9, A~F or a~f, No more than 32 bytes)')}
      </div>
      
      <div className={styles.warningText}>
        <strong>{t('NOTE')}:</strong> {t('After reset key, You need to restart the device.')}
      </div>
      
      <Form.Item
        label={t('New Key')}
        name="encryption_key"
        validateStatus={keyError ? 'error' : ''}
        help={keyError}
        style={{ marginTop: 24 }}
      >
        <Input
          onChange={e => {
            setKey(e.target.value);
            setKeyError(validateKey(e.target.value));
          }}
          placeholder={t('Enter new key (hex)')}
          maxLength={64}
          disabled={keyLoading}
        />
      </Form.Item>
    </Card>
  );

  return (
    <div className={styles.container}>
      <Card 
        title={t('Security Configuration')} 
        className={styles.card}
        extra={
          <SyncButton
            deviceId={Number(device.id)}
            configType="encryption"
            configTypeName={t('Security')}
            onSyncSuccess={() => {
              const fetchConfig = async () => {
                try {
                  setLoading(true);
                  const algRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DCIAC?');
                  let algorithm = EncryptionAlgorithm.NONE;
                  if (algRes.data?.response) {
                    const match = algRes.data.response.match(/\^DCIAC:\s*(\d+)/);
                    if (match && match[1]) {
                      algorithm = Number(match[1]) as EncryptionAlgorithm;
                    }
                  }
                  
                  setConfig(prev => ({
                    ...prev,
                    encryption_algorithm: algorithm,
                  }));
                  form.setFieldsValue({
                    encryption_algorithm: algorithm,
                  });
                } catch (error) {
                  // 安全配置获取失败
                } finally {
                  setLoading(false);
                }
              };
              fetchConfig();
            }}
          />
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={config}
          onFinish={handleSubmit}
        >
          <Tabs defaultActiveKey="encryption">
            <TabPane
              tab={
                <span>
                  <LockOutlined />
                  {t('Encryption')}
                </span>
              }
              key="encryption"
            >
              {renderEncryptionSettings()}
            </TabPane>
            <TabPane
              tab={
                <span>
                  <KeyOutlined />
                  {t('Key')}
                </span>
              }
              key="key"
            >
              {renderKeySettings()}
            </TabPane>
          </Tabs>
          <Divider />
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {t('Save Configuration')}
              </Button>
              <Button onClick={async () => {
                form.resetFields();
                form.setFieldsValue({ encryption_algorithm: 0 });
                setConfig(prev => ({ ...prev, encryption_algorithm: 0 }));
                setKey('');
                setCurrentKey('');
                form.setFieldsValue({ encryption_key: '' });
                try {
                  await deviceConfigAPI.sendATCommand(device.id, 'AT^DCIAC=0');
                  message.success(t('Reset completed'));
                } catch (error) {
                  message.error(t('Reset completed but failed to send AT command'));
                }
              }}>
                {t('Reset')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SecurityConfig2Mesh; 