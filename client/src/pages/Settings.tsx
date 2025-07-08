import React from 'react';
import { Card, Tabs, Form, Input, Switch, Select, Button, Space, InputNumber, Divider } from 'antd';
import styles from './Settings.module.css';
import { useTranslation } from 'react-i18next';

const { Option } = Select;
const { TabPane } = Tabs;

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const { t, i18n } = useTranslation();

  const handleSave = (values: any) => {
    if (values.language) {
      // 切换语言
      i18n.changeLanguage(values.language.startsWith('zh') ? 'zh' : 'en');
    }
    // 这里可以保存其它设置
  };

  return (
    <div className={styles.container}>
      <Tabs defaultActiveKey="system">
        <TabPane tab={t('System Settings')} key="system">
          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              initialValues={{
                timezone: 'Asia/Shanghai',
                language: i18n.language === 'zh' ? 'zh_CN' : 'en_US',
                autoUpdate: true,
                updateSchedule: 'daily',
                logLevel: 'info',
                logRetention: 30,
              }}
            >
              <Form.Item
                name="timezone"
                label={t('Timezone')}
                rules={[{ required: true, message: t('Please select timezone') }]}
              >
                <Select>
                  <Option value="UTC">{t('UTC')}</Option>
                  <Option value="Asia/Shanghai">{t('Asia/Shanghai')}</Option>
                  <Option value="America/New_York">{t('America/New_York')}</Option>
                  <Option value="Europe/London">{t('Europe/London')}</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="language"
                label={t('Language')}
                rules={[{ required: true, message: t('Please select language') }]}
              >
                <Select onChange={val => i18n.changeLanguage(val.startsWith('zh') ? 'zh' : 'en')}>
                  <Option value="en_US">English</Option>
                  <Option value="zh_CN">中文</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="autoUpdate"
                label={t('Auto Update')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="updateSchedule"
                label={t('Update Schedule')}
              >
                <Select>
                  <Option value="daily">{t('Daily')}</Option>
                  <Option value="weekly">{t('Weekly')}</Option>
                  <Option value="monthly">{t('Monthly')}</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="logLevel"
                label={t('Log Level')}
              >
                <Select>
                  <Option value="debug">{t('Debug')}</Option>
                  <Option value="info">{t('Info')}</Option>
                  <Option value="warning">{t('Warning')}</Option>
                  <Option value="error">{t('Error')}</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="logRetention"
                label={t('Log Retention (days)')}
              >
                <InputNumber min={1} max={365} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    {t('Save Settings')}
                  </Button>
                  <Button onClick={() => form.resetFields()}>
                    {t('Reset')}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
        <TabPane tab={t('Security Settings')} key="security">
          <Card>
            <Form
              layout="vertical"
              initialValues={{
                enableFirewall: true,
                firewallLevel: 'medium',
                enableVpn: false,
                vpnType: 'openvpn',
                enableSsh: true,
                sshPort: 22,
              }}
            >
              <Form.Item
                name="enableFirewall"
                label={t('Enable Firewall')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="firewallLevel"
                label={t('Firewall Level')}
              >
                <Select>
                  <Option value="low">{t('Low')}</Option>
                  <Option value="medium">{t('Medium')}</Option>
                  <Option value="high">{t('High')}</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="enableVpn"
                label={t('Enable VPN')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="vpnType"
                label={t('VPN Type')}
              >
                <Select>
                  <Option value="openvpn">{t('OpenVPN')}</Option>
                  <Option value="ipsec">{t('IPSec')}</Option>
                  <Option value="wireguard">{t('WireGuard')}</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="enableSsh"
                label={t('Enable SSH')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="sshPort"
                label={t('SSH Port')}
              >
                <InputNumber min={1} max={65535} />
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
        <TabPane tab={t('Backup and Recovery')} key="backup">
          <Card>
            <Form layout="vertical">
              <Form.Item label={t('Auto Backup')}>
                <Space>
                  <Form.Item
                    name="autoBackup"
                    valuePropName="checked"
                    noStyle
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name="backupSchedule"
                    noStyle
                  >
                    <Select style={{ width: 120 }}>
                      <Option value="daily">{t('Daily')}</Option>
                      <Option value="weekly">{t('Weekly')}</Option>
                      <Option value="monthly">{t('Monthly')}</Option>
                    </Select>
                  </Form.Item>
                </Space>
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary">
                    {t('Backup Now')}
                  </Button>
                  <Button>
                    {t('Restore Backup')}
                  </Button>
                  <Button type="default">
                    {t('Download Backup')}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Settings; 