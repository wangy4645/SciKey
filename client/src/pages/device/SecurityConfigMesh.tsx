import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Spin, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Device } from '../../types';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';

interface SecurityConfigMeshProps {
  device: Device;
}

const SecurityConfigMesh: React.FC<SecurityConfigMeshProps> = ({ device }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [algorithm, setAlgorithm] = useState('');
  const [passwordId, setPasswordId] = useState('');

  useEffect(() => {
    const fetchSecurity = async () => {
      setLoading(true);
      try {
        // 获取加密算法
        const algRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DCIAC?');
        setAlgorithm(algRes.data?.response || '');
        // 获取密码ID
        const pwdRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DAPI?');
        setPasswordId(pwdRes.data?.response || '');
      } catch (err) {
        message.error(t('Failed to fetch security config'));
      } finally {
        setLoading(false);
      }
    };
    fetchSecurity();
  }, [device.id, t]);

  return (
    <Card title={t('Security Config')} style={{ marginBottom: 24 }}>
      {loading ? (
        <Spin />
      ) : (
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label={t('Encryption Algorithm')}>{algorithm || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('Password ID')}>{passwordId || '-'}</Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
};

export default SecurityConfigMesh; 