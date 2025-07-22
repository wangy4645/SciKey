import React, { useState } from 'react';
import { Card, Switch, Table, message, Spin, Space, Button, Divider } from 'antd';
import { SyncOutlined, WarningOutlined, NotificationOutlined } from '@ant-design/icons';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { useTranslation } from 'react-i18next';

interface ErrorLog {
  time: string;
  code: string;
  description: string;
}

interface EventLog {
  time: string;
  type: string;
  value: string;
}

interface LogAndReportingMeshProps {
  deviceId: number;
}

const LogAndReportingMesh: React.FC<LogAndReportingMeshProps> = ({ deviceId }) => {
  const { t } = useTranslation();
  // 错误上报
  const [errorLoading, setErrorLoading] = useState(false);
  const [errorSyncing, setErrorSyncing] = useState(false);
  const [cmeeEnabled, setCmeeEnabled] = useState(false);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  // 事件上报
  const [eventLoading, setEventLoading] = useState(false);
  const [eventSyncing, setEventSyncing] = useState(false);
  const [cmerEnabled, setCmerEnabled] = useState(false);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);

  // React.useEffect(() => {
  //   fetchErrorLocal();
  //   fetchEventLocal();
  // }, [deviceId]);

  // 错误上报相关
  const fetchErrorLocal = async () => {
    setErrorLoading(true);
    try {
      const cmeeRes = await deviceConfigAPI.sendATCommand(deviceId, 'AT+CMEE?');
      setCmeeEnabled(String(cmeeRes.data?.response).includes('1'));
      setErrorLogs([]); // 可扩展
    } catch {}
    setErrorLoading(false);
  };
  const handleErrorSync = async () => {
    setErrorSyncing(true);
    await fetchErrorLocal();
    setErrorSyncing(false);
    message.success(t('Sync successful'));
  };
  const handleCmeeSwitch = async (checked: boolean) => {
    setErrorLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(deviceId, `AT+CMEE=${checked ? 1 : 0}`);
      setCmeeEnabled(checked);
      message.success(t('Error reporting has been ') + (checked ? t('enabled') : t('disabled')));
    } catch {
      message.error(t('Failed to set error reporting'));
    }
    setErrorLoading(false);
  };
  const errorColumns = [
    { title: t('Time'), dataIndex: 'time', key: 'time', width: 180 },
    { title: t('Error Code'), dataIndex: 'code', key: 'code', width: 100 },
    { title: t('Description'), dataIndex: 'description', key: 'description' },
  ];

  // 事件上报相关
  const fetchEventLocal = async () => {
    setEventLoading(true);
    try {
      const cmerRes = await deviceConfigAPI.sendATCommand(deviceId, 'AT+CMER?');
      setCmerEnabled(String(cmerRes.data?.response).includes('2,0,0,2,0'));
      setEventLogs([]); // 可扩展
    } catch {}
    setEventLoading(false);
  };
  const handleEventSync = async () => {
    setEventSyncing(true);
    await fetchEventLocal();
    setEventSyncing(false);
    message.success(t('Sync successful'));
  };
  const handleCmerSwitch = async (checked: boolean) => {
    setEventLoading(true);
    try {
      await deviceConfigAPI.sendATCommand(deviceId, `AT+CMER=${checked ? '2,0,0,2,0' : '2,0,0,0,0'}`);
      setCmerEnabled(checked);
      message.success(t('Event reporting has been ') + (checked ? t('enabled') : t('disabled')));
    } catch {
      message.error(t('Failed to set event reporting'));
    }
    setEventLoading(false);
  };
  const eventColumns = [
    { title: t('Time'), dataIndex: 'time', key: 'time', width: 180 },
    { title: t('Type'), dataIndex: 'type', key: 'type', width: 100 },
    { title: t('Content'), dataIndex: 'value', key: 'value' },
  ];

  return (
    <div>
      <Card
        title={t('Error Reporting')}
        extra={
          <Button icon={<SyncOutlined spin={errorSyncing} />} onClick={handleErrorSync} loading={errorSyncing} type="primary">
            {t('Sync')}
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Spin spinning={errorLoading}>
          <Space style={{ marginBottom: 16 }}>
            <WarningOutlined /> {t('Error reporting switch')}:
            <Switch checked={cmeeEnabled} onChange={handleCmeeSwitch} disabled={errorLoading} />
          </Space>
          <Table
            columns={errorColumns}
            dataSource={errorLogs}
            rowKey="time"
            pagination={false}
            locale={{ emptyText: t('No error logs yet') }}
            size="small"
          />
        </Spin>
      </Card>
      <Divider />
      <Card
        title={t('Event Reporting')}
        extra={
          <Button icon={<SyncOutlined spin={eventSyncing} />} onClick={handleEventSync} loading={eventSyncing} type="primary">
            {t('Sync')}
          </Button>
        }
      >
        <Spin spinning={eventLoading}>
          <Space style={{ marginBottom: 16 }}>
            <NotificationOutlined /> {t('Event reporting switch')}:
            <Switch checked={cmerEnabled} onChange={handleCmerSwitch} disabled={eventLoading} />
          </Space>
          <Table
            columns={eventColumns}
            dataSource={eventLogs}
            rowKey="time"
            pagination={false}
            locale={{ emptyText: t('No event records yet') }}
            size="small"
          />
        </Spin>
      </Card>
    </div>
  );
};

export default LogAndReportingMesh; 