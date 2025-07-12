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
      case 'board_6680':
        return t('Board 6680');
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
    console.log('handleDelete called with id:', id);
    try {
      console.log('Dispatching deleteDevice action...');
      await dispatch(deleteDevice(id));
      console.log('deleteDevice action completed successfully');
      message.success(t('Device deleted successfully'));
      
      // Force refresh the device list to ensure UI is updated
      console.log('Refreshing device list...');
      await dispatch(fetchDevices());
      console.log('Device list refreshed');
    } catch (error) {
      console.error('Error in handleDelete:', error);
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
    console.log('handleConfig called with id:', id);
    if (!id) {
      console.error('Invalid device ID in handleConfig');
      message.error(t('Invalid device ID'));
      return;
    }
    console.log('Navigating to device config page with id:', id);
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
        // 添加时间戳参数来触发组件重新渲染
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('refresh', Date.now().toString());
        window.history.replaceState({}, '', currentUrl.toString());
        
        // 触发一个自定义事件，通知配置组件刷新数据
        window.dispatchEvent(new CustomEvent('deviceConfigSync', { 
          detail: { deviceId, syncData } 
        }));
      }
    } catch (error: any) {
      console.error('Failed to sync device configuration:', error);
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
      console.error('Failed to reboot device:', error);
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
          {record.board_type === 'board_1.0_mesh' && (
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
        title={t('Configuration Sync Result')}
        open={syncModalVisible}
        onCancel={handleSyncModalClose}
        footer={[
          <Button key="close" onClick={handleSyncModalClose}>
            {t('Close')}
          </Button>
        ]}
        width={800}
      >
        {syncResult && (
          <div>
            {syncResult.error ? (
              <div style={{ color: 'red' }}>
                <h4>{t('Sync Failed')}:</h4>
                <p>{syncResult.error}</p>
              </div>
            ) : (
              <div>
                <h4>{t('Sync Summary')}:</h4>
                <p><strong>{t('Device ID')}:</strong> {syncResult.device_id}</p>
                <p><strong>{t('Board Type')}:</strong> {getBoardTypeDisplayName(syncResult.board_type)}</p>
                <p><strong>{t('Total Commands')}:</strong> {syncResult.total_commands}</p>
                <p><strong>{t('Success Count')}:</strong> {syncResult.success_count}</p>
                
                {/* 如果所有命令都失败，只显示设备不可达提示 */}
                {syncResult.success_count === 0 ? (
                  <div style={{ color: 'red', marginTop: '20px' }}>
                    <h4>{t('Device is unreachable')}</h4>
                    <p>{t('Please check network connection and device status.')}</p>
                  </div>
                ) : (
                  <>
                    <h4>{t('Sync Results')}:</h4>
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {Object.entries(syncResult.sync_results || {}).map(([command, result]: [string, any]) => (
                        <div key={command} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
                          <h5>{command.replace('get_', '').replace(/_/g, ' ')}</h5>
                          <p><strong>{t('Status')}:</strong> {result.success ? '✅ ' + t('Success') : '❌ ' + t('Failed')}</p>
                          {result.error && (
                            <p><strong>{t('Error')}:</strong> {
                              result.error.includes('Device is unreachable') || result.error.includes('设备不可达') 
                                ? t('Device is unreachable') 
                                : result.error
                            }</p>
                          )}
                          {result.config && (
                            <div>
                              <strong>{t('Config')}:</strong>
                              <div style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
                                {/* 过滤和优化配置显示 */}
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
                                    )
                                    .sort(([keyA], [keyB]) => {
                                      const priorityOrder = [
                                        'ip', 'device_type', 'encryption_algorithm', 'current_setting',
                                        'frequency_band', 'bandwidth', 'frequency', 'power',
                                        'frequency_hopping', 'slave_max_tx_power', 'access_state',
                                        'all_radio_param_report', 'radio_param_report', 'band_config'
                                      ];
                                      const indexA = priorityOrder.indexOf(keyA);
                                      const indexB = priorityOrder.indexOf(keyB);
                                      if (indexA === -1 && indexB === -1) return 0;
                                      if (indexA === -1) return 1;
                                      if (indexB === -1) return -1;
                                      return indexA - indexB;
                                    });

                                  if (validConfig.length === 0) {
                                    return <span style={{ color: '#999' }}>No valid configuration data</span>;
                                  }

                                  return (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', alignItems: 'center' }}>
                                      {validConfig.map(([key, value]) => (
                                        <React.Fragment key={key}>
                                          <span style={{ fontWeight: 600, color: '#444' }}>
                                            {key === 'device_type' ? 'Device Type' :
                                             key === 'encryption_algorithm' ? 'Encryption' :
                                             key === 'current_setting' ? 'TDD Setting' :
                                             key === 'frequency_band' ? 'Frequency Band' :
                                             key === 'frequency_hopping' ? 'Frequency Hopping' :
                                             key === 'slave_max_tx_power' ? 'Max TX Power' :
                                             key === 'access_state' ? 'Access State' :
                                             key === 'all_radio_param_report' ? 'Radio Report' :
                                             key === 'radio_param_report' ? 'Param Report' :
                                             key === 'band_config' ? 'Band Config' :
                                             key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:
                                          </span>
                                          <span>
                                            {key === 'encryption_algorithm' ? (
                                              <span>
                                                {value === '0' || value === 0 ? 'NONE'
                                                  : value === '1' || value === 1 ? 'SNOW3G'
                                                  : value === '2' || value === 2 ? 'AES'
                                                  : value === '3' || value === 3 ? 'ZUC'
                                                  : String(value)}
                                              </span>
                                            ) : (
                                              Array.isArray(value) ? value.join(', ') : String(value)
                                            )}
                                          </span>
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  );
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
              <Option value="board_6680">Board 6680</Option>
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