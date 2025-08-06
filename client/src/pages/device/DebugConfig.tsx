import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Row,
  Col,
  Divider,
  message,
  Tabs,
  Table,
  Space,
  InputNumber,
  Select,
  Progress,
  Tag,
  Alert,
  Typography,
} from 'antd';
import {
  BugOutlined,
  SettingOutlined,
  FileTextOutlined,
  LineChartOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SendOutlined,
  CodeOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import styles from './DebugConfig.module.css';
import { Device } from '../../types';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { useTranslation } from 'react-i18next';
import SyncButton from '../../components/SyncButton';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface DebugConfigProps {
  device: Device;
  onSave?: (values: any) => Promise<void>;
  loading?: boolean;
}

interface DebugConfig {
  debugSwitch: boolean;
  drprReporting: boolean;
  atCommand: string;
  shellCommand: string;
}

const DebugConfig: React.FC<DebugConfigProps> = ({
  device,
  onSave,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [config, setConfig] = useState<DebugConfig>({
    debugSwitch: false,
    drprReporting: false,
    atCommand: '',
    shellCommand: '',
  });

  // 状态管理
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [drprMessages, setDrprMessages] = useState<any[]>([]);
  const [atResult, setAtResult] = useState<string>('');
  const [shellResult, setShellResult] = useState<string>('');
  const [drprInterval, setDrprInterval] = useState<NodeJS.Timeout | null>(null);
  const [drprMonitoringActive, setDrprMonitoringActive] = useState<boolean>(false);

  // 获取当前配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await deviceConfigAPI.getDebugConfig(Number(device.id));
        if (response.data && response.data.config) {
          const config = response.data.config;
          setConfig({
            debugSwitch: config.debug_switch === 'active',
            drprReporting: config.drpr_reporting === 'active',
            atCommand: '',
            shellCommand: '',
          });
        } else {
          setConfig({
            debugSwitch: false,
            drprReporting: false,
            atCommand: '',
            shellCommand: '',
          });
        }
      } catch (error) {
        setConfig({
          debugSwitch: false,
          drprReporting: false,
          atCommand: '',
          shellCommand: '',
        });
      }
    };
    
    fetchConfig();
    
    // 监听设备配置同步事件
    const handleDeviceConfigSync = (event: CustomEvent) => {
      if (event.detail && event.detail.deviceId === Number(device.id)) {
        // 收到同步事件，刷新数据
        fetchConfig();
      }
    };
    
    window.addEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    
    return () => {
      window.removeEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    };
  }, [device.id]);

  // Debug Switch 子页面（Frequency Hopping 风格）
  const renderDebugSwitch = () => (
    <Card title={t('Debug Switch')} className={styles.card}>
      <div className={styles.currentConfig}>
        <strong>{t('Now Configuration')}:</strong>
        <div className={styles.statusDisplay}>
          <div className={`${styles.statusIndicator} ${config.debugSwitch ? styles.statusActive : styles.statusInactive}`}>
            <div className={styles.statusDot}></div>
            <span className={styles.statusText}>
              {config.debugSwitch ? t('Open') : t('Close')}
            </span>
          </div>
        </div>
      </div>
      <Divider />
      <div className={styles.hoppingControls}>
        <div className={styles.controlDescription}>
          <strong>{t('Debug Switch Control')}:</strong>
          <p>{t('Click the button below to enable or disable debug switch functionality.')}</p>
        </div>
        <div className={styles.hoppingButtons}>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            className={`${styles.hoppingButton} ${styles.openButton} ${config.debugSwitch ? styles.activeButton : ''}`}
            onClick={async () => {
              if (!config.debugSwitch) await handleDebugSwitchToggle();
            }}
            loading={loading}
            disabled={config.debugSwitch}
          >
            {t('Open')}
          </Button>
          <Button
            size="large"
            icon={<PauseCircleOutlined />}
            className={`${styles.hoppingButton} ${styles.closeButton} ${!config.debugSwitch ? styles.activeButton : ''}`}
            onClick={async () => {
              if (config.debugSwitch) await handleDebugSwitchToggle();
            }}
            loading={loading}
            disabled={!config.debugSwitch}
          >
            {t('Close')}
          </Button>
        </div>
      </div>
    </Card>
  );

  // DRPR Reporting 子页面（左右分栏色条+大按钮+表格，按钮组与截图一致）
  const renderDrprReporting = () => (
    <Card title={t('DRPR Reporting')} className={styles.card}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start', marginBottom: 24 }}>
        {/* 左侧按钮组 */}
        <div style={{ minWidth: 160, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className={styles.buttonGroup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Button
              className={`${styles.startBtn} ${drprMonitoringActive ? styles.btnDisabled : ''}`}
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={!drprMonitoringActive ? handleDrprReportingToggle : undefined}
              disabled={drprMonitoringActive}
            >
              <span className={styles.btnText}>{t('Start')}</span>
            </Button>
            <Button
              className={`${styles.pauseBtn} ${!drprMonitoringActive ? styles.btnDisabled : ''}`}
              size="large"
              icon={<PauseCircleOutlined />}
              onClick={drprMonitoringActive ? handleDrprReportingToggle : undefined}
              disabled={!drprMonitoringActive}
            >
              <span className={styles.btnText}>{t('Pause')}</span>
            </Button>
          </div>
        </div>
        {/* 右侧色条说明 */}
        <div style={{ flex: 1, display: 'flex', gap: 32 }}>
          {/* RSRP 阈值色条卡片 */}
          <div style={{ flex: 1 }}>
            <div style={{ background: '#fafafa', borderRadius: 12, padding: '24px 24px 16px 24px', marginBottom: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <h4 style={{ marginBottom: 16 }}>{t('RSRP Threshold')}</h4>
              <div style={{ background: '#d32f2f', color: '#222', padding: 8, borderRadius: 4, marginBottom: 8 }}>{t('RSRP Extremely Poor')} &lt;-124</div>
              <div style={{ background: '#f44336', color: '#222', padding: 8, borderRadius: 4, marginBottom: 8 }}>{t('RSRP Poor')} -124~-104</div>
              <div style={{ background: '#ff9800', color: '#222', padding: 8, borderRadius: 4, marginBottom: 8 }}>{t('RSRP Low')} -103~-85</div>
              <div style={{ background: '#ffeb3b', color: '#222', padding: 8, borderRadius: 4, marginBottom: 8 }}>{t('RSRP Medium')} -84~-65</div>
              <div style={{ background: '#b7eb8f', color: '#222', padding: 8, borderRadius: 4 }}>{t('RSRP High')} &gt;-64</div>
            </div>
          </div>
          {/* SNR 阈值色条卡片 */}
          <div style={{ flex: 1 }}>
            <div style={{ background: '#fafafa', borderRadius: 12, padding: '24px 24px 16px 24px', marginBottom: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <h4 style={{ marginBottom: 16 }}>{t('SNR Threshold')}</h4>
              <div style={{ background: '#d32f2f', color: '#222', padding: 8, borderRadius: 4, marginBottom: 8 }}>{t('SNR Extremely Poor')} &lt;0</div>
              <div style={{ background: '#f44336', color: '#222', padding: 8, borderRadius: 4, marginBottom: 8 }}>{t('SNR Poor')} 0~6</div>
              <div style={{ background: '#ff9800', color: '#222', padding: 8, borderRadius: 4, marginBottom: 8 }}>{t('SNR Low')} 7~12</div>
              <div style={{ background: '#ffeb3b', color: '#222', padding: 8, borderRadius: 4, marginBottom: 8 }}>{t('SNR Medium')} 13~18</div>
              <div style={{ background: '#b7eb8f', color: '#222', padding: 8, borderRadius: 4 }}>{t('SNR High')} &gt;19</div>
            </div>
          </div>
        </div>
      </div>
      {/* 数据表格 */}
      <div className={styles.dataTable}>
        <Table
          columns={[
            { title: 'IP', dataIndex: 'device_ip', key: 'device_ip', render: () => device.ip, width: 120 },
            { title: 'RSRP', dataIndex: 'rsrp', key: 'rsrp', width: 100, render: (rsrp: string) => {
              const value = Number(rsrp);
              let color = '#52c41a';
              if (value <= -104) color = '#ff4d4f';
              else if (value <= -85) color = '#faad14';
              return <span style={{ backgroundColor: color, padding: '2px 6px', borderRadius: '3px', color: 'white' }}>{rsrp}</span>;
            } },
            { title: 'SNR', dataIndex: 'snr', key: 'snr', width: 100, render: (snr: string) => {
              const value = Number(snr);
              let color = '#52c41a';
              if (value < 0) color = '#ff4d4f';
              else if (value < 10) color = '#faad14';
              return <span style={{ backgroundColor: color, padding: '2px 6px', borderRadius: '3px', color: 'white' }}>{snr}</span>;
            } },
            { title: 'DISTANCE', dataIndex: 'distance', key: 'distance', width: 100 },
          ]}
          dataSource={drprMessages}
          pagination={false}
          size="small"
          rowKey={(record) => `${record.device_id}_${record.timestamp}_${record.index}`}
          locale={{ emptyText: <div style={{ textAlign: 'center', color: '#aaa', padding: 32 }}><div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>No data</div> }}
          scroll={{ x: 400 }}
        />
      </div>
    </Card>
  );

  // AT Debug 子页面
  const renderAtDebug = () => (
    <Card title={t('AT Debug')} className={styles.card}>
      <div className={styles.commandSection}>
        <Row gutter={16} align="middle">
          <Col span={4}>
            <Text strong>{t('Mesh')}:</Text>
          </Col>
          <Col span={16}>
            <Input
              value={config.atCommand}
              onChange={(e) => setConfig({ ...config, atCommand: e.target.value })}
              placeholder={t('Enter AT command')}
              onPressEnter={handleAtExecute}
            />
          </Col>
          <Col span={4}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleAtExecute}
              loading={loading}
              disabled={!config.atCommand.trim()}
            >
              {t('Execute')}
            </Button>
          </Col>
        </Row>
      </div>

      {atResult && (
        <>
          <Divider />
          <div className={styles.resultSection}>
            <Title level={5}>{t('Execution Result')}:</Title>
            <TextArea
              value={atResult}
              rows={6}
              readOnly
              className={styles.resultTextArea}
            />
          </div>
        </>
      )}
    </Card>
  );

  // Shell Debug 子页面
  const renderShellDebug = () => (
    <Card title={t('Shell Debug')} className={styles.card}>
      <div className={styles.commandSection}>
        <Row gutter={16} align="middle">
          <Col span={20}>
            <Input
              value={config.shellCommand}
              onChange={(e) => setConfig({ ...config, shellCommand: e.target.value })}
              placeholder={t('Please input shell command')}
              onPressEnter={handleShellExecute}
            />
          </Col>
          <Col span={4}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleShellExecute}
              loading={loading}
              disabled={!config.shellCommand.trim()}
            >
              {t('Execute')}
            </Button>
          </Col>
        </Row>
      </div>

      {shellResult && (
        <>
          <Divider />
          <div className={styles.resultSection}>
            <Title level={5}>{t('Execution Result')}:</Title>
            <TextArea
              value={shellResult}
              rows={6}
              readOnly
              className={styles.resultTextArea}
            />
          </div>
        </>
      )}
    </Card>
  );

  // 处理 AT 命令执行
  const handleAtExecute = async () => {
    if (!config.atCommand.trim()) return;
    
    try {
      const result = await deviceConfigAPI.executeAtCommand(Number(device.id), config.atCommand);
      setAtResult(result.data || 'Command executed successfully');
      message.success(t('AT command executed successfully'));
    } catch (error) {
      setAtResult('Error: Failed to execute AT command');
      message.error(t('Failed to execute AT command'));
    }
  };

  // 处理 Shell 命令执行
  const handleShellExecute = async () => {
    if (!config.shellCommand.trim()) return;
    
    try {
      const result = await deviceConfigAPI.executeShellCommand(Number(device.id), config.shellCommand);
      setShellResult(result.data || 'Command executed successfully');
      message.success(t('Shell command executed successfully'));
    } catch (error) {
      setShellResult('Error: Failed to execute shell command');
      message.error(t('Failed to execute shell command'));
    }
  };

  const handleDebugSwitchToggle = async () => {
    try {
      const newValue = !config.debugSwitch;
      await deviceConfigAPI.setDebugSwitch(Number(device.id), newValue);
      setConfig(prev => ({ ...prev, debugSwitch: newValue }));
    } catch (error) {
      // 失败时不做多余处理
    }
  };

  // 获取DRPR消息
  const fetchDRPRMessages = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/devices/${device.id}/debug/drpr/messages?limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDrprMessages(data.messages || []);
      } else {
        const errorText = await response.text();
      }
    } catch (error) {
    }
  };

  // 检查DRPR监控状态
  const checkDRPRMonitoringStatus = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/devices/${device.id}/debug/drpr/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDrprMonitoringActive(data.is_active || false);
      } else {
      }
    } catch (error) {
    }
  };

  // 开始DRPR监控
  const startDRPRMonitoring = () => {
    // 立即获取一次数据
    fetchDRPRMessages();
    
    // 设置定时器，每5秒获取一次数据
    const interval = setInterval(fetchDRPRMessages, 5000);
    setDrprInterval(interval);
    setDrprMonitoringActive(true);
  };

  // 停止DRPR监控
  const stopDRPRMonitoring = () => {
    if (drprInterval) {
      clearInterval(drprInterval);
      setDrprInterval(null);
    }
    setDrprMonitoringActive(false);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (drprInterval) {
        clearInterval(drprInterval);
      }
    };
  }, [drprInterval]);

  // 检查DRPR监控状态和启动监控
  useEffect(() => {
    const initializeDRPRMonitoring = async () => {
      await checkDRPRMonitoringStatus();
      
      // 如果配置显示DRPR已启用，但监控状态未知，则启动监控
      if (config.drprReporting && !drprMonitoringActive) {
        startDRPRMonitoring();
      }
    };
    
    initializeDRPRMonitoring();
  }, [device.id, config.drprReporting]);

  const handleDrprReportingToggle = async () => {
    try {
      const newValue = !config.drprReporting;
      await deviceConfigAPI.setDrprReporting(Number(device.id), newValue);
      setConfig(prev => ({ ...prev, drprReporting: newValue }));
      
      // 根据状态启动或停止监控
      if (newValue) {
        startDRPRMonitoring();
      } else {
        stopDRPRMonitoring();
      }
    } catch (error) {
      // 失败时不做多余处理
    }
  };

  return (
    <div className={styles.container}>
      <Card 
        title={t('Debug Configuration')} 
        className={styles.card}
        extra={
          <SyncButton
            deviceId={device.id}
            configType="debug"
            configTypeName={t('Debug')}
            onSyncSuccess={() => {
              // 重新获取调试配置
              const fetchConfig = async () => {
                try {
                  const response = await deviceConfigAPI.getDebugConfig(Number(device.id));
                  if (response.data && response.data.config) {
                    const config = response.data.config;
                    setConfig({
                      debugSwitch: config.debug_switch === 'active',
                      drprReporting: config.drpr_reporting === 'active',
                      atCommand: '',
                      shellCommand: '',
                    });
                  }
                } catch (error) {
                }
              };
              fetchConfig();
            }}
          />
        }
      >
        <Tabs defaultActiveKey="debugSwitch">
          <TabPane
            tab={
              <span>
                <BugOutlined />
                {t('Debug Switch')}
              </span>
            }
            key="debugSwitch"
          >
            {renderDebugSwitch()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <LineChartOutlined />
                {t('DRPR Reporting')}
              </span>
            }
            key="drprReporting"
          >
            {renderDrprReporting()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                {t('AT Debug')}
              </span>
            }
            key="atDebug"
          >
            {renderAtDebug()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <CodeOutlined />
                {t('Shell Debug')}
              </span>
            }
            key="shellDebug"
          >
            {renderShellDebug()}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default DebugConfig; 