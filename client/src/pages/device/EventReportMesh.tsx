import React, { useState } from 'react';
import { Card, Button, Switch, Table, message, Spin, Space } from 'antd';
import { SyncOutlined, NotificationOutlined } from '@ant-design/icons';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { useTranslation } from 'react-i18next';

interface EventLog {
  time: string;
  type: string;
  value: string;
}

interface EventReportMeshProps {
  deviceId: number;
}

const EventReportMesh: React.FC<EventReportMeshProps> = ({ deviceId }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cmerEnabled, setCmerEnabled] = useState(false);
  const [logs, setLogs] = useState<EventLog[]>([]);

  React.useEffect(() => {
    fetchLocal();
  }, [deviceId]);

  const fetchLocal = async () => {
    setLoading(true);
    try {
      // 查询事件上报开关
      const cmerRes = await deviceConfigAPI.sendATCommand(deviceId, 'AT+CMER?');
      setCmerEnabled(String(cmerRes.data?.response).includes('2,0,0,2,0'));
      // 查询事件记录（如有接口，实际应从设备或本地数据库获取）
      setLogs([]); // 这里用空，后续可扩展
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

  const handleCmerSwitch = async (checked: boolean) => {
    setLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(deviceId, `AT+CMER=${checked ? '2,0,0,2,0' : '2,0,0,0,0'}`);
      setCmerEnabled(checked);
      message.success(t('Event reporting has been ') + (checked ? t('enabled') : t('disabled')));
    } catch {
      message.error(t('Failed to set event reporting'));
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: t('Time'), dataIndex: 'time', key: 'time', width: 180 },
    { title: t('Type'), dataIndex: 'type', key: 'type', width: 100 },
    { title: t('Content'), dataIndex: 'value', key: 'value' },
  ];

  return (
    <Card
      title={t('Event Reporting (Mesh 1.0)')}
      extra={
        <Button icon={<SyncOutlined spin={syncing} />} onClick={handleSync} loading={syncing} type="primary">
          {t('Sync')}
        </Button>
      }
    >
      <Spin spinning={loading}>
        <Space style={{ marginBottom: 16 }}>
          <NotificationOutlined /> {t('Event reporting switch')}:
          <Switch checked={cmerEnabled} onChange={handleCmerSwitch} disabled={loading} />
        </Space>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="time"
          pagination={false}
          locale={{ emptyText: t('No event records yet') }}
          size="small"
        />
      </Spin>
    </Card>
  );
};

export default EventReportMesh; 