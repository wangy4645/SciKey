import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Switch, Button, message } from 'antd';
import { Device } from '../../types';
import { deviceConfigAPI } from '../../services/api';
import styles from './NetworkStateConfig.module.css';

interface NetworkStateConfigProps {
  device: Device;
  onSave: (values: any) => void;
  loading?: boolean;
}

const NetworkStateConfig: React.FC<NetworkStateConfigProps> = ({ device, onSave, loading }) => {
  const [form] = Form.useForm();
  const [networkState, setNetworkState] = useState<any>(null);

  const fetchNetworkState = async () => {
    try {
      console.log('Fetching network state for device:', device);
      if (!device || !device.id) {
        console.error('Invalid device data:', device);
        message.error('Invalid device data');
        return;
      }

      const response = await deviceConfigAPI.getNetworkConfig(device.id);
      console.log('Network state response:', response.data);
      
      if (!response.data || !response.data.config) {
        console.error('Invalid response format:', response.data);
        message.error('Invalid response format');
        return;
      }

      setNetworkState(response.data.config);
      form.setFieldsValue(response.data.config);
    } catch (error: any) {
      console.error('Error fetching network state:', error);
      message.error(error.response?.data?.message || 'Failed to fetch network state');
    }
  };

  useEffect(() => {
    if (device && device.id) {
      fetchNetworkState();
    }
  }, [device.id]);

  const handleSubmit = async (values: any) => {
    try {
      await onSave(values);
      message.success('Network state updated successfully');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to update network state');
    }
  };

  return (
    <div className={styles.container}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={networkState}
      >
        <Form.Item
          name="ipAddress"
          label="IP Address"
          rules={[{ required: true, message: 'Please input IP address!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="subnetMask"
          label="Subnet Mask"
          rules={[{ required: true, message: 'Please input subnet mask!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="gateway"
          label="Gateway"
          rules={[{ required: true, message: 'Please input gateway!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="dns"
          label="DNS Servers"
          rules={[{ required: true, message: 'Please input DNS servers!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="mtu"
          label="MTU"
          rules={[{ required: true, message: 'Please input MTU!' }]}
        >
          <InputNumber min={576} max={9000} />
        </Form.Item>

        <Form.Item
          name="enableDhcp"
          label="Enable DHCP"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="packetLoss"
          label="Packet Loss (%)"
          rules={[{ required: true, message: 'Please input packet loss!' }]}
        >
          <InputNumber min={0} max={100} />
        </Form.Item>

        <Form.Item
          name="latency"
          label="Latency (ms)"
          rules={[{ required: true, message: 'Please input latency!' }]}
        >
          <InputNumber min={0} />
        </Form.Item>

        <Form.Item
          name="bandwidth"
          label="Bandwidth (Mbps)"
          rules={[{ required: true, message: 'Please input bandwidth!' }]}
        >
          <InputNumber min={0} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default NetworkStateConfig; 