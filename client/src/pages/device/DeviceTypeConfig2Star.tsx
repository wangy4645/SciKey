import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Button, message, Divider, Row, Col, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import styles from './WirelessConfig.module.css';
import { SyncOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

interface DeviceTypeConfig2StarProps {
  device: any;
  onConfigUpdate: () => void;
}

const typeOptions = [
  { label: 'Central Node', value: 1 },
  { label: 'Access Node', value: 2 },
];

const DeviceTypeConfig2Star: React.FC<DeviceTypeConfig2StarProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  useEffect(() => {
    // 获取当前配置（从API获取）
    const fetchCurrentConfig = async () => {
      try {
        const resp = await deviceConfigAPI.getDeviceTypeConfig(device.id);
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
      await deviceConfigAPI.sendATCommand(device.id, `AT^DDTC=${values.type}`);
      message.success(t('Device type updated successfully'));
      onConfigUpdate();
    } catch (e) {
      message.error(t('Failed to update device type'));
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card} title={t('Device Type')}
        extra={<Button type="primary" icon={<SyncOutlined />} onClick={async () => {
          setLoading(true);
          await deviceConfigAPI.syncDeviceConfigByType(device.id, 'device_type');
          await form.resetFields();
          // 重新拉取配置
          const resp = await deviceConfigAPI.getDeviceTypeConfig(device.id);
          if (resp && resp.data && resp.data.config) {
            setCurrentConfig(resp.data.config);
          }
          setLoading(false);
        }}>{t('Sync')}</Button>}
      >
        <div className={styles.warningText}>
          <strong>{t('NOTE')}:&nbsp;&nbsp;</strong>{t('Please restart device when setup is completed')}
        </div>
        <Divider />
        <div className={styles.currentConfig}>
          <strong>{t('Current Configuration')}:</strong>
          {currentConfig ? (
            <Row gutter={16} className={styles.currentConfigRow}>
              {currentConfig.type !== undefined && <Col><Text>{t('Device Type')}: {typeOptions.find(ti => ti.value === currentConfig.type)?.label}</Text></Col>}
            </Row>
          ) : (
            <div className={styles.currentConfigRow}>
              <Text type="secondary">{t('Loading...')}</Text>
            </div>
          )}
        </div>
        <Divider />
        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ type: 1 }}>
          <Form.Item label={t('Device Type')} name="type" rules={[{ required: true }]}> <Select style={{ width: '100%' }} options={typeOptions} /> </Form.Item>
          <div className={styles.buttonGroup}>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: 120 }}>{t('Save Configuration')}</Button>
            <Button htmlType="button" onClick={() => form.resetFields()} style={{ width: 100, marginLeft: 8 }}>{t('Reset')}</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default DeviceTypeConfig2Star; 