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
  TimePicker,
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
import dayjs from 'dayjs';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';

const { Option } = Select;
const { RangePicker } = TimePicker;

interface SystemManagerConfigProps {
  device: Device;
  onSave: (values: any) => void;
  loading?: boolean;
}

const SystemManagerConfig: React.FC<SystemManagerConfigProps> = ({
  device,
  onSave,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [config, setConfig] = useState<any>(null);

  const handleSubmit = async (values: any) => {
    onSave(values);
  };

  // 解析时间窗口字符串为 dayjs 对象
  const parseTimeWindow = (timeWindow: string) => {
    const [start, end] = timeWindow.split('-');
    return [dayjs(start, 'HH:mm'), dayjs(end, 'HH:mm')];
  };

  return (
    <div className={styles.container}>
      <Card
        title={t('System Manager Settings')}
        className={styles.card}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            autoUpdate: true,
            updateSchedule: 'daily',
            maintenanceWindow: parseTimeWindow('02:00-04:00'),
            backupEnabled: true,
            backupSchedule: 'weekly',
          }}
        >
          <Form.Item
            name="autoUpdate"
            label={t('Auto Update')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="updateSchedule"
            label={t('Update Schedule')}
            rules={[{ required: true, message: t('Please select update schedule') }]}
          >
            <Select>
              <Option value="daily">{t('Daily')}</Option>
              <Option value="weekly">{t('Weekly')}</Option>
              <Option value="monthly">{t('Monthly')}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="maintenanceWindow"
            label={t('Maintenance Window')}
            rules={[{ required: true, message: t('Please input maintenance window') }]}
            getValueFromEvent={(dates) => {
              if (dates && dates[0] && dates[1]) {
                return `${dates[0].format('HH:mm')}-${dates[1].format('HH:mm')}`;
              }
              return '';
            }}
          >
            <RangePicker format="HH:mm" />
          </Form.Item>

          <Form.Item
            name="backupEnabled"
            label={t('Backup Enabled')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="backupSchedule"
            label={t('Backup Schedule')}
            rules={[{ required: true, message: t('Please select backup schedule') }]}
          >
            <Select>
              <Option value="daily">{t('Daily')}</Option>
              <Option value="weekly">{t('Weekly')}</Option>
              <Option value="monthly">{t('Monthly')}</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <div className={styles.buttonGroup}>
              <Button type="primary" htmlType="submit" loading={loading}>
                {t('Save')}
              </Button>
              <Button onClick={() => form.resetFields()}>
                {t('Reset')}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SystemManagerConfig; 