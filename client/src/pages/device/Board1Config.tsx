import React, { useState, useEffect } from 'react';
import { Tabs, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Device } from '../../types';
import { deviceAPI } from '../../services/api';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import NetworkStatus from './NetworkStatus';
import SecurityConfigComponent from './SecurityConfig';
import WirelessConfig from './WirelessConfig';
import NetSettingConfig from './NetSettingConfig';
import UpDownConfig from './UpDownConfig';
import DebugConfig from './DebugConfig';
import DeviceTypeConfig from './DeviceTypeConfig';

const { TabPane } = Tabs;

interface Board1ConfigProps {
  device: Device;
  onConfigUpdate: () => void;
}

const Board1Config: React.FC<Board1ConfigProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string>('network');

  const handleSave = async (values: any, configType: string) => {
    try {
      setLoading(true);
      // 根据配置类型调用相应的API
      switch (configType) {
        case 'network':
          await deviceConfigAPI.updateNetworkConfig(device.id, values);
          break;
        case 'netSettings':
          await deviceConfigAPI.updateNetSettingConfig(device.id, values);
          break;
        case 'up_down':
          await deviceConfigAPI.updateUpDownConfig(device.id, values);
          break;
        case 'debug':
          await deviceConfigAPI.updateDebugConfig(device.id, values);
          break;
        case 'device_type':
          await deviceConfigAPI.updateDeviceTypeConfig(device.id, values);
          break;
        default:
          console.warn('Unknown config type:', configType);
      }
      message.success(t('Configuration saved successfully'));
      onConfigUpdate();
    } catch (error) {
      message.error(t('Failed to save configuration'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Tabs activeKey={selectedConfig} onChange={setSelectedConfig}>
        <TabPane tab={t('Network Status')} key="network">
          <NetworkStatus
            device={device}
            onSave={(values) => handleSave(values, 'network')}
            loading={loading}
          />
        </TabPane>
        <TabPane tab={t('Network Role')} key="device_type">
          <DeviceTypeConfig
            device={device}
            onSave={(values) => handleSave(values, 'device_type')}
            loading={loading}
          />
        </TabPane>
        <TabPane tab={t('Security')} key="security">
          <SecurityConfigComponent
            deviceId={String(device.id)}
          />
        </TabPane>
        <TabPane tab={t('Wireless')} key="wireless">
          <WirelessConfig
            device={device}
          />
        </TabPane>
        <TabPane tab={t('Net Setting')} key="net_setting">
          <NetSettingConfig
            device={device}
            onSave={(values) => handleSave(values, 'netSettings')}
            loading={loading}
          />
        </TabPane>
        <TabPane tab={t('Up/Down')} key="up_down">
          <UpDownConfig
            device={device}
            onSave={(values) => handleSave(values, 'up_down')}
            loading={loading}
          />
        </TabPane>
        <TabPane tab={t('Debug')} key="debug">
          <DebugConfig
            device={device}
            onSave={(values) => handleSave(values, 'debug')}
            loading={loading}
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Board1Config; 