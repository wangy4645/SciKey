import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Typography, Button, Descriptions, Tag, Space, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { forceCenter } from 'd3-force';
import { topologyAPI } from '../services/api';
import styles from './NetworkTopology.module.css';

const { Title } = Typography;

// Correctly import force-graph
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

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const NetworkTopology: React.FC = () => {
  const { t } = useTranslation();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Separate function for manual refresh, which shows a notification.
  const handleRefresh = useCallback(async () => {
      setRefreshing(true);
    try {
      const response = await topologyAPI.getTopology();
      const data = response.data;
      if (data && Array.isArray(data.nodes) && Array.isArray(data.links)) {
        setGraphData(data);
      message.success(t('Network topology refreshed successfully'));
      } else {
        console.error('Received malformed topology data from API:', data);
        message.error(t('Failed to parse network topology data'));
        setGraphData({ nodes: [], links: [] });
      }
    } catch (error) {
      console.error('Failed to refresh network topology', error);
      message.error(t('Failed to refresh network topology'));
      setGraphData({ nodes: [], links: [] });
    } finally {
      setRefreshing(false);
    }
  }, [t]);

  // Auto refresh function (silent, no notifications)
  const autoRefresh = useCallback(async () => {
    try {
      const response = await topologyAPI.getTopology();
      const data = response.data;
      if (data && Array.isArray(data.nodes) && Array.isArray(data.links)) {
        setGraphData(data);
      }
    } catch (error) {
      console.error('Auto refresh failed:', error);
    }
  }, []);

  // Fetch initial data on component mount, without a success notification.
  useEffect(() => {
    const fetchInitialData = async () => {
        setRefreshing(true);
      try {
        const response = await topologyAPI.getTopology();
        const data = response.data;
        if (data && Array.isArray(data.nodes) && Array.isArray(data.links)) {
          setGraphData(data);
        } else {
          setGraphData({ nodes: [], links: [] });
        }
      } catch (error) {
        setGraphData({ nodes: [], links: [] });
      } finally {
        setRefreshing(false);
      }
    };
    fetchInitialData();

    // Start auto refresh every 30 seconds
    autoRefreshIntervalRef.current = setInterval(autoRefresh, 30000);

    // Cleanup function
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh]); // Add autoRefresh to dependencies
    
  // Initialize the graph
  const initializeGraph = useCallback(() => {
    if (!containerRef.current) return;

    try {
      // Destroy existing graph instance
      if (graphRef.current) {
        graphRef.current.d3Force('charge', null);
        graphRef.current.d3Force('link', null);
        graphRef.current.d3Force('center', null);
        graphRef.current = null;
      }

      // Create new graph instance
      graphRef.current = ForceGraph2D()(containerRef.current)
        .width(containerRef.current.offsetWidth)
        .height(containerRef.current.offsetHeight)
        .nodeLabel('name')
        .nodeColor((node: GraphNode) => {
          // 离线设备保持原色但变暗
          if (node.status.toLowerCase() === 'offline') {
            return node.type === 'master' ? '#b3d9ff' : '#b3e6b3'; // 变暗的蓝色和绿色
          }
          return node.type === 'master' ? '#1890ff' : '#52c41a';
        })
        .nodeRelSize(8)
        .linkColor(() => '#999')
        .linkWidth(2)
        .linkDirectionalArrowLength((link: any) => {
          // 只为主到从的方向显示箭头
          const sourceNode = graphData.nodes.find(n => n.id === (link.source.id || link.source));
          const targetNode = graphData.nodes.find(n => n.id === (link.target.id || link.target));
          if (sourceNode && sourceNode.type === 'master' && targetNode && targetNode.type === 'slave') {
            return 8;
          }
          return 0;
        })
        .linkDirectionalArrowRelPos(1)
        .nodeLabel((node: GraphNode) =>
          (node.type === 'master' ? t('Master Node') : t('Slave Node')) + ': ' + node.name
        )
        .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          // 根据状态和类型设置颜色
          let fillColor;
          if (node.status && node.status.toLowerCase() === 'offline') {
            // 离线设备：变暗的颜色
            fillColor = node.type === 'master' ? '#b3d9ff' : '#b3e6b3';
          } else {
            // 在线设备：正常颜色
            fillColor = node.type === 'master' ? '#1890ff' : '#52c41a';
          }
          
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
          ctx.fillStyle = fillColor;
          ctx.fill();
        })
        .onNodeClick((node: GraphNode) => setSelectedNode(node))
        .onNodeHover((node: GraphNode | null) => {
          if (containerRef.current) {
            containerRef.current.style.cursor = node ? 'pointer' : 'default';
          }
        });
      
      // Add a centering force to keep the graph in the middle
      graphRef.current.d3Force('center', forceCenter());

    } catch (error) {
      message.error(t('Failed to initialize network topology'));
    }
  }, [t, graphData]);

  // Update graph data
  const updateGraphData = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.graphData(graphData);
      
      // 重新设置箭头显示逻辑，确保新节点上线时箭头能正确显示
      graphRef.current.linkDirectionalArrowLength((link: any) => {
        // 只为主到从的方向显示箭头
        const sourceNode = graphData.nodes.find(n => n.id === (link.source.id || link.source));
        const targetNode = graphData.nodes.find(n => n.id === (link.target.id || link.target));
        if (sourceNode && sourceNode.type === 'master' && targetNode && targetNode.type === 'slave') {
          return 8;
        }
        return 0;
      });
    }
  }, [graphData]);

  // Initialize graph
  useEffect(() => {
    initializeGraph();
  }, [initializeGraph]);

  // Update graph data
  useEffect(() => {
    updateGraphData();
  }, [updateGraphData]);

  // Handle container size changes when selectedNode changes
  useEffect(() => {
    // 使用setTimeout确保DOM更新完成后再调整图表尺寸
    const timer = setTimeout(() => {
      if (graphRef.current && containerRef.current) {
        graphRef.current
          .width(containerRef.current.offsetWidth)
          .height(containerRef.current.offsetHeight);
      }
    }, 100); // 给DOM一点时间更新

    return () => clearTimeout(timer);
  }, [selectedNode]); // 当selectedNode变化时重新调整尺寸

  // Cleanup function
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current && containerRef.current) {
        graphRef.current
          .width(containerRef.current.offsetWidth)
          .height(containerRef.current.offsetHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
                <Tag color={selectedNode.status.toLowerCase() === 'online' ? 'success' : 'error'}>
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