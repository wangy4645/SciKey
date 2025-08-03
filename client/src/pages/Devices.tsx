import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tooltip,
  Badge,
  Statistic,
  Row,
  Col,
  Popconfirm,
  Typography,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ClusterOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { fetchDevices, createDevice, updateDevice, deleteDevice } from '../store/slices/deviceSlice';
import { deviceConfigAPI } from '../services/deviceConfigAPI';
import { deviceStatusService } from '../services/deviceStatusService';
import { RootState, AppDispatch } from '../store';
import styles from './Devices.module.css';
import { Device } from '../types';

const { Option } = Select;

const Devices: React.FC = () => {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [syncLoading, setSyncLoading] = useState<number | null>(null);
  const [rebootLoading, setRebootLoading] = useState<number | null>(null);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { devices, loading } = useSelector((state: RootState) => state.device);
  
  const getBoardTypeDisplayName = (type: string) => {
    switch (type) {
      case 'board_1.0':
      case 'board_1.0_star':
        return t('Board 1.0 Star');
      case 'board_1.0_mesh':
        return t('Board 1.0 Mesh');
      case 'board_2.0_star':
        return t('Board 2.0 Star');
      case 'board_2.0_mesh':
        return t('Board 2.0 Mesh');
      default:
        return type?.toUpperCase() || t('Unknown');
    }
  };

  useEffect(() => {
    dispatch(fetchDevices());
    
    // 设置自动检测设备状态的定时器（每30秒检测一次）
    deviceStatusService.startAutoCheck(30000, () => {
      // 静默更新设备列表，不显示结果模态框
      dispatch(fetchDevices());
    });
    
    return () => {
      deviceStatusService.stopAutoCheck();
    };
  }, [dispatch]);



  const handleAdd = () => {
    setEditingDevice(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    form.setFieldsValue(device);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteDevice(id));
      message.success(t('Device deleted successfully'));
      
      // Force refresh the device list to ensure UI is updated
      await dispatch(fetchDevices());
    } catch (error) {
      message.error(t('Failed to delete device'));
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingDevice && editingDevice.id) {
        await dispatch(updateDevice({ id: editingDevice.id, ...values }));
        message.success(t('Device updated successfully'));
      } else {
        const newDevice = {
          ...values,
          status: 'offline',
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await dispatch(createDevice(newDevice));
        message.success(t('Device created successfully'));
      }
      setModalVisible(false);
      dispatch(fetchDevices());
    } catch (error) {
      message.error(t('Operation failed'));
    }
  };

  const handleConfig = (id: number) => {
    if (!id) {
      message.error(t('Invalid device ID'));
      return;
    }
    navigate(`/devices/${id}/config`);
  };

  const handleSyncConfig = async (deviceId: number) => {
  
    try {
      setSyncLoading(deviceId);
      setSyncModalVisible(true);
      
      const response = await deviceConfigAPI.syncDeviceConfig(deviceId);
      
      // 后端返回的数据结构是 {message: "...", result: {...}}
      const syncData = response.data.result || response.data;
      setSyncResult(syncData);
      
      // 根据同步结果判断显示不同的消息
      const { success_count, total_commands } = syncData;
      
      if (success_count === 0) {
        // 所有命令都失败，可能是设备不可达
        message.error(t('Device is unreachable. Please check network connection and device status.'));
      } else if (success_count < total_commands) {
        // 部分成功
        message.warning(t('Device configuration partially synchronized. Some commands failed.'));
      } else {
        // 全部成功
        message.success(t('Device configuration synchronized successfully'));
      }
      
      // 刷新设备列表
      dispatch(fetchDevices());
      
      // 如果当前在设备配置页面，通过URL参数触发刷新
      if (window.location.pathname.includes(`/devices/${deviceId}/config`)) {
        // 检查当前是否在Security配置页面，如果是则不触发页面刷新
        const urlParams = new URLSearchParams(window.location.search);
        const currentTab = urlParams.get('tab');
        
        // 只有在非Security配置页面时才触发页面刷新
        if (currentTab !== 'encryption') {
          // 添加时间戳参数来触发组件重新渲染
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('refresh', Date.now().toString());
          window.history.replaceState({}, '', currentUrl.toString());
          
          // 触发一个自定义事件，通知配置组件刷新数据
          window.dispatchEvent(new CustomEvent('deviceConfigSync', { 
            detail: { deviceId, syncData } 
          }));
        }
      }
    } catch (error: any) {
      message.error(t('Failed to sync device configuration'));
      setSyncResult({ error: error.message || t('Unknown') });
    } finally {
      setSyncLoading(null);
    }
  };

  const handleSyncModalClose = () => {
    setSyncModalVisible(false);
    setSyncResult(null);
  };

  const handleReboot = async (deviceId: number) => {
    try {
      setRebootLoading(deviceId);
      
      const response = await deviceConfigAPI.rebootDevice(deviceId);
      
      message.success(t('Device reboot command sent successfully'));
      
      // 刷新设备列表
      dispatch(fetchDevices());
    } catch (error: any) {
      message.error(t('Failed to reboot device'));
    } finally {
      setRebootLoading(null);
    }
  };

  const columns = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Device, b: Device) => ((a?.name || '').toString()).localeCompare((b?.name || '').toString()),
    },
    {
      title: t('IP Address'),
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: t('Node ID'),
      dataIndex: 'node_id',
      key: 'node_id',
    },
    {
      title: t('Type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'master' ? 'blue' : 'green'}>
          {(type || '').toString().toUpperCase()}
        </Tag>
      ),
    },
    {
      title: t('Board Type'),
      dataIndex: 'board_type',
      key: 'board_type',
      render: (boardType: string) => (
        <Tag color="blue">
          {getBoardTypeDisplayName(boardType)}
        </Tag>
      ),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          online: { color: 'success', icon: <CheckCircleOutlined />, text: t('Online') },
          offline: { color: 'error', icon: <WarningOutlined />, text: t('Offline') },
          warning: { color: 'warning', icon: <WarningOutlined />, text: t('Warning') },
        };
        const { color, icon, text } = statusMap[status as keyof typeof statusMap] || statusMap['offline'];
        return (
          <Tag color={color} icon={icon}>
            {text}
          </Tag>
        );
      },
    },
    {
      title: t('Actions'),
      key: 'actions',
      render: (_: any, record: Device) => (
        <Space>
          <Tooltip title={t('Edit')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title={t('Configure')}>
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => {
                if (!record || !record.id) {
                  message.error(t('Invalid device data'));
                  return;
                }
                handleConfig(record.id);
              }}
            />
          </Tooltip>
          <Tooltip title={t('Sync Config from Board')}>
            <Button
              type="text"
              icon={<SyncOutlined />}
              loading={syncLoading === record.id}
              onClick={() => {
                if (!record || !record.id) {
                  message.error(t('Invalid device data'));
                  return;
                }
                handleSyncConfig(record.id);
              }}
            />
          </Tooltip>
          {/* 只对支持重启的板卡显示重启按钮 */}
          {(record.board_type === 'board_1.0_mesh' || record.board_type === 'board_2.0_mesh') && (
            <Popconfirm
              title={t('Reboot Device')}
              description={t('Are you sure you want to reboot this device?')}
              onConfirm={() => handleReboot(record.id)}
              okText={t('Reboot')}
              cancelText={t('Cancel')}
              okType="default"
            >
              <Tooltip title={t('Reboot Device')}>
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  loading={rebootLoading === record.id}
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
          <Popconfirm
            title={t('Delete Device')}
            description={t('This action cannot be undone.')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('Delete')}
            cancelText={t('Cancel')}
            okType="danger"
          >
            <Tooltip title={t('Delete')}>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const stats = {
    total: devices?.length || 0,
    online: devices?.filter((d: Device) => d?.status === 'online').length || 0,
    master: devices?.filter((d: Device) => d?.type === 'master').length || 0,
    slave: devices?.filter((d: Device) => d?.type === 'slave').length || 0,
  };

  return (
    <div className={styles.container}>
      <Card>
        <div className={styles.header}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              {t('Add Device')}
            </Button>
            <Button
              icon={<SyncOutlined />}
              onClick={() => dispatch(fetchDevices())}
            >
              {t('Refresh')}
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={devices || []}
          rowKey={(record) => record?.id?.toString() || ''}
          loading={loading}
          pagination={{
            total: devices?.length || 0,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* 同步配置结果模态框 */}
      <Modal
        title={<span style={{fontWeight:700,fontSize:20}}>{t('Configuration Sync Result')}</span>}
        open={syncModalVisible}
        onCancel={handleSyncModalClose}
        footer={[
          <Button key="close" onClick={handleSyncModalClose}>
            {t('Close')}
          </Button>
        ]}
        width={800}
        bodyStyle={{ background: '#f7f9fa', borderRadius: 12 }}
      >
        {syncResult && (
          <div>
            {syncResult.error ? (
              <div style={{ color: '#ff4d4f', background: '#fff1f0', borderRadius: 8, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px #ffccc7' }}>
                <h3 style={{ color: '#cf1322', fontWeight: 700, marginBottom: 8 }}>❌ {t('Sync Failed')}</h3>
                <p>{syncResult.error}</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
                  <div style={{ flex: 1, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #e6f7ff', padding: 16 }}>
                    <h4 style={{ color: '#1890ff', fontWeight: 700 }}>{t('Sync Summary')}</h4>
                    <div style={{ margin: '8px 0' }}><strong>{t('Device ID')}:</strong> <span style={{ color: '#222' }}>{syncResult.device_id}</span></div>
                    <div style={{ margin: '8px 0' }}><strong>{t('Board Type')}:</strong> <span style={{ color: '#222' }}>{getBoardTypeDisplayName(syncResult.board_type)}</span></div>
                    <div style={{ margin: '8px 0' }}><strong>{t('Total Commands')}:</strong> <span style={{ color: '#222' }}>{syncResult.total_commands}</span></div>
                    <div style={{ margin: '8px 0' }}><strong>{t('Success Count')}:</strong> <span style={{ color: syncResult.success_count === syncResult.total_commands ? '#52c41a' : syncResult.success_count === 0 ? '#ff4d4f' : '#faad14', fontWeight: 700 }}>{syncResult.success_count}</span></div>
                  </div>
                  {syncResult.success_count === 0 && (
                    <div style={{ flex: 1, background: '#fff1f0', borderRadius: 8, boxShadow: '0 2px 8px #ffccc7', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <h4 style={{ color: '#cf1322', fontWeight: 700 }}>❌ {t('Device is unreachable')}</h4>
                      <p style={{ color: '#cf1322' }}>{t('Please check network connection and device status.')}</p>
                    </div>
                  )}
                </div>
                {syncResult.success_count > 0 && (
                  <>
                    <Divider style={{ margin: '16px 0' }} />
                    <h4 style={{ color: '#1890ff', fontWeight: 700 }}>{t('Sync Results')}</h4>
                    <div style={{ maxHeight: '320px', overflow: 'auto', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                      {Object.entries(syncResult.sync_results || {}).map(([command, result]: [string, any]) => (
                        <div key={command} style={{ flex: '1 1 320px', minWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #e6f7ff', padding: 16, marginBottom: 8, border: result.success ? '1px solid #b7eb8f' : '1px solid #ffa39e' }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 18, marginRight: 8 }}>{result.success ? '✅' : '❌'}</span>
                            <span style={{ fontWeight: 600, color: result.success ? '#52c41a' : '#ff4d4f', fontSize: 16 }}>{command.replace('get_', '').replace(/_/g, ' ')}</span>
                          </div>
                          <div style={{ marginBottom: 4 }}><strong>{t('Status')}:</strong> <span style={{ color: result.success ? '#52c41a' : '#ff4d4f' }}>{result.success ? t('Success') : t('Failed')}</span></div>
                          {result.error && (
                            <div style={{ color: '#ff4d4f', marginBottom: 4 }}><strong>{t('Error')}:</strong> {result.error.includes('Device is unreachable') || result.error.includes('设备不可达') ? t('Device is unreachable') : result.error}</div>
                          )}
                          {result.config && (
                            <div style={{ marginTop: 8 }}>
                              <strong>{t('Config')}:</strong>
                              <div style={{ fontSize: '13px', background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginTop: '4px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', alignItems: 'center' }}>
                                {(() => {
                                  const config = result.config;
                                  const hiddenFields = [
                                    'raw_response', 'tdd_config', 'stored_bandwidth', 'stored_frequency', 
                                    'stored_power', 'working_type', 'access_state_enabled', 'master_ip', 
                                    'slave_ip', 'status', 'message', 'note'
                                  ];
                                  const validConfig = Object.entries(config)
                                    .filter(([key, value]) => 
                                      !hiddenFields.includes(key) && 
                                      value !== '' && 
                                      value !== null && 
                                      value !== undefined
                                    );
                                  if (validConfig.length === 0) {
                                    return <span style={{ color: '#999' }}>No valid configuration data</span>;
                                  }
                                  return validConfig.map(([key, value]) => (
                                        <React.Fragment key={key}>
                                      <span style={{ fontWeight: 600, color: '#444' }}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:</span>
                                      <span>{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                                        </React.Fragment>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={editingDevice ? t('Edit Device') : t('Add Device')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            type: 'slave',
            board_type: 'board_1.0_star'
          }}
        >
          <Form.Item
            name="name"
            label={t('Device Name')}
            rules={[{ required: true, message: t('Please input device name!') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="ip"
            label={t('IP Address')}
            rules={[
              { required: true, message: t('Please input IP address!') },
              { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: t('Invalid IP address format!') }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="node_id"
            label={t('Node ID')}
            rules={[{ required: true, message: t('Please input node ID!') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="type"
            label={t('Device Type')}
            rules={[{ required: true, message: t('Please select device type!') }]}
          >
            <Select>
              <Option value="master">{t('Master')}</Option>
              <Option value="slave">{t('Slave')}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="board_type"
            label={t('Board Type')}
            rules={[{ required: true, message: t('Please select board type!') }]}
          >
            <Select>
              <Option value="board_1.0_star">Board 1.0 Star</Option>
              <Option value="board_1.0_mesh">Board 1.0 Mesh</Option>
              <Option value="board_2.0_star">Board 2.0 Star</Option>
              <Option value="board_2.0_mesh">Board 2.0 Mesh</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingDevice ? t('Update') : t('Create')}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                {t('Cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Devices; 