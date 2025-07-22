import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Tag, Spin, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Device } from '../../types';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';

interface NetworkStatusMeshProps {
  device: Device;
}

const NetworkStatusMesh: React.FC<NetworkStatusMeshProps> = ({ device }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [ip, setIp] = useState('');
  const [accessState, setAccessState] = useState('');
  const [deviceType, setDeviceType] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      try {
        // 获取IP
        const netRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^NETIFCFG?');
        const ipMatch = /IP:([\d.]+)/.exec(netRes.data?.response || '');
        setIp(ipMatch ? ipMatch[1] : '');
        // 获取接入状态
        const accessRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DACS?');
        setAccessState(accessRes.data?.response || '');
        // 获取设备类型
        const typeRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DDTC?');
        setDeviceType(typeRes.data?.response || '');
      } catch (err) {
        message.error(t('Failed to fetch network status'));
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [device.id, t]);

  return (
    <Card title={t('Network Status')} style={{ marginBottom: 24 }}>
      {loading ? (
        <Spin />
      ) : (
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label={t('IP Address')}>{ip || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('Access State')}>{accessState || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('Device Type')}>{deviceType || '-'}</Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
};

export default NetworkStatusMesh; 