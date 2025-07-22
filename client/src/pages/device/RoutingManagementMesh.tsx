import React, { useState } from 'react';
import { Card, Button, Table, message, Spin } from 'antd';
import { SyncOutlined, ApartmentOutlined } from '@ant-design/icons';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { useTranslation } from 'react-i18next';

interface RouteEntry {
  destSN: string;
  nextSN: string;
  hop: number;
  type: number;
}

interface RoutingManagementMeshProps {
  deviceId: number;
}

const RoutingManagementMesh: React.FC<RoutingManagementMeshProps> = ({ deviceId }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [routes, setRoutes] = useState<RouteEntry[]>([]);

  React.useEffect(() => {
    fetchLocal();
  }, [deviceId]);

  const fetchLocal = async () => {
    setLoading(true);
    try {
      // 查询路由表（AT^DSONRIRPT=2）
      const res = await deviceConfigAPI.sendATCommand(deviceId, 'AT^DSONRIRPT=2');
      // 假设返回格式为 ^DSONRIRPT: <type>,<destSN>,<hop>,<nextSN>\n... 多行
      const lines = String(res.data?.response || '').split('\n');
      const parsed: RouteEntry[] = lines.map(line => {
        const m = line.match(/\^DSONRIRPT:\s*(\d+),(\w+),(\d+),(\w+)/);
        if (m) {
          return {
            type: Number(m[1]),
            destSN: m[2],
            hop: Number(m[3]),
            nextSN: m[4],
          };
        }
        return null;
      }).filter(Boolean) as RouteEntry[];
      setRoutes(parsed);
    } catch {
      setRoutes([]);
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

  const columns = [
    { title: t('Destination Node SN'), dataIndex: 'destSN', key: 'destSN', width: 120 },
    { title: t('Next Hop SN'), dataIndex: 'nextSN', key: 'nextSN', width: 120 },
    { title: t('Hop Count'), dataIndex: 'hop', key: 'hop', width: 80 },
    { title: t('Type'), dataIndex: 'type', key: 'type', width: 80, render: (v: number) => v === 0 ? t('Dynamic') : t('Static') },
  ];

  return (
    <Card
      title={t('Routing Management')}
      extra={
        <Button icon={<SyncOutlined spin={syncing} />} onClick={handleSync} loading={syncing} type="primary">
          {t('Sync')}
        </Button>
      }
    >
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={routes}
          rowKey={r => r.destSN + r.nextSN}
          pagination={false}
          locale={{ emptyText: t('No routing information yet') }}
          size="small"
        />
      </Spin>
    </Card>
  );
};

export default RoutingManagementMesh; 