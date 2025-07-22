import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, message, Button, Descriptions } from 'antd';
import { ArrowLeftOutlined, AppstoreOutlined, GlobalOutlined, IdcardOutlined } from '@ant-design/icons';
import { AppstoreTwoTone, GoldTwoTone, IdcardTwoTone } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDevice } from '../store/slices/deviceSlice';
import { Device } from '../types';
import './DeviceConfig.module.css';

// 导入不同板子的配置组件
import Board1Config from './device/Board1Config';
import Board1MeshConfig from './device/Board1MeshConfig';
import Board6680Config from './device/Board6680Config';
import Board2StarConfig from './device/Board2StarConfig';

const DeviceConfig: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  
  const getBoardTypeDisplayName = (boardType: string) => {
    switch (boardType) {
      case 'board_1.0':
      case 'board_1.0_star':
        return t('Board 1.0 Star');
      case 'board_1.0_mesh':
        return t('Board 1.0 Mesh');
      case 'board_6680':
        return t('Board 6680');
      default:
        return boardType;
    }
  };
  
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<Device | null>(null);
  
  useEffect(() => {
    if (id === undefined || id === null || id === '' || id === 'undefined') {
      // 如果id无效，给出提示，不跳转
      message.error(t('Invalid device ID in URL. Please select a device from the list.'));
      setLoading(false);
      setDevice(null);
      return;
    }
      loadDevice(parseInt(id));
  }, [id]);
  
  const loadDevice = async (deviceId: number) => {
    try {
      setLoading(true);
      const result = await dispatch(fetchDevice(deviceId));
      if (fetchDevice.fulfilled.match(result)) {
        setDevice(result.payload);
      } else {
        message.error(t('Failed to load device'));
        navigate('/devices');
      }
    } catch (error) {
      message.error(t('Failed to load device'));
      navigate('/devices');
    } finally {
      setLoading(false);
    }
  };
  
  const renderConfigComponent = () => {
    if (!device) return null;
    
    const props = {
      device,
      onConfigUpdate: () => loadDevice(device.id),
    };
    
    switch (device.board_type) {
      case 'board_1.0':
      case 'board_1.0_star':
        return <Board1Config {...props} />;
      case 'board_1.0_mesh':
        return <Board1MeshConfig {...props} />;
      case 'board_6680':
        return <Board6680Config {...props} />;
      case 'board_2.0_star':
      case '2.0_star':
        return <Board2StarConfig {...props} />;
      default:
        return (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3>{t('Unsupported board type')}: {device.board_type}</h3>
            <p>{t('Configuration interface not available for this board type.')}</p>
          </div>
        );
    }
  };
  
  if (!id || id === 'undefined') {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Card>
          <h3>{t('Invalid device ID in URL')}</h3>
          <Button type="primary" onClick={() => navigate('/devices')}>{t('Back to Devices')}</Button>
        </Card>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>{t('Loading device configuration...')}</p>
      </div>
    );
  }
  
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/devices')}
            type="primary"
            style={{ marginBottom: '16px', borderRadius: 6, fontWeight: 600, fontSize: 16 }}
          >
            {t('Back to Devices')}
          </Button>
          
          {device && (
            <Descriptions
              className="device-info-descriptions"
              bordered
              column={{ xs: 1, sm: 2, md: 3 }}
              size="middle"
            >
              <Descriptions.Item label={t('Board Type')}>
                {getBoardTypeDisplayName(device.board_type)}
              </Descriptions.Item>
              <Descriptions.Item label={t('IP Address')}>
                {device.ip}
              </Descriptions.Item>
              <Descriptions.Item label={t('Node ID')}>
                {device.node_id}
              </Descriptions.Item>
            </Descriptions>
          )}
        </div>
        
        {renderConfigComponent()}
      </Card>
    </div>
  );
};

export default DeviceConfig; 