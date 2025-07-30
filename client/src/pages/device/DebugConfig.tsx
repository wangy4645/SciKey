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
  onSave: (values: any) => Promise<void>;
  loading: boolean;
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
  const [drprMessages, setDrprMessages] = useState<string[]>([]);
  const [atResult, setAtResult] = useState<string>('');
  const [shellResult, setShellResult] = useState<string>('');

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
        console.log('Debug config: Received sync event, refreshing data...');
        fetchConfig();
      }
    };
    
    window.addEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    
    return () => {
      window.removeEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    };
  }, [device.id]);

  // Debug Switch 子页面
  const renderDebugSwitch = () => (
    <Card title={t('Debug Switch')} className={styles.card}>
      <div className={styles.currentConfig}>
        <strong>{t('Status')}:</strong>
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

      <div className={styles.controlDescription}>
        <strong>{t('Debug Switch Control')}:</strong>
      </div>
      
      <div className={styles.hoppingButtons}>
        <Button 
          type="primary"
          size="large"
          icon={<PlayCircleOutlined />}
          className={`${styles.hoppingButton} ${styles.openButton} ${config.debugSwitch ? styles.activeButton : ''}`}
          onClick={handleDebugSwitchToggle}
          loading={loading}
          disabled={config.debugSwitch}
        >
          {t('Open')}
        </Button>
        
        <Button 
          size="large"
          icon={<PauseCircleOutlined />}
          className={`${styles.hoppingButton} ${styles.closeButton} ${!config.debugSwitch ? styles.activeButton : ''}`}
          onClick={handleDebugSwitchToggle}
          loading={loading}
          disabled={!config.debugSwitch}
        >
          {t('Close')}
        </Button>
      </div>

      {config.debugSwitch && (
        <>
          <Divider />
          <div className={styles.messagesSection}>
            <Title level={5}>{t('Debug Messages')}:</Title>
            <div className={styles.messagesContainer}>
              {debugMessages.length > 0 ? (
                debugMessages.map((msg, index) => (
                  <div key={index} className={styles.messageItem}>
                    <Text type="secondary">[{new Date().toLocaleTimeString()}]</Text> {msg}
                  </div>
                ))
              ) : (
                <Text type="secondary">{t('No messages received yet...')}</Text>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );

  // DRPR Reporting 子页面
  const renderDrprReporting = () => (
    <Card title={t('DRPR Reporting')} className={styles.card}>
      <Row gutter={16} align="middle" style={{ marginLeft: '32px' }}>
        {/* 左侧控制按钮 */}
        <Col flex="none" style={{ display: 'flex', alignItems: 'center' }}>
          <div className={`${styles.hoppingButtons} ${styles.drprButtons}`} style={{ marginLeft: 0 }}>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              className={`${styles.hoppingButton} ${styles.openButton} ${config.drprReporting ? styles.activeButton : ''}`}
              onClick={handleDrprReportingToggle}
              loading={loading}
              disabled={config.drprReporting}
            >
              {t('Start')}
            </Button>
            <Button
              size="large"
              icon={<PauseCircleOutlined />}
              className={`${styles.hoppingButton} ${styles.closeButton} ${!config.drprReporting ? styles.activeButton : ''}`}
              onClick={handleDrprReportingToggle}
              loading={loading}
              disabled={!config.drprReporting}
            >
              {t('Pause')}
            </Button>
          </div>
        </Col>

        {/* 中间空白 */}
        <Col flex="32px" />

        {/* 右侧信号质量图例 */}
        <Col flex="auto">
          <Row gutter={32} justify="start">
            {/* RSRP图例 */}
            <Col span={10}>
              <div className={styles.signalLegend}>
                <h4>{t('RSRP Threshold')}</h4>
                <div className={styles.legendItem} style={{ backgroundColor: '#d32f2f' }}>
                  {t('RSRP Extremely Poor')} &lt;-124
                </div>
                <div className={styles.legendItem} style={{ backgroundColor: '#f44336' }}>
                  {t('RSRP Poor')} -124~-104
                </div>
                <div className={styles.legendItem} style={{ backgroundColor: '#ff9800' }}>
                  {t('RSRP Low')} -103~-85
                </div>
                <div className={styles.legendItem} style={{ backgroundColor: '#ffeb3b' }}>
                  {t('RSRP Medium')} -84~-65
                </div>
                <div className={styles.legendItem} style={{ backgroundColor: '#b7eb8f' }}>
                  {t('RSRP High')} &gt;-64
                </div>
              </div>
            </Col>

            {/* SNR图例 */}
            <Col span={10}>
              <div className={styles.signalLegend}>
                <h4>{t('SNR Threshold')}</h4>
                <div className={styles.legendItem} style={{ backgroundColor: '#d32f2f' }}>
                  {t('SNR Extremely Poor')} &lt;0
                </div>
                <div className={styles.legendItem} style={{ backgroundColor: '#f44336' }}>
                  {t('SNR Poor')} 0~6
                </div>
                <div className={styles.legendItem} style={{ backgroundColor: '#ff9800' }}>
                  {t('SNR Low')} 7~12
                </div>
                <div className={styles.legendItem} style={{ backgroundColor: '#ffeb3b' }}>
                  {t('SNR Medium')} 13~18
                </div>
                <div className={styles.legendItem} style={{ backgroundColor: '#b7eb8f' }}>
                  {t('SNR High')} &gt;19
                </div>
              </div>
            </Col>
          </Row>
        </Col>
      </Row>

      <Divider />

      {/* 数据表格 */}
      <div className={styles.dataTable}>
        <Table
          columns={[
            { title: 'IP', dataIndex: 'ip', key: 'ip' },
            { title: 'RSRP', dataIndex: 'rsrp', key: 'rsrp' },
            { title: 'SNR', dataIndex: 'snr', key: 'snr' },
            { title: 'DISTANCE', dataIndex: 'distance', key: 'distance' },
          ]}
          dataSource={[]}
          pagination={false}
          size="small"
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

  const handleDrprReportingToggle = async () => {
    try {
      const newValue = !config.drprReporting;
      await deviceConfigAPI.setDrprReporting(Number(device.id), newValue);
      setConfig(prev => ({ ...prev, drprReporting: newValue }));
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
                  console.error('Error fetching debug config:', error);
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