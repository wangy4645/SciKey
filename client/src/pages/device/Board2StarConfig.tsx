import React from 'react';
import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import { Device } from '../../types';
import WirelessConfig2Star from './WirelessConfig2Star';
import UpDownConfig2Star from './UpDownConfig2Star';
import NetSettingConfig2Star from './NetSettingConfig2Star';
import SecurityConfig2Star from './SecurityConfig2Star';
import DeviceTypeConfig2Star from './DeviceTypeConfig2Star';
import DebugConfig from './DebugConfig';
import NetworkStatus2Star from './NetworkStatus2Star';

const { TabPane } = Tabs;

interface Board2StarConfigProps {
  device: Device;
  onConfigUpdate: () => void;
}

const Board2StarConfig: React.FC<Board2StarConfigProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  return (
    <Tabs defaultActiveKey="networkstatus">
      <TabPane tab={t('Network Status')} key="networkstatus">
        <NetworkStatus2Star device={device} />
      </TabPane>
      <TabPane tab={t('Wireless Config')} key="network">
        <WirelessConfig2Star device={device} onConfigUpdate={onConfigUpdate} />
      </TabPane>
      <TabPane tab={t('UpDown Config')} key="updown">
        <UpDownConfig2Star device={device} onConfigUpdate={onConfigUpdate} />
      </TabPane>
      <TabPane tab={t('Network Config')} key="netsetting">
        <NetSettingConfig2Star device={device} onConfigUpdate={onConfigUpdate} />
      </TabPane>
      <TabPane tab={t('Security Config')} key="security">
        <SecurityConfig2Star device={device} onConfigUpdate={onConfigUpdate} />
      </TabPane>
      <TabPane tab={t('Network Role')} key="devicetype">
        <p><strong>{t('Network Role')}:</strong> {device.type}</p>
      </TabPane>
      <TabPane tab={t('Debug')} key="debug">
        <DebugConfig 
          device={device} 
          onSave={async (values: any) => {
            // 这里可以添加保存逻辑，目前为空
            console.log('Debug config values:', values);
          }} 
          loading={false} 
        />
      </TabPane>
    </Tabs>
  );
};

export default Board2StarConfig; 