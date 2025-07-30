import React from 'react';
import { Form, Input, Select, Switch, Card, Row, Col, Button, Space } from 'antd';
import { Device } from '../../types';
import styles from './SystemConfig.module.css';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

interface SystemConfigProps {
  device: Device;
  onSave: (values: any) => void;
  loading?: boolean;
}

const SystemConfig: React.FC<SystemConfigProps> = ({
  device,
  onSave,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();

  const handleSubmit = async (values: any) => {
    onSave(values);
  };

  return (
    <div className={styles.container}>
      <Card title={t('System Configuration')} className={styles.card}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            hostname: device.node_id || '',
            timezone: 'UTC',
            language: 'en',
            logLevel: 'info',
          }}
        >
          <Form.Item
            name="hostname"
            label={t('Hostname')}
            rules={[{ required: true, message: t('Please input hostname') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="timezone"
            label={t('Timezone')}
            rules={[{ required: true, message: t('Please select timezone') }]}
          >
            <Select>
              <Option value="UTC">UTC</Option>
              <Option value="EST">EST</Option>
              <Option value="PST">PST</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="language"
            label={t('Language')}
            rules={[{ required: true, message: t('Please select language') }]}
          >
            <Select>
              <Option value="en">{t('English')}</Option>
              <Option value="zh">{t('Chinese')}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="logLevel"
            label={t('Log Level')}
            rules={[{ required: true, message: t('Please select log level') }]}
          >
            <Select>
              <Option value="debug">{t('Debug')}</Option>
              <Option value="info">{t('Info')}</Option>
              <Option value="warning">{t('Warning')}</Option>
              <Option value="error">{t('Error')}</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <div className={styles.buttonGroup}>
              <Button type="primary" htmlType="submit" loading={loading}>
                {t('Save')}
              </Button>
              <Button onClick={() => form.resetFields()}>
                {t('Reset')}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SystemConfig; 