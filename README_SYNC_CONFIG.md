# 设备配置同步功能

## 功能概述

当新机器登录后，数据库中没有数据时，系统提供了从单板获取配置并保存到本地数据库的功能。这个功能可以自动从设备获取所有配置信息，并在页面配置中显示。

## 实现的功能

### 1. 后端功能

#### 新增的API端点
- `POST /api/devices/:id/sync-config` - 同步设备配置从单板到数据库

#### 新增的服务方法
- `SyncDeviceConfig(deviceID uint)` - 同步设备配置
- `parseATResponseToConfig()` - 解析AT响应为配置数据
- `saveConfigToDatabase()` - 保存配置到数据库

#### 支持的AT命令
系统会自动执行以下get命令来获取配置：

**1.0版本单板 (board_1.0.yaml):**
- `get_access_state` - 获取接入状态 (AT^DACS?)
- `get_radio_params` - 获取无线参数配置 (AT^DRPC?)
- `get_radio_params_store` - 获取存储的无线参数 (AT^DRPS?)
- `get_slave_max_tx_power` - 获取从节点最大发射功率 (AT^DSSMTP?)
- `get_radio_param_report` - 获取无线参数上报状态 (AT^DRPR?)
- `get_all_radio_param_report` - 获取所有接入节点无线参数上报状态 (AT^DAPR?)
- `get_band_config` - 获取用户频段配置 (AT^DAOCNDI?)
- `get_device_type` - 获取设备类型配置 (AT^DDTC?)
- `get_encryption_algorithm` - 获取加密算法配置 (AT^DCIAC?)
- `get_tdd_config` - 获取TDD配置 (AT^DSTC?)
- `get_frequency_hopping` - 获取跳频控制状态 (AT^DFHC?)

**6680单板 (board_6680.yaml):**
- 支持相同的get命令，但参数范围可能不同

### 2. 前端功能

#### 新增的UI组件
- 同步配置按钮 - 位于设备配置页面右上角
- 同步结果模态框 - 显示同步过程的详细结果

#### 新增的API调用
- `syncDeviceConfig(deviceId: number)` - 调用同步配置API

## 使用方法

### 1. 访问设备配置页面
1. 登录系统
2. 进入设备列表页面
3. 点击设备的"配置"按钮
4. 进入设备配置页面

### 2. 执行配置同步
1. 在设备配置页面右上角找到"Sync Config from Board"按钮
2. 点击按钮开始同步
3. 系统会自动执行所有get命令
4. 同步完成后会显示详细的结果

### 3. 查看同步结果
同步完成后会弹出模态框显示：
- 同步摘要信息（设备ID、板级类型、总命令数、成功数）
- 每个命令的执行结果（成功/失败、响应内容、解析的配置）
- 错误信息（如果有）

### 4. 查看同步的配置
同步成功后，配置会自动保存到数据库，并在各个配置标签页中显示：
- Network Status - 网络状态配置
- Security - 安全配置
- Wireless - 无线配置
- Net Setting - 网络设置
- Up/Down - 上下行配置
- Debug - 调试配置
- System - 系统配置

## 配置分类

系统会根据命令名称自动将配置分类：

- **wireless** - 包含"radio"的命令
- **security** - 包含"encryption"或"security"的命令
- **system** - 包含"access"或"device_type"的命令
- **up_down** - 包含"tdd"或"hopping"的命令
- **debug** - 其他命令

## 错误处理

### 常见错误
1. **设备连接失败** - 检查设备IP地址和网络连接
2. **AT命令执行失败** - 检查设备是否支持该命令
3. **配置解析失败** - 检查设备响应格式是否符合预期

### 错误恢复
- 系统会记录每个命令的执行结果
- 失败的命令不会影响其他命令的执行
- 可以重新执行同步操作

## 技术实现

### 后端架构
```
DeviceHandler.SyncDeviceConfig()
    ↓
DeviceCommService.SyncDeviceConfig()
    ↓
BoardConfigManager.GetBoardConfig()
    ↓
遍历所有get命令
    ↓
SendATCommandByName()
    ↓
parseATResponseToConfig()
    ↓
saveConfigToDatabase()
```

### 前端架构
```
DeviceConfig组件
    ↓
handleSyncConfig()
    ↓
deviceConfigAPI.syncDeviceConfig()
    ↓
显示同步结果模态框
```

## 注意事项

1. **设备连接** - 确保设备在线且可访问
2. **权限验证** - 某些设备可能需要登录才能执行AT命令
3. **命令支持** - 不同版本的设备可能支持不同的AT命令
4. **响应格式** - 设备响应格式可能因版本而异
5. **网络延迟** - 同步过程可能需要一些时间，请耐心等待

## 扩展性

系统设计具有良好的扩展性：

1. **新增AT命令** - 只需在board配置文件中添加新的get命令
2. **新增板级类型** - 创建新的board配置文件
3. **新增配置分类** - 修改parseATResponseToConfig方法
4. **自定义解析逻辑** - 扩展parseATResponseToConfig方法

## 日志记录

系统会自动记录同步操作的日志：
- 操作类型：`config_sync`
- 消息格式：`Device configuration synchronized from board. Success: X/Y`
- 存储位置：`device_logs`表 