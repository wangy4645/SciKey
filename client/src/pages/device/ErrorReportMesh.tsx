import React, { useState } from 'react';
import { Card, Button, Switch, Table, message, Spin, Space } from 'antd';
import { SyncOutlined, WarningOutlined } from '@ant-design/icons';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { useTranslation } from 'react-i18next';

interface ErrorLog {
  time: string;
  code: string;
  description: string;
}

interface ErrorReportMeshProps {
  deviceId: number;
}

const ErrorReportMesh: React.FC<ErrorReportMeshProps> = ({ deviceId }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cmeeEnabled, setCmeeEnabled] = useState(false);
  const [logs, setLogs] = useState<ErrorLog[]>([]);

  React.useEffect(() => {
    fetchLocal();
  }, [deviceId]);

  const fetchLocal = async () => {
    setLoading(true);
    try {
      // 查询错误上报开关
      const cmeeRes = await deviceConfigAPI.sendATCommand(deviceId, 'AT+CMEE?');
      setCmeeEnabled(String(cmeeRes.data?.response).includes('1'));
      // 查询错误日志（如有接口，实际应从设备或本地数据库获取）
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

  const handleCmeeSwitch = async (checked: boolean) => {
    setLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(deviceId, `AT+CMEE=${checked ? 1 : 0}`);
      setCmeeEnabled(checked);
      message.success(t('Error reporting has been ') + (checked ? t('enabled') : t('disabled')));
    } catch {
      message.error(t('Failed to set error reporting'));
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: t('Time'), dataIndex: 'time', key: 'time', width: 180 },
    { title: t('Error Code'), dataIndex: 'code', key: 'code', width: 100 },
    { title: t('Description'), dataIndex: 'description', key: 'description' },
  ];

  return (
    <Card
      title={t('Error Reporting (Mesh 1.0)')}
      extra={
        <Button icon={<SyncOutlined spin={syncing} />} onClick={handleSync} loading={syncing} type="primary">
          {t('Sync')}
        </Button>
      }
    >
      <Spin spinning={loading}>
        <Space style={{ marginBottom: 16 }}>
          <WarningOutlined /> {t('Error reporting switch')}:
          <Switch checked={cmeeEnabled} onChange={handleCmeeSwitch} disabled={loading} />
        </Space>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="time"
          pagination={false}
          locale={{ emptyText: t('No error logs yet') }}
          size="small"
        />
      </Spin>
    </Card>
  );
};

export default ErrorReportMesh; 