import React, { useState } from 'react';
import { Button, message, Modal, Spin, Typography, Space, Tag, Divider } from 'antd';
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { deviceConfigAPI } from '../services/deviceConfigAPI';

const { Text, Title } = Typography;

interface SyncButtonProps {
  deviceId: number;
  configType: string;
  configTypeName: string;
  onSyncSuccess?: () => void;
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
}

interface SyncResult {
  device_id: number;
  board_type: string;
  config_type: string;
  sync_results: Record<string, any>;
  total_commands: number;
  success_count: number;
  config_data: Record<string, any>;
  error?: string; // Added for new rendering logic
}

const SyncButton: React.FC<SyncButtonProps> = ({
  deviceId,
  configType,
  configTypeName,
  onSyncSuccess,
  size = 'small',
  type = 'default'
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    try {
      setLoading(true);
      setModalVisible(true);
      
      const response = await deviceConfigAPI.syncDeviceConfigByType(deviceId, configType);
      const result = response.data.result || response.data;
      setSyncResult(result);
      
      // 根据同步结果显示消息
      const { success_count, total_commands } = result;
      
      if (success_count === 0) {
        // 检查是否有具体的AT命令错误信息
        const hasATCommandErrors = Object.values(result.sync_results || {}).some((cmdResult: any) => 
          cmdResult.error && cmdResult.error.includes('AT command execution failed')
        );
        
        if (hasATCommandErrors) {
          message.error(t('AT command execution failed. Please check device configuration and try again.'));
        } else {
          message.error(t('Device is unreachable. Please check network connection and device status.'));
        }
      } else if (success_count < total_commands) {
        message.warning(t('Configuration partially synchronized. Some commands failed.'));
      } else {
        message.success(t('Configuration synchronized successfully'));
        onSyncSuccess?.();
        // 自动通知子页面刷新
        window.dispatchEvent(new CustomEvent('deviceConfigSync', { detail: { deviceId } }));
      }
      
    } catch (error: any) {
      console.error('Sync error:', error);
      // 检查错误信息是否包含AT命令执行失败
      const errorMessage = error.response?.data?.error || t('Failed to sync configuration');
      if (errorMessage.includes('AT command execution failed')) {
        message.error(t('AT command execution failed. Please check device configuration and try again.'));
      } else {
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSyncResult(null);
  };

  // 渲染同步结果（详细卡片式风格）
  const renderSyncResults = () => {
    if (!syncResult) return null;
    return (
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
                <div style={{ margin: '8px 0' }}><strong>{t('Board Type')}:</strong> <span style={{ color: '#222' }}>{syncResult.board_type}</span></div>
                <div style={{ margin: '8px 0' }}><strong>{t('Total Commands')}:</strong> <span style={{ color: '#222' }}>{syncResult.total_commands}</span></div>
                <div style={{ margin: '8px 0' }}><strong>{t('Success Count')}:</strong> <span style={{ color: syncResult.success_count === syncResult.total_commands ? '#52c41a' : syncResult.success_count === 0 ? '#ff4d4f' : '#faad14', fontWeight: 700 }}>{syncResult.success_count}</span></div>
              </div>
            </div>
            {syncResult.success_count > 0 && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <h4 style={{ color: '#1890ff', fontWeight: 700 }}>{t('Sync Results')}</h4>
                <div style={{ maxHeight: '320px', overflow: 'auto', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {Object.entries(syncResult.sync_results || {})
                    .filter(([command]) => command.startsWith('get_') && command !== 'get_radio_params_store' && command !== 'get_accessible_nodes')
                    .map(([command, result]: [string, any]) => (
                      <div key={command} style={{ flex: '1 1 320px', minWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #e6f7ff', padding: 16, marginBottom: 8, border: result.success ? '1px solid #b7eb8f' : '1px solid #ffa39e' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 18, marginRight: 8 }}>{result.success ? '✅' : '❌'}</span>
                          <span style={{ fontWeight: 600, color: result.success ? '#52c41a' : '#ff4d4f', fontSize: 16 }}>{command.replace('get_', '').replace(/_/g, ' ')}</span>
                        </div>
                        <div style={{ marginBottom: 4 }}><strong>{t('Status')}:</strong> <span style={{ color: result.success ? '#52c41a' : '#ff4d4f' }}>{result.success ? t('Success') : t('Failed')}</span></div>
                        {result.error && (
                          <div style={{ color: '#ff4d4f', marginBottom: 4 }}><strong>{t('Error')}:</strong> {result.error}</div>
                        )}
                        {result.config && (
                          <div style={{ marginTop: 8 }}>
                            <strong>{t('Config')}:</strong>
                            <div style={{ fontSize: '13px', background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginTop: '4px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', alignItems: 'center' }}>
                              {Object.entries(result.config)
                                .filter(([key, value]) =>
                                  !['raw_response', 'tdd_config', 'stored_bandwidth', 'stored_frequency', 'stored_power', 'working_type', 'access_state_enabled', 'master_ip', 'slave_ip', 'status', 'message', 'note'].includes(key) &&
                                  value !== '' && value !== null && value !== undefined &&
                                  !(Array.isArray(value) && value.length === 0)
                                )
                                .map(([key, value]) => (
                                  <React.Fragment key={key}>
                                    <span style={{ fontWeight: 600, color: '#444' }}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:</span>
                                    <span>{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                                  </React.Fragment>
                                ))}
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
    );
  };

  return (
    <>
      <Button
        icon={<SyncOutlined spin={loading} />}
        onClick={handleSync}
        loading={loading}
        size={size}
        type="primary"
        style={{
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          border: 'none',
          boxShadow: '0 2px 4px rgba(24, 144, 255, 0.3)',
          borderRadius: '6px',
          fontWeight: 500,
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(24, 144, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(24, 144, 255, 0.3)';
        }}
        title={t('Sync {{configType}} configuration from device', { configType: configTypeName })}
      >
        {t('Sync')}
      </Button>

      <Modal
        title={t('Sync {{configType}} Configuration', { configType: configTypeName })}
        open={modalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button key="close" onClick={handleModalClose}>
            {t('Close')}
          </Button>
        ]}
        width={600}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>{t('Synchronizing configuration from device...')}</Text>
            </div>
          </div>
        ) : (
          renderSyncResults()
        )}
      </Modal>
    </>
  );
};

export default SyncButton; 