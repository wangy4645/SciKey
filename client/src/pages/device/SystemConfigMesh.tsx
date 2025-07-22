import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Spin, message, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { Device } from '../../types';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';

interface SystemConfigMeshProps {
  device: Device;
}

const SystemConfigMesh: React.FC<SystemConfigMeshProps> = ({ device }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [deviceType, setDeviceType] = useState('');
  const [version, setVersion] = useState('');
  const [rebooting, setRebooting] = useState(false);

  useEffect(() => {
    const fetchSystem = async () => {
      setLoading(true);
      try {
        // 获取设备类型
        const typeRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DDTC?');
        setDeviceType(typeRes.data?.response || '');
        // 获取版本
        const verRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DGMR?');
        setVersion(verRes.data?.response || '');
      } catch (err) {
        message.error(t('Failed to fetch system config'));
      } finally {
        setLoading(false);
      }
    };
    fetchSystem();
  }, [device.id, t]);

  const handleReboot = async () => {
    setRebooting(true);
    try {
      await deviceConfigAPI.sendATCommand(device.id, 'AT^POWERCTL=1');
      message.success(t('Device reboot command sent successfully'));
    } catch (err) {
      message.error(t('Failed to reboot device'));
    } finally {
      setRebooting(false);
    }
  };

  return (
    <Card title={t('System Config')} style={{ marginBottom: 24 }}>
      {loading ? (
        <Spin />
      ) : (
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label={t('Device Type')}>{deviceType || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('Firmware Version')}>{version || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('Reboot')}>
            <Button type="primary" onClick={handleReboot} loading={rebooting}>{t('Reboot')}</Button>
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
};

export default SystemConfigMesh; 