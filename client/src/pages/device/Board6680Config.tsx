import React, { useState, useEffect } from 'react';
import { Tabs, message, Card, Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { Device } from '../../types';
import { deviceAPI } from '../../services/api';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';

const { TabPane } = Tabs;

interface Board6680ConfigProps {
  device: Device;
  onConfigUpdate: () => void;
}

// 6680网络配置组件
const Board6680NetworkConfig: React.FC<{ device: Device }> = ({ device }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await deviceConfigAPI.syncDeviceConfig(device.id);
      message.success(t('Board 6680 network configuration synchronized'));
    } catch (error) {
      message.error(t('Failed to sync board 6680 network configuration'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('Board 6680 Network Configuration')}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          type="primary" 
          onClick={handleSync} 
          loading={loading}
        >
          {t('Sync from Device')}
        </Button>
        <div>
          <p><strong>{t('Board Type')}:</strong> 6680</p>
          <p><strong>{t('Network Role')}:</strong> {device.type}</p>
          <p><strong>{t('Node ID')}:</strong> {device.node_id}</p>
        </div>
      </Space>
    </Card>
  );
};

// 6680安全配置组件
const Board6680SecurityConfig: React.FC<{ device: Device }> = ({ device }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await deviceConfigAPI.syncDeviceConfig(device.id);
      message.success(t('Board 6680 security configuration synchronized'));
    } catch (error) {
      message.error(t('Failed to sync board 6680 security configuration'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('Board 6680 Security Configuration')}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          type="primary" 
          onClick={handleSync} 
          loading={loading}
        >
          {t('Sync from Device')}
        </Button>
        <div>
          <p><strong>{t('Encryption')}:</strong> Board 6680 Encryption</p>
          <p><strong>{t('Key Management')}:</strong> 6680 Specific</p>
        </div>
      </Space>
    </Card>
  );
};

// 6680系统配置组件
const Board6680SystemConfig: React.FC<{ device: Device }> = ({ device }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await deviceConfigAPI.syncDeviceConfig(device.id);
      message.success(t('Board 6680 system configuration synchronized'));
    } catch (error) {
      message.error(t('Failed to sync board 6680 system configuration'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('Board 6680 System Configuration')}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          type="primary" 
          onClick={handleSync} 
          loading={loading}
        >
          {t('Sync from Device')}
        </Button>
        <div>
          <p><strong>{t('Board Protocol')}:</strong> 6680 Protocol</p>
          <p><strong>{t('Firmware Version')}:</strong> 6680 v1.0</p>
        </div>
      </Space>
    </Card>
  );
};

// 6680调试配置组件
const Board6680DebugConfig: React.FC<{ device: Device }> = ({ device }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await deviceConfigAPI.syncDeviceConfig(device.id);
      message.success(t('Board 6680 debug configuration synchronized'));
    } catch (error) {
      message.error(t('Failed to sync board 6680 debug configuration'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('Board 6680 Debug Configuration')}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          type="primary" 
          onClick={handleSync} 
          loading={loading}
        >
          {t('Sync from Device')}
        </Button>
        <div>
          <p><strong>{t('Debug Level')}:</strong> Board 6680 Debug</p>
          <p><strong>{t('Log Output')}:</strong> 6680 Logs</p>
        </div>
      </Space>
    </Card>
  );
};

const Board6680Config: React.FC<Board6680ConfigProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  const [selectedConfig, setSelectedConfig] = useState<string>('network');

  return (
    <div>
      <Tabs activeKey={selectedConfig} onChange={setSelectedConfig}>
        <TabPane tab={t('Board 6680 Network')} key="network">
          <Board6680NetworkConfig device={device} />
        </TabPane>
        <TabPane tab={t('Board 6680 Security')} key="security">
          <Board6680SecurityConfig device={device} />
        </TabPane>
        <TabPane tab={t('Board 6680 System')} key="system">
          <Board6680SystemConfig device={device} />
        </TabPane>
        <TabPane tab={t('Board 6680 Debug')} key="debug">
          <Board6680DebugConfig device={device} />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Board6680Config; 