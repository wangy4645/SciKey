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
  SyncOutlined,
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
const ENCRYPTION_ALGORITHM_LABELS: { [key: number]: string } = {
  0: "None",
  1: "SNOW3G",
  2: "AES",
  3: "ZUC",
};

interface SecurityConfigProps {
  deviceId: string;
  isMesh?: boolean;
}

const SecurityConfigComponent: React.FC<SecurityConfigProps> = ({ deviceId, isMesh }) => {
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
  // mesh本地状态
  const [meshLocal, setMeshLocal] = useState<SecurityConfigType | null>(null);
  const [meshSyncLoading, setMeshSyncLoading] = useState(false);

  // Key Tab State
  const [key, setKey] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [currentKey, setCurrentKey] = useState('');

  // mesh本地状态
  const isMeshLocal = false; // TODO: 通过props或deviceId查找设备类型

  // 已移除自动同步相关useEffect代码

  // 获取当前配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await deviceConfigAPI.getSecurityConfig(Number(deviceId));
        if (response && response.data && response.data.config) {
          const configData = response.data.config;
          setConfig(prev => ({
            ...prev,
            ...configData,
            encryption_algorithm: Number(configData.encryption_algorithm ?? 0), // 强制转为数字
          }));
          form.setFieldsValue({
            ...configData,
            encryption_algorithm: Number(configData.encryption_algorithm ?? 0), // 强制转为数字
          });
        }
      } catch (e) {
        // ... existing code ...
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [deviceId]);

  // 获取被修改的字段
  const getChangedFields = (original: Record<string, any>, updated: Record<string, any>) => {
    const changed: Record<string, any> = {};
    Object.keys(updated).forEach(key => {
      if (updated[key] !== original[key]) {
        changed[key] = updated[key];
      }
    });
    return changed;
  };

  const handleSubmit = async (values: SecurityConfigType) => {
    setLoading(true);
    try {
      const changedFields = getChangedFields(config, values);
      changedFields.device_id = Number(deviceId);
      if (Object.prototype.hasOwnProperty.call(values, 'encryption_algorithm')) {
        changedFields.encryption_algorithm = values.encryption_algorithm;
      }
      if ('security_scan_period' in changedFields) {
        changedFields.security_scan_period = changedFields.security_scan_period * 3600;
      }
      await deviceConfigAPI.updateSecurityConfig(Number(deviceId), changedFields);
      setConfig(prev => ({
        ...prev,
        ...values,
        encryption_algorithm: values.encryption_algorithm
      }));
      form.setFieldsValue({
        ...values,
        encryption_algorithm: values.encryption_algorithm
      });
      if (values.encryption_key && values.encryption_key.trim() !== '') {
        setCurrentKey(values.encryption_key);
      }
      message.success(t('Security configuration updated successfully'));
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
            name="ssh_key_auth"
            label={t('SSH Key Authentication')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label={t('SSH Port')} name="ssh_port">
        <InputNumber min={1} max={65535} style={{ width: '100%' }} />
      </Form.Item>
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
              <Select.Option value="openvpn">{t('OpenVPN')}</Select.Option>
              <Select.Option value="wireguard">{t('WireGuard')}</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label={t('VPN Server')} name="vpn_server">
        <Input placeholder={t('Enter VPN server address')} />
      </Form.Item>
    </Card>
  );

  const renderFirewallSettings = () => (
    <Card title={t('Firewall Settings')} className={styles.card}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="firewall_enabled"
            label={t('Enable Firewall')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="firewall_logging"
            label={t('Firewall Logging')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label={t('Allowed Ports')} name="allowed_ports">
        <Input placeholder={t('Enter allowed ports (e.g., 80,443,8080)')} />
      </Form.Item>
    </Card>
  );

  const renderSecuritySettings = () => (
    <Card title={t('Security Settings')} className={styles.card}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="security_scan_enabled"
            label={t('Enable Security Scan')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="security_scan_period"
            label={t('Scan Period (hours)')}
          >
            <InputNumber min={1} max={24} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label={t('Security Policies')} name="security_policies">
        <Select mode="multiple" placeholder={t('Select security policies')}>
          <Select.Option value="password_policy">{t('Password Policy')}</Select.Option>
          <Select.Option value="session_timeout">{t('Session Timeout')}</Select.Option>
          <Select.Option value="login_attempts">{t('Login Attempts')}</Select.Option>
        </Select>
      </Form.Item>
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

  // mesh同步按钮逻辑
  const handleMeshSync = async () => {
    setMeshSyncLoading(true);
    try {
      // 这里只举例用AT^DCIAC?和AT^DAPI?，如有更多mesh安全指令可补充
      const algRes = await deviceConfigAPI.sendATCommand(Number(deviceId), 'AT^DCIAC?');
      const pwdRes = await deviceConfigAPI.sendATCommand(Number(deviceId), 'AT^DAPI?');
      // 解析响应并更新本地（实际应由后端同步到本地数据库）
      // 这里只做前端展示
      const meshConfig: SecurityConfigType = {
        ...config,
        encryption_algorithm: algRes.data?.response || '',
        encryption_key: pwdRes.data?.response || '',
      };
      setMeshLocal(meshConfig);
      form.setFieldsValue(meshConfig);
    } catch (err) {
      message.error(t('Failed to fetch mesh security config'));
    } finally {
      setMeshSyncLoading(false);
    }
  };

  if (isMesh) {
    return (
      <Card title={t('Security')}>
        <Button
          type="primary"
          icon={<SyncOutlined />}
          onClick={handleMeshSync}
          loading={meshSyncLoading}
          style={{ float: 'right', marginBottom: 16 }}
        >
          {t('Sync')}
        </Button>
        <Form form={form} layout="vertical">
          <Form.Item label={t('Encryption Algorithm')} name="encryption_algorithm">
            <Input readOnly />
          </Form.Item>
          <Form.Item label={t('Password ID')} name="encryption_key">
            <Input readOnly />
          </Form.Item>
        </Form>
      </Card>
    );
  }

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
        // 获取安全配置失败
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