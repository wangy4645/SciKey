import React, { useState } from 'react';
import { Form, Input, Select, Switch, Card, Row, Col, Button, Space, InputNumber } from 'antd';
import { Device } from '../../types';
import styles from './WirelessConfig.module.css';

const { Option } = Select;

interface WirelessConfigProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
}

const WirelessConfig: React.FC<WirelessConfigProps> = ({ device, onSave, loading }) => {
  const [form] = Form.useForm();

  return (
    <div className={styles.container}>
      <Card title="Wireless Settings" className={styles.configCard}>
        {/* Current Value Display - 卡片分行风格 */}
        <div className={styles.currentKeySection}>
          <div className={styles.currentKeyLabel}>Now Band:</div>
          <div className={styles.currentKeyValue}>{form.getFieldValue('band') || '-'}</div>
          <div className={styles.currentKeyLabel}>Now Channel:</div>
          <div className={styles.currentKeyValue}>{form.getFieldValue('channel') || '-'}</div>
          <div className={styles.currentKeyLabel}>Now Channel Width:</div>
          <div className={styles.currentKeyValue}>{form.getFieldValue('channelWidth') || '-'}</div>
        </div>
        {/* Wireless Settings Form */}
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            enableWireless: true,
            ssid: 'MyNetwork',
            hideSsid: false,
            securityMode: 'wpa2',
            password: '',
            channel: 1,
            channelWidth: '20',
            txPower: 100,
            band: '2.4',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="enableWireless"
                label="Enable Wireless"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="hideSsid"
                label="Hide SSID"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="ssid"
                label="Network Name (SSID)"
                rules={[{ required: true, message: 'Please input SSID!' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="securityMode"
                label="Security Mode"
                rules={[{ required: true, message: 'Please select security mode!' }]}
              >
                <Select>
                  <Option value="none">None</Option>
                  <Option value="wep">WEP</Option>
                  <Option value="wpa">WPA</Option>
                  <Option value="wpa2">WPA2</Option>
                  <Option value="wpa3">WPA3</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please input password!' }]}
          >
            <Input.Password />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="band"
                label="Band"
                rules={[{ required: true, message: 'Please select band!' }]}
              >
                <Select>
                  <Option value="2.4">2.4 GHz</Option>
                  <Option value="5">5 GHz</Option>
                  <Option value="6">6 GHz</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="channel"
                label="Channel"
                rules={[{ required: true, message: 'Please select channel!' }]}
              >
                <Select>
                  <Option value="1">Channel 1</Option>
                  <Option value="6">Channel 6</Option>
                  <Option value="11">Channel 11</Option>
                  <Option value="36">Channel 36</Option>
                  <Option value="40">Channel 40</Option>
                  <Option value="44">Channel 44</Option>
                  <Option value="48">Channel 48</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="channelWidth"
                label="Channel Width"
                rules={[{ required: true, message: 'Please select channel width!' }]}
              >
                <Select>
                  <Option value="20">20 MHz</Option>
                  <Option value="40">40 MHz</Option>
                  <Option value="80">80 MHz</Option>
                  <Option value="160">160 MHz</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="txPower"
            label="Transmit Power (%)"
            rules={[{ required: true, message: 'Please input transmit power!' }]}
          >
            <InputNumber min={0} max={100} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Save Wireless Settings
              </Button>
              <Button onClick={() => form.resetFields()}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Advanced Settings" className={styles.configCard}>
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="enableBeamforming"
                label="Enable Beamforming"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="enableMimo"
                label="Enable MIMO"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="enableQos"
                label="Enable QoS"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="enableWmm"
                label="Enable WMM"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary">
                Save Advanced Settings
              </Button>
              <Button>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default WirelessConfig; 