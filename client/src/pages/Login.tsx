import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';
import styles from './Login.module.css';

const { TabPane } = Tabs;

// 粒子效果组件
const ParticleEffect: React.FC = () => {
  useEffect(() => {
    const canvas = document.getElementById('particleCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    // 创建粒子
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.fill();

        // 连接临近的粒子
        particles.forEach((otherParticle, otherIndex) => {
          if (index !== otherIndex) {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance / 100)})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      id="particleCanvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
};

const Login: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register, setAuth } = useAuth();
  const [registerVisible, setRegisterVisible] = useState(false);
  const [form] = Form.useForm();

  const onLogin = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      const response = await login(values);
      
      message.success(t('Login successful'));
      navigate('/dashboard');
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.error || t('Invalid username or password');
        message.error(errorMessage);
      } else if (error.request) {
        message.error(t('Server is not responding. Please try again later.'));
      } else {
        message.error(t('An error occurred. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: { username: string; password: string }) => {
    try {
      const response = await register({
        username: values.username,
        password: values.password
      });
      message.success(t('Registration successful'));
      setRegisterVisible(false);
      form.resetFields();
      
      // 注册成功后自动跳转到主页面
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.response?.data?.error || t('Registration failed'));
    }
  };

  return (
    <div className={styles.container}>
      <ParticleEffect />
      <Card className={styles.card}>
        <div className={styles.loginForm}>
          <h1>{t('MESH Device Management Platform')}</h1>
        </div>
        <Tabs defaultActiveKey="login" centered>
          <TabPane tab={t('Login')} key="login">
            <Form
              name="login"
              onFinish={onLogin}
              autoComplete="off"
              size="large"
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: t('Please input your username!') }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder={t('Username')}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: t('Please input your password!') }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder={t('Password')}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                >
                  {t('Login')}
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab={t('Register')} key="register">
            <Form
              form={form}
              name="register"
              onFinish={onRegister}
              autoComplete="off"
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: t('Please input your username!') }]}
              >
                <Input prefix={<UserOutlined />} placeholder={t('Username')} />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: t('Please input your password!') }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder={t('Password')} />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                >
                  {t('Register')}
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Login; 