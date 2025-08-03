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

interface DebugConfig2MeshProps {
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

const DebugConfig2Mesh: React.FC<DebugConfig2MeshProps> = ({
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
        // 2.0mesh使用ELog和DRPR功能
        const elogRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^ELFUN?');
        const drprRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DRPR?');
        
        let debugSwitch = false;
        let drprReporting = false;
        
        if (elogRes.data?.response) {
          const match = elogRes.data.response.match(/\^ELFUN:\s*(\d+)/);
          if (match && match[1] !== undefined && match[1] !== '') {
            debugSwitch = match[1] === '1';
          }
        }
        
        if (drprRes.data?.response) {
          const match = drprRes.data.response.match(/\^DRPR:\s*(\d+)/);
          if (match && match[1] !== undefined && match[1] !== '') {
            drprReporting = match[1] === '1';
          }
        }
        
        setConfig({
          debugSwitch,
          drprReporting,
          atCommand: '',
          shellCommand: '',
        });
        
        form.setFieldsValue({
          debugSwitch,
          drprReporting,
          atCommand: '',
          shellCommand: '',
        });
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

  // 渲染调试开关
  const renderDebugSwitch = () => (
    <Card title={<span><BugOutlined /> {t('Debug Switch')}</span>} className={styles.card}>
      <div className={styles.currentKeySection}>
        <div className={styles.currentKeyLabel}>
          <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          <span style={{ fontWeight: 600 }}>{t('Now Debug Status')}:</span>
        </div>
        <div className={styles.currentKeyValue}>
          {config.debugSwitch ? t('Enabled') : t('Disabled')}
        </div>
      </div>
      
      <div className={styles.helpText}>
        <strong>{t('ELog Function')}</strong> {t('(Enable/Disable ELog debugging function)')}
      </div>
      
      <div className={styles.warningText}>
        <strong>{t('NOTE')}:</strong> {t('Debug function may affect device performance')}
      </div>
      
      <Form.Item
        label={t('Debug Switch')}
        name="debugSwitch"
        valuePropName="checked"
        style={{ marginTop: 24 }}
      >
        <Switch
          checked={config.debugSwitch}
          onChange={(checked) => {
            setConfig(prev => ({ ...prev, debugSwitch: checked }));
            form.setFieldsValue({ debugSwitch: checked });
          }}
        />
      </Form.Item>

      <Divider />

      <Form.Item>
        <Space>
          <Button 
            type="primary" 
            onClick={async () => {
              try {
                await deviceConfigAPI.sendATCommand(device.id, `AT^ELFUN=${config.debugSwitch ? 1 : 0}`);
                message.success(config.debugSwitch ? t('Debug enabled') : t('Debug disabled'));
              } catch (error) {
                message.error(t('Failed to toggle debug switch'));
              }
            }}
            loading={loading}
          >
            {t('Save Configuration')}
          </Button>
          <Button onClick={() => {
            setConfig(prev => ({ ...prev, debugSwitch: false }));
            form.setFieldsValue({ debugSwitch: false });
          }}>
            {t('Reset')}
          </Button>
        </Space>
      </Form.Item>
    </Card>
  );

  // 渲染无线参数上报
  const renderRadioParamReport = () => (
    <Card title={<span><FileTextOutlined /> {t('Radio Parameter Report')}</span>} className={styles.card}>
      <div className={styles.currentKeySection}>
        <div className={styles.currentKeyLabel}>
          <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          <span style={{ fontWeight: 600 }}>{t('Now Radio Parameter Report Status')}:</span>
        </div>
        <div className={styles.currentKeyValue}>
          {config.drprReporting ? t('Enabled') : t('Disabled')}
        </div>
      </div>
      

      
      <div className={styles.warningText}>
        <strong>{t('NOTE')}:</strong> {t('Radio parameter reporting may generate log files')}
      </div>
      
      <Form.Item
        label={t('Radio Parameter Report')}
        name="drprReporting"
        valuePropName="checked"
        style={{ marginTop: 24 }}
      >
        <Switch
          checked={config.drprReporting}
          onChange={async (checked) => {
            try {
              await deviceConfigAPI.sendATCommand(device.id, `AT^DRPR=${checked ? 1 : 0}`);
              setConfig(prev => ({ ...prev, drprReporting: checked }));
              form.setFieldsValue({ drprReporting: checked });
              message.success(checked ? t('Radio parameter report enabled') : t('Radio parameter report disabled'));
            } catch (error) {
              message.error(t('Failed to toggle radio parameter report'));
            }
          }}
        />
      </Form.Item>
      
      <Divider />
      
      <div>
        <Space>
          <Button
            type="primary"
            icon={drprMonitoringActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => {
              if (drprMonitoringActive) {
                stopDRPRMonitoring();
              } else {
                startDRPRMonitoring();
              }
            }}
          >
            {drprMonitoringActive ? t('Stop Monitoring') : t('Start Monitoring')}
          </Button>
          <Button onClick={fetchDRPRMessages}>
            {t('Refresh Messages')}
          </Button>
        </Space>
      </div>
      
      {drprMessages.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Title level={5}>{t('Radio Parameter Messages')}</Title>
          <Table
            dataSource={drprMessages}
            columns={[
              { title: t('Time'), dataIndex: 'timestamp', key: 'timestamp' },
              { title: t('Message'), dataIndex: 'message', key: 'message' },
            ]}
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ y: 200 }}
          />
        </div>
      )}
    </Card>
  );

  // 渲染AT调试
  const renderAtDebug = () => (
    <Card title={<span><CodeOutlined /> {t('AT Command Debug')}</span>} className={styles.card}>
      
      <Form.Item label={t('AT Command')} name="atCommand">
        <TextArea
          rows={3}
          placeholder={t('Enter AT command (e.g., AT^DGMR?)')}
          value={config.atCommand}
          onChange={(e) => setConfig(prev => ({ ...prev, atCommand: e.target.value }))}
        />
      </Form.Item>
      
      <Form.Item>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleAtExecute}
          disabled={!config.atCommand.trim()}
        >
          {t('Execute')}
        </Button>
      </Form.Item>
      
      {atResult && (
        <div style={{ marginTop: 16 }}>
          <Title level={5}>{t('Result')}</Title>
          <TextArea
            rows={6}
            value={atResult}
            readOnly
            style={{ fontFamily: 'monospace' }}
          />
        </div>
      )}
    </Card>
  );

  // 渲染Shell调试
  const renderShellDebug = () => (
    <Card title={<span><CodeOutlined /> {t('Shell Command Debug')}</span>} className={styles.card}>
      
      <Form.Item label={t('Shell Command')} name="shellCommand">
        <TextArea
          rows={3}
          placeholder={t('Enter shell command')}
          value={config.shellCommand}
          onChange={(e) => setConfig(prev => ({ ...prev, shellCommand: e.target.value }))}
        />
      </Form.Item>
      
      <Form.Item>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleShellExecute}
          disabled={!config.shellCommand.trim()}
        >
          {t('Execute')}
        </Button>
      </Form.Item>
      
      {shellResult && (
        <div style={{ marginTop: 16 }}>
          <Title level={5}>{t('Result')}</Title>
          <TextArea
            rows={6}
            value={shellResult}
            readOnly
            style={{ fontFamily: 'monospace' }}
          />
        </div>
      )}
    </Card>
  );

  // 执行AT命令
  const handleAtExecute = async () => {
    if (!config.atCommand.trim()) return;
    
    try {
      const response = await deviceConfigAPI.sendATCommand(device.id, config.atCommand);
      setAtResult(response.data?.response || 'No response');
      message.success(t('AT command executed successfully'));
    } catch (error) {
      setAtResult(t('Failed to execute AT command'));
      message.error(t('Failed to execute AT command'));
    }
  };

  // 执行Shell命令
  const handleShellExecute = async () => {
    if (!config.shellCommand.trim()) return;
    
    try {
      // 2.0mesh可能不支持直接的shell命令，这里使用AT命令模拟
      const response = await deviceConfigAPI.sendATCommand(device.id, config.shellCommand);
      setShellResult(response.data?.response || 'No response');
      message.success(t('Shell command executed successfully'));
    } catch (error) {
      setShellResult(t('Failed to execute shell command'));
      message.error(t('Failed to execute shell command'));
    }
  };

  // 获取无线参数上报消息
  const fetchDRPRMessages = async () => {
    try {
      // 2.0mesh的无线参数上报功能相对简单
      // 这里可以获取当前的无线参数配置作为参考
      const radioRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DRPC?');
      if (radioRes.data?.response) {
        message.success(t('Radio parameter configuration retrieved successfully'));
        // 可以在这里解析和显示无线参数信息
      } else {
        message.info(t('No radio parameter configuration available'));
      }
    } catch (error) {
      message.error(t('Failed to fetch radio parameter configuration'));
    }
  };

  // 开始DRPR监控
  const startDRPRMonitoring = () => {
    setDrprMonitoringActive(true);
    message.success(t('DRPR monitoring started'));
  };

  // 停止DRPR监控
  const stopDRPRMonitoring = () => {
    setDrprMonitoringActive(false);
    if (drprInterval) {
      clearInterval(drprInterval);
      setDrprInterval(null);
    }
    message.success(t('DRPR monitoring stopped'));
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
            configTypeName={t('Debug Configuration')}
            onSyncSuccess={() => {
              // 重新获取调试配置
              const fetchConfig = async () => {
                try {
                  const elogRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^ELFUN?');
                  const drprRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DRPR?');
                  
                  let debugSwitch = false;
                  let drprReporting = false;
                  
                  if (elogRes.data?.response) {
                    const match = elogRes.data.response.match(/\^ELFUN:\s*(\d+)/);
                    if (match) {
                      debugSwitch = match[1] === '1';
                    }
                  }
                  
                  if (drprRes.data?.response) {
                    const match = drprRes.data.response.match(/\^DRPR:\s*(\d+)/);
                    if (match) {
                      drprReporting = match[1] === '1';
                    }
                  }
                  
                  setConfig({
                    debugSwitch,
                    drprReporting,
                    atCommand: '',
                    shellCommand: '',
                  });
                  
                  form.setFieldsValue({
                    debugSwitch,
                    drprReporting,
                    atCommand: '',
                    shellCommand: '',
                  });
                } catch (error) {
                  // 获取调试配置失败
                }
              };
              fetchConfig();
            }}
          />
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={config}
          onFinish={onSave}
        >
          <Tabs defaultActiveKey="debug_switch">
            <TabPane
              tab={
                <span>
                  <BugOutlined />
                  {t('Debug Switch')}
                </span>
              }
              key="debug_switch"
            >
              {renderDebugSwitch()}
            </TabPane>
            <TabPane
              tab={
                <span>
                  <FileTextOutlined />
                  {t('Radio Parameter Report')}
                </span>
              }
              key="radio_param_report"
            >
              {renderRadioParamReport()}
            </TabPane>
            <TabPane
              tab={
                <span>
                  <CodeOutlined />
                  {t('AT Debug')}
                </span>
              }
              key="at_debug"
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
              key="shell_debug"
            >
              {renderShellDebug()}
            </TabPane>
          </Tabs>
        </Form>
      </Card>
    </div>
  );
};

export default DebugConfig2Mesh; 