import React from 'react';
import { Form, Input, Select, Switch, Card, Button, Space } from 'antd';
import { Device } from '../../types';
import styles from './DebugConfig.module.css';

const { Option } = Select;
const { TextArea } = Input;

interface DebugConfigProps {
  device: Device;
  onSave: (values: any) => void;
  loading?: boolean;
}

const DebugConfig: React.FC<DebugConfigProps> = ({
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
      <Card title="Debug Configuration" className={styles.card}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            debugLevel: 'info',
            enableLogging: true,
            logRetention: 30,
            enableRemoteDebug: false,
          }}
        >
          <Form.Item
            name="debugLevel"
            label="Debug Level"
            rules={[{ required: true, message: 'Please select debug level' }]}
          >
            <Select>
              <Option value="debug">Debug</Option>
              <Option value="info">Info</Option>
              <Option value="warning">Warning</Option>
              <Option value="error">Error</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="enableLogging"
            label="Enable Logging"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="logRetention"
            label="Log Retention (days)"
            rules={[{ required: true, message: 'Please input log retention days' }]}
          >
            <Input type="number" min={1} max={365} />
          </Form.Item>

          <Form.Item
            name="enableRemoteDebug"
            label="Enable Remote Debug"
            valuePropName="checked"
          >
            <Switch />
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

export default DebugConfig; 