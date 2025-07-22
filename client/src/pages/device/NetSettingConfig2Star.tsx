import React, { useState, useEffect } from 'react';
import { Card, Form, Button, message, Divider, Row, Col, Typography, Select, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import styles from './NetSettingConfig.module.css';
import { SyncOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

// IP 输入组件（复制自1.0 star NetSettingConfig.tsx）
const IPInput: React.FC<{
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}> = ({ value = '', onChange, placeholder = '192.168.1.100' }) => {
  const [ipParts, setIpParts] = React.useState(['', '', '', '']);

  React.useEffect(() => {
    if (value) {
      const parts = value.split('.');
      setIpParts([
        parts[0] || '',
        parts[1] || '',
        parts[2] || '',
        parts[3] || '',
      ]);
    }
  }, [value]);

  const handlePartChange = (index: number, partValue: string) => {
    if (partValue.includes('.') && index < 3) {
      const nextInput = document.getElementById(`ip-part2-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
      return;
    }
    const numericValue = partValue.replace(/[^0-9]/g, '');
    let finalValue = numericValue;
    if (numericValue !== '') {
      const num = parseInt(numericValue, 10);
      if (num > 255) {
        finalValue = '255';
      }
    }
    const newParts = [...ipParts];
    newParts[index] = finalValue;
    setIpParts(newParts);
    if (finalValue.length === 3 && index < 3) {
      const nextInput = document.getElementById(`ip-part2-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
    const fullIP = newParts.join('.');
    onChange?.(fullIP);
  };
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '.' && index < 3) {
      e.preventDefault();
      const nextInput = document.getElementById(`ip-part2-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
      return;
    }
    if (e.key === 'Backspace' && ipParts[index] === '' && index > 0) {
      const prevInput = document.getElementById(`ip-part2-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };
  return (
    <div className={styles.ipInputContainer}>
      <div className={styles.ipInputGroup}>
        {ipParts.map((part, index) => (
          <React.Fragment key={index}>
            <Input
              id={`ip-part2-${index}`}
              className={styles.ipPartInput}
              value={part}
              onChange={(e) => handlePartChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              maxLength={3}
              placeholder={placeholder.split('.')[index] || ''}
            />
            {index < 3 && <span className={styles.ipDot}>.</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

interface NetSettingConfig2StarProps {
  device: any;
  onConfigUpdate: () => void;
}

const typeOptions = [
  { label: 'IP Only', value: 2 },
  { label: 'IP + Subnet Mask', value: 3 },
  { label: 'IP + Subnet Mask + Gateway', value: 4 },
];

const NetSettingConfig2Star: React.FC<NetSettingConfig2StarProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(2);
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const defaultMask = '255.255.255.0';
  const defaultGateway = '192.168.1.1';
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

  useEffect(() => {
    // 获取当前配置（从API获取）
    const fetchCurrentConfig = async () => {
      try {
        const resp = await deviceConfigAPI.getNetSettingConfig(device.id);
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
    let atCmd = `AT^NETIFCFG=${values.type},"${values.ip}"`;
    if (values.type >= 3) atCmd += `,"${values.mask}"`;
    if (values.type === 4) atCmd += `,"${values.gateway}"`;
    try {
      await deviceConfigAPI.sendATCommand(device.id, atCmd);
      message.success(t('Network parameters updated successfully'));
      onConfigUpdate();
    } catch (e) {
      message.error(t('Failed to update network parameters'));
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card} title={t('Network Config')}
        extra={<Button type="primary" icon={<SyncOutlined />} onClick={async () => {
          setLoading(true);
          await deviceConfigAPI.syncDeviceConfigByType(device.id, 'net_setting');
          await form.resetFields();
          // 重新拉取配置
          const resp = await deviceConfigAPI.getNetSettingConfig(device.id);
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
          <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4, minHeight: 44, display: 'flex', alignItems: 'center' }}>
            {currentConfig ? (
              <>
                {currentConfig.type && <span style={{ marginRight: 24 }}>{t('Type')}: {typeOptions.find(o => o.value === currentConfig.type)?.label}</span>}
                {currentConfig.ip && <span style={{ marginRight: 24 }}>{t('IP Address')}: {currentConfig.ip}</span>}
                {currentConfig.mask && <span style={{ marginRight: 24 }}>{t('Subnet Mask')}: {currentConfig.mask}</span>}
                {currentConfig.gateway && <span>{t('Gateway')}: {currentConfig.gateway}</span>}
              </>
            ) : (
              <span style={{ color: '#aaa' }}>{t('Loading...')}</span>
            )}
          </div>
        </div>
        <Divider />
        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ type: 2, mask: defaultMask, gateway: defaultGateway }}>
          <Form.Item label={t('Type')} name="type" rules={[{ required: true }]}> <Select style={{ width: 400 }} options={typeOptions.map(o => ({ ...o, label: t(o.label) }))} onChange={setType} /> </Form.Item>
          <Form.Item label={t('IP Address')} name="ip" rules={[{ required: true }]}> <IPInput placeholder="192.168.1.100" /> </Form.Item>
          {type >= 3 && <Form.Item label={t('Subnet Mask')} name="mask" rules={[{ required: true }]}> <IPInput placeholder="255.255.255.0" /> </Form.Item>}
          {type === 4 && <Form.Item label={t('Gateway')} name="gateway" rules={[{ required: true }]}> <IPInput placeholder="192.168.1.1" /> </Form.Item>}
          <div className={styles.buttonGroup}>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: 145 }}>{t('Save Configuration')}</Button>
            <Button htmlType="button" onClick={() => form.resetFields()} style={{ width: 100, marginLeft: 8 }}>{t('Reset')}</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default NetSettingConfig2Star; 