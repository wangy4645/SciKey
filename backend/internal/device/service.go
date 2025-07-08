package device

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
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

// DeleteDevice 删除设备
func (s *Service) DeleteDevice(deviceID string) error {
	if err := s.db.Where("node_id = ?", deviceID).Delete(&Device{}).Error; err != nil {
		return fmt.Errorf("删除设备失败: %w", err)
	}
	return nil
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
		switch device.Type {
		case "board_1.0":
			boardType = "1.0"
		case "board_6680":
			boardType = "6680"
		default:
			return fmt.Errorf("unknown device type: %s", device.Type)
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
		mapping := &model.ATCommandMapping{
			DeviceID:    device.NodeID,
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
