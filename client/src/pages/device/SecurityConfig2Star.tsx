import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, message, Divider, Row, Col, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import styles from './WirelessConfig.module.css';
import { SyncOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

interface SecurityConfig2StarProps {
  device: any;
  onConfigUpdate: () => void;
}

const algoOptions = [
  { label: 'NONE', value: 0 },
  { label: 'SNOW3G', value: 1 },
  { label: 'AES', value: 2 },
  { label: 'ZUC', value: 3 },
];

const SecurityConfig2Star: React.FC<SecurityConfig2StarProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  useEffect(() => {
    // 获取当前配置（从API获取）
    const fetchCurrentConfig = async () => {
      try {
        const resp = await deviceConfigAPI.getSecurityConfig(device.id);
        if (resp && resp.data && resp.data.config) {
          setCurrentConfig(resp.data.config);
        } else {
          setCurrentConfig(null);
        }
      } catch {
        setCurrentConfig(null);
      }
    };
    fetchCurrentConfig();
  }, [device.id]);

  const handleFinish = async (values: any) => {
    try {
      await deviceConfigAPI.sendATCommand(device.id, `AT^DCIAC=${values.algo}`);
      await deviceConfigAPI.sendATCommand(device.id, `AT^DAPI=\"${values.key}\"`);
      message.success(t('Security parameters updated successfully'));
      onConfigUpdate();
    } catch (e) {
      message.error(t('Failed to update security parameters'));
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card} title={t('Security Config')}
        extra={<Button type="primary" icon={<SyncOutlined />} onClick={async () => {
          setLoading(true);
          await deviceConfigAPI.syncDeviceConfigByType(device.id, 'security');
          await form.resetFields();
          // 重新拉取配置
          const resp = await deviceConfigAPI.getSecurityConfig(device.id);
          if (resp && resp.data && resp.data.config) {
            setCurrentConfig(resp.data.config);
          }
          setLoading(false);
        }}>{t('Sync')}</Button>}
      >
        <div className={styles.currentConfig}>
          <strong>{t('Current Configuration')}:</strong>
          {currentConfig ? (
            <Row gutter={16} className={styles.currentConfigRow}>
              {currentConfig.algo !== undefined && <Col><Text>{t('Encryption Algorithm')}: {algoOptions.find(a => a.value === currentConfig.algo)?.label}</Text></Col>}
              {currentConfig.key && <Col><Text>{t('Key (hex, max 64 chars)')}: {currentConfig.key}</Text></Col>}
            </Row>
          ) : (
            <div className={styles.currentConfigRow}>
              <Text type="secondary">{t('Loading...')}</Text>
            </div>
          )}
        </div>
        <div className={styles.warningText}>
          <strong>{t('NOTE')}:&nbsp;&nbsp;</strong>{t('Please restart device when setup is completed')}
        </div>
        <Divider />
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item label={t('Encryption Algorithm')} name="algo" rules={[{ required: true }]}> <Select style={{ width: '100%' }} options={algoOptions} /> </Form.Item>
          <Form.Item label={t('Key (hex, max 64 chars)')} name="key" rules={[{ required: true, pattern: /^[0-9a-fA-F]{2,64}$/ }]}> <Input style={{ width: '100%' }} maxLength={64} /> </Form.Item>
          <div className={styles.buttonGroup}>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: 120 }}>{t('Save Configuration')}</Button>
            <Button htmlType="button" onClick={() => form.resetFields()} style={{ width: 100, marginLeft: 8 }}>{t('Reset')}</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default SecurityConfig2Star; 