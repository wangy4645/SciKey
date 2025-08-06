import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Divider, Space, Select, Modal, Tooltip, Tabs, Switch, InputNumber, Row, Col, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { Device } from '../../types';
import { SyncOutlined, ReloadOutlined, SettingOutlined, InfoCircleOutlined } from '@ant-design/icons';
import styles from './NetSettingConfig.module.css';
import NetworkStatus2Mesh from './NetworkStatus2Mesh';

import DebugConfig2Mesh from './DebugConfig2Mesh';
import SecurityConfig2Mesh from './SecurityConfig2Mesh';
import SyncButton from '../../components/SyncButton';

const { TabPane } = Tabs;
const { Option } = Select;

// IP 输入组件（复制自1.0 star NetSettingConfig.tsx）
const IPInput: React.FC<{
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}> = ({ value = '', onChange, placeholder = '192.168.1.100' }) => {
  const [ipParts, setIpParts] = React.useState(['', '', '', '']);

  React.useEffect(() => {
    if (value) {
      const parts = value.split('.');
      setIpParts([
        parts[0] || '',
        parts[1] || '',
        parts[2] || '',
        parts[3] || '',
      ]);
    }
  }, [value]);

  const handlePartChange = (index: number, partValue: string) => {
    if (partValue.includes('.') && index < 3) {
      const nextInput = document.getElementById(`ip-part-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
      return;
    }
    const numericValue = partValue.replace(/[^0-9]/g, '');
    let finalValue = numericValue;
    if (numericValue !== '') {
      const num = parseInt(numericValue, 10);
      if (num > 255) {
        finalValue = '255';
      }
    }
    const newParts = [...ipParts];
    newParts[index] = finalValue;
    setIpParts(newParts);
    if (finalValue.length === 3 && index < 3) {
      const nextInput = document.getElementById(`ip-part-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
    const fullIP = newParts.join('.');
    onChange?.(fullIP);
  };
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '.' && index < 3) {
      e.preventDefault();
      const nextInput = document.getElementById(`ip-part-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
      return;
    }
    if (e.key === 'Backspace' && ipParts[index] === '' && index > 0) {
      const prevInput = document.getElementById(`ip-part-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };
  return (
    <div className={styles.ipInputContainer}>
      <div className={styles.ipInputGroup}>
        {ipParts.map((part, index) => (
          <React.Fragment key={index}>
            <Input
              id={`ip-part-${index}`}
              className={styles.ipPartInput}
              value={part}
              onChange={(e) => handlePartChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              maxLength={3}
              placeholder={placeholder.split('.')[index] || ''}
            />
            {index < 3 && <span className={styles.ipDot}>.</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

interface Board2MeshConfigProps {
  device: Device;
  onConfigUpdate: () => void;
}

interface BasicConfigData {
  ip: string;
  password: string;
}

interface RadioConfigData {
  freq: string | number;
  bandwidth: string | number;
  power: string | number;
}





const Board2MeshConfig: React.FC<Board2MeshConfigProps> = ({ device, onConfigUpdate }) => {
  const { t } = useTranslation();
  const [selectedConfig, setSelectedConfig] = useState<string>('network_status');
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [rebooting, setRebooting] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  
  // 添加同步结果弹窗状态
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Configuration data states
  const [basicConfig, setBasicConfig] = useState<BasicConfigData>({ ip: '', password: '' });
  const [radioConfig, setRadioConfig] = useState<RadioConfigData>({ freq: '', bandwidth: '', power: '' });

  // 添加radioConfig状态的调试
  useEffect(() => {
  }, [radioConfig]);


  // 获取设备信息
  useEffect(() => {
    fetchDeviceInfo();
  }, [device.id]);

  // 添加全局的deviceConfigSync事件监听器
  useEffect(() => {
    
    const handleGlobalDeviceConfigSync = (event: CustomEvent) => {
      
      if (event.detail && event.detail.deviceId === Number(device.id)) {
        
        // 调用fetchAllConfigs来获取所有配置，包括无线电配置
        
        fetchAllConfigs();
      }
    };

    window.addEventListener('deviceConfigSync', handleGlobalDeviceConfigSync as EventListener);
    
    return () => {
      window.removeEventListener('deviceConfigSync', handleGlobalDeviceConfigSync as EventListener);
    };
  }, [device.id]);

  // 获取所有配置数据 - 页面加载时自动获取配置
  useEffect(() => {
    fetchAllConfigs();
  }, [device.id]);

  const fetchDeviceInfo = async () => {
    try {
      const [versionRes, ipRes] = await Promise.allSettled([
        deviceConfigAPI.sendATCommand(device.id, 'AT^DGMR?'),
        deviceConfigAPI.sendATCommand(device.id, 'AT^DUIP?')
      ]);
      
      // Parse version from ^DGMR response
      let version = '';
      if (versionRes.status === 'fulfilled' && versionRes.value.data?.response) {
        const versionMatch = /\^DGMR:"([^"]+)"/.exec(versionRes.value.data.response);
        if (versionMatch) {
          version = versionMatch[1];
        }
      }
      
      // Parse IP from ^DUIP response
      let ip = '';
      if (ipRes.status === 'fulfilled' && ipRes.value.data?.response) {
        const ipMatch = /\^DUIP:\s*\d+,"([^"]+)"/.exec(ipRes.value.data.response);
        if (ipMatch) {
          ip = ipMatch[1];
        }
      }
      
      setDeviceInfo({
        version: version,
        ip: ip
      });
    } catch (err) {
      // 设备信息获取失败
    }
  };

  const fetchAllConfigs = async () => {
    
    try {
      // 从数据库读取已保存的配置，而不是重新发送AT命令
      
      // 获取网络设置配置
      try {
        const netSettingResponse = await deviceConfigAPI.getNetSettingConfig(Number(device.id));
        if (netSettingResponse?.data?.config) {
          const config = netSettingResponse.data.config;
          setBasicConfig({
            ip: config.ip || '',
            password: config.password || ''
          });
        }
      } catch (error) {
      }

      // 获取无线配置（包括radio参数）
      try {
        // 不使用时间戳参数，直接获取数据
        
        const wirelessResponse = await deviceConfigAPI.getWirelessConfig(Number(device.id));
        
        if (wirelessResponse?.data?.config) {
          const config = wirelessResponse.data.config;
          
          // 设置radio配置 - 只使用radio params数据
          const frequency = config.frequency;
          const bandwidth = config.bandwidth;
          const power = config.power;
          
          if (frequency && bandwidth && power) {
            setRadioConfig({
              freq: frequency,
              bandwidth: bandwidth,
              power: power
            });
          } else {
          }
          

        } else {
        }
      } catch (error: any) {
      }

      // 获取安全配置
      try {
        const securityResponse = await deviceConfigAPI.getSecurityConfig(Number(device.id));
        if (securityResponse?.data?.config) {
          const config = securityResponse.data.config;
          // 设置安全配置
          // setEncryptionConfig({ // This state is not defined in the original file, so it's commented out
          //   algorithm: config.encryption_algorithm || ''
          // });
        }
      } catch (error) {
      }

    } catch (error) {
    }
  };

  const handleReboot = async () => {
    setRebooting(true);
    try {
      await deviceConfigAPI.rebootDevice(device.id);
      message.success(t('Device reboot command sent successfully'));
    } catch (error) {
      message.error(t('Failed to reboot device'));
    } finally {
      setRebooting(false);
    }
  };

  const handleRestoreFactory = async () => {
    try {
      await deviceConfigAPI.sendATCommand(device.id, 'AT^FACTORY');
      message.success(t('Factory reset command sent successfully'));
    } catch (error) {
      message.error(t('Failed to send factory reset command'));
    }
  };

  // 同步设备配置 - 使用简化的同步逻辑
  const handleSyncConfig = async () => {
    setSyncLoading(true);
    setSyncModalVisible(true);
    
    // 直接测试AT^DRPC?命令
    try {
      
      const testRadioRes = await deviceConfigAPI.sendATCommand(device.id, 'AT^DRPC?');
      
    } catch (error) {
    }
    
    try {
      // 包含2.0mesh所有子页面的配置类型
      const configTypes = [
        'network',      // Network Status
        'basic',        // Net Setting
        'radio',        // Wireless
        'encryption',   // Security
        'debug',        // Debug
        'system'        // System Control
      ];
      
      const results = await Promise.allSettled(
        configTypes.map(type => deviceConfigAPI.syncDeviceConfigByType(device.id, type))
      );

      // 合并所有同步结果
      let totalSuccessCount = 0;
      let totalCommandsCount = 0;
      const allSyncResults: { [key: string]: any } = {};
      let deviceId = '';
      let boardType = '';

      results.forEach((result, index) => {
        const configType = configTypes[index];
        
        if (result.status === 'fulfilled') {
          const response = result.value;
          const syncData = response.data.result || response.data;
          
          if (syncData.success_count > 0) {
            totalSuccessCount += syncData.success_count;
          }
          if (syncData.total_commands) {
            totalCommandsCount += syncData.total_commands;
          }
          
          // 合并同步结果
          if (syncData.sync_results) {
            for (const [command, result] of Object.entries(syncData.sync_results)) {
              allSyncResults[command] = result;
            }
          }
          
          // 保存设备信息
          if (syncData.device_id) deviceId = syncData.device_id;
          if (syncData.board_type) boardType = syncData.board_type;
        } else {
        }
      });

      // 设置同步结果
      setSyncResult({
        device_id: deviceId,
        board_type: boardType,
        total_commands: totalCommandsCount,
        success_count: totalSuccessCount,
        sync_results: allSyncResults
      });

      // 根据同步结果判断显示不同的消息
      if (totalSuccessCount === 0) {
        // 所有命令都失败，可能是设备不可达
        message.error(t('Device is unreachable. Please check network connection and device status.'));
      } else if (totalSuccessCount < totalCommandsCount) {
        // 部分成功
        message.warning(t('Device configuration partially synchronized. Some commands failed.'));
      } else {
        // 全部成功
        message.success(t('Device configuration synchronized successfully'));
      }

      // 刷新所有配置数据
      // 添加小延迟确保设备有足够时间处理同步请求
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        await fetchAllConfigs();
        
        // 添加额外延迟确保状态更新完成
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 重新获取最新的radioConfig状态
        
        // 强制重新获取无线配置以确保数据是最新的
        try {
          
          const forceRefreshResponse = await deviceConfigAPI.getWirelessConfig(Number(device.id));
          
          if (forceRefreshResponse?.data?.config) {
            const config = forceRefreshResponse.data.config;
            
            const frequency = config.frequency || config.stored_frequency;
            const bandwidth = config.bandwidth || config.stored_bandwidth;
            const power = config.power || config.stored_power;
            
            if (frequency && bandwidth && power) {
              setRadioConfig({
                freq: frequency,
                bandwidth: bandwidth,
                power: power
              });
            } else {
            }
          } else {
          }
        } catch (error) {
        }
      } catch (error) {
      }
      
      // 直接调用radio配置类型的同步，就像Wireless子页面一样
      try {
        
        const radioSyncResponse = await deviceConfigAPI.syncDeviceConfigByType(device.id, 'radio');
        
        // 再次调用fetchAllConfigs来确保radio配置被正确设置
        await fetchAllConfigs();
        
        // 添加额外的调试信息
        
      } catch (error) {
      }
      
      // 不再需要复杂的radio配置提取逻辑，直接依赖fetchAllConfigs
      // fetchAllConfigs会正确解析AT^DRPC?命令并设置radioConfig状态
      
      // 同步完成，等待状态更新
      
      onConfigUpdate();
    } catch (error: any) {
      message.error(t('Failed to sync device configuration'));
      setSyncResult({ error: error.message || t('Unknown error') });
    } finally {
      setSyncLoading(false);
    }
  };

  // 处理同步结果弹窗关闭
  const handleSyncModalClose = () => {
    setSyncModalVisible(false);
    setSyncResult(null);
  };

  // 获取板卡类型显示名称
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

  // 基础配置组件
  const BasicConfig: React.FC = () => {
    const [form] = Form.useForm();
    const [configLoading, setConfigLoading] = useState(false);
    const [config, setConfig] = useState<{
      currentIP: string, 
      newIP: string, 
      currentSubnetMask: string, 
      newSubnetMask: string,
      currentGateway: string,
      newGateway: string
    }>({
      currentIP: device.ip || '192.168.1.100',
      newIP: '',
      currentSubnetMask: '',
      newSubnetMask: '',
      currentGateway: '',
      newGateway: '',
    });

    // 获取网络设置配置
    useEffect(() => {
      const fetchConfig = async () => {
        try {
          const response = await deviceConfigAPI.getNetSettingConfig(Number(device.id));
          if (response && response.data && response.data.config) {
            const configData = response.data.config;
            setConfig(prev => ({
              ...prev,
              currentIP: configData.ip || device.ip || '192.168.1.100',
              currentSubnetMask: configData.subnet_mask || '',
              currentGateway: configData.gateway || '',
            }));
          } else {
            // 使用设备信息中的IP作为默认值
            setConfig(prev => ({
              ...prev,
              currentIP: device.ip || '192.168.1.100',
            }));
          }
        } catch (error) {
          // 使用设备信息中的IP作为默认值
          setConfig(prev => ({
            ...prev,
            currentIP: device.ip || '192.168.1.100',
          }));
        }
      };
      
      fetchConfig();
      
      // 移除重复的事件监听器，使用全局的监听器
      // 监听设备配置同步事件
      // const handleDeviceConfigSync = (event: CustomEvent) => {
      //   console.log('=== DEVICE CONFIG SYNC EVENT RECEIVED (BasicConfig) ===');
      //   console.log('Event detail:', event.detail);
      //   console.log('Current device ID:', device.id);
      //   console.log('Event device ID:', event.detail?.deviceId);
      //   
      //   if (event.detail && event.detail.deviceId === Number(device.id)) {
      //     console.log('=== DEVICE CONFIG SYNC EVENT MATCHED ===');
      //     console.log('Event detail:', event.detail);
      //     // 调用fetchAllConfigs来获取所有配置，包括无线电配置
      //     fetchAllConfigs();
      //   } else {
      //     console.log('=== DEVICE CONFIG SYNC EVENT NOT MATCHED ===');
      //   }
      // };
      // 
      // window.addEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
      // 
      // return () => {
      //   window.removeEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
      // };
    }, [device.id, device.ip]);

    const handleSubmit = async (values: any) => {
      setConfigLoading(true);
      try {
        let atCommand = '';
        if (values.newSubnetMask && values.newGateway) {
          // 设置IP、子网掩码和网关
          atCommand = `AT^NETIFCFG=4,"${values.newIP}","${values.newSubnetMask}","${values.newGateway}"`;
        } else if (values.newSubnetMask) {
          // 设置IP和子网掩码
          atCommand = `AT^NETIFCFG=3,"${values.newIP}","${values.newSubnetMask}"`;
        } else {
          // 只设置IP地址
          atCommand = `AT^NETIFCFG=2,"${values.newIP}"`;
        }
        
        await deviceConfigAPI.sendATCommand(device.id, atCommand);
        message.success(t('Network configuration updated successfully'));
        
        // 更新当前配置显示
        setConfig(prev => ({
          ...prev,
          currentIP: values.newIP,
          currentSubnetMask: values.newSubnetMask || '',
          currentGateway: values.newGateway || '',
          newIP: '',
          newSubnetMask: '',
          newGateway: '',
        }));
        form.resetFields();
      } catch (error) {
        message.error(t('Failed to update network configuration'));
      } finally {
        setConfigLoading(false);
      }
    };

    const handleReset = () => {
      form.resetFields();
      setConfig(prev => ({
        ...prev,
        newIP: '',
        newSubnetMask: '',
        newGateway: '',
      }));
    };

    const validateIP = (rule: any, value: string) => {
      if (!value) {
        return Promise.resolve();
      }
      
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(value)) {
        return Promise.reject(new Error(t('Please enter a valid IP address')));
      }
      
      return Promise.resolve();
    };

    return (
      <Card 
        title={t('Network Settings')}
        extra={
          <SyncButton
            deviceId={device.id}
            configType="network_settings"
            configTypeName={t('Network Settings')}
            onSyncSuccess={() => {
              // 重新获取网络设置配置
              const fetchConfig = async () => {
                try {
                  const response = await deviceConfigAPI.getNetSettingConfig(Number(device.id));
                  if (response && response.data && response.data.config) {
                    const configData = response.data.config;
                    setConfig(prev => ({
                      ...prev,
                      currentIP: configData.ip || device.ip || '192.168.1.100',
                      currentSubnetMask: configData.subnet_mask || '',
                      currentGateway: configData.gateway || '',
                    }));
                  }
                } catch (error) {
                  // 获取网络设置配置失败
                }
              };
              fetchConfig();
            }}
          />
        }
      >
        <div className={styles.warningText}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          <strong>{t('NOTE')}&nbsp;&nbsp;</strong>{t('After IP changed, you need relogin.')}
        </div>
        
        <Divider />
        
        <div className={styles.currentConfig}>
          <strong>{t('Current Network Configuration')}:</strong>
          <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>{t('IP Address')}</div>
              <div style={{ fontSize: '14px', color: '#333' }}>{config.currentIP}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>{t('Subnet Mask')}</div>
              <div style={{ fontSize: '14px', color: '#333' }}>{config.currentSubnetMask || t('Not configured')}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>{t('Gateway')}</div>
              <div style={{ fontSize: '14px', color: '#333' }}>{config.currentGateway || t('Not configured')}</div>
            </div>
          </div>
        </div>

        <Divider />

        <div className={styles.settingValue}>
          <strong>{t('New Network Configuration')}:</strong>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className={styles.form}
          >
            <Form.Item
              name="newIP"
              label={t('IP Address')}
              rules={[
                { required: true, message: t('Please enter a new IP address') },
                { validator: validateIP },
              ]}
            >
              <IPInput
                value={config.newIP}
                onChange={(value) => {
                  setConfig(prev => ({ ...prev, newIP: value }));
                  form.setFieldsValue({ newIP: value });
                }}
                placeholder="192.168.1.100"
              />
            </Form.Item>

            <Form.Item
              name="newSubnetMask"
              label={t('Subnet Mask')}
              rules={[
                { validator: validateIP },
              ]}
            >
              <IPInput
                value={config.newSubnetMask}
                onChange={(value) => {
                  setConfig(prev => ({ ...prev, newSubnetMask: value }));
                  form.setFieldsValue({ newSubnetMask: value });
                }}
                placeholder="255.255.255.0"
              />
            </Form.Item>

            <Form.Item
              name="newGateway"
              label={t('Gateway')}
              rules={[
                { validator: validateIP },
              ]}
            >
              <IPInput
                value={config.newGateway}
                onChange={(value) => {
                  setConfig(prev => ({ ...prev, newGateway: value }));
                  form.setFieldsValue({ newGateway: value });
                }}
                placeholder="192.168.1.1"
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={configLoading}>
                  {t('Save Configuration')}
                </Button>
                <Button onClick={handleReset}>
                  {t('Reset')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Card>
    );
  };

  // 无线参数配置组件
  const RadioConfig: React.FC = () => {
    const [form] = Form.useForm();
    const [configLoading, setConfigLoading] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    // 高级功能状态
    const [frequencyHopping, setFrequencyHopping] = useState({
      enabled: false,
      interval: 10
    });
    const [lockFrequency, setLockFrequency] = useState({
      enabled: false,
      pcellFreq: '',
      scellFreq: ''
    });
    const [fixedPower, setFixedPower] = useState({
      enabled: false,
      power: ''
    });

    const handleSubmit = async (values: any) => {
      setConfigLoading(true);
      try {
        // 设置无线参数
        await deviceConfigAPI.sendATCommand(device.id, `AT^DRPC=${values.freq},${values.bandwidth},"${values.power}"`);
        message.success(t('Radio configuration saved successfully'));
        await fetchAllConfigs();
        onConfigUpdate();
      } catch (error) {
        message.error(t('Failed to save radio configuration'));
      } finally {
        setConfigLoading(false);
      }
    };

    const handleSync = async () => {
      setSyncLoading(true);
      setSyncModalVisible(true);
      
      try {
        const response = await deviceConfigAPI.syncDeviceConfigByType(device.id, 'radio');
        
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
        
        // 刷新配置数据
        await fetchAllConfigs();
        
        // 如果当前在设备配置页面，通过URL参数触发刷新
        if (window.location.pathname.includes(`/devices/${device.id}/config`)) {
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
              detail: { deviceId: device.id, syncData } 
            }));
          }
        }
      } catch (error: any) {
        message.error(t('Failed to sync device configuration'));
        setSyncResult({ error: error.message || t('Unknown') });
      } finally {
        setSyncLoading(false);
      }
    };

    const getBandwidthText = (value: string | number) => {
      // 确保值是字符串类型
      const stringValue = String(value);
      const bandwidthMap: { [key: string]: string } = {
        '0': '1.4M',
        '1': '3M',
        '2': '5M',
        '3': '10M',
        '5': '20M'
      };
      return bandwidthMap[stringValue] || stringValue;
    };

    // 保存所有高级设置
    const handleSaveAdvancedSettings = async () => {
      try {
        const promises = [];
        
        // 跳频控制
        promises.push(
          deviceConfigAPI.sendATCommand(device.id, `AT^DFHC=${frequencyHopping.enabled ? 1 : 0},${frequencyHopping.interval}`)
        );
        
        // 锁频控制
        promises.push(
          deviceConfigAPI.sendATCommand(device.id, `AT^DLF=${lockFrequency.enabled ? 1 : 0},${lockFrequency.pcellFreq},${lockFrequency.scellFreq}`)
        );
        
        // 固定功率控制
        promises.push(
          deviceConfigAPI.sendATCommand(device.id, `AT^DSONSFTP=${fixedPower.enabled ? 1 : 0},"${fixedPower.power}"`)
        );
        
        await Promise.all(promises);
        message.success(t('Advanced settings saved successfully'));
      } catch (error) {
        message.error(t('Failed to save advanced settings'));
      }
    };

    return (
      <Card 
        title={t('Wireless')}
        extra={
          <Tooltip title={t('Sync Wireless Configuration')}>
            <Button
              icon={<SyncOutlined spin={syncLoading} />}
              loading={syncLoading}
              onClick={handleSync}
              size="small"
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
            >
              {t('Sync')}
            </Button>
          </Tooltip>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={t('Basic Settings')} key="basic">
            {/* Current Configuration Display */}
            <div className={styles.currentConfig}>
              <strong>{t('Current Radio Settings')}</strong>
              <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>{t('Frequency')}</div>
                  <div style={{ fontSize: '14px', color: '#333' }}>{radioConfig.freq ? String(radioConfig.freq) : t('Not configured')}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>{t('Bandwidth')}</div>
                  <div style={{ fontSize: '14px', color: '#333' }}>{radioConfig.bandwidth ? getBandwidthText(radioConfig.bandwidth) : t('Not configured')}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>{t('Power')}</div>
                  <div style={{ fontSize: '14px', color: '#333' }}>{radioConfig.power ? String(radioConfig.power) : t('Not configured')}</div>
                </div>

              </div>
            </div>

            <Divider />

            {/* New Configuration Section */}
            <div className={styles.newConfig}>
              <strong>{t('New Radio Settings')}</strong>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                name="freq"
                label={t('Frequency')}
                rules={[{ required: true, message: t('Please input frequency') }]}
              >
                <Input placeholder="24020" />
              </Form.Item>
              
              <Form.Item
                name="bandwidth"
                label={t('Bandwidth')}
                rules={[{ required: true, message: t('Please select bandwidth') }]}
              >
                <Select placeholder={t('Select bandwidth')}>
                  <Option value={0}>{t('1.4M')}</Option>
                  <Option value={1}>{t('3M')}</Option>
                  <Option value={2}>{t('5M')}</Option>
                  <Option value={3}>{t('10M')}</Option>
                  <Option value={5}>{t('20M')}</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="power"
                label={t('Power')}
                rules={[{ required: true, message: t('Please input power') }]}
              >
                <Input placeholder="27" />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={configLoading}>
                    {t('Save Configuration')}
                  </Button>
                  <Button onClick={() => form.resetFields()}>
                    {t('Reset')}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab={t('Advanced Settings')} key="advanced">
            <Row gutter={[16, 16]}>
              {/* 跳频控制卡片 */}
              <Col xs={24} md={12}>
                <Card 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{t('Frequency Hopping')}</span>
                      <Tag color={frequencyHopping.enabled ? 'green' : 'default'}>
                        {frequencyHopping.enabled ? t('Enabled') : t('Disabled')}
                      </Tag>
                    </div>
                  }
                  size="small"
                  style={{ height: '100%' }}
                >
                  <Form layout="vertical">
                    <Form.Item label={t('Enable')}>
                      <Switch
                        checked={frequencyHopping.enabled}
                        onChange={(checked: boolean) => setFrequencyHopping(prev => ({ ...prev, enabled: checked }))}
                      />
                    </Form.Item>
                    
                    <Form.Item label={t('Interval (seconds)')}>
                      <InputNumber
                        min={0}
                        max={60}
                        value={frequencyHopping.interval}
                        onChange={(value: number | null) => setFrequencyHopping(prev => ({ ...prev, interval: value || 10 }))}
                        disabled={!frequencyHopping.enabled}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Form>
                </Card>
              </Col>

              {/* 锁频控制卡片 */}
              <Col xs={24} md={12}>
                <Card 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{t('Lock Frequency')}</span>
                      <Tag color={lockFrequency.enabled ? 'green' : 'default'}>
                        {lockFrequency.enabled ? t('Enabled') : t('Disabled')}
                      </Tag>
                    </div>
                  }
                  size="small"
                  style={{ height: '100%' }}
                >
                  <Form layout="vertical">
                    <Form.Item label={t('Enable')}>
                      <Switch
                        checked={lockFrequency.enabled}
                        onChange={(checked: boolean) => setLockFrequency(prev => ({ ...prev, enabled: checked }))}
                      />
                    </Form.Item>
                    
                    <Form.Item label={t('Primary Cell Frequency')}>
                      <Input
                        placeholder="24020"
                        value={lockFrequency.pcellFreq}
                        onChange={(e) => setLockFrequency(prev => ({ ...prev, pcellFreq: e.target.value }))}
                        disabled={!lockFrequency.enabled}
                      />
                    </Form.Item>
                    
                    <Form.Item label={t('Secondary Cell Frequency')}>
                      <Input
                        placeholder="24020"
                        value={lockFrequency.scellFreq}
                        onChange={(e) => setLockFrequency(prev => ({ ...prev, scellFreq: e.target.value }))}
                        disabled={!lockFrequency.enabled}
                      />
                    </Form.Item>
                  </Form>
                </Card>
              </Col>

              {/* 固定功率控制卡片 */}
              <Col xs={24} md={12}>
                <Card 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{t('Fixed Power')}</span>
                      <Tag color={fixedPower.enabled ? 'green' : 'default'}>
                        {fixedPower.enabled ? t('Enabled') : t('Disabled')}
                      </Tag>
                    </div>
                  }
                  size="small"
                  style={{ height: '100%' }}
                >
                  <Form layout="vertical">
                    <Form.Item label={t('Enable')}>
                      <Switch
                        checked={fixedPower.enabled}
                        onChange={(checked: boolean) => setFixedPower(prev => ({ ...prev, enabled: checked }))}
                      />
                    </Form.Item>
                    
                    <Form.Item label={t('Power (dBm)')}>
                      <Input
                        placeholder="27"
                        value={fixedPower.power}
                        onChange={(e) => setFixedPower(prev => ({ ...prev, power: e.target.value }))}
                        disabled={!fixedPower.enabled}
                      />
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
            </Row>

            <Divider />

            <Form.Item>
              <Space>
                <Button type="primary" onClick={handleSaveAdvancedSettings}>
                  {t('Save Configuration')}
                </Button>
                <Button onClick={() => {
                  // 重置所有高级设置到默认值
                  setFrequencyHopping({ enabled: false, interval: 10 });
                  setLockFrequency({ enabled: false, pcellFreq: '', scellFreq: '' });
                  setFixedPower({ enabled: false, power: '' });
                }}>
                  {t('Reset')}
                </Button>
              </Space>
            </Form.Item>
          </TabPane>
        </Tabs>
      </Card>
    );
  };

  // 设备类型配置组件




  // 系统控制组件
  const SystemControl: React.FC = () => {
    const [syncLoading, setSyncLoading] = useState(false);

    const handleSync = async () => {
      setSyncLoading(true);
      try {
        // 刷新设备信息
        await fetchDeviceInfo();
        message.success(t('System information synchronized successfully'));
      } catch (error) {
        message.error(t('Failed to sync system information'));
      } finally {
        setSyncLoading(false);
      }
    };

    return (
      <Card 
        title={t('System Control')}
        extra={
          <Tooltip title={t('Sync System Information')}>
            <Button
              icon={<SyncOutlined spin={syncLoading} />}
              loading={syncLoading}
              onClick={handleSync}
              size="small"
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
            >
              {t('Sync')}
            </Button>
          </Tooltip>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div className={styles.currentKeySection}>
            <div className={styles.currentKeyLabel}>
              <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
              <span style={{ fontWeight: 600 }}>{t('Version')}:</span>
            </div>
            <div className={styles.currentKeyValue}>
              {deviceInfo.version || t('Unknown')}
            </div>
          </div>
          
          <Divider />
          
          <div>
            <h4>{t('System Operations')}</h4>
            <Space>
              <Button 
                type="primary" 
                danger 
                onClick={handleReboot}
                loading={rebooting}
              >
                {t('Reboot Device')}
              </Button>
              <Button 
                type="primary" 
                danger 
                onClick={handleRestoreFactory}
              >
                {t('Restore Factory Settings')}
              </Button>
            </Space>
          </div>
        </Space>
      </Card>
    );
  };

  return (
    <div>
      <Tabs activeKey={selectedConfig} onChange={setSelectedConfig}>
        <TabPane tab={t('Network Status')} key="network_status">
          <NetworkStatus2Mesh
            device={device}
            onSave={async (values) => {
              // Network Status不需要保存操作
            }}
            loading={false}
          />
        </TabPane>
        <TabPane tab={t('Net Setting')} key="basic">
          <BasicConfig />
        </TabPane>
        <TabPane tab={t('Wireless')} key="radio">
          <RadioConfig />
        </TabPane>

        <TabPane tab={t('Security')} key="encryption">
          <SecurityConfig2Mesh device={device} onConfigUpdate={onConfigUpdate} />
        </TabPane>
        <TabPane tab={t('Debug')} key="debug">
          <DebugConfig2Mesh
            device={device}
            onSave={async (values) => {
              // Debug配置保存逻辑已在组件内处理
            }}
            loading={false}
          />
        </TabPane>
        <TabPane tab={t('System Control')} key="system">
          <SystemControl />
        </TabPane>
      </Tabs>

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
    </div>
  );
};

export default Board2MeshConfig; 