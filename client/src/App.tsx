import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './store/auth';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import DeviceConfig from './pages/DeviceConfig';
import DeviceMonitor from './pages/DeviceMonitor';
import NetworkTopology from './pages/NetworkTopology';
import Settings from './pages/Settings';



const App: React.FC = () => {
  const { user, initialize, initialized, loading } = useAuth();

  useEffect(() => {
    console.log('App: Initializing auth...');
    initialize();
  }, [initialize]);

  console.log('App: State - user:', !!user, 'initialized:', initialized, 'loading:', loading);

  // 如果还在初始化中，显示加载状态
  if (!initialized) {
    console.log('App: Showing loading state - not initialized');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px'
      }}>
        Loading...
      </div>
    );
  }

  console.log('App: Rendering routes, user:', !!user);

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          user ? (
            <MainLayout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="devices" element={<Devices />} />
        <Route path="devices/:id/config" element={<DeviceConfig />} />
        <Route path="monitor" element={<DeviceMonitor />} />
        <Route path="topology" element={<NetworkTopology />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default App; 