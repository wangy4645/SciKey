import React, { useState, useEffect } from 'react';
import type { Device } from '../../types';
import {
  Card,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Row,
  Col,
  Divider,
  message,
  Tabs,
  Checkbox,
  Space,
  Alert,
} from 'antd';
import {
  WifiOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  RadarChartOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import styles from './WirelessConfig.module.css';
import { deviceConfigAPI } from '../../services/deviceConfigAPI';
import { useTranslation } from 'react-i18next';
import SyncButton from '../../components/SyncButton';

const { TabPane } = Tabs;
const { Option } = Select;

interface WirelessConfigProps {
  device: Device;
  onSave?: (values: any) => Promise<void>;
  loading: boolean;
}

interface WirelessConfig {
  frequencyBand: string[];
  bandwidth: string;
  buildingChain: string;
  frequencyHopping: boolean;
}

const WirelessConfig: React.FC<WirelessConfigProps> = ({ device, onSave, loading }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [config, setConfig] = useState<WirelessConfig>({
    frequencyBand: [],
    bandwidth: '1.4M',
    buildingChain: '',
    frequencyHopping: false,
  });

  // 添加当前设备配置状态
  const [currentFrequencyBand, setCurrentFrequencyBand] = useState<string[]>([]);
  const [currentBandwidth, setCurrentBandwidth] = useState<string>('1.4M');
  const [currentBuildingChain, setCurrentBuildingChain] = useState<string>('');
  const [currentFrequencyHopping, setCurrentFrequencyHopping] = useState<boolean>(false);

  // 获取当前配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        console.log('Fetching wireless config for device:', device.id);
        const response = await deviceConfigAPI.getWirelessConfig(Number(device.id));
        console.log('Wireless config response:', response);
        
        if (response && response.data && response.data.config) {
          const configData = response.data.config;
          console.log('Wireless config data:', configData);
          
          // 检查是否是执行状态响应（没有具体配置数据）
          if (configData.status === 'command_executed' && configData.note) {
            console.log('Device returned execution status only:', configData.note);
            // 显示提示信息
            message.info('Device command executed successfully, but no configuration data was returned. This may indicate that the device does not support this command or requires additional setup.');
            return;
          }
          
          // 映射同步的配置字段到前端显示字段
          // 从同步的配置中提取值
          const frequency = configData.frequency || configData.stored_frequency;
          const bandwidth = configData.bandwidth || configData.stored_bandwidth;
          const power = configData.power || configData.stored_power;
          const frequencyHopping = configData.frequency_hopping === 'true' || configData.frequency_hopping === '1';
          
          // 优先使用同步的频段配置，如果没有则根据频率值推断
          let frequencyBand: string[] = [];
          if (configData.frequency_band && Array.isArray(configData.frequency_band)) {
            // 使用同步的频段配置
            frequencyBand = configData.frequency_band;
            console.log('Using synced frequency_band:', frequencyBand);
          } else if (frequency) {
            // 根据频率值推断频段（备用逻辑）
            const freqNum = parseInt(frequency);
            if (freqNum >= 8060 && freqNum <= 9600) {
              frequencyBand = ['800M'];
            } else if (freqNum >= 14400 && freqNum <= 15000) {
              frequencyBand = ['1.4G'];
            } else if (freqNum >= 24000 && freqNum <= 24814) {
              frequencyBand = ['2.4G'];
            }
            console.log('Inferred frequency_band from frequency:', frequencyBand);
          }
          
          // 根据带宽值确定带宽显示
          let bandwidthDisplay = '1.4M';
          if (bandwidth) {
            const bwNum = parseInt(bandwidth);
            switch (bwNum) {
              case 0: bandwidthDisplay = '1.4M'; break;
              case 1: bandwidthDisplay = '3M'; break;
              case 2: bandwidthDisplay = '5M'; break;
              case 3: bandwidthDisplay = '10M'; break;
              case 5: bandwidthDisplay = '20M'; break;
              default: bandwidthDisplay = '1.4M';
            }
          }
          
          // 设置当前设备配置（用于显示Now Configuration）
          setCurrentFrequencyBand(frequencyBand);
          setCurrentBandwidth(bandwidthDisplay);
          setCurrentBuildingChain(configData.building_chain || '');
          setCurrentFrequencyHopping(frequencyHopping);
          
          // 设置表单配置（同步当前设备状态）
          setConfig({
            frequencyBand: [], // 保持为空，不显示勾选状态
            bandwidth: '1.4M', // 保持默认值，不显示当前配置
            buildingChain: '', // 保持为空，不显示当前配置
            frequencyHopping: frequencyHopping, // 同步当前频跳状态
          });
          
          console.log('Set wireless config:', {
            currentFrequencyBand: frequencyBand,
            currentBandwidth: configData.bandwidth || '1.4M',
            currentBuildingChain: configData.building_chain || '',
            currentFrequencyHopping: configData.frequency_hopping || false,
            configFrequencyBand: [], // Setting Value保持为空
            rawFrequencyHopping: configData.frequency_hopping,
            parsedFrequencyHopping: frequencyHopping,
          });
        } else {
          console.log('No wireless config data found, using defaults');
        }
      } catch (error) {
        console.error('Failed to fetch wireless config:', error);
      }
    };
    
    fetchConfig();
    
    // 监听设备配置同步事件
    const handleDeviceConfigSync = (event: CustomEvent) => {
      if (event.detail && event.detail.deviceId === Number(device.id)) {
        console.log('Wireless config: Received sync event, refreshing data...');
        fetchConfig();
      }
    };
    
    window.addEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    
    return () => {
      window.removeEventListener('deviceConfigSync', handleDeviceConfigSync as EventListener);
    };
  }, [device.id]);

  // Frequency Band 子页面
  const renderFrequencyBand = () => (
    <Card title={t('Frequency Band Management')} className={styles.card}>
      <div className={styles.warningText}>
        <strong>{t('NOTE')}:&nbsp;&nbsp;</strong>{t('Please restart device when setup is completed')}
      </div>
      
      <Divider />
      
      <div className={styles.currentConfig}>
        <strong>{t('Now Configuration')}:</strong>
        <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          {Array.isArray(currentFrequencyBand) && currentFrequencyBand.length > 0 
            ? currentFrequencyBand.join(', ') 
            : 'No bands selected'}
        </div>
      </div>

      <Divider />

      <div className={styles.settingValue}>
        <strong>{t('Setting Value')}:</strong>
        <Form.Item style={{ marginTop: 16 }}>
          <Checkbox.Group
            value={config.frequencyBand}
            onChange={(checkedValues) => {
              setConfig({
                ...config,
                frequencyBand: checkedValues as string[],
              });
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Checkbox value="800M">800M Hz {t('Band')}</Checkbox>
              <Checkbox value="1.4G">1.4G Hz {t('Band')}</Checkbox>
              <Checkbox value="2.4G">2.4G Hz {t('Band')}</Checkbox>
            </Space>
          </Checkbox.Group>
        </Form.Item>
      </div>

      <div className={styles.buttonGroup}>
        <Button 
          type="primary" 
          onClick={async () => {
            try {
              await deviceConfigAPI.setFrequencyBand(Number(device.id), config.frequencyBand);
              // 保存成功后更新当前配置状态
              setCurrentFrequencyBand(config.frequencyBand);
              message.success('Frequency band configuration saved successfully');
            } catch (error) {
              message.error('Failed to save frequency band configuration');
            }
          }}
          loading={loading}
        >
          {t('Save')}
        </Button>
        <Button 
          onClick={() => {
            setConfig({ ...config, frequencyBand: [] });
            message.info('Reset to default values');
          }}
        >
          {t('Reset')}
        </Button>
      </div>
    </Card>
  );

  // Band Width 子页面
  const renderBandWidth = () => (
    <Card title={t('Bandwidth Setting')} className={styles.card}>
      <div style={{ marginBottom: 16 }}>
        <strong>{t('Now Configuration')}:</strong>
        <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          {currentBandwidth}
        </div>
      </div>

      <Divider />

      <div className={styles.settingValue}>
        <strong>{t('Set Bandwidth')}:</strong>
        <Form.Item style={{ marginTop: 16 }}>
          <Select
            value={config.bandwidth}
            onChange={(value) => {
              setConfig({
                ...config,
                bandwidth: value,
              });
            }}
            style={{ width: '100%' }}
          >
            <Option value="1.4M">1.4M</Option>
            <Option value="3M">3M</Option>
            <Option value="5M">5M</Option>
            <Option value="10M">10M</Option>
            <Option value="20M">20M</Option>
          </Select>
        </Form.Item>
      </div>

      <div className={styles.buttonGroup}>
        <Button 
          type="primary" 
          onClick={async () => {
            try {
              await deviceConfigAPI.setBandwidth(Number(device.id), config.bandwidth);
              // 保存成功后更新当前配置状态
              setCurrentBandwidth(config.bandwidth);
              message.success('Bandwidth setting saved successfully');
            } catch (error) {
              message.error('Failed to save bandwidth setting');
            }
          }}
          loading={loading}
        >
          {t('Save')}
        </Button>
        <Button 
          onClick={() => {
            setConfig({ ...config, bandwidth: '1.4M' });
            message.info('Reset to default value');
          }}
        >
          {t('Reset')}
        </Button>
      </div>
    </Card>
  );

  // Building Chain 子页面
  const renderBuildingChain = () => (
    <Card title={t('Building Chain Setting')} className={styles.card}>
      <div className={styles.currentConfig}>
        <strong>{t('Now Configuration')}:</strong>
        <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          {currentBuildingChain || 'Not set'}
        </div>
      </div>

      <Divider />

      <div className={styles.settingValue}>
        <strong>{t('Frequency Point Setting')}:</strong>
        <Form.Item style={{ marginTop: 16 }}>
          <Input
            value={config.buildingChain}
            onChange={(e) => {
              setConfig({
                ...config,
                buildingChain: e.target.value,
              });
            }}
            placeholder="Please enter the correct value 24015-24814,8060-8259,14279-14478"
          />
        </Form.Item>
        <Alert
          message="Please enter the correct value 24015-24814,8060-8259,14279-14478"
          type="info"
          showIcon
          style={{ marginTop: 8 }}
        />
      </div>

      <div className={styles.buttonGroup}>
        <Button 
          type="primary" 
          onClick={async () => {
            // 验证输入
            if (!config.buildingChain || config.buildingChain.trim() === '') {
              message.error('Please enter frequency point range');
              return;
            }
            
            // 验证格式
            const ranges = config.buildingChain.split(',');
            for (const range of ranges) {
              const trimmedRange = range.trim();
              if (trimmedRange === '') continue;
              
              const parts = trimmedRange.split('-');
              if (parts.length !== 2) {
                message.error('Invalid format. Expected: start-end,start-end,...');
                return;
              }
              
              const start = parseInt(parts[0].trim());
              const end = parseInt(parts[1].trim());
              if (isNaN(start) || isNaN(end)) {
                message.error('Invalid frequency values. Please enter numbers only.');
                return;
              }
            }
            
            try {
              await deviceConfigAPI.setBuildingChain(Number(device.id), config.buildingChain);
              // 保存成功后更新当前配置状态
              setCurrentBuildingChain(config.buildingChain);
              message.success('Building chain setting saved successfully');
            } catch (error) {
              message.error('Failed to save building chain setting');
            }
          }}
          loading={loading}
        >
          {t('Save')}
        </Button>
        <Button 
          onClick={() => {
            setConfig({ ...config, buildingChain: '' });
            message.info('Reset to empty value');
          }}
        >
          {t('Reset')}
        </Button>
      </div>
    </Card>
  );

  // Frequency Hopping 子页面
  const renderFrequencyHopping = () => (
    <Card title={t('Frequency Hopping')} className={styles.card}>
      <div className={styles.currentConfig}>
        <strong>{t('Now Configuration')}:</strong>
        <div className={styles.statusDisplay}>
          <div className={`${styles.statusIndicator} ${currentFrequencyHopping ? styles.statusActive : styles.statusInactive}`}>
            <div className={styles.statusDot}></div>
            <span className={styles.statusText}>
              {currentFrequencyHopping ? 'Open' : 'Close'}
            </span>
          </div>
        </div>
      </div>

      <Divider />

      <div className={styles.hoppingControls}>
        <div className={styles.controlDescription}>
          <strong>{t('Frequency Hopping Control')}:</strong>
          <p>{t('Click the button below to enable or disable frequency hopping functionality.')}</p>
        </div>
        
        <div className={styles.hoppingButtons}>
          <Button 
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            className={`${styles.hoppingButton} ${styles.openButton} ${config.frequencyHopping ? styles.activeButton : ''}`}
            onClick={async () => {
              try {
                await deviceConfigAPI.setFrequencyHopping(Number(device.id), true);
                setConfig({ ...config, frequencyHopping: true });
                // 保存成功后更新当前配置状态
                setCurrentFrequencyHopping(true);
                message.success('Frequency hopping opened successfully');
              } catch (error) {
                message.error('Failed to open frequency hopping');
              }
            }}
            loading={loading}
            disabled={config.frequencyHopping}
          >
            {t('Open')}
          </Button>
          
          <Button 
            size="large"
            icon={<PauseCircleOutlined />}
            className={`${styles.hoppingButton} ${styles.closeButton} ${!config.frequencyHopping ? styles.activeButton : ''}`}
            onClick={async () => {
              try {
                await deviceConfigAPI.setFrequencyHopping(Number(device.id), false);
                setConfig({ ...config, frequencyHopping: false });
                // 保存成功后更新当前配置状态
                setCurrentFrequencyHopping(false);
                message.success('Frequency hopping closed successfully');
              } catch (error) {
                message.error('Failed to close frequency hopping');
              }
            }}
            loading={loading}
            disabled={!config.frequencyHopping}
          >
            {t('Close')}
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className={styles.container}>
      <Card 
        title={t('Wireless Configuration')} 
        className={styles.card}
        extra={
          <SyncButton
            deviceId={device.id}
            configType="wireless"
            configTypeName={t('Wireless')}
            onSyncSuccess={() => {
              // 重新获取无线配置
              const fetchConfig = async () => {
                try {
                  const response = await deviceConfigAPI.getWirelessConfig(Number(device.id));
                  if (response && response.data && response.data.config) {
                    const configData = response.data.config;
                    // 更新配置状态
                    const frequency = configData.frequency || configData.stored_frequency;
                    const bandwidth = configData.bandwidth || configData.stored_bandwidth;
                    const frequencyHopping = configData.frequency_hopping === 'true' || configData.frequency_hopping === '1';
                    
                    let frequencyBand: string[] = [];
                    if (configData.frequency_band && Array.isArray(configData.frequency_band)) {
                      frequencyBand = configData.frequency_band;
                    } else if (frequency) {
                      const freqNum = parseInt(frequency);
                      if (freqNum >= 8060 && freqNum <= 9600) {
                        frequencyBand = ['800M'];
                      } else if (freqNum >= 14400 && freqNum <= 15000) {
                        frequencyBand = ['1.4G'];
                      } else if (freqNum >= 24000 && freqNum <= 24814) {
                        frequencyBand = ['2.4G'];
                      }
                    }
                    
                    let bandwidthDisplay = '1.4M';
                    if (bandwidth) {
                      const bwNum = parseInt(bandwidth);
                      switch (bwNum) {
                        case 0: bandwidthDisplay = '1.4M'; break;
                        case 1: bandwidthDisplay = '3M'; break;
                        case 2: bandwidthDisplay = '5M'; break;
                        case 3: bandwidthDisplay = '10M'; break;
                        case 5: bandwidthDisplay = '20M'; break;
                        default: bandwidthDisplay = '1.4M';
                      }
                    }
                    
                    setCurrentFrequencyBand(frequencyBand);
                    setCurrentBandwidth(bandwidthDisplay);
                    setCurrentBuildingChain(configData.building_chain || '');
                    setCurrentFrequencyHopping(frequencyHopping);
                    
                    setConfig({
                      frequencyBand: [],
                      bandwidth: '1.4M',
                      buildingChain: '',
                      frequencyHopping: frequencyHopping,
                    });
                  }
                } catch (error) {
                  console.error('Error fetching wireless config:', error);
                }
              };
              fetchConfig();
            }}
          />
        }
      >
        <Tabs defaultActiveKey="frequencyBand">
          <TabPane
            tab={
              <span>
                <WifiOutlined />
                {t('Frequency Band')}
              </span>
            }
            key="frequencyBand"
          >
            {renderFrequencyBand()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <SettingOutlined />
                {t('Band Width')}
              </span>
            }
            key="bandWidth"
          >
            {renderBandWidth()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <ThunderboltOutlined />
                {t('Building Chain')}
              </span>
            }
            key="buildingChain"
          >
            {renderBuildingChain()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <RadarChartOutlined />
                {t('Frequency Hopping')}
              </span>
            }
            key="frequencyHopping"
          >
            {renderFrequencyHopping()}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default WirelessConfig;