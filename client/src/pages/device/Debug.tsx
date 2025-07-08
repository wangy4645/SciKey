import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  Tabs,
  Table,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Progress,
  Row,
  Col,
  Statistic,
  Alert,
  Timeline,
  Modal,
  Form,
  message,
} from 'antd';
import {
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
  BugOutlined,
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import styles from './Debug.module.css';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
}

interface SystemStatus {
  cpu: {
    usage: number;
    temperature: number;
    load: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
  };
  network: {
    interfaces: Array<{
      name: string;
      status: 'up' | 'down';
      rx_bytes: number;
      tx_bytes: number;
      rx_errors: number;
      tx_errors: number;
    }>;
  };
}

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
}

interface DiagnosticResult {
  id: string;
  timestamp: string;
  type: 'system' | 'network' | 'security';
  status: 'success' | 'warning' | 'error';
  message: string;
  details: string;
}

const Debug: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    cpu: {
      usage: 45,
      temperature: 65,
      load: [1.2, 1.5, 1.8],
    },
    memory: {
      total: 8192,
      used: 4096,
      free: 4096,
    },
    disk: {
      total: 102400,
      used: 51200,
      free: 51200,
    },
    network: {
      interfaces: [
        {
          name: 'eth0',
          status: 'up',
          rx_bytes: 1024000,
          tx_bytes: 512000,
          rx_errors: 0,
          tx_errors: 0,
        },
        {
          name: 'wlan0',
          status: 'up',
          rx_bytes: 512000,
          tx_bytes: 256000,
          rx_errors: 2,
          tx_errors: 1,
        },
      ],
    },
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([
    {
      id: '1',
      name: 'CPU Usage',
      value: 45,
      unit: '%',
      threshold: 80,
      status: 'normal',
    },
    {
      id: '2',
      name: 'Memory Usage',
      value: 50,
      unit: '%',
      threshold: 85,
      status: 'normal',
    },
    {
      id: '3',
      name: 'Disk Usage',
      value: 50,
      unit: '%',
      threshold: 90,
      status: 'normal',
    },
    {
      id: '4',
      name: 'Network Latency',
      value: 35,
      unit: 'ms',
      threshold: 100,
      status: 'normal',
    },
  ]);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([
    {
      id: '1',
      timestamp: '2024-02-20 10:00:00',
      type: 'system',
      status: 'success',
      message: 'System check completed successfully',
      details: 'All system components are functioning normally',
    },
    {
      id: '2',
      timestamp: '2024-02-20 09:30:00',
      type: 'network',
      status: 'warning',
      message: 'Network interface wlan0 has errors',
      details: '2 receive errors and 1 transmit error detected',
    },
  ]);
  const [isDiagnosticModalVisible, setIsDiagnosticModalVisible] = useState(false);
  const [diagnosticForm] = Form.useForm();

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'debug':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleRefresh = () => {
    // TODO: 刷新数据
    message.success('Data refreshed successfully');
  };

  const handleDownloadLogs = () => {
    // TODO: 下载日志
    message.success('Logs downloaded successfully');
  };

  const handleRunDiagnostic = (values: any) => {
    // TODO: 运行诊断
    setIsDiagnosticModalVisible(false);
    message.success('Diagnostic started successfully');
  };

  const renderLogs = () => (
    <Card className={styles.card}>
      <div className={styles.toolbar}>
        <Space>
          <Input
            placeholder="Search logs..."
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
          />
          <Select defaultValue="all" style={{ width: 120 }}>
            <Option value="all">All Levels</Option>
            <Option value="error">Error</Option>
            <Option value="warning">Warning</Option>
            <Option value="info">Info</Option>
            <Option value="debug">Debug</Option>
          </Select>
          <RangePicker showTime />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadLogs}>
            Download
          </Button>
        </Space>
      </div>

      <Table
        dataSource={logs}
        columns={[
          {
            title: 'Timestamp',
            dataIndex: 'timestamp',
            width: 180,
          },
          {
            title: 'Level',
            dataIndex: 'level',
            width: 100,
            render: (level) => (
              <Tag color={getLogLevelColor(level)}>
                {level.toUpperCase()}
              </Tag>
            ),
          },
          {
            title: 'Source',
            dataIndex: 'source',
            width: 150,
          },
          {
            title: 'Message',
            dataIndex: 'message',
          },
        ]}
        scroll={{ y: 400 }}
      />
    </Card>
  );

  const renderSystemStatus = () => (
    <Card className={styles.card}>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic
              title="CPU Usage"
              value={systemStatus.cpu.usage}
              suffix="%"
              valueStyle={{
                color: systemStatus.cpu.usage > 80 ? '#cf1322' : '#3f8600',
              }}
            />
            <Progress
              percent={systemStatus.cpu.usage}
              status={systemStatus.cpu.usage > 80 ? 'exception' : 'active'}
            />
            <div className={styles.metricDetail}>
              <span>Temperature: {systemStatus.cpu.temperature}°C</span>
              <span>Load: {systemStatus.cpu.load.join(', ')}</span>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Memory Usage"
              value={Math.round((systemStatus.memory.used / systemStatus.memory.total) * 100)}
              suffix="%"
              valueStyle={{
                color: (systemStatus.memory.used / systemStatus.memory.total) * 100 > 85 ? '#cf1322' : '#3f8600',
              }}
            />
            <Progress
              percent={Math.round((systemStatus.memory.used / systemStatus.memory.total) * 100)}
              status={(systemStatus.memory.used / systemStatus.memory.total) * 100 > 85 ? 'exception' : 'active'}
            />
            <div className={styles.metricDetail}>
              <span>Used: {systemStatus.memory.used}MB</span>
              <span>Free: {systemStatus.memory.free}MB</span>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Disk Usage"
              value={Math.round((systemStatus.disk.used / systemStatus.disk.total) * 100)}
              suffix="%"
              valueStyle={{
                color: (systemStatus.disk.used / systemStatus.disk.total) * 100 > 90 ? '#cf1322' : '#3f8600',
              }}
            />
            <Progress
              percent={Math.round((systemStatus.disk.used / systemStatus.disk.total) * 100)}
              status={(systemStatus.disk.used / systemStatus.disk.total) * 100 > 90 ? 'exception' : 'active'}
            />
            <div className={styles.metricDetail}>
              <span>Used: {systemStatus.disk.used}MB</span>
              <span>Free: {systemStatus.disk.free}MB</span>
            </div>
          </Card>
        </Col>
      </Row>

      <div className={styles.networkStatus}>
        <h3>Network Interfaces</h3>
        <Table
          dataSource={systemStatus.network.interfaces}
          columns={[
            {
              title: 'Interface',
              dataIndex: 'name',
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (status) => (
                <Tag color={status === 'up' ? 'success' : 'error'}>
                  {status.toUpperCase()}
                </Tag>
              ),
            },
            {
              title: 'RX Bytes',
              dataIndex: 'rx_bytes',
              render: (value) => `${(value / 1024 / 1024).toFixed(2)} MB`,
            },
            {
              title: 'TX Bytes',
              dataIndex: 'tx_bytes',
              render: (value) => `${(value / 1024 / 1024).toFixed(2)} MB`,
            },
            {
              title: 'Errors',
              render: (_, record) => (
                <span>
                  RX: {record.rx_errors} / TX: {record.tx_errors}
                </span>
              ),
            },
          ]}
        />
      </div>
    </Card>
  );

  const renderPerformance = () => (
    <Card className={styles.card}>
      <Row gutter={[16, 16]}>
        {performanceMetrics.map((metric) => (
          <Col span={12} key={metric.id}>
            <Card>
              <Statistic
                title={metric.name}
                value={metric.value}
                suffix={metric.unit}
                valueStyle={{
                  color: metric.status === 'critical' ? '#cf1322' : metric.status === 'warning' ? '#faad14' : '#3f8600',
                }}
              />
              <Progress
                percent={metric.value}
                status={metric.status === 'critical' ? 'exception' : metric.status === 'warning' ? 'normal' : 'active'}
              />
              <div className={styles.metricDetail}>
                <span>Threshold: {metric.threshold}{metric.unit}</span>
                <Tag color={getStatusColor(metric.status)}>
                  {metric.status.toUpperCase()}
                </Tag>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );

  const renderDiagnostics = () => (
    <Card className={styles.card}>
      <div className={styles.toolbar}>
        <Button
          type="primary"
          icon={<BugOutlined />}
          onClick={() => setIsDiagnosticModalVisible(true)}
        >
          Run Diagnostic
        </Button>
      </div>

      <Timeline>
        {diagnosticResults.map((result) => (
          <Timeline.Item
            key={result.id}
            color={
              result.status === 'success'
                ? 'green'
                : result.status === 'warning'
                ? 'orange'
                : 'red'
            }
          >
            <div className={styles.diagnosticItem}>
              <div className={styles.diagnosticHeader}>
                <span className={styles.timestamp}>{result.timestamp}</span>
                <Tag color={getStatusColor(result.status)}>
                  {result.status.toUpperCase()}
                </Tag>
              </div>
              <div className={styles.diagnosticContent}>
                <h4>{result.message}</h4>
                <p>{result.details}</p>
              </div>
            </div>
          </Timeline.Item>
        ))}
      </Timeline>

      <Modal
        title="Run Diagnostic"
        open={isDiagnosticModalVisible}
        onCancel={() => setIsDiagnosticModalVisible(false)}
        footer={null}
      >
        <Form form={diagnosticForm} onFinish={handleRunDiagnostic}>
          <Form.Item
            name="type"
            label="Diagnostic Type"
            rules={[{ required: true, message: 'Please select diagnostic type' }]}
          >
            <Select>
              <Option value="system">System</Option>
              <Option value="network">Network</Option>
              <Option value="security">Security</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Start Diagnostic
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );

  return (
    <div className={styles.container}>
      <Tabs defaultActiveKey="logs">
        <TabPane
          tab={
            <span>
              <FileTextOutlined />
              Logs
            </span>
          }
          key="logs"
        >
          {renderLogs()}
        </TabPane>
        <TabPane
          tab={
            <span>
              <DashboardOutlined />
              System Status
            </span>
          }
          key="status"
        >
          {renderSystemStatus()}
        </TabPane>
        <TabPane
          tab={
            <span>
              <SettingOutlined />
              Performance
            </span>
          }
          key="performance"
        >
          {renderPerformance()}
        </TabPane>
        <TabPane
          tab={
            <span>
              <BugOutlined />
              Diagnostics
            </span>
          }
          key="diagnostics"
        >
          {renderDiagnostics()}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Debug; 