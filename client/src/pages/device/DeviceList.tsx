import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Device } from '../../types';
import { createDevice, getDevices } from '../../api/device';

const DeviceList: React.FC = () => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);

  // 设备类型选项
  const deviceTypeOptions = [
    { label: '单板 1.0', value: 'board_1.0' },
    { label: '单板 6680', value: 'board_6680' },
  ];

  // 获取设备列表
  const fetchDevices = async () => {
    try {
      const response = await getDevices();
      setDevices(response.data);
    } catch (error) {
      message.error('获取设备列表失败');
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // 显示创建设备对话框
  const showModal = () => {
    setIsModalVisible(true);
  };

  // 处理取消
  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // 处理提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await createDevice(values);
      message.success('创建设备成功');
      setIsModalVisible(false);
      form.resetFields();
      fetchDevices();
    } catch (error) {
      message.error('创建设备失败');
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '节点ID',
      dataIndex: 'node_id',
      key: 'node_id',
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '设备类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const option = deviceTypeOptions.find(opt => opt.value === type);
        return option ? option.label : type;
      },
    },
    {
      title: '板卡类型',
      dataIndex: 'board_type',
      key: 'board_type',
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: '最后在线时间',
      dataIndex: 'last_seen',
      key: 'last_seen',
      render: (time: string) => new Date(time).toLocaleString(),
    },
  ];

  return (
    <div>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={showModal}
        style={{ marginBottom: 16 }}
      >
        添加设备
      </Button>

      <Table
        columns={columns}
        dataSource={devices}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title="添加设备"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="node_id"
            label="节点ID"
            rules={[{ required: true, message: '请输入节点ID' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="name"
            label="设备名称"
            rules={[{ required: true, message: '请输入设备名称' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="type"
            label="设备类型"
            rules={[{ required: true, message: '请选择设备类型' }]}
          >
            <Select options={deviceTypeOptions} placeholder="请选择设备类型" />
          </Form.Item>

          <Form.Item
            name="ip"
            label="IP地址"
            rules={[
              { required: true, message: '请输入IP地址' },
              { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '请输入有效的IP地址' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="location"
            label="位置"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceList; 