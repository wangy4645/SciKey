import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Space, Avatar } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  ApiOutlined,
  NodeIndexOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  BellOutlined,
  HistoryOutlined,
  ToolOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';
import MeshLogo from '../components/MeshLogo';
import styles from './MainLayout.module.css';
import { User } from '../types';

const { Header, Sider, Content } = Layout;

// 调整默认菜单栏宽度为260，使MESH MGMT一行显示
const DEFAULT_SIDER_WIDTH = 260;
const MIN_SIDER_WIDTH = 180;
const MAX_SIDER_WIDTH = 340;

const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [siderWidth, setSiderWidth] = useState(DEFAULT_SIDER_WIDTH);
  const dragging = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // 保存当前路径到localStorage
  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/login') {
      localStorage.setItem('lastPath', location.pathname);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 拖拽事件
  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    const startX = e.clientX;
    const startWidth = siderWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragging.current) return;
      let newWidth = startWidth + (moveEvent.clientX - startX);
      newWidth = Math.max(MIN_SIDER_WIDTH, Math.min(MAX_SIDER_WIDTH, newWidth));
      setSiderWidth(newWidth);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const systemMenu = (
    <Menu>
      <Menu.Item key="logs" icon={<HistoryOutlined />}>
        {t('System Logs')}
      </Menu.Item>
      <Menu.Item key="maintenance" icon={<ToolOutlined />}>
        {t('System Maintenance')}
      </Menu.Item>
    </Menu>
  );

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        {t('Profile')}
      </Menu.Item>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        {t('Logout')}
      </Menu.Item>
    </Menu>
  );

  const groupedMenu = [
    {
      group: 'Device',
      items: [
        {
          key: '/dashboard',
          icon: <DashboardOutlined style={{ fontSize: 22 }} />, label: t('Dashboard'), onClick: () => navigate('/dashboard'),
        },
        {
          key: '/devices',
          icon: <ApiOutlined style={{ fontSize: 22 }} />, label: t('Device Management'), onClick: () => navigate('/devices'),
        },
        {
          key: '/monitor',
          icon: <LineChartOutlined style={{ fontSize: 22 }} />, label: t('Device Monitor'), onClick: () => navigate('/monitor'),
        },
        {
          key: '/topology',
          icon: <NodeIndexOutlined style={{ fontSize: 22 }} />, label: t('Network Topology'), onClick: () => navigate('/topology'),
        },
      ],
    },
    {
      group: 'System',
      items: [
        {
          key: '/settings',
          icon: <SettingOutlined style={{ fontSize: 22 }} />, label: t('System Settings'), onClick: () => navigate('/settings'),
        },
      ],
    },
  ];

  return (
    <Layout className={styles.layout} style={{ background: '#f7f9fb' }}>
      {/* 仅在未折叠时渲染Sider和菜单栏内容 */}
      {!collapsed && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={siderWidth}
          style={{
            background: 'linear-gradient(180deg, #f4f6fa 80%, #e9edf3 100%)',
            borderRadius: '12px 0 0 12px',
            boxShadow: '2px 0 12px rgba(0,0,0,0.06)',
            minHeight: '100vh',
            padding: '10px 0 0 0',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            transition: 'width 0.2s',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 拖拽手柄 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 6,
              height: '100%',
              cursor: 'ew-resize',
              zIndex: 100,
              background: 'transparent',
            }}
            onMouseDown={handleMouseDown}
          />
          {/* Logo区 */}
          <div style={{ padding: '8px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', background: '#e9edf3', borderRadius: 8 }}>
            <img src="/icon.png" alt="logo" style={{ width: 40, height: 40, borderRadius: 6, marginRight: 14, opacity: 0.9, background: 'transparent' }} />
            <span style={{ fontWeight: 700, fontSize: 22, color: '#6b8fcf', letterSpacing: 1 }}>MESH MGMT</span>
        </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', overflowY: 'auto' }}>
            <div className={styles.menuCardGrid}>
              {[
            {
              key: '/dashboard',
                  icon: <DashboardOutlined className={styles.menuCardIcon} />, label: t('Dashboard'), onClick: () => navigate('/dashboard'),
            },
            {
              key: '/devices',
                  icon: <ApiOutlined className={styles.menuCardIcon} />, label: t('Device Management'), onClick: () => navigate('/devices'),
            },
            {
              key: '/monitor',
                  icon: <LineChartOutlined className={styles.menuCardIcon} />, label: t('Device Monitor'), onClick: () => navigate('/monitor'),
            },
            {
              key: '/topology',
                  icon: <NodeIndexOutlined className={styles.menuCardIcon} />, label: t('Network Topology'), onClick: () => navigate('/topology'),
            },
            {
              key: '/settings',
                  icon: <SettingOutlined className={styles.menuCardIcon} />, label: t('System Settings'), onClick: () => navigate('/settings'),
            },
              ].map(item => {
                const selected = location.pathname.startsWith('/devices') ? item.key === '/devices' : location.pathname === item.key;
                return (
                  // 图标卡片样式（大图票）
                  <div
                    key={item.key}
                    className={styles.menuCard}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s',
                      boxShadow: location.pathname === item.key ? '0 4px 16px rgba(107,143,207,0.18)' : '0 2px 12px rgba(59,130,246,0.08)',
                      border: location.pathname === item.key ? '2px solid #6b8fcf' : '2px solid transparent',
                      background: location.pathname === item.key ? '#f4f8ff' : '#fff',
                    }}
                    onClick={item.onClick}
                  >
                    {/* 恢复为大图票风格：仅主色#6b8fcf，无背景 */}
                    {React.cloneElement(item.icon as React.ReactElement, { style: { fontSize: 40, color: '#6b8fcf', marginBottom: 8 } })}
                    <span style={{ fontWeight: 600, fontSize: 18, color: location.pathname === item.key ? '#6b8fcf' : '#5a6a85', letterSpacing: 1 }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
      </Sider>
      )}
      <Layout>
        <Header className={styles.header} style={{ background: '#f7f9fb', borderBottom: '1px solid #e3e6eb', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 20, width: 48, height: 48, color: '#3b82f6' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginRight: 24 }}>
              <Dropdown overlay={systemMenu} placement="bottomRight">
              <Button type="text" icon={<ToolOutlined style={{ color: '#3b82f6' }} />} style={{ color: '#3b82f6', fontWeight: 600 }}>
                {t('System')}
                </Button>
              </Dropdown>
              <Dropdown overlay={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ background: '#3b82f6' }} />
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>{user?.username}</span>
                </Space>
              </Dropdown>
          </div>
        </Header>
        <Content className={styles.content} style={{ background: '#f7f9fb', padding: 24, minHeight: '100vh' }}>
          <div style={{ height: '100%', width: '100%' }}>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: 16, padding: 20, width: '100%', height: '100%' }}>
              <div style={{ fontWeight: 600, fontSize: 20, color: '#3b82f6', marginBottom: 16 }}>
                {/* 可放置主标题/面包屑等 */}
              </div>
              {/* 右侧主内容区插槽 */}
          <Outlet />
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout; 