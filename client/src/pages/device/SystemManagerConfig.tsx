import React, { useState } from 'react';
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
} from 'antd';
import {
  SettingOutlined,
  CloudUploadOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import styles from './SystemManagerConfig.module.css';
import { Device } from '../../types';
import { useTranslation } from 'react-i18next';

const { TabPane } = Tabs;
const { Option } = Select;

interface SystemManagerConfigProps {
  device: Device;
  onSave: (values: any) => Promise<void>;
  loading: boolean;
}

interface SystemManagerConfig {
  system: {
    hostname: string;
    timezone: string;
    language: string;
    autoUpdate: boolean;
    updateSchedule: string;
  };
  backup: {
    enabled: boolean;
    schedule: string;
    retention: number;
    destination: string;
  };
  maintenance: {
    enabled: boolean;
    schedule: string;
    window: string;
    tasks: string[];
  };
  security: {
    passwordPolicy: {
      enabled: boolean;
      minLength: number;
      requireSpecial: boolean;
      requireNumber: boolean;
      requireUppercase: boolean;
    };
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
}

const SystemManagerConfig: React.FC<SystemManagerConfigProps> = ({
  device,
  onSave,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [config, setConfig] = useState<SystemManagerConfig>({
    system: {
      hostname: device.node_id || '',
      timezone: 'Asia/Shanghai',
      language: 'en_US',
      autoUpdate: true,
      updateSchedule: 'daily',
    },
    backup: {
      enabled: true,
      schedule: 'daily',
      retention: 30,
      destination: 'local',
    },
    maintenance: {
      enabled: true,
      schedule: 'weekly',
      window: '02:00-04:00',
      tasks: ['system', 'security', 'performance'],
    },
    security: {
      passwordPolicy: {
        enabled: true,
        minLength: 8,
        requireSpecial: true,
        requireNumber: true,
        requireUppercase: true,
      },
      sessionTimeout: 30,
      maxLoginAttempts: 5,
    },
  });

  const { t } = useTranslation();

  const handleSubmit = async (values: any) => {
    try {
      await onSave(values);
      message.success('System manager configuration saved successfully');
    } catch (error) {
      message.error('Failed to save system manager configuration');
    }
  };

  const renderSystemSettings = (system: SystemManagerConfig['system']) => (
    <>
      <Form.Item label="Hostname">
        <Input
          value={system.hostname}
          onChange={(e) =>
            setConfig({
              ...config,
              system: { ...system, hostname: e.target.value },
            })
          }
        />
      </Form.Item>

      <Form.Item label="Timezone">
        <Select
          value={system.timezone}
          onChange={(value) =>
            setConfig({
              ...config,
              system: { ...system, timezone: value },
            })
          }
        >
          <Option value="UTC">UTC</Option>
          <Option value="Asia/Shanghai">Asia/Shanghai</Option>
          <Option value="America/New_York">America/New_York</Option>
          <Option value="Europe/London">Europe/London</Option>
        </Select>
      </Form.Item>

      <Form.Item label={t('Language')}>
        <Select
          value={system.language}
          onChange={(value) =>
            setConfig({
              ...config,
              system: { ...system, language: value },
            })
          }
        >
          <Option value="en_US">{t('English')}</Option>
          <Option value="zh_CN">{t('Chinese')}</Option>
          <Option value="ja_JP">{t('Japanese')}</Option>
          <Option value="ko_KR">{t('Korean')}</Option>
        </Select>
      </Form.Item>

      <Form.Item label={t('Auto Update')}>
        <Switch
          checked={system.autoUpdate}
          onChange={(checked) =>
            setConfig({
              ...config,
              system: { ...system, autoUpdate: checked },
            })
          }
        />
      </Form.Item>

      {system.autoUpdate && (
        <Form.Item label={t('Update Schedule')}>
          <Select
            value={system.updateSchedule}
            onChange={(value) =>
              setConfig({
                ...config,
                system: { ...system, updateSchedule: value },
              })
            }
          >
            <Option value="daily">{t('Daily')}</Option>
            <Option value="weekly">{t('Weekly')}</Option>
            <Option value="monthly">{t('Monthly')}</Option>
          </Select>
        </Form.Item>
      )}
    </>
  );

  const renderBackupSettings = (backup: SystemManagerConfig['backup']) => (
    <>
      <Form.Item label={t('Enable Backup')}>
        <Switch
          checked={backup.enabled}
          onChange={(checked) =>
            setConfig({
              ...config,
              backup: { ...backup, enabled: checked },
            })
          }
        />
      </Form.Item>

      {backup.enabled && (
        <>
          <Form.Item label={t('Backup Schedule')}>
            <Select
              value={backup.schedule}
              onChange={(value) =>
                setConfig({
                  ...config,
                  backup: { ...backup, schedule: value },
                })
              }
            >
              <Option value="daily">{t('Daily')}</Option>
              <Option value="weekly">{t('Weekly')}</Option>
              <Option value="monthly">{t('Monthly')}</Option>
            </Select>
          </Form.Item>

          <Form.Item label={t('Retention Period (days)')}>
            <InputNumber
              min={1}
              max={365}
              value={backup.retention}
              onChange={(value) =>
                setConfig({
                  ...config,
                  backup: { ...backup, retention: value || 30 },
                })
              }
            />
          </Form.Item>

          <Form.Item label={t('Backup Destination')}>
            <Select
              value={backup.destination}
              onChange={(value) =>
                setConfig({
                  ...config,
                  backup: { ...backup, destination: value },
                })
              }
            >
              <Option value="local">{t('Local Storage')}</Option>
              <Option value="remote">{t('Remote Server')}</Option>
              <Option value="cloud">{t('Cloud Storage')}</Option>
            </Select>
          </Form.Item>
        </>
      )}
    </>
  );

  const renderMaintenanceSettings = (maintenance: SystemManagerConfig['maintenance']) => (
    <>
      <Form.Item label={t('Enable Maintenance')}>
        <Switch
          checked={maintenance.enabled}
          onChange={(checked) =>
            setConfig({
              ...config,
              maintenance: { ...maintenance, enabled: checked },
            })
          }
        />
      </Form.Item>

      {maintenance.enabled && (
        <>
          <Form.Item label={t('Maintenance Schedule')}>
            <Select
              value={maintenance.schedule}
              onChange={(value) =>
                setConfig({
                  ...config,
                  maintenance: { ...maintenance, schedule: value },
                })
              }
            >
              <Option value="daily">{t('Daily')}</Option>
              <Option value="weekly">{t('Weekly')}</Option>
              <Option value="monthly">{t('Monthly')}</Option>
            </Select>
          </Form.Item>

          <Form.Item label={t('Maintenance Window')}>
            <Input
              value={maintenance.window}
              onChange={(e) =>
                setConfig({
                  ...config,
                  maintenance: { ...maintenance, window: e.target.value },
                })
              }
              placeholder="HH:MM-HH:MM"
            />
          </Form.Item>

          <Form.Item label={t('Maintenance Tasks')}>
            <Select
              mode="multiple"
              value={maintenance.tasks}
              onChange={(value) =>
                setConfig({
                  ...config,
                  maintenance: { ...maintenance, tasks: value },
                })
              }
            >
              <Option value="system">{t('System Check')}</Option>
              <Option value="security">{t('Security Update')}</Option>
              <Option value="performance">{t('Performance Optimization')}</Option>
              <Option value="backup">{t('Backup')}</Option>
            </Select>
          </Form.Item>
        </>
      )}
    </>
  );

  const renderSecuritySettings = (security: SystemManagerConfig['security']) => (
    <>
      <Form.Item label={t('Password Policy')}>
        <Switch
          checked={security.passwordPolicy.enabled}
          onChange={(checked) =>
            setConfig({
              ...config,
              security: {
                ...security,
                passwordPolicy: { ...security.passwordPolicy, enabled: checked },
              },
            })
          }
        />
      </Form.Item>

      {security.passwordPolicy.enabled && (
        <>
          <Form.Item label={t('Minimum Length')}>
            <InputNumber
              min={6}
              max={32}
              value={security.passwordPolicy.minLength}
              onChange={(value) =>
                setConfig({
                  ...config,
                  security: {
                    ...security,
                    passwordPolicy: {
                      ...security.passwordPolicy,
                      minLength: value || 8,
                    },
                  },
                })
              }
            />
          </Form.Item>

          <Form.Item label={t('Require Special Characters')}>
            <Switch
              checked={security.passwordPolicy.requireSpecial}
              onChange={(checked) =>
                setConfig({
                  ...config,
                  security: {
                    ...security,
                    passwordPolicy: {
                      ...security.passwordPolicy,
                      requireSpecial: checked,
                    },
                  },
                })
              }
            />
          </Form.Item>

          <Form.Item label={t('Require Numbers')}>
            <Switch
              checked={security.passwordPolicy.requireNumber}
              onChange={(checked) =>
                setConfig({
                  ...config,
                  security: {
                    ...security,
                    passwordPolicy: {
                      ...security.passwordPolicy,
                      requireNumber: checked,
                    },
                  },
                })
              }
            />
          </Form.Item>

          <Form.Item label={t('Require Uppercase')}>
            <Switch
              checked={security.passwordPolicy.requireUppercase}
              onChange={(checked) =>
                setConfig({
                  ...config,
                  security: {
                    ...security,
                    passwordPolicy: {
                      ...security.passwordPolicy,
                      requireUppercase: checked,
                    },
                  },
                })
              }
            />
          </Form.Item>
        </>
      )}

      <Form.Item label={t('Session Timeout (minutes)')}>
        <InputNumber
          min={5}
          max={1440}
          value={security.sessionTimeout}
          onChange={(value) =>
            setConfig({
              ...config,
              security: { ...security, sessionTimeout: value || 30 },
            })
          }
        />
      </Form.Item>

      <Form.Item label={t('Max Login Attempts')}>
        <InputNumber
          min={3}
          max={10}
          value={security.maxLoginAttempts}
          onChange={(value) =>
            setConfig({
              ...config,
              security: { ...security, maxLoginAttempts: value || 5 },
            })
          }
        />
      </Form.Item>
    </>
  );

  return (
    <div className={styles.container}>
      <Card title="System Manager Configuration" className={styles.card}>
        <Tabs defaultActiveKey="system">
          <TabPane
            tab={
              <span>
                <SettingOutlined />
                System
              </span>
            }
            key="system"
          >
            {renderSystemSettings(config.system)}
          </TabPane>

          <TabPane
            tab={
              <span>
                <CloudUploadOutlined />
                Backup
              </span>
            }
            key="backup"
          >
            {renderBackupSettings(config.backup)}
          </TabPane>

          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                Maintenance
              </span>
            }
            key="maintenance"
          >
            {renderMaintenanceSettings(config.maintenance)}
          </TabPane>

          <TabPane
            tab={
              <span>
                <SafetyOutlined />
                Security
              </span>
            }
            key="security"
          >
            {renderSecuritySettings(config.security)}
          </TabPane>
        </Tabs>

        <div className={styles.buttonGroup}>
          <Button type="primary" onClick={() => handleSubmit(config)} loading={loading}>
            Save
          </Button>
          <Button onClick={() => form.resetFields()}>
            Reset
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SystemManagerConfig; 