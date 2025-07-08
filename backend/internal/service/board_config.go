package service

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// BoardConfig 单板配置结构
type BoardConfig struct {
	BoardType   string                `yaml:"board_type"`
	Description string                `yaml:"description"`
	Version     string                `yaml:"version"`
	Commands    map[string]CommandDef `yaml:"commands"`
}

// CommandDef 命令定义结构
type CommandDef struct {
	ATCommand      string           `yaml:"at_command"`
	Description    string           `yaml:"description"`
	ResponseFormat string           `yaml:"response_format,omitempty"`
	Parameters     []BoardParameter `yaml:"parameters,omitempty"`
}

// BoardParameter 参数定义结构
type BoardParameter struct {
	Name        string        `yaml:"name"`
	Type        string        `yaml:"type"`
	Values      []interface{} `yaml:"values,omitempty"`
	Range       []int         `yaml:"range,omitempty"`
	Pattern     string        `yaml:"pattern,omitempty"`
	Description string        `yaml:"description"`
}

// BoardConfigManager 单板配置管理器
type BoardConfigManager struct {
	configs   map[string]*BoardConfig
	configDir string
}

// NewBoardConfigManager 创建单板配置管理器
func NewBoardConfigManager(configDir string) *BoardConfigManager {
	return &BoardConfigManager{
		configs:   make(map[string]*BoardConfig),
		configDir: configDir,
	}
}

// LoadBoardConfig 加载指定单板类型的配置
func (m *BoardConfigManager) LoadBoardConfig(boardType string) (*BoardConfig, error) {
	// 检查是否已加载
	if config, exists := m.configs[boardType]; exists {
		return config, nil
	}

	// 处理BoardType，移除可能的"board_"前缀
	cleanBoardType := boardType
	if strings.HasPrefix(boardType, "board_") {
		cleanBoardType = strings.TrimPrefix(boardType, "board_")
	}

	// 构建配置文件路径
	configFile := filepath.Join(m.configDir, fmt.Sprintf("board_%s.yaml", cleanBoardType))

	// 读取配置文件
	data, err := os.ReadFile(configFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read board config file %s: %v", configFile, err)
	}

	// 解析YAML
	var config BoardConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse board config file %s: %v", configFile, err)
	}

	// 验证配置
	if config.BoardType == "" {
		return nil, fmt.Errorf("invalid board config: missing board_type")
	}

	// 缓存配置
	m.configs[boardType] = &config

	return &config, nil
}

// GetCommand 获取指定命令的定义
func (m *BoardConfigManager) GetCommand(boardType, commandName string) (*CommandDef, error) {
	config, err := m.LoadBoardConfig(boardType)
	if err != nil {
		return nil, err
	}

	command, exists := config.Commands[commandName]
	if !exists {
		return nil, fmt.Errorf("command %s not found in board type %s", commandName, boardType)
	}

	return &command, nil
}

// FormatATCommand 格式化AT命令（替换参数）
func (m *BoardConfigManager) FormatATCommand(boardType, commandName string, params map[string]interface{}) (string, error) {
	command, err := m.GetCommand(boardType, commandName)
	if err != nil {
		return "", err
	}

	// 如果命令没有参数，直接返回
	if len(command.Parameters) == 0 {
		return command.ATCommand, nil
	}

	// 构建参数列表
	var args []interface{}
	for _, param := range command.Parameters {
		value, exists := params[param.Name]
		if !exists {
			return "", fmt.Errorf("missing required parameter: %s", param.Name)
		}

		// 验证参数值
		if err := m.validateParameter(param, value); err != nil {
			return "", fmt.Errorf("invalid parameter %s: %v", param.Name, err)
		}

		args = append(args, value)
	}

	// 格式化命令
	formatted := fmt.Sprintf(command.ATCommand, args...)
	return formatted, nil
}

// validateParameter 验证参数值
func (m *BoardConfigManager) validateParameter(param BoardParameter, value interface{}) error {
	switch param.Type {
	case "int":
		// 检查是否在指定范围内
		if len(param.Range) == 2 {
			intVal, ok := value.(int)
			if !ok {
				return fmt.Errorf("expected int, got %T", value)
			}
			if intVal < param.Range[0] || intVal > param.Range[1] {
				return fmt.Errorf("value %d out of range [%d, %d]", intVal, param.Range[0], param.Range[1])
			}
		}

		// 检查是否在指定值列表中
		if len(param.Values) > 0 {
			found := false
			for _, allowedValue := range param.Values {
				if value == allowedValue {
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("value %v not in allowed values %v", value, param.Values)
			}
		}

	case "string":
		strVal, ok := value.(string)
		if !ok {
			return fmt.Errorf("expected string, got %T", value)
		}

		// 检查正则表达式模式
		if param.Pattern != "" {
			// 这里可以添加正则表达式验证
			// 简化处理：检查是否为十六进制字符串
			if strings.Contains(param.Pattern, "[0-9A-Fa-f]+") {
				for _, char := range strVal {
					if !((char >= '0' && char <= '9') ||
						(char >= 'A' && char <= 'F') ||
						(char >= 'a' && char <= 'f')) {
						return fmt.Errorf("value %s does not match hex pattern", strVal)
					}
				}
			}
		}

		// 检查是否在指定值列表中
		if len(param.Values) > 0 {
			found := false
			for _, allowedValue := range param.Values {
				if value == allowedValue {
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("value %v not in allowed values %v", value, param.Values)
			}
		}
	}

	return nil
}

// GetAvailableCommands 获取指定单板类型的所有可用命令
func (m *BoardConfigManager) GetAvailableCommands(boardType string) (map[string]CommandDef, error) {
	config, err := m.LoadBoardConfig(boardType)
	if err != nil {
		return nil, err
	}

	return config.Commands, nil
}

// GetBoardConfig 获取完整的板级配置
func (m *BoardConfigManager) GetBoardConfig(boardType string) (*BoardConfig, error) {
	return m.LoadBoardConfig(boardType)
}
