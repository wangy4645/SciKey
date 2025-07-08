import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Device } from '../types';
import { deviceAPI } from '../services/api';
import { deviceConfigAPI } from '../services/deviceConfigAPI';
import NetworkStatus from './device/NetworkStatus';
import SecurityConfigComponent from './device/SecurityConfig';
import WirelessConfig from './device/WirelessConfig';
import NetSettingConfig from './device/NetSettingConfig';
import UpDownConfig from './device/UpDownConfig';
import DebugConfig from './device/DebugConfig';
import SystemManagerConfig from '../components/config/SystemManagerConfig';
import styles from './DeviceConfig.module.css';

const { TabPane } = Tabs;

const DeviceConfig: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string>('network');

  const fetchDevice = async () => {
    try {
      setLoading(true);
      const device = await deviceAPI.getDevice(parseInt(id!));
      setCurrentDevice(device);
    } catch (error) {
      message.error(t('Failed to fetch device information'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDevice();
    }
  }, [id]);

  const handleSave = async (values: any, configType: string) => {
    try {
      setLoading(true);
      // 根据配置类型调用相应的API
      switch (configType) {
        case 'network':
          await deviceConfigAPI.updateNetworkConfig(parseInt(id!), values);
          break;
        case 'netSettings':
          await deviceConfigAPI.updateNetSettingConfig(parseInt(id!), values);
          break;
        case 'up_down':
          await deviceConfigAPI.updateUpDownConfig(parseInt(id!), values);
          break;
        case 'debug':
          await deviceConfigAPI.updateDebugConfig(parseInt(id!), values);
          break;
        default:
          console.warn('Unknown config type:', configType);
      }
      message.success(t('Configuration saved successfully'));
    } catch (error) {
      message.error(t('Failed to save configuration'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>{t('Loading...')}</div>;
  }

  if (!currentDevice) {
    return <div>{t('Device not found')}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>{t('Device Configuration')}</h1>
          {currentDevice && (
            <div className={styles.deviceInfo}>
              <span>{t('Device')}: {currentDevice.name}</span>
              <span>{t('ID')}: {currentDevice.node_id}</span>
              <span>{t('Type')}: {currentDevice.board_type}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <Tabs activeKey={selectedConfig || 'network'} onChange={setSelectedConfig}>
          <TabPane tab={t('Network Status')} key="network">
            <NetworkStatus
              device={currentDevice}
              onSave={(values) => handleSave(values, 'network')}
              loading={loading}
            />
          </TabPane>
          <TabPane tab={t('Security')} key="security">
            <SecurityConfigComponent
              deviceId={String(currentDevice.id)}
            />
          </TabPane>
          <TabPane tab={t('Wireless')} key="wireless">
            <WirelessConfig
              device={currentDevice}
              loading={loading}
            />
          </TabPane>
          <TabPane tab={t('Net Setting')} key="net_setting">
            <NetSettingConfig
              device={currentDevice}
              onSave={(values) => handleSave(values, 'netSettings')}
              loading={loading}
            />
          </TabPane>
          <TabPane tab={t('Up/Down')} key="up_down">
            <UpDownConfig
              device={currentDevice}
              onSave={(values) => handleSave(values, 'up_down')}
              loading={loading}
            />
          </TabPane>
          <TabPane tab={t('Debug')} key="debug">
            <DebugConfig
              device={currentDevice}
              onSave={(values) => handleSave(values, 'debug')}
              loading={loading}
            />
          </TabPane>
          <TabPane tab={t('System')} key="system">
            <SystemManagerConfig
              device={currentDevice}
              onSave={(values) => handleSave(values, 'system')}
              loading={loading}
            />
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default DeviceConfig; 