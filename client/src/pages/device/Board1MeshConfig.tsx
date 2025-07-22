import React, { useState, useEffect } from 'react';
import { Tabs, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Device } from '../../types';
import NetworkStatus from './NetworkStatus';
import SecurityConfigComponent from './SecurityConfig';
import WirelessConfig from './WirelessConfig';
import DeviceTypeConfig from './DeviceTypeConfig';
import FeatureManagementMesh from './FeatureManagementMesh';
import ErrorReportMesh from './ErrorReportMesh';
import EventReportMesh from './EventReportMesh';
import RoutingManagementMesh from './RoutingManagementMesh';
import LogAndReportingMesh from './LogAndReportingMesh';
import SystemAndRoutingMesh from './SystemAndRoutingMesh';
import { Card, Form, Input, Button, Descriptions, Spin, Select, message as antdMessage } from 'antd';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';

const { TabPane } = Tabs;
const { Option } = Select;

interface Board1MeshConfigProps {
  device: Device;
  onConfigUpdate: () => void;
}

const Board1MeshConfig: React.FC<Board1MeshConfigProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string>('network');

  // mesh固件版本和重启状态
  const [firmwareVersion, setFirmwareVersion] = useState<string>('');
  const [rebooting, setRebooting] = useState(false);

  // 获取固件版本
  useEffect(() => {
    const fetchFirmwareVersion = async () => {
      try {
        const verRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DGMR?');
        setFirmwareVersion(verRes.data?.response || '');
      } catch (err) {
        setFirmwareVersion('');
      }
    };
    fetchFirmwareVersion();
  }, [device.id]);

  // mesh重启
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

  // mesh页面的保存逻辑与star一致，调用onConfigUpdate
  const handleSave = async (values: any, configType: string) => {
    try {
      setLoading(true);
      // 这里只做回调，具体API由各子组件处理
      onConfigUpdate();
      message.success(t('Configuration saved successfully'));
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
          {/* Mesh专有安全参数展示区 */}
          <MeshSecurityExtras device={device} />
        </TabPane>
        <TabPane tab={t('Wireless')} key="wireless">
          <WirelessConfig
            device={device}
          />
        </TabPane>
        {/* 移除System Tab */}
        <TabPane tab={t('Feature Management')} key="feature_management">
          <FeatureManagementMesh deviceId={device.id} />
        </TabPane>
        <TabPane tab={t('Log and Reporting')} key="log_and_reporting">
          <LogAndReportingMesh deviceId={device.id} />
        </TabPane>
        <TabPane tab={t('System and Routing')} key="system_and_routing">
          <SystemAndRoutingMesh device={device} />
        </TabPane>
      </Tabs>
    </div>
  );
};

// Mesh 专有参数表单组件 - 安全参数
const MeshSecurityExtras: React.FC<{ device: Device }> = ({ device }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [algorithm, setAlgorithm] = useState('');
  const [passwordId, setPasswordId] = useState('');
  const [algorithmSet, setAlgorithmSet] = useState('');
  const [passwordIdSet, setPasswordIdSet] = useState('');

  // 查询 mesh 安全参数
  const fetchMeshSecurity = async () => {
    setLoading(true);
    try {
      const algRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DCIAC?');
      setAlgorithm(algRes.data?.response || '');
      const pwdRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DAPI?');
      setPasswordId(pwdRes.data?.response || '');
    } catch (err) {
      antdMessage.error(t('Failed to fetch mesh security config'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchMeshSecurity(); }, [device.id]);

  // 设置加密算法
  const handleSetAlgorithm = async () => {
    setLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(device.id, `AT^DCIAC=${algorithmSet}`);
      antdMessage.success(t('Encryption algorithm set successfully'));
      fetchMeshSecurity();
    } catch (err) {
      antdMessage.error(t('Failed to set encryption algorithm'));
    } finally {
      setLoading(false);
    }
  };
  // 设置密码ID
  const handleSetPasswordId = async () => {
    setLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(device.id, `AT^DAPI=${passwordIdSet}`);
      antdMessage.success(t('Password ID set successfully'));
      fetchMeshSecurity();
    } catch (err) {
      antdMessage.error(t('Failed to set password ID'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('Mesh专有安全参数')} style={{ marginTop: 24 }}>
      {loading ? <Spin /> : (
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label={t('Encryption Algorithm (AT^DCIAC?)')}>{algorithm || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('Password ID (AT^DAPI?)')}>{passwordId || '-'}</Descriptions.Item>
        </Descriptions>
      )}
      <Form layout="inline" style={{ marginTop: 16 }}>
        <Form.Item label={t('Set Algorithm (AT^DCIAC=)')}>
          <Select style={{ width: 120 }} value={algorithmSet} onChange={setAlgorithmSet}>
            <Option value="0">0 - None</Option>
            <Option value="1">1 - SNOW</Option>
            <Option value="2">2 - AES128</Option>
            <Option value="3">3 - ZUC</Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleSetAlgorithm} loading={loading}>{t('Set')}</Button>
        </Form.Item>
        <Form.Item label={t('Set Password ID (AT^DAPI=)')} style={{ marginLeft: 16 }}>
          <Input style={{ width: 180 }} value={passwordIdSet} onChange={e => setPasswordIdSet(e.target.value)} placeholder={t('HEX string, max 64 chars')} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleSetPasswordId} loading={loading}>{t('Set')}</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

// MeshSystemExtras 组件定义及相关引用已移除

export default Board1MeshConfig; 