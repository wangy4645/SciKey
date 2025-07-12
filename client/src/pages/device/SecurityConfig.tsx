import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Row,
  Col,
  Divider,
  message,
  Tabs,
  Space,
  InputNumber,
  Select,
} from 'antd';
import { useTranslation } from 'react-i18next';
import {
  SafetyOutlined,
  LockOutlined,
  UserOutlined,
  FireOutlined,
  InfoCircleOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import styles from './SecurityConfig.module.css';
import type { SecurityConfig as SecurityConfigType } from './types';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import SyncButton from '../../components/SyncButton';

const { TabPane } = Tabs;
const { Option } = Select;

// 定义加密算法枚举
enum EncryptionAlgorithm {
  NONE = 0,
  SNOW3G = 1,
  AES = 2,
  ZUC = 3
}

// 加密算法显示名称映射
const ENCRYPTION_ALGORITHM_LABELS = {
  0: "None",
  1: "SNOW3G",
  2: "AES",
  3: "ZUC",
};

interface SecurityConfigProps {
  deviceId: string;
}

const SecurityConfigComponent: React.FC<SecurityConfigProps> = ({ deviceId }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SecurityConfigType>({
    device_id: Number(deviceId),
    encryption_algorithm: EncryptionAlgorithm.NONE,
    encryption_key: '',
    firewall_enabled: false,
    ssh_enabled: false,
    ssh_port: 22,
    ssh_key_auth: false,
    ssh_password_auth: true,
    vpn_enabled: false,
    vpn_type: 'openvpn',
    vpn_config: '',
    access_control_list: '',
    security_log_level: 'info',
    security_alerts: false,
    security_updates: false,
    security_scan_period: 24,
  });

  // Key Tab State
  const [key, setKey] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [currentKey, setCurrentKey] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await deviceConfigAPI.getSecurityConfig(Number(deviceId));
        if (response && response.data && response.data.config) {
          const configData = response.data.config as SecurityConfigType;
          
          // 检查是否是执行状态响应（没有具体配置数据）
          if (configData.status === 'command_executed' && configData.note) {
            console.log('Device returned execution status only:', configData.note);
            message.info('Device command executed successfully, but no configuration data was returned. This may indicate that the device does not support this command or requires additional setup.');
            return;
          }
          
          // 将 security_scan_period 从秒转换为小时
          if (configData.security_scan_period) {
            configData.security_scan_period = Math.round(configData.security_scan_period / 3600);
          }
          
          setConfig(configData);
          form.setFieldsValue(configData);
        } else {
          message.error(t('Failed to get security configuration: invalid response format'));
        }
      } catch (error) {
        console.error('Error fetching security config:', error);
        message.error(t('Failed to get security configuration: ') + (error instanceof Error ? error.message : t('Unknown error')));
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfig();
    
    // 监听设备配置同步事件
    const handleDeviceConfigSync = (event: CustomEvent) => {
      if (event.detail && event.detail.deviceId === Number(deviceId)) {
        console.log('Security config: Received sync event, refreshing data...');
        fetchConfig();
      }
    };
    
    window.addEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    
    return () => {
      window.removeEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    };
  }, [deviceId, form]);

  // 获取当前Key
  useEffect(() => {
    const fetchKey = async () => {
      try {
        setKeyLoading(true);
        // 从安全配置中获取encryption_key字段
        const response = await deviceConfigAPI.getSecurityConfig(Number(deviceId));
        if (response && response.data && response.data.config && response.data.config.encryption_key) {
          setCurrentKey(response.data.config.encryption_key);
        } else {
          setCurrentKey('');
        }
      } catch (e) {
        setCurrentKey('');
      } finally {
        setKeyLoading(false);
      }
    };
    fetchKey();
  }, [deviceId]);

  // 获取被修改的字段
  const getChangedFields = (original: Record<string, any>, updated: Record<string, any>) => {
    const changed: Record<string, any> = {};
    Object.keys(updated).forEach(key => {
      // 用全等判断，确保0等falsy值也能被识别为变化
      if (updated[key] !== original[key]) {
        changed[key] = updated[key];
      }
    });
    return changed;
  };

  const handleSubmit = async (values: SecurityConfigType) => {
    setLoading(true);
    try {
      // 只传递被修改的字段
      const changedFields = getChangedFields(config, values);
      changedFields.device_id = Number(deviceId);

      // 确保encryption_algorithm字段总是被发送（即使值没有变化）
      if (Object.prototype.hasOwnProperty.call(values, 'encryption_algorithm')) {
        changedFields.encryption_algorithm = values.encryption_algorithm;
      }

      // 添加调试日志
      console.log('Original config:', config);
      console.log('Form values:', values);
      console.log('Changed fields:', changedFields);
      console.log('encryption_key in values:', values.encryption_key);
      console.log('encryption_algorithm in values:', values.encryption_algorithm);

      // 特殊处理：如果有 security_scan_period，转换为秒
      if ('security_scan_period' in changedFields) {
        changedFields.security_scan_period = changedFields.security_scan_period * 3600;
      }

      await deviceConfigAPI.updateSecurityConfig(Number(deviceId), changedFields);

      // 检查是否有字段被修改（除了device_id）
      const hasChanges = Object.keys(changedFields).some(key => key !== 'device_id');
      console.log('Has changes:', hasChanges);
      console.log('Changed fields keys:', Object.keys(changedFields));
      
      // 检查是否有encryption_key，如果有则发送AT+CONFIG指令
      if (values.encryption_key && values.encryption_key.trim() !== '') {
        const atCommand = `AT+CONFIG=0,0,0,0,${values.encryption_algorithm || 0},${values.encryption_key}`;
        console.log('Sending AT+CONFIG command with key:', atCommand);
        await deviceConfigAPI.sendATCommand(Number(deviceId), atCommand);
      } else if (Object.prototype.hasOwnProperty.call(values, 'encryption_algorithm')) {
        // 只有加密算法变化时，发送AT^DCIAC指令
        const atCommand = `AT^DCIAC=${values.encryption_algorithm}`;
        console.log('Sending AT^DCIAC command:', atCommand);
        await deviceConfigAPI.sendATCommand(Number(deviceId), atCommand);
      } else if (hasChanges) {
        // 其他字段变化时发送默认AT指令
        const atCommand = 'AT+CONFIG?'; // 示例
        if (atCommand) {
          await deviceConfigAPI.sendATCommand(Number(deviceId), atCommand);
        }
      } else {
        console.log('No changes detected, skipping AT command');
      }

      message.success(t('Security configuration updated successfully'));
      
      // 如果保存了encryption_key，更新currentKey显示
      if (values.encryption_key && values.encryption_key.trim() !== '') {
        setCurrentKey(values.encryption_key);
      }
    } catch (error) {
      message.error(t('Failed to update security configuration'));
    } finally {
      setLoading(false);
    }
  };

  // Key 校验
  const validateKey = (value: string) => {
    if (!value) return t('Key is required');
    if (!/^[0-9a-fA-F]+$/.test(value)) return t('Key must be hex (0-9, a-f, A-F)');
    if (value.length % 2 !== 0) return t('Key length must be even');
    if (value.length > 64) return t('Key must be no more than 32 bytes (64 hex chars)');
    return '';
  };

  // 提交Key
  const handleKeySubmit = async () => {
    const err = validateKey(key);
    setKeyError(err);
    if (err) return;
    setKeyLoading(true);
    try {
      await deviceConfigAPI.setKey(Number(deviceId), key);
      message.success(t('Key updated successfully'));
      setCurrentKey(key);
      setKey('');
    } catch (e) {
      message.error(t('Failed to update key'));
    } finally {
      setKeyLoading(false);
    }
  };

  // 重置Key
  const handleKeyReset = async () => {
    setKeyLoading(true);
    try {
      await deviceConfigAPI.setKey(Number(deviceId), '');
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
          <strong>{t('Now Algorithm')}:</strong>
        </div>
        <div className={styles.currentKeyValue}>
          {(() => {
            console.log('encryption_algorithm value:', config.encryption_algorithm, 'type:', typeof config.encryption_algorithm);
            const algo = Number(config.encryption_algorithm);
            console.log('converted algo:', algo, 'type:', typeof algo);
            const result = algo === 0 ? t('None') :
              algo === 1 ? 'SNOW3G' :
              algo === 2 ? 'AES' :
              algo === 3 ? 'ZUC' : t('Not set');
            console.log('display result:', result);
            return result;
          })()}
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

  const renderSSHSettings = () => (
    <Card title={t('SSH Settings')} className={styles.card}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="ssh_enabled"
            label={t('Enable SSH')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="ssh_port"
            label={t('SSH Port')}
            rules={[
              { type: 'number', min: 1, max: 65535, message: t('Port must be between 1 and 65535') }
            ]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="22" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="ssh_key_auth"
            label={t('Enable Key Authentication')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="ssh_password_auth"
            label={t('Enable Password Authentication')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  const renderVPNSettings = () => (
    <Card title={t('VPN Settings')} className={styles.card}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="vpn_enabled"
            label={t('Enable VPN')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="vpn_type"
            label={t('VPN Type')}
          >
            <Select>
              <Select.Option value="openvpn">OpenVPN</Select.Option>
              <Select.Option value="ipsec">IPSec</Select.Option>
              <Select.Option value="wireguard">WireGuard</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        name="vpn_config"
        label={t('VPN Configuration')}
      >
        <Input.TextArea rows={4} />
      </Form.Item>
    </Card>
  );

  const renderFirewallSettings = () => (
    <Card title={t('Firewall Settings')} className={styles.card}>
      <Form.Item
        name="firewall_enabled"
        label={t('Enable Firewall')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="access_control_list"
        label={t('Access Control List')}
      >
        <Input.TextArea rows={4} placeholder={t('Enter access control rules (one per line)')} />
      </Form.Item>
    </Card>
  );

  const renderSecuritySettings = () => (
    <Card title={t('Security Settings')} className={styles.card}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="security_alerts"
            label={t('Enable Security Alerts')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="security_updates"
            label={t('Enable Security Updates')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="security_log_level"
            label={t('Security Log Level')}
          >
            <Select>
              <Select.Option value="debug">{t('Debug')}</Select.Option>
              <Select.Option value="info">{t('Info')}</Select.Option>
              <Select.Option value="warning">{t('Warning')}</Select.Option>
              <Select.Option value="error">{t('Error')}</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="security_scan_period"
            label={t('Security Scan Period (hours)')}
            rules={[
              { type: 'number', min: 1, max: 168, message: t('Period must be between 1 and 168 hours') }
            ]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  // Key Tab 渲染
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
            deviceId={Number(deviceId)}
            configType="security"
            configTypeName={t('Security')}
            onSyncSuccess={() => {
              // 重新获取安全配置
              const fetchConfig = async () => {
                try {
                  setLoading(true);
                  const response = await deviceConfigAPI.getSecurityConfig(Number(deviceId));
                  if (response && response.data && response.data.config) {
                    const configData = response.data.config as SecurityConfigType;
                    setConfig(configData);
                    form.setFieldsValue(configData);
                  }
                } catch (error) {
                  console.error('Error fetching security config:', error);
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
                // 清空表单中的encryption_key字段
                form.setFieldsValue({ encryption_key: '' });
                try {
                  // 重置时发送AT+CONFIG指令，将encryption_key设为空
                  const atCommand = 'AT+CONFIG=0,0,0,0,0,';
                  await deviceConfigAPI.sendATCommand(Number(deviceId), atCommand);
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

export default SecurityConfigComponent; 