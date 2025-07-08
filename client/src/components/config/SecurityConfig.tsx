import React, { useState } from 'react';
import { Form, Input, Select, Switch, Card, Row, Col, Button, Space, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Device } from '../../types';
import styles from './SecurityConfig.module.css';

const { Option } = Select;

interface SecurityConfigProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
}

const SecurityConfig: React.FC<SecurityConfigProps> = ({ device, onSave, loading }) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    encryption: {
      enabled: true,
      algorithm: '',
      keySize: 256,
      certificate: '',
    },
    firewall: {
      enabled: true,
      level: 'medium',
    },
    vpn: {
      enabled: false,
      type: 'openvpn',
    },
    ssh: {
      enabled: true,
      port: 22,
    },
    https: {
      enabled: true,
      port: 443,
    },
    allowedIps: [],
  });

  const handleSubmit = async (values: any) => {
    try {
      await onSave(values);
      message.success(t('Security configuration saved successfully'));
    } catch (error) {
      message.error(t('Failed to save security configuration'));
    }
  };

  return (
    <div className={styles.container}>
      <Card title={t('Security Settings')} className={styles.configCard}>
        <Form
          form={form}
          layout="vertical"
          initialValues={config}
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['encryption', 'enabled']}
                label={t('Enable Encryption')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['encryption', 'algorithm']}
                label={t('Encryption Algorithm')}
                rules={[{ required: true, message: t('Please select encryption algorithm!') }]}
              >
                <Select>
                  <Option value="1">{t('SNOW3G')}</Option>
                  <Option value="2">{t('AES')}</Option>
                  <Option value="3">{t('ZUC')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['firewall', 'enabled']}
                label={t('Enable Firewall')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['firewall', 'level']}
                label={t('Firewall Level')}
                rules={[{ required: true, message: t('Please select firewall level!') }]}
              >
                <Select>
                  <Option value="low">{t('Low')}</Option>
                  <Option value="medium">{t('Medium')}</Option>
                  <Option value="high">{t('High')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['vpn', 'enabled']}
                label={t('Enable VPN')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['vpn', 'type']}
                label={t('VPN Type')}
                rules={[{ required: true, message: t('Please select VPN type!') }]}
              >
                <Select>
                  <Option value="openvpn">{t('OpenVPN')}</Option>
                  <Option value="ipsec">{t('IPSec')}</Option>
                  <Option value="wireguard">{t('WireGuard')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['ssh', 'enabled']}
                label={t('Enable SSH')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['ssh', 'port']}
                label={t('SSH Port')}
                rules={[{ required: true, message: t('Please input SSH port!') }]}
              >
                <Input type="number" min={1} max={65535} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['https', 'enabled']}
                label={t('Enable HTTPS')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['https', 'port']}
                label={t('HTTPS Port')}
                rules={[{ required: true, message: t('Please input HTTPS port!') }]}
              >
                <Input type="number" min={1} max={65535} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="allowedIps"
            label={t('Allowed IP Addresses')}
            rules={[{ required: true, message: t('Please input allowed IP addresses!') }]}
          >
            <Select mode="tags" placeholder={t('Enter IP addresses')}>
              <Option value="192.168.1.0/24">{t('Local Network (192.168.1.0/24)')}</Option>
              <Option value="10.0.0.0/8">{t('Private Network (10.0.0.0/8)')}</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="securityLogLevel"
                label={t('Security Log Level')}
                rules={[{ required: true, message: t('Please select security log level!') }]}
              >
                <Select>
                  <Option value="debug">{t('Debug')}</Option>
                  <Option value="info">{t('Info')}</Option>
                  <Option value="warning">{t('Warning')}</Option>
                  <Option value="error">{t('Error')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {t('Save Security Settings')}
              </Button>
              <Button onClick={() => form.resetFields()}>
                {t('Reset')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title={t('Access Control')} className={styles.configCard}>
        <Form layout="vertical">
          <Form.Item
            name="accessControl"
            label={t('Access Control List')}
            rules={[{ required: true, message: t('Please input access control rules!') }]}
          >
            <Select mode="tags" placeholder={t('Enter access control rules')}>
              <Option value="allow:192.168.1.0/24">{t('Allow Local Network')}</Option>
              <Option value="deny:0.0.0.0/0">{t('Deny All')}</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary">
                {t('Update Access Control')}
              </Button>
              <Button>
                {t('Reset')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SecurityConfig; 