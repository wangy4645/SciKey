import React, { useState } from 'react';
import { Button, message, Modal, Spin, Typography, Space, Tag } from 'antd';
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
        message.error(t('Device is unreachable. Please check network connection and device status.'));
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
      message.error(error.response?.data?.error || t('Failed to sync configuration'));
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSyncResult(null);
  };

  const renderSyncResults = () => {
    if (!syncResult) return null;

    const { sync_results, total_commands, success_count, config_data } = syncResult;

    // 只显示有有效关键信息时的Key Configuration
    const keyConfigEntries = Object.entries(config_data)
      .filter(([key, value]) => {
        // 隐藏无用的字段
        const hiddenFields = [
          'raw_response',           // 原始响应，对用户无意义
          'tdd_config',            // 与current_setting重复
          'stored_bandwidth',       // 与bandwidth重复
          'stored_frequency',       // 与frequency重复  
          'stored_power',          // 与power重复
          'working_type',          // 与device_type重复
          'access_state_enabled',  // 与access_state重复
          'master_ip',             // 与ip重复
          'slave_ip',              // 通常为空
          'status',                // 执行状态，对用户无意义
          'message',               // 执行消息，对用户无意义
          'note'                   // 说明信息，对用户无意义
        ];
        
        return !hiddenFields.includes(key) && 
               value !== '' && 
               value !== null && 
               value !== undefined;
      })
      // 按重要性排序
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

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong>{t('Summary')}:</Text>
              <Space style={{ marginLeft: 8 }}>
                <Tag color="blue">{t('Total Commands')}: {total_commands}</Tag>
                <Tag color="green">{t('Success')}: {success_count}</Tag>
                <Tag color="red">{t('Failed')}: {total_commands - success_count}</Tag>
              </Space>
            </div>
            <div>
              <Text strong>{t('Success Rate')}:</Text>
              <Text style={{ marginLeft: 8 }}>
                {total_commands > 0 ? Math.round((success_count / total_commands) * 100) : 0}%
              </Text>
            </div>
          </Space>
        </div>

        {/* 只显示有有效关键信息时的Key Configuration */}
        {keyConfigEntries.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15 }}>{t('Key Configuration')}:</Text>
            <div style={{
              maxHeight: 220,
              overflowY: 'auto',
              marginTop: 8,
              padding: 12,
              background: '#f8fafc',
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              border: '1px solid #e6e6e6',
            }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <tbody>
                  {/* 优先显示 Network Role */}
                  {(() => {
                    const val = config_data.device_type;
                    console.log('DEBUG Network Role:', val, typeof val);
                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                      const strVal = String(val).trim();
                      let role = 'Unknown';
                      if (strVal === '0') role = 'Auto Mode';
                      else if (strVal === '1') role = 'Master Node';
                      else if (strVal === '2') role = 'Slave Node';
                      else role = strVal;
                      return (
                        <tr>
                          <td style={{
                            fontWeight: 600,
                            color: '#444',
                            textAlign: 'right',
                            padding: '4px 12px 4px 0',
                            width: 160,
                            whiteSpace: 'nowrap',
                          }}>{t('Network Role')}:</td>
                          <td style={{
                            textAlign: 'left',
                            padding: '4px 0',
                            wordBreak: 'break-all',
                          }}>{role}</td>
                        </tr>
                      );
                    }
                    return null;
                  })()}
                  {/* 其它配置项 */}
                  {keyConfigEntries.map(([key, value]) => {
                    if (key === 'device_type') return null; // 跳过已显示的 Network Role
                    const isTddConfig = key === 'current_setting' && ['2D3U','3D2U','4D1U','1D4U'].includes(String(value).trim().toUpperCase());
                    return isTddConfig ? (
                      <tr key={key}>
                        <td style={{
                          fontWeight: 600,
                          color: '#444',
                          textAlign: 'right',
                          padding: '4px 12px 4px 0',
                          width: 160,
                          whiteSpace: 'nowrap',
                        }}>{t('TDD Config')}:</td>
                        <td style={{
                          textAlign: 'left',
                          padding: '4px 0',
                          wordBreak: 'break-all',
                        }}>{String(value).trim()}</td>
                      </tr>
                    ) : (
                      <tr key={key}>
                        <td style={{
                          fontWeight: 600,
                          color: '#444',
                          textAlign: 'right',
                          padding: '4px 12px 4px 0',
                          width: 160,
                          whiteSpace: 'nowrap',
                        }}>
                          {/* 字段名称友好化显示 */}
                          {key === 'encryption_algorithm' ? t('Encryption') :
                           key === 'frequency_band' ? t('Frequency Band') :
                           key === 'frequency_hopping' ? t('Frequency Hopping') :
                           key === 'slave_max_tx_power' ? t('Max TX Power') :
                           key === 'access_state' ? t('Access State') :
                           key === 'all_radio_param_report' ? t('Radio Report') :
                           key === 'radio_param_report' ? t('Param Report') :
                           key === 'band_config' ? t('Band Config') :
                           key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:
                        </td>
                        <td style={{
                          textAlign: 'left',
                          padding: '4px 0',
                          wordBreak: 'break-all',
                        }}>
                          {key === 'encryption_algorithm' ? (
                            <span>
                              {value === '0' || value === 0 ? t('NONE')
                                : value === '1' || value === 1 ? t('SNOW3G')
                                : value === '2' || value === 2 ? t('AES')
                                : value === '3' || value === 3 ? t('ZUC')
                                : String(value)}
                            </span>
                          ) : (
                            String(value)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 简化的命令结果 */}
        <div>
          <Text strong>{t('Command Status')}:</Text>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
            {Object.entries(sync_results).map(([commandName, result]: [string, any]) => (
              <div key={commandName} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: 4,
                padding: 4,
                backgroundColor: result.success ? '#f6ffed' : '#fff2f0',
                borderRadius: 4
              }}>
                {result.success ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                )}
                <Text style={{ flex: 1, fontSize: 12 }}>
                  {commandName === 'get_tdd_config' && result.config && result.config.current_setting ? (
                    `Tdd config: ${String(result.config.current_setting).trim()}`
                  ) : (
                    commandName.replace('get_', '').replace(/_/g, ' ')
                  )}
                </Text>
                <Tag color={result.success ? 'green' : 'red'}>
                  {result.success ? t('Success') : t('Failed')}
                </Tag>
              </div>
            ))}
          </div>
        </div>
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