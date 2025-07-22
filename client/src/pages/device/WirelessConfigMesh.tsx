import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Spin, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Device } from '../../types';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';

interface WirelessConfigMeshProps {
  device: Device;
}

const WirelessConfigMesh: React.FC<WirelessConfigMeshProps> = ({ device }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [radioParams, setRadioParams] = useState('');
  const [radioStore, setRadioStore] = useState('');
  const [hop, setHop] = useState('');

  useEffect(() => {
    const fetchWireless = async () => {
      setLoading(true);
      try {
        // 获取无线参数
        const radioRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DRPC?');
        setRadioParams(radioRes.data?.response || '');
        // 获取存储参数
        const storeRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DRPS?');
        setRadioStore(storeRes.data?.response || '');
        // 获取跳频状态
        const hopRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DFHC?');
        setHop(hopRes.data?.response || '');
      } catch (err) {
        message.error(t('Failed to fetch wireless config'));
      } finally {
        setLoading(false);
      }
    };
    fetchWireless();
  }, [device.id, t]);

  return (
    <Card title={t('Wireless Config')} style={{ marginBottom: 24 }}>
      {loading ? (
        <Spin />
      ) : (
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label={t('Radio Params')}>{radioParams || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('Stored Params')}>{radioStore || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('Frequency Hopping')}>{hop || '-'}</Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
};

export default WirelessConfigMesh; 