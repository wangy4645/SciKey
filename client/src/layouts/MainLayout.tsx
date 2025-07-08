import React, { useState, useEffect } from 'react';
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

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  return (
    <Layout className={styles.layout}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className={styles.logo}>
          <img src="/icon.png" alt="logo" style={{ width: 28, height: 28, marginRight: 8, borderRadius: 6, background: 'rgba(255,255,255,0.1)', opacity: 0.7, display: 'inline-block', verticalAlign: 'middle' }} />
          <span className={styles.logoTitle} style={{ display: 'inline-block', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>MANNET MGMT</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname.startsWith('/devices') ? '/devices' : location.pathname]}
          items={[
            {
              key: '/dashboard',
              icon: <DashboardOutlined />,
              label: t('Dashboard'),
              onClick: () => navigate('/dashboard'),
            },
            {
              key: '/devices',
              icon: <ApiOutlined />,
              label: t('Device Management'),
              onClick: () => navigate('/devices'),
            },
            {
              key: '/monitor',
              icon: <LineChartOutlined />,
              label: t('Device Monitor'),
              onClick: () => navigate('/monitor'),
            },
            {
              key: '/topology',
              icon: <NodeIndexOutlined />,
              label: t('Network Topology'),
              onClick: () => navigate('/topology'),
            },
            {
              key: '/settings',
              icon: <SettingOutlined />,
              label: t('System Settings'),
              onClick: () => navigate('/settings'),
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className={styles.trigger}
          />
          <div className={styles.headerRight}>
            <Space size="large">
              <Button
                type="text"
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
              />
              <Dropdown overlay={systemMenu} placement="bottomRight">
                <Button type="text" icon={<ToolOutlined />}>
                  {t('System Management')}
                </Button>
              </Dropdown>
              <Button type="text" icon={<BellOutlined />} />
              <Dropdown overlay={userMenu} placement="bottomRight">
                <Space className={styles.userInfo}>
                  <Avatar icon={<UserOutlined />} />
                  <span>{user?.username}</span>
                </Space>
              </Dropdown>
            </Space>
          </div>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout; 