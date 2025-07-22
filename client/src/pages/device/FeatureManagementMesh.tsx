import React, { useState } from 'react';
import { Card, Button, Switch, Space, message, Descriptions, Spin } from 'antd';
import { SyncOutlined, CloudUploadOutlined, ToolOutlined, MergeCellsOutlined } from '@ant-design/icons';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { useTranslation } from 'react-i18next';

interface FeatureManagementMeshProps {
  deviceId: number;
}

const FeatureManagementMesh: React.FC<FeatureManagementMeshProps> = ({ deviceId }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [otaEnabled, setOtaEnabled] = useState(false);
  const [elogEnabled, setElogEnabled] = useState(false);
  const [mergeEnabled, setMergeEnabled] = useState(false);

  // 本地优先加载（已移除自动fetchLocal）
  // React.useEffect(() => {
  //   fetchLocal();
  // }, [deviceId]);

  const fetchLocal = async () => {
    setLoading(true);
    try {
      // 查询ELOG开关
      const elogRes = await deviceConfigAPI.sendATCommand(deviceId, 'AT^ELFUN?');
      setElogEnabled(String(elogRes.data?.response).includes('1'));
      // 查询子网合并
      const mergeRes = await deviceConfigAPI.sendATCommand(deviceId, 'AT^DSONNMF?');
      setMergeEnabled(String(mergeRes.data?.response).includes('1'));
      // 查询OTA（这里只做演示，实际OTA状态可根据实际指令调整）
      setOtaEnabled(false);
    } catch {
      // 忽略错误
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await fetchLocal();
    setSyncing(false);
    message.success(t('Sync successful'));
  };

  const handleElogSwitch = async (checked: boolean) => {
    setLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(deviceId, `AT^ELFUN=${checked ? 1 : 0}`);
      setElogEnabled(checked);
      message.success(t('ELOG module has been ') + (checked ? t('enabled') : t('disabled')));
    } catch {
      message.error(t('Failed to set ELOG module'));
    } finally {
      setLoading(false);
    }
  };

  const handleMergeSwitch = async (checked: boolean) => {
    setLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(deviceId, `AT^DSONNMF=${checked ? 1 : 0}`);
      setMergeEnabled(checked);
      message.success(t('Subnet merge has been ') + (checked ? t('enabled') : t('disabled')));
    } catch {
      message.error(t('Failed to set subnet merge'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtaUpgrade = async () => {
    setLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(deviceId, 'AT^RCVR=1');
      message.success(t('OTA upgrade command sent'));
    } catch {
      message.error(t('Failed to send OTA upgrade command'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={t('Feature Management')}
      extra={
        <Button icon={<SyncOutlined spin={syncing} />} onClick={handleSync} loading={syncing} type="primary">
          {t('Sync')}
        </Button>
      }
    >
      <Spin spinning={loading}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={<span><CloudUploadOutlined /> {t('OTA Upgrade')}</span>}>
            <Button type="primary" onClick={handleOtaUpgrade} disabled={loading}>
              {t('Upgrade OTA now')}
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label={<span><ToolOutlined /> {t('ELOG Module')}</span>}>
            <Switch checked={elogEnabled} onChange={handleElogSwitch} disabled={loading} />
          </Descriptions.Item>
          <Descriptions.Item label={<span><MergeCellsOutlined /> {t('Subnet Merge')}</span>}>
            <Switch checked={mergeEnabled} onChange={handleMergeSwitch} disabled={loading} />
          </Descriptions.Item>
        </Descriptions>
      </Spin>
    </Card>
  );
};

export default FeatureManagementMesh; 