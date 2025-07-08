import React from 'react';
import { Form, Input, Select, Switch, Card, Row, Col, Button, Space, InputNumber } from 'antd';
import { Device } from '../../types';
import styles from './UpDownSettingConfig.module.css';

const { Option } = Select;

interface UpDownSettingConfigProps {
  device: Device;
  onSave: (values: any) => void;
  loading?: boolean;
}

const UpDownSettingConfig: React.FC<UpDownSettingConfigProps> = ({
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
      <Card title="Up/Down Settings" className={styles.card}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            autoRestart: true,
            restartDelay: 30,
            maxRetries: 3,
            retryInterval: 60,
          }}
        >
          <Form.Item
            name="autoRestart"
            label="Auto Restart"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="restartDelay"
            label="Restart Delay (seconds)"
            rules={[{ required: true, message: 'Please input restart delay' }]}
          >
            <InputNumber min={0} max={300} />
          </Form.Item>

          <Form.Item
            name="maxRetries"
            label="Max Retries"
            rules={[{ required: true, message: 'Please input max retries' }]}
          >
            <InputNumber min={0} max={10} />
          </Form.Item>

          <Form.Item
            name="retryInterval"
            label="Retry Interval (seconds)"
            rules={[{ required: true, message: 'Please input retry interval' }]}
          >
            <InputNumber min={0} max={300} />
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

export default UpDownSettingConfig; 