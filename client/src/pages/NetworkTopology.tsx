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
  }, []); // Empty dependency array ensures this runs only once on mount.
    
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
        .nodeLabel('name')
        .nodeColor((node: GraphNode) => {
          if (node.status.toLowerCase() === 'offline') return '#ff4d4f';
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
      
      // Add a centering force to keep the graph in the middle
      graphRef.current.d3Force('center', forceCenter());

    } catch (error) {
      message.error(t('Failed to initialize network topology'));
    }
  }, [t]);

  // Update graph data
  const updateGraphData = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.graphData(graphData);
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