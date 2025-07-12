package device

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"backend/internal/model"

	"gopkg.in/yaml.v3"
	"gorm.io/gorm"
)

// Service 设备服务
type Service struct {
	db     *gorm.DB
	client *http.Client
}

// NewService 创建设备服务实例
func NewService(db *gorm.DB) *Service {
	return &Service{
		db: db,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// SendCommand 发送命令到设备
func (s *Service) SendCommand(device *Device, command *NetManagerRequest) (*NetManagerResponse, error) {
	// 获取AT指令映射
	mapping, err := s.GetATCommandMapping(device.NodeID, command.CommandType)
	if err != nil {
		return nil, fmt.Errorf("获取AT指令映射失败: %w", err)
	}
	fmt.Printf("获取到AT指令映射: %+v\n", mapping)

	// 转换为板级请求
	boardReq, err := command.ConvertToBoardRequest(mapping)
	if err != nil {
		return nil, fmt.Errorf("转换请求失败: %w", err)
	}
	fmt.Printf("转换后的板级请求: %+v\n", boardReq)

	// 发送请求到设备
	reqBody, err := json.Marshal(boardReq)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %w", err)
	}
	fmt.Printf("发送的请求体: %s\n", string(reqBody))

	// 构造请求URL
	url := fmt.Sprintf("http://%s/atservice.fcgi", device.IP)
	fmt.Printf("请求URL: %s\n", url)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// 发送请求
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("发送请求失败: %w", err)
	}
	defer resp.Body.Close()

	// 解析响应
	var boardResp BoardResponse
	if err := json.NewDecoder(resp.Body).Decode(&boardResp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}
	fmt.Printf("设备响应: %+v\n", boardResp)

	// 转换为网管响应
	return ParseBoardResponse(&boardResp)
}

// GetATCommandMapping 获取AT指令映射
func (s *Service) GetATCommandMapping(deviceID string, commandType string) (*model.ATCommandMapping, error) {
	var mapping model.ATCommandMapping
	if err := s.db.Where("device_id = ? AND command_type = ?", deviceID, commandType).First(&mapping).Error; err != nil {
		return nil, fmt.Errorf("获取AT指令映射失败: %w", err)
	}
	return &mapping, nil
}

// SaveATCommandMapping 保存AT指令映射
func (s *Service) SaveATCommandMapping(mapping *model.ATCommandMapping) error {
	if err := s.db.Save(mapping).Error; err != nil {
		return fmt.Errorf("保存AT指令映射失败: %w", err)
	}
	return nil
}

// GetDevice 获取设备信息
func (s *Service) GetDevice(deviceID string) (*Device, error) {
	var device Device
	if err := s.db.Where("node_id = ?", deviceID).First(&device).Error; err != nil {
		return nil, fmt.Errorf("获取设备失败: %w", err)
	}
	return &device, nil
}

// SaveDevice 保存设备信息
func (s *Service) SaveDevice(device *Device) error {
	// 检查设备是否已存在
	var existingDevice Device
	err := s.db.Where("node_id = ?", device.NodeID).First(&existingDevice).Error
	isNewDevice := err == gorm.ErrRecordNotFound

	// 保存设备信息
	if err := s.db.Save(device).Error; err != nil {
		return fmt.Errorf("保存设备失败: %w", err)
	}

	// 如果是新设备，初始化AT指令映射
	if isNewDevice {
		if err := s.InitializeATCommandMappings(device); err != nil {
			return fmt.Errorf("初始化AT指令映射失败: %w", err)
		}
	}

	return nil
}

// ListDevices 获取设备列表
func (s *Service) ListDevices() ([]Device, error) {
	var devices []Device
	if err := s.db.Find(&devices).Error; err != nil {
		return nil, fmt.Errorf("获取设备列表失败: %w", err)
	}
	return devices, nil
}

// UpdateDeviceStatus 更新设备状态
func (s *Service) UpdateDeviceStatus(deviceID string, status string) error {
	if err := s.db.Model(&Device{}).Where("node_id = ?", deviceID).Updates(map[string]interface{}{
		"status":    status,
		"last_seen": time.Now(),
	}).Error; err != nil {
		return fmt.Errorf("更新设备状态失败: %w", err)
	}
	return nil
}

// GetDeviceStatus 获取设备状态
func (s *Service) GetDeviceStatus(device *Device) (*DeviceStatus, error) {
	// 发送状态查询命令
	command := &NetManagerRequest{
		DeviceID:    device.NodeID,
		CommandType: string(CommandTypeStatus),
	}
	resp, err := s.SendCommand(device, command)
	if err != nil {
		return nil, fmt.Errorf("获取设备状态失败: %w", err)
	}

	// 解析状态信息
	var status DeviceStatus
	if err := json.Unmarshal([]byte(resp.Result), &status); err != nil {
		return nil, fmt.Errorf("解析状态信息失败: %w", err)
	}

	return &status, nil
}

// DeleteDevice 删除设备（彻底删除，不使用软删除）
func (s *Service) DeleteDevice(deviceID string) error {
	// 开启事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 将 NodeID 转换为 uint
	deviceIDUint, err := strconv.ParseUint(deviceID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid device ID format: %s", deviceID)
	}

	// 删除设备相关的所有数据
	// 1. 删除设备日志
	if err := tx.Unscoped().Where("device_id = ?", deviceIDUint).Delete(&model.DeviceLog{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("删除设备日志失败: %w", err)
	}

	// 2. 删除命令日志
	if err := tx.Unscoped().Where("device_id = ?", deviceIDUint).Delete(&model.CommandLog{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("删除命令日志失败: %w", err)
	}

	// 3. 删除设备配置
	if err := tx.Unscoped().Where("device_id = ?", deviceIDUint).Delete(&model.DeviceConfig{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("删除设备配置失败: %w", err)
	}

	// 4. 删除监控数据
	if err := tx.Unscoped().Where("device_id = ?", deviceIDUint).Delete(&model.MonitorData{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("删除监控数据失败: %w", err)
	}

	// 5. 删除AT指令映射
	if err := tx.Unscoped().Where("device_id = ?", deviceIDUint).Delete(&model.ATCommandMapping{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("删除AT指令映射失败: %w", err)
	}

	// 6. 最后删除设备本身
	if err := tx.Unscoped().Where("node_id = ?", deviceID).Delete(&Device{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("删除设备失败: %w", err)
	}

	// 提交事务
	return tx.Commit().Error
}

// ListATCommandMappings 获取AT指令映射列表
func (s *Service) ListATCommandMappings(deviceID string) ([]model.ATCommandMapping, error) {
	var mappings []model.ATCommandMapping
	query := s.db.Model(&model.ATCommandMapping{})
	if deviceID != "" {
		query = query.Where("device_id = ?", deviceID)
	}
	if err := query.Find(&mappings).Error; err != nil {
		return nil, fmt.Errorf("获取AT指令映射列表失败: %w", err)
	}
	return mappings, nil
}

// DeleteATCommandMapping 删除AT指令映射
func (s *Service) DeleteATCommandMapping(id string) error {
	if err := s.db.Delete(&model.ATCommandMapping{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("删除AT指令映射失败: %w", err)
	}
	return nil
}

// InitializeATCommandMappings 初始化设备的AT指令映射
func (s *Service) InitializeATCommandMappings(device *Device) error {
	// 根据设备类型确定单板类型
	boardType := device.BoardType
	if boardType == "" {
		// 如果没有指定单板类型，根据设备类型推断
		switch device.BoardType {
		case "board_1.0":
			boardType = "1.0_star"
		case "board_1.0_mesh":
			boardType = "1.0_mesh"
		case "board_6680":
			boardType = "6680"
		default:
			return fmt.Errorf("unknown board type: %s", device.BoardType)
		}
	}

	fmt.Printf("Initializing AT command mappings for device %s (type: %s, board: %s)\n", device.NodeID, device.Type, boardType)

	// 读取对应单板的配置文件
	configPath := fmt.Sprintf("config/boards/board_%s.yaml", boardType)
	fmt.Printf("Reading board configuration from: %s\n", configPath)

	configData, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read board config: %v", err)
	}

	var boardConfig struct {
		ATCommands map[string]struct {
			Command    string            `yaml:"command"`
			Parameters map[string]string `yaml:"parameters"`
		} `yaml:"at_commands"`
	}

	if err := yaml.Unmarshal(configData, &boardConfig); err != nil {
		return fmt.Errorf("failed to parse board config: %v", err)
	}

	fmt.Printf("Parsed board configuration: %+v\n", boardConfig)

	// 为每个AT指令创建映射
	for cmdType, cmdConfig := range boardConfig.ATCommands {
		// 将 NodeID 转换为 uint，这里假设 NodeID 是数字字符串
		deviceID, err := strconv.ParseUint(device.NodeID, 10, 32)
		if err != nil {
			return fmt.Errorf("invalid device ID format: %s", device.NodeID)
		}

		mapping := &model.ATCommandMapping{
			DeviceID:    uint(deviceID),
			CommandType: cmdType,
			ATCommand:   cmdConfig.Command,
			Parameters:  cmdConfig.Parameters,
		}

		fmt.Printf("Creating AT command mapping: %+v\n", mapping)

		if err := s.SaveATCommandMapping(mapping); err != nil {
			return fmt.Errorf("failed to create AT command mapping: %v", err)
		}
	}

	return nil
}
