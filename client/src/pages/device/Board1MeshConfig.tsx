import React, { useState, useEffect } from 'react';
import { Tabs, message, Card, Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { Device } from '../../types';
import { deviceAPI } from '../../services/api';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';

const { TabPane } = Tabs;

interface Board1MeshConfigProps {
  device: Device;
  onConfigUpdate: () => void;
}

// Mesh网络配置组件
const MeshNetworkConfig: React.FC<{ device: Device }> = ({ device }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await deviceConfigAPI.syncDeviceConfig(device.id);
      message.success(t('Mesh network configuration synchronized'));
      // 这里可以处理同步结果
    } catch (error) {
      message.error(t('Failed to sync mesh network configuration'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('Mesh Network Configuration')}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          type="primary" 
          onClick={handleSync} 
          loading={loading}
        >
          {t('Sync from Device')}
        </Button>
        <div>
          <p><strong>{t('Network Mode')}:</strong> Mesh Network</p>
          <p><strong>{t('Device Role')}:</strong> {device.type}</p>
          <p><strong>{t('Node ID')}:</strong> {device.node_id}</p>
        </div>
      </Space>
    </Card>
  );
};

// Mesh安全配置组件
const MeshSecurityConfig: React.FC<{ device: Device }> = ({ device }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await deviceConfigAPI.syncDeviceConfig(device.id);
      message.success(t('Mesh security configuration synchronized'));
    } catch (error) {
      message.error(t('Failed to sync mesh security configuration'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('Mesh Security Configuration')}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          type="primary" 
          onClick={handleSync} 
          loading={loading}
        >
          {t('Sync from Device')}
        </Button>
        <div>
          <p><strong>{t('Encryption')}:</strong> Mesh Encryption</p>
          <p><strong>{t('Key Management')}:</strong> Distributed</p>
        </div>
      </Space>
    </Card>
  );
};

// Mesh系统配置组件
const MeshSystemConfig: React.FC<{ device: Device }> = ({ device }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await deviceConfigAPI.syncDeviceConfig(device.id);
      message.success(t('Mesh system configuration synchronized'));
    } catch (error) {
      message.error(t('Failed to sync mesh system configuration'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('Mesh System Configuration')}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          type="primary" 
          onClick={handleSync} 
          loading={loading}
        >
          {t('Sync from Device')}
        </Button>
        <div>
          <p><strong>{t('Mesh Protocol')}:</strong> MESH1代</p>
          <p><strong>{t('Firmware Version')}:</strong> 1.0 Mesh</p>
        </div>
      </Space>
    </Card>
  );
};

// Mesh调试配置组件
const MeshDebugConfig: React.FC<{ device: Device }> = ({ device }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await deviceConfigAPI.syncDeviceConfig(device.id);
      message.success(t('Mesh debug configuration synchronized'));
    } catch (error) {
      message.error(t('Failed to sync mesh debug configuration'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('Mesh Debug Configuration')}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          type="primary" 
          onClick={handleSync} 
          loading={loading}
        >
          {t('Sync from Device')}
        </Button>
        <div>
          <p><strong>{t('Debug Level')}:</strong> Mesh Debug</p>
          <p><strong>{t('Log Output')}:</strong> Mesh Logs</p>
        </div>
      </Space>
    </Card>
  );
};

const Board1MeshConfig: React.FC<Board1MeshConfigProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  const [selectedConfig, setSelectedConfig] = useState<string>('network');

  return (
    <div>
      <Tabs activeKey={selectedConfig} onChange={setSelectedConfig}>
        <TabPane tab={t('Mesh Network')} key="network">
          <MeshNetworkConfig device={device} />
        </TabPane>
        <TabPane tab={t('Mesh Security')} key="security">
          <MeshSecurityConfig device={device} />
        </TabPane>
        <TabPane tab={t('Mesh System')} key="system">
          <MeshSystemConfig device={device} />
        </TabPane>
        <TabPane tab={t('Mesh Debug')} key="debug">
          <MeshDebugConfig device={device} />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Board1MeshConfig; 