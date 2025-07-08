package device

import (
	"fmt"
	"strings"
	"time"

	"backend/internal/model"

	"gorm.io/gorm"
)

// CommandType 命令类型
type CommandType string

const (
	// 无线参数配置命令
	CommandTypeWirelessConfig CommandType = "wireless_config"
	// 安全配置命令
	CommandTypeSecurityConfig CommandType = "security_config"
	// 动态管理命令
	CommandTypeDynamicConfig CommandType = "dynamic_config"
	// 设备基础配置命令
	CommandTypeDeviceConfig CommandType = "device_config"
	// 状态命令
	CommandTypeStatus CommandType = "STATUS"
	// 配置命令
	CommandTypeConfig CommandType = "CONFIG"
)

// NetManagerRequest 网管请求
type NetManagerRequest struct {
	DeviceID    string                 `json:"device_id" binding:"required"`    // 设备ID
	CommandType string                 `json:"command_type" binding:"required"` // 命令类型
	Parameters  map[string]interface{} `json:"parameters" binding:"required"`   // 参数（JSON格式）
}

// NetManagerResponse 网管响应
type NetManagerResponse struct {
	Success bool   `json:"success"`         // 是否成功
	Result  string `json:"result"`          // 执行结果
	Error   string `json:"error,omitempty"` // 错误信息
}

// BoardRequest 板级请求
type BoardRequest struct {
	Action string `json:"action"` // 固定为"sendcmd"
	AT     string `json:"AT"`     // AT指令
}

// BoardResponse 板级响应
type BoardResponse struct {
	Retcode  int    `json:"retcode"`  // 返回码，1表示成功
	Response string `json:"response"` // 响应消息
}

// Device 设备模型
type Device struct {
	gorm.Model
	NodeID      string    `gorm:"uniqueIndex" json:"node_id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`       // 设备类型
	BoardType   string    `json:"board_type"` // 单板类型
	IP          string    `json:"ip"`
	Status      string    `json:"status"`
	Location    string    `json:"location"`
	Description string    `json:"description"`
	LastSeen    time.Time `json:"last_seen"`
}

// DeviceStatus 设备状态
type DeviceStatus struct {
	Status      string    `json:"status"`
	LastSeen    time.Time `json:"last_seen"`
	SignalLevel int       `json:"signal_level"`
	Battery     int       `json:"battery"`
	Temperature float64   `json:"temperature"`
}

// ParseParameters 解析网管参数
func (r *NetManagerRequest) ParseParameters() (map[string]interface{}, error) {
	return r.Parameters, nil
}

// ValidateParameters 验证网管参数
func (r *NetManagerRequest) ValidateParameters() error {
	params := r.Parameters
	switch CommandType(r.CommandType) {
	case CommandTypeWirelessConfig:
		// 验证无线参数
		if _, ok := params["frequency_band"]; !ok {
			return fmt.Errorf("缺少频段参数")
		}
		if _, ok := params["channel_width"]; !ok {
			return fmt.Errorf("缺少信道宽度参数")
		}
		if _, ok := params["center_frequency"]; !ok {
			return fmt.Errorf("缺少中心频率参数")
		}
		if _, ok := params["transmit_power"]; !ok {
			return fmt.Errorf("缺少发射功率参数")
		}
	case CommandTypeSecurityConfig:
		// 验证安全参数
		algorithm, ok := params["encryption_algorithm"]
		if !ok {
			return fmt.Errorf("缺少加密算法参数")
		}
		// 验证加密算法值
		algValue, ok := algorithm.(float64)
		if !ok {
			return fmt.Errorf("加密算法参数类型错误")
		}
		if algValue < 0 || algValue > 3 {
			return fmt.Errorf("加密算法值无效，应为0-3之间的整数")
		}
		if _, ok := params["encryption_key"]; !ok {
			return fmt.Errorf("缺少加密密钥参数")
		}
	case CommandTypeDynamicConfig:
		// 验证动态管理参数
		if _, ok := params["report_enabled"]; !ok {
			return fmt.Errorf("缺少上报使能参数")
		}
		if _, ok := params["flight_mode"]; !ok {
			return fmt.Errorf("缺少飞行模式参数")
		}
	case CommandTypeDeviceConfig:
		// 验证设备基础参数
		if _, ok := params["name"]; !ok {
			return fmt.Errorf("缺少设备名称参数")
		}
		if _, ok := params["ip"]; !ok {
			return fmt.Errorf("缺少IP地址参数")
		}
		if _, ok := params["node_type"]; !ok {
			return fmt.Errorf("缺少节点类型参数")
		}
	default:
		return fmt.Errorf("未知的命令类型: %s", r.CommandType)
	}
	return nil
}

// ConvertToBoardRequest 转换为板级请求
func (r *NetManagerRequest) ConvertToBoardRequest(mapping *model.ATCommandMapping) (*BoardRequest, error) {
	// 解析AT命令模板中的参数
	atCmd := mapping.ATCommand
	params := r.Parameters

	// 根据命令类型处理参数
	switch CommandType(r.CommandType) {
	case CommandTypeSecurityConfig:
		// 处理加密算法参数
		if algorithm, ok := params["encryption_algorithm"]; ok {
			// 将算法值转换为整数
			algValue, ok := algorithm.(float64)
			if !ok {
				return nil, fmt.Errorf("加密算法参数类型错误")
			}
			// 使用%d格式化整数
			atCmd = fmt.Sprintf(atCmd, int(algValue))
		}
	default:
		// 其他命令类型的处理保持不变
		for key, value := range params {
			placeholder := fmt.Sprintf("${%s}", key)
			atCmd = strings.ReplaceAll(atCmd, placeholder, fmt.Sprintf("%v", value))
		}
	}

	return &BoardRequest{
		Action: "sendcmd",
		AT:     atCmd,
	}, nil
}

// ParseBoardResponse 解析单板响应
func ParseBoardResponse(response *BoardResponse) (*NetManagerResponse, error) {
	if response.Retcode != 1 {
		return &NetManagerResponse{
			Success: false,
			Error:   response.Response,
		}, nil
	}

	return &NetManagerResponse{
		Success: true,
		Result:  response.Response,
	}, nil
}
