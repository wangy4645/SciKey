import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Button, message, Divider, Row, Col, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import styles from './WirelessConfig.module.css';
import { SyncOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

interface UpDownConfig2StarProps {
  device: any;
  onConfigUpdate: () => void;
}

const tddOptions = [
  { label: '2D3U', value: 0 },
  { label: '3D2U', value: 1 },
  { label: '4D1U', value: 2 },
  { label: '1D4U', value: 3 },
];

const UpDownConfig2Star: React.FC<UpDownConfig2StarProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  useEffect(() => {
    // 获取当前配置（从API获取）
    const fetchCurrentConfig = async () => {
      try {
        const resp = await deviceConfigAPI.getUpDownConfig(device.id);
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
      await deviceConfigAPI.sendATCommand(device.id, `AT^DSTC=${values.tdd}`);
      message.success(t('TDD Config Updated'));
      onConfigUpdate();
    } catch (e) {
      message.error(t('TDD Config Update Failed'));
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card} title={t('UpDown Config')}
        extra={<Button type="primary" icon={<SyncOutlined />} onClick={async () => {
          setLoading(true);
          await deviceConfigAPI.syncDeviceConfigByType(device.id, 'up_down');
          await form.resetFields();
          // 重新拉取配置
          const resp = await deviceConfigAPI.getUpDownConfig(device.id);
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
              {currentConfig.tdd !== undefined && <Col><Text>{t('TDD Config')}: {tddOptions.find(o => o.value === currentConfig.tdd)?.label}</Text></Col>}
            </Row>
          ) : (
            <div className={styles.currentConfigRow}>
              <Text type="secondary">{t('Loading...')}</Text>
            </div>
          )}
        </div>
        <Divider />
        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ tdd: 0 }}>
          <Form.Item label={t('TDD Config')} name="tdd" rules={[{ required: true }]}> <Select style={{ width: '100%' }} options={tddOptions} /> </Form.Item>
          <div className={styles.buttonGroup}>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: 120 }}>{t('Save Configuration')}</Button>
            <Button htmlType="button" onClick={() => form.resetFields()} style={{ width: 100, marginLeft: 8 }}>{t('Reset')}</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default UpDownConfig2Star; 