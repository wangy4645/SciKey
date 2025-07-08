import React from 'react';
import { Form, Input, Select, Switch, Card, Row, Col, Button, Space } from 'antd';
import { Device } from '../../types';
import styles from './SystemConfig.module.css';

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

  const handleSubmit = async (values: any) => {
    onSave(values);
  };

  return (
    <div className={styles.container}>
      <Card title="System Configuration" className={styles.card}>
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
            label="Hostname"
            rules={[{ required: true, message: 'Please input hostname' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="timezone"
            label="Timezone"
            rules={[{ required: true, message: 'Please select timezone' }]}
          >
            <Select>
              <Option value="UTC">UTC</Option>
              <Option value="EST">EST</Option>
              <Option value="PST">PST</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="language"
            label="Language"
            rules={[{ required: true, message: 'Please select language' }]}
          >
            <Select>
              <Option value="en">English</Option>
              <Option value="zh">Chinese</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="logLevel"
            label="Log Level"
            rules={[{ required: true, message: 'Please select log level' }]}
          >
            <Select>
              <Option value="debug">Debug</Option>
              <Option value="info">Info</Option>
              <Option value="warning">Warning</Option>
              <Option value="error">Error</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <div className={styles.buttonGroup}>
              <Button type="primary" htmlType="submit" loading={loading}>
                Save
              </Button>
              <Button onClick={() => form.resetFields()}>
                Reset
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SystemConfig; 