import React, { useState, useEffect } from 'react';
import { Card, Form, Button, message, Divider, Row, Col, Typography, Select, Input, InputNumber } from 'antd';
import { useTranslation } from 'react-i18next';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import styles from './WirelessConfig.module.css';
import { SyncOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Title, Text } = Typography;

interface WirelessConfig2StarProps {
  device: any;
  onConfigUpdate: () => void;
}

const bandwidthOptions = [
  { label: '1.4M', value: 0 },
  { label: '3M', value: 1 },
  { label: '5M', value: 2 },
  { label: '10M', value: 3 },
  { label: '20M', value: 5 },
];

const cellIdOptions = [
  { label: 'Primary Cell', value: 0 },
  { label: 'Secondary Cell', value: 1 },
];

const WirelessConfig2Star: React.FC<WirelessConfig2StarProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  useEffect(() => {
    // 获取当前配置（从API获取）
    const fetchCurrentConfig = async () => {
      try {
        const resp = await deviceConfigAPI.getWirelessConfig(device.id);
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
    setLoading(true);
    try {
      const atCmd = `AT^DRPC=${values.freq},${values.bandwidth},"${values.power}",${values.cellid}`;
      await deviceConfigAPI.sendATCommand(device.id, atCmd);
      message.success(t('Wireless parameters updated successfully'));
      onConfigUpdate();
    } catch (e) {
      message.error(t('Failed to update wireless parameters'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card} title={t('Wireless Config')}
        extra={<Button type="primary" icon={<SyncOutlined />} onClick={async () => {
          setLoading(true);
          await deviceConfigAPI.syncDeviceConfigByType(device.id, 'wireless');
          await form.resetFields();
          // 重新拉取配置
          const resp = await deviceConfigAPI.getWirelessConfig(device.id);
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
              {currentConfig.freq && <Col><Text>{t('Main Frequency (100KHz)')}: {currentConfig.freq}</Text></Col>}
              {currentConfig.bandwidth !== undefined && <Col><Text>{t('Bandwidth')}: {bandwidthOptions.find(bw => bw.value === currentConfig.bandwidth)?.label}</Text></Col>}
              {currentConfig.power !== undefined && <Col><Text>{t('Transmit Power (dBm)')}: {currentConfig.power}</Text></Col>}
              {currentConfig.cellid !== undefined && <Col><Text>{t('Cell Type')}: {cellIdOptions.find(c => c.value === currentConfig.cellid)?.label}</Text></Col>}
            </Row>
          ) : (
            <div className={styles.currentConfigRow}>
              <Text type="secondary">{t('Loading...')}</Text>
            </div>
          )}
        </div>
        <Divider />
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ bandwidth: 5, cellid: 0 }}
        >
          <Form.Item label={t('Main Frequency (100KHz)')} name="freq" rules={[{ required: true }]}> <InputNumber min={24015} max={24814} style={{ width: '100%' }} /> </Form.Item>
          <Form.Item label={t('Bandwidth')} name="bandwidth" rules={[{ required: true }]}> <Select style={{ width: '100%' }} options={bandwidthOptions.map(o => ({ ...o, label: t(o.label) }))} /> </Form.Item>
          <Form.Item label={t('Transmit Power (dBm)')} name="power" rules={[{ required: true }]}> <InputNumber min={-40} max={50} style={{ width: '100%' }} /> </Form.Item>
          <Form.Item label={t('Cell Type')} name="cellid" rules={[{ required: true }]}> <Select style={{ width: '100%' }} options={cellIdOptions.map(o => ({ ...o, label: t(o.label) }))} /> </Form.Item>
          <div className={styles.buttonGroup}>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: 120 }}>{t('Save Configuration')}</Button>
            <Button htmlType="button" onClick={() => form.resetFields()} style={{ width: 100, marginLeft: 8 }}>{t('Reset')}</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default WirelessConfig2Star; 