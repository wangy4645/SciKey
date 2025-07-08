import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Typography, Button, Descriptions, Tag, Space, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Device } from '../types';
import { fetchDevices } from '../store/slices/deviceSlice';
import { AppDispatch, RootState } from '../store';
import styles from './NetworkTopology.module.css';

const { Title } = Typography;

// 正确导入force-graph
const ForceGraph2D = require('force-graph').default;

interface GraphNode {
  id: string;
  nodeId: string;
  name: string;
  type: 'master' | 'slave';
  status: 'online' | 'offline';
  ip: string;
  location: string;
  parent_id?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

const NetworkTopology: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { devices, loading } = useSelector((state: RootState) => state.device);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

  // 刷新数据的回调函数
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await dispatch(fetchDevices());
      message.success(t('Network topology refreshed successfully'));
    } catch (error) {
      message.error(t('Failed to refresh network topology'));
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  // 组件初始化时获取数据
  useEffect(() => {
    const initializeData = async () => {
      try {
        setRefreshing(true);
        await dispatch(fetchDevices());
      } catch (error) {
        message.error(t('Failed to refresh network topology'));
      } finally {
        setRefreshing(false);
      }
    };
    
    initializeData();
  }, [dispatch]);

  // 初始化图形
  const initializeGraph = useCallback(() => {
    if (!containerRef.current) return;

    try {
      // 销毁现有图形实例
      if (graphRef.current) {
        graphRef.current.d3Force('charge', null);
        graphRef.current.d3Force('link', null);
        graphRef.current.d3Force('center', null);
        graphRef.current = null;
      }

      // 创建新的图形实例
      graphRef.current = ForceGraph2D()(containerRef.current)
        .nodeLabel('name')
        .nodeColor((node: GraphNode) => {
          if (node.status === 'offline') return '#ff4d4f';
          return node.type === 'master' ? '#1890ff' : '#52c41a';
        })
        .nodeRelSize(8)
        .linkColor(() => '#999')
        .linkWidth(2)
        .onNodeClick((node: GraphNode) => setSelectedNode(node))
        .onNodeHover((node: GraphNode | null) => {
          if (containerRef.current) {
            containerRef.current.style.cursor = node ? 'pointer' : 'default';
          }
        });

    } catch (error) {
      message.error(t('Failed to initialize network topology'));
    }
  }, [t]);

  // 更新图形数据
  const updateGraphData = useCallback(() => {
    if (!graphRef.current || !devices || devices.length === 0) {
      return;
    }

    try {
      const nodes: GraphNode[] = devices
        .filter((device: Device) => device && device.id)
        .map((device: Device) => ({
          id: String(device.id),
          nodeId: String(device.node_id || ''),
          name: String(device.name || ''),
          type: device.type === 'master' ? 'master' : 'slave',
          status: device.status === 'online' ? 'online' : 'offline',
          ip: String(device.ip || ''),
          location: String((device as any)?.location || ''),
          parent_id: Number((device as any)?.parent_id) || undefined,
        }));

      const links: GraphLink[] = devices
        .filter((device: Device) => device && device.id && (device as any)?.parent_id)
        .map((device: Device) => ({
          source: String((device as any)?.parent_id),
          target: String(device.id),
        }));

      graphRef.current.graphData({ nodes, links });
    } catch (error) {
      message.error(t('Failed to update network topology'));
    }
  }, [devices, t]);

  // 初始化图形
  useEffect(() => {
    initializeGraph();
  }, [initializeGraph]);

  // 更新图形数据
  useEffect(() => {
    updateGraphData();
  }, [updateGraphData]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (graphRef.current) {
        graphRef.current.d3Force('charge', null);
        graphRef.current.d3Force('link', null);
        graphRef.current.d3Force('center', null);
        graphRef.current = null;
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>{t('Network Topology')}</Title>
        <Space>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            loading={refreshing}
            onClick={handleRefresh}
          >
            {t('Refresh')}
          </Button>
        </Space>
      </div>

      <div className={styles.content}>
        <div className={styles.graphContainer} ref={containerRef} />
        {selectedNode && (
          <Card className={styles.detailsCard} title={t('Device Details')}>
            <Descriptions column={1}>
              <Descriptions.Item label={t('Name')}>{selectedNode.name}</Descriptions.Item>
              <Descriptions.Item label={t('IP Address')}>{selectedNode.ip}</Descriptions.Item>
              <Descriptions.Item label={t('Node ID')}>{selectedNode.nodeId}</Descriptions.Item>
              <Descriptions.Item label={t('Type')}>
                <Tag color={selectedNode.type === 'master' ? 'blue' : 'green'}>
                  {selectedNode.type.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('Status')}>
                <Tag color={selectedNode.status === 'online' ? 'success' : 'error'}>
                  {selectedNode.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('Location')}>{selectedNode.location || t('Not specified')}</Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NetworkTopology; 