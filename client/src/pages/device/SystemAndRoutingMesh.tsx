import React, { useState, useEffect } from 'react';
import { Card, Button, Spin, Descriptions, Divider, message } from 'antd';
import { SyncOutlined, ApartmentOutlined, PoweroffOutlined } from '@ant-design/icons';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { useTranslation } from 'react-i18next';

interface RouteEntry {
  destSN: string;
  nextSN: string;
  hop: number;
  type: number;
}

interface SystemAndRoutingMeshProps {
  device: any;
}

const SystemAndRoutingMesh: React.FC<SystemAndRoutingMeshProps> = ({ device }) => {
  const { t } = useTranslation();
  // 系统信息
  const [firmwareVersion, setFirmwareVersion] = useState('');
  const [rebooting, setRebooting] = useState(false);
  // 路由表
  const [routes, setRoutes] = useState<RouteEntry[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeSyncing, setRouteSyncing] = useState(false);

  // 获取固件版本
  // useEffect(() => {
  //   const fetchFirmwareVersion = async () => {
  //     try {
  //       const verRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DGMR?');
  //       setFirmwareVersion(verRes.data?.response || '');
  //     } catch (err) {
  //       setFirmwareVersion('');
  //     }
  //   };
  //   fetchFirmwareVersion();
  // }, [device.id]);

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

  // 路由表相关
  const fetchRoutes = async () => {
    setRouteLoading(true);
    try {
      const res = await deviceConfigAPI.sendATCommand(device.id, 'AT^DSONRIRPT=2');
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
      setRouteLoading(false);
    }
  };
  // useEffect(() => { fetchRoutes(); }, [device.id]);

  const handleRouteSync = async () => {
    setRouteSyncing(true);
    await fetchRoutes();
    setRouteSyncing(false);
    message.success(t('Sync successful'));
  };

  const routeColumns = [
    { title: t('Destination Node SN'), dataIndex: 'destSN', key: 'destSN', width: 120 },
    { title: t('Next Hop SN'), dataIndex: 'nextSN', key: 'nextSN', width: 120 },
    { title: t('Hop Count'), dataIndex: 'hop', key: 'hop', width: 80 },
    { title: t('Type'), dataIndex: 'type', key: 'type', width: 80, render: (v: number) => v === 0 ? t('Dynamic') : t('Static') },
  ];

  return (
    <div>
      <Card title={t('System and Routing')} style={{ marginBottom: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 4 }}>
          <Button
            type="primary"
            style={{
              background: '#faad14',
              borderColor: '#faad14',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 18,
              padding: '8px 32px',
            }}
            size="large"
            icon={<PoweroffOutlined />}
            onClick={handleReboot}
            loading={rebooting}
            danger
          >
            {t('Reboot Device')}
          </Button>
          <div style={{ color: '#faad14', marginTop: 8, fontSize: 13, fontWeight: 500 }}>
            {t('This will immediately reboot the device!')}
          </div>
        </div>
        {firmwareVersion && (
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, textAlign: 'center' }}>
            {t('Firmware Version')}: {firmwareVersion}
          </div>
        )}
      </Card>
      <Divider />
      <Card
        title={t('Routing Management')}
        extra={
          <Button icon={<SyncOutlined spin={routeSyncing} />} onClick={handleRouteSync} loading={routeSyncing} type="primary">
            {t('Sync')}
          </Button>
        }
      >
        <Spin spinning={routeLoading}>
          <ApartmentOutlined style={{ marginRight: 8 }} />
          <span>{t('Mesh routing table')}</span>
          <div style={{ marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {routeColumns.map(col => (
                    <th key={col.key as string} style={{ border: '1px solid #eee', padding: 8 }}>{col.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {routes.length === 0 ? (
                  <tr><td colSpan={routeColumns.length} style={{ textAlign: 'center', padding: 16 }}>{t('No routing information yet')}</td></tr>
                ) : (
                  routes.map((row, idx) => (
                    <tr key={row.destSN + row.nextSN + idx}>
                      <td style={{ border: '1px solid #eee', padding: 8 }}>{row.destSN}</td>
                      <td style={{ border: '1px solid #eee', padding: 8 }}>{row.nextSN}</td>
                      <td style={{ border: '1px solid #eee', padding: 8 }}>{row.hop}</td>
                      <td style={{ border: '1px solid #eee', padding: 8 }}>{routeColumns[3].render ? routeColumns[3].render(row.type) : row.type}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Spin>
      </Card>
    </div>
  );
};

export default SystemAndRoutingMesh; 