package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"regexp"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
	"gorm.io/gorm"
)

// 配置类别常量
const (
	ConfigCategoryNetState   = "net_state"
	ConfigCategorySecurity   = "security"
	ConfigCategoryWireless   = "wireless"
	ConfigCategoryNetSetting = "net_setting"
	ConfigCategoryUpDown     = "up_down"
	ConfigCategoryDebug      = "debug"
	ConfigCategorySystem     = "system"
)

// ConfigService 配置服务
type ConfigService struct {
	db         *gorm.DB
	deviceRepo *repository.DeviceRepository
	deviceComm *DeviceCommService
}

// NewConfigService 创建配置服务实例
func NewConfigService(db *gorm.DB, deviceRepo *repository.DeviceRepository) *ConfigService {
	deviceComm := NewDeviceCommService(db)
	return &ConfigService{
		db:         db,
		deviceRepo: deviceRepo,
		deviceComm: deviceComm,
	}
}

func (s *ConfigService) GetConfigCategories() ([]string, error) {
	var categories []string
	err := s.db.Model(&model.ConfigTemplate{}).Distinct().Pluck("category", &categories).Error
	return categories, err
}

func (s *ConfigService) GetConfigTemplate(category string) (*model.ConfigTemplate, error) {
	var template model.ConfigTemplate
	err := s.db.Where("category = ?", category).First(&template).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (s *ConfigService) GetDeviceConfigs(deviceID uint, category string) (interface{}, error) {
	switch category {
	case ConfigCategoryNetState:
		var netConfig model.NetworkConfig
		err := s.db.Where("device_id = ?", deviceID).First(&netConfig).Error
		if err == gorm.ErrRecordNotFound {
			// 尝试从DeviceConfig表中读取同步的数据
			var deviceConfigs []model.DeviceConfig
			err = s.db.Where("device_id = ? AND category = ?", deviceID, category).Find(&deviceConfigs).Error
			if err == nil && len(deviceConfigs) > 0 {
				// 将DeviceConfig数据转换为NetworkConfig格式
				configMap := make(map[string]interface{})
				for _, config := range deviceConfigs {
					configMap[config.Key] = config.Value
				}
				return configMap, nil
			}
			// 如果记录不存在，返回默认配置
			return map[string]interface{}{
				"ip":        "",
				"subnet":    "",
				"gateway":   "",
				"dns":       "",
				"mac":       "",
				"hostname":  "",
				"status":    "offline",
				"last_seen": "",
			}, nil
		}
		if err != nil {
			return nil, err
		}
		return netConfig, nil

	case ConfigCategorySecurity:
		var securityConfig model.SecurityConfig
		result := s.db.Where("device_id = ?", deviceID).First(&securityConfig)
		if result.Error != nil {
			if errors.Is(result.Error, gorm.ErrRecordNotFound) {
				// 尝试从DeviceConfig表中读取同步的数据
				var deviceConfigs []model.DeviceConfig
				err := s.db.Where("device_id = ? AND category = ?", deviceID, category).Find(&deviceConfigs).Error
				if err == nil && len(deviceConfigs) > 0 {
					// 将DeviceConfig数据转换为SecurityConfig格式
					configMap := make(map[string]interface{})
					for _, config := range deviceConfigs {
						configMap[config.Key] = config.Value
					}
					return configMap, nil
				}
				// 如果记录不存在，返回默认配置
				defaultConfig := model.SecurityConfig{
					DeviceID:            deviceID,
					EncryptionAlgorithm: 0, // none
					EncryptionKey:       "",
				}
				// 创建默认配置记录
				if err := s.db.Create(&defaultConfig).Error; err != nil {
					return nil, fmt.Errorf("failed to create default security config: %v", err)
				}
				return defaultConfig, nil
			}
			return nil, fmt.Errorf("failed to fetch security config: %v", result.Error)
		}
		return securityConfig, nil

	case ConfigCategoryWireless:
		var wirelessConfig model.WirelessConfig
		err := s.db.Where("device_id = ?", deviceID).First(&wirelessConfig).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 尝试从DeviceConfig表中读取同步的数据
				var deviceConfigs []model.DeviceConfig
				err = s.db.Where("device_id = ? AND category = ?", deviceID, category).Find(&deviceConfigs).Error
				if err == nil && len(deviceConfigs) > 0 {
					// 将DeviceConfig数据转换为WirelessConfig格式
					configMap := make(map[string]interface{})
					for _, config := range deviceConfigs {
						configMap[config.Key] = config.Value
					}
					return configMap, nil
				}
				log.Printf("No wireless config found for device %d, returning defaults", deviceID)
				// 返回默认的Wireless配置，不创建数据库记录
				defaultConfig := model.WirelessConfig{
					DeviceID:         deviceID,
					Bandwidth:        "1.4M",
					BuildingChain:    "",
					FrequencyHopping: false,
				}
				defaultConfig.SetFrequencyBandArray([]string{})
				return defaultConfig, nil
			} else {
				return nil, err
			}
		}
		log.Printf("Found wireless config for device %d: %+v", deviceID, wirelessConfig)
		return wirelessConfig, nil

	case ConfigCategoryNetSetting:
		var netSettingConfig model.NetworkConfig
		err := s.db.Where("device_id = ?", deviceID).First(&netSettingConfig).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 尝试从DeviceConfig表中读取同步的数据
				var deviceConfigs []model.DeviceConfig
				err = s.db.Where("device_id = ? AND category = ?", deviceID, category).Find(&deviceConfigs).Error
				if err == nil && len(deviceConfigs) > 0 {
					// 将DeviceConfig数据转换为NetworkConfig格式
					configMap := make(map[string]interface{})
					for _, config := range deviceConfigs {
						configMap[config.Key] = config.Value
					}
					return configMap, nil
				}
				// 返回默认的Network配置，不创建数据库记录
				return model.NetworkConfig{
					DeviceID: deviceID,
					IP:       "192.168.1.100",
				}, nil
			} else {
				return nil, err
			}
		}
		return netSettingConfig, nil

	case ConfigCategoryUpDown:
		var upDownConfig model.UpDownConfig
		err := s.db.Where("device_id = ?", deviceID).First(&upDownConfig).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 尝试从DeviceConfig表中读取同步的数据
				var deviceConfigs []model.DeviceConfig
				err = s.db.Where("device_id = ? AND category = ?", deviceID, category).Find(&deviceConfigs).Error
				if err == nil && len(deviceConfigs) > 0 {
					// 将DeviceConfig数据转换为UpDownConfig格式
					configMap := make(map[string]interface{})
					for _, config := range deviceConfigs {
						configMap[config.Key] = config.Value
					}
					return configMap, nil
				}
				// 返回默认的UpDown配置，不创建数据库记录
				return model.UpDownConfig{
					DeviceID:       deviceID,
					CurrentSetting: "",
					Setting:        "",
				}, nil
			} else {
				return nil, err
			}
		}
		return upDownConfig, nil

	case ConfigCategoryDebug:
		var debugConfig model.DebugConfig
		err := s.db.Where("device_id = ?", deviceID).First(&debugConfig).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 尝试从DeviceConfig表中读取同步的数据
				var deviceConfigs []model.DeviceConfig
				err = s.db.Where("device_id = ? AND category = ?", deviceID, category).Find(&deviceConfigs).Error
				if err == nil && len(deviceConfigs) > 0 {
					// 将DeviceConfig数据转换为DebugConfig格式
					configMap := make(map[string]interface{})
					for _, config := range deviceConfigs {
						configMap[config.Key] = config.Value
					}
					return configMap, nil
				}
				// 创建默认的Debug配置
				debugConfig = model.DebugConfig{
					DeviceID:              deviceID,
					DebugSwitch:           "inactive",
					DrprReporting:         "inactive",
					ActiveEscalationCheck: "inactive",
				}
				if err := s.db.Create(&debugConfig).Error; err != nil {
					return nil, fmt.Errorf("failed to create default debug config: %v", err)
				}
			} else {
				return nil, err
			}
		}
		return debugConfig, nil

	case ConfigCategorySystem:
		var systemConfig model.SystemConfig
		err := s.db.Where("device_id = ?", deviceID).First(&systemConfig).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 尝试从DeviceConfig表中读取同步的数据
				var deviceConfigs []model.DeviceConfig
				err = s.db.Where("device_id = ? AND category = ?", deviceID, category).Find(&deviceConfigs).Error
				if err == nil && len(deviceConfigs) > 0 {
					// 将DeviceConfig数据转换为SystemConfig格式
					configMap := make(map[string]interface{})
					for _, config := range deviceConfigs {
						configMap[config.Key] = config.Value
					}
					return configMap, nil
				}
				// 返回默认的System配置，不创建数据库记录
				return model.SystemConfig{
					DeviceID:         deviceID,
					Timezone:         "Asia/Shanghai",
					Language:         "en_US",
					AutoUpdate:       true,
					UpdateSchedule:   "daily",
					LogLevel:         "info",
					LogRetention:     30,
					BackupEnabled:    true,
					BackupSchedule:   "daily",
					BackupRetention:  30,
					RemoteAccess:     false,
					RemoteAccessPort: 22,
					RemoteAccessSSL:  false,
					SNMPEnabled:      false,
					SNMPCommunity:    "public",
					PowerManagement:  false,
					TemperatureUnit:  "celsius",
					FanControl:       false,
					LEDControl:       true,
					LEDBrightness:    50,
				}, nil
			} else {
				return nil, err
			}
		}
		return systemConfig, nil

	default:
		return nil, fmt.Errorf("unknown config category: %s", category)
	}
}

func (s *ConfigService) SaveDeviceConfigs(deviceID uint, category string, configs map[string]interface{}) error {
	// 根据配置类别选择对应的处理方式
	switch category {
	case ConfigCategoryNetState:
		var netConfig model.NetworkConfig
		if err := mapToStruct(configs, &netConfig); err != nil {
			return fmt.Errorf("invalid network state configuration: %v", err)
		}
		netConfig.DeviceID = deviceID
		if err := s.db.Save(&netConfig).Error; err != nil {
			return fmt.Errorf("failed to save network state configuration: %v", err)
		}
		return nil

	case ConfigCategorySecurity:
		// 1. 查询原有配置
		oldConfigRaw, err := s.GetDeviceConfigs(deviceID, category)
		if err != nil {
			return fmt.Errorf("failed to get old security config: %v", err)
		}
		// 2. 转为map[string]interface{}
		var oldConfigMap map[string]interface{}
		jsonBytes, _ := json.Marshal(oldConfigRaw)
		json.Unmarshal(jsonBytes, &oldConfigMap)
		// 3. 用新提交字段覆盖
		for k, v := range configs {
			oldConfigMap[k] = v
		}
		// 4. 用补全后的map做mapToStruct
		var securityConfig model.SecurityConfig
		if err := mapToStruct(oldConfigMap, &securityConfig); err != nil {
			return fmt.Errorf("failed to map security config: %v", err)
		}
		securityConfig.DeviceID = deviceID

		tx := s.db.Begin()
		if tx.Error != nil {
			return fmt.Errorf("failed to start transaction: %v", tx.Error)
		}
		result := tx.Model(&model.SecurityConfig{}).Where("device_id = ?", deviceID).Updates(securityConfig)
		if result.Error != nil {
			tx.Rollback()
			return fmt.Errorf("failed to update security config: %v", result.Error)
		}
		if result.RowsAffected == 0 {
			if err := tx.Create(&securityConfig).Error; err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to create security config: %v", err)
			}
		}
		if err := tx.Commit().Error; err != nil {
			return fmt.Errorf("failed to commit transaction: %v", err)
		}

		// 发送AT+CONFIG指令（如果encryption_key存在）
		if _, ok := configs["encryption_key"]; ok {
			getStr := func(k string, def string) string {
				if v, ok := configs[k]; ok && v != nil {
					return fmt.Sprintf("%v", v)
				}
				if v, ok := oldConfigMap[k]; ok && v != nil {
					return fmt.Sprintf("%v", v)
				}
				return def
			}
			encryption := getStr("encryption_algorithm", "0")
			params := []string{
				"0", // frequency_band
				"0", // bandwidth
				"0", // center_freq
				"0", // transmit_power
				encryption,
				getStr("encryption_key", ""),
			}
			atCmd := "AT+CONFIG=" + strings.Join(params, ",")
			_, err := s.deviceComm.SendATCommand(deviceID, atCmd)
			if err != nil {
				log.Printf("Failed to send AT+CONFIG: %v", err)
			}
		}
		return nil

	case ConfigCategoryWireless:
		log.Printf("Saving wireless config for device %d: %+v", deviceID, configs)

		// 1. 查询原有配置
		oldConfigRaw, err := s.GetDeviceConfigs(deviceID, category)
		if err != nil {
			return fmt.Errorf("failed to get old wireless config: %v", err)
		}

		// 2. 转为map[string]interface{}
		var oldConfigMap map[string]interface{}
		jsonBytes, _ := json.Marshal(oldConfigRaw)
		json.Unmarshal(jsonBytes, &oldConfigMap)
		log.Printf("Old wireless config: %+v", oldConfigMap)

		// 3. 用新提交字段覆盖
		for k, v := range configs {
			oldConfigMap[k] = v
		}
		log.Printf("Merged wireless config: %+v", oldConfigMap)

		// 4. 用补全后的map做mapToStruct
		var wirelessConfig model.WirelessConfig
		if err := mapToStruct(oldConfigMap, &wirelessConfig); err != nil {
			return fmt.Errorf("invalid wireless configuration: %v", err)
		}
		wirelessConfig.DeviceID = deviceID

		// 检查是否已存在记录
		var existingConfig model.WirelessConfig
		err = s.db.Where("device_id = ?", deviceID).First(&existingConfig).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				log.Printf("Creating new wireless config for device %d", deviceID)
				// 创建新记录
				if err := s.db.Create(&wirelessConfig).Error; err != nil {
					return fmt.Errorf("failed to create wireless configuration: %v", err)
				}
			} else {
				return fmt.Errorf("failed to check existing wireless config: %v", err)
			}
		} else {
			log.Printf("Updating existing wireless config for device %d", deviceID)
			// 更新现有记录，使用Updates方法并只更新提供的字段
			updateData := make(map[string]interface{})
			for k, v := range configs {
				// 特殊处理frequency_band字段
				if k == "frequency_band" {
					switch val := v.(type) {
					case []string:
						jsonBytes, _ := json.Marshal(val)
						updateData[k] = string(jsonBytes)
					case []interface{}:
						var bands []string
						for _, band := range val {
							if bandStr, ok := band.(string); ok {
								bands = append(bands, bandStr)
							}
						}
						jsonBytes, _ := json.Marshal(bands)
						updateData[k] = string(jsonBytes)
					default:
						updateData[k] = v
					}
				} else {
					updateData[k] = v
				}
			}
			log.Printf("Update data: %+v", updateData)

			// 使用Model().Updates()方法，这样可以正确处理JSON字段
			if err := s.db.Model(&model.WirelessConfig{}).Where("device_id = ?", deviceID).Updates(updateData).Error; err != nil {
				return fmt.Errorf("failed to update wireless configuration: %v", err)
			}
		}
		return nil

	case ConfigCategoryNetSetting:
		var netSettingConfig model.NetworkConfig
		if err := mapToStruct(configs, &netSettingConfig); err != nil {
			return fmt.Errorf("invalid network setting configuration: %v", err)
		}
		netSettingConfig.DeviceID = deviceID
		if err := s.db.Save(&netSettingConfig).Error; err != nil {
			return fmt.Errorf("failed to save network setting configuration: %v", err)
		}

		// 发送 AT 命令设置 IP 地址
		if netSettingConfig.IP != "" {
			atCommand := fmt.Sprintf("AT^NETIFCFG=2,\"%s\"", netSettingConfig.IP)
			_, err := s.deviceComm.SendATCommand(deviceID, atCommand)
			if err != nil {
				log.Printf("Error sending AT command for IP setting: %v", err)
				// 不返回错误，因为配置已经保存到数据库
			}
		}

		return nil

	case ConfigCategoryUpDown:
		var upDownConfig model.UpDownConfig
		if err := mapToStruct(configs, &upDownConfig); err != nil {
			return fmt.Errorf("invalid up-down configuration: %v", err)
		}

		upDownConfig.DeviceID = deviceID

		if err := s.db.Save(&upDownConfig).Error; err != nil {
			return fmt.Errorf("failed to save up-down configuration: %v", err)
		}

		// 发送 TDD 配置的 AT 命令
		if upDownConfig.Setting != "" {
			// 根据设置值映射到对应的配置索引
			var configIndex string
			switch upDownConfig.Setting {
			case "2D3U":
				configIndex = "0"
			case "3D2U":
				configIndex = "1"
			case "4D1U":
				configIndex = "2"
			case "1D4U":
				configIndex = "3"
			default:
				log.Printf("Invalid TDD setting: %s", upDownConfig.Setting)
				return nil
			}

			atCommand := fmt.Sprintf("AT^TDDCONFIG=%s", configIndex)
			_, err := s.deviceComm.SendATCommand(deviceID, atCommand)
			if err != nil {
				log.Printf("Error sending AT command for TDD config: %v", err)
				// 不返回错误，因为配置已经保存到数据库
			}
		}

		return nil

	case ConfigCategoryDebug:
		// 1. 查询原有配置
		oldConfigRaw, err := s.GetDeviceConfigs(deviceID, category)
		if err != nil {
			return fmt.Errorf("failed to get old debug config: %v", err)
		}

		// 2. 转为map[string]interface{}
		var oldConfigMap map[string]interface{}
		jsonBytes, _ := json.Marshal(oldConfigRaw)
		json.Unmarshal(jsonBytes, &oldConfigMap)

		// 3. 用新提交字段覆盖
		for k, v := range configs {
			oldConfigMap[k] = v
		}

		// 4. 用补全后的map做mapToStruct
		var debugConfig model.DebugConfig
		if err := mapToStruct(oldConfigMap, &debugConfig); err != nil {
			return fmt.Errorf("invalid debug configuration: %v", err)
		}
		debugConfig.DeviceID = deviceID

		if err := s.db.Save(&debugConfig).Error; err != nil {
			return fmt.Errorf("failed to save debug configuration: %v", err)
		}
		return nil

	case ConfigCategorySystem:
		var systemConfig model.SystemConfig
		if err := mapToStruct(configs, &systemConfig); err != nil {
			return fmt.Errorf("invalid system configuration: %v", err)
		}
		systemConfig.DeviceID = deviceID
		if err := s.db.Save(&systemConfig).Error; err != nil {
			return fmt.Errorf("failed to save system configuration: %v", err)
		}
		return nil

	default:
		return fmt.Errorf("unsupported config category: %s", category)
	}
}

// mapToStruct 将 map 转换为结构体
func mapToStruct(m map[string]interface{}, v interface{}) error {
	// 特殊处理 WirelessConfig 的 frequency_band 字段
	if wirelessConfig, ok := v.(*model.WirelessConfig); ok {
		if val, ok := m["frequency_band"]; ok {
			// 从map中移除frequency_band，避免JSON序列化错误
			delete(m, "frequency_band")

			switch v := val.(type) {
			case []string:
				wirelessConfig.SetFrequencyBandArray(v)
			case []interface{}:
				// 将 []interface{} 转换为 []string
				var bands []string
				for _, band := range v {
					if bandStr, ok := band.(string); ok {
						bands = append(bands, bandStr)
					}
				}
				wirelessConfig.SetFrequencyBandArray(bands)
			}
		}
	}

	// 将 map 转换为 JSON 字节
	jsonBytes, err := json.Marshal(m)
	if err != nil {
		return fmt.Errorf("failed to marshal map to JSON: %v", err)
	}

	// 将 JSON 字节解析为结构体
	if err := json.Unmarshal(jsonBytes, v); err != nil {
		return fmt.Errorf("failed to unmarshal JSON to struct: %v", err)
	}

	// 特殊处理 SecurityConfig 的字段类型
	if securityConfig, ok := v.(*model.SecurityConfig); ok {
		// 处理 EncryptionAlgorithm
		if val, ok := m["encryption_algorithm"]; ok {
			switch v := val.(type) {
			case float64:
				securityConfig.EncryptionAlgorithm = int(v)
			case int:
				securityConfig.EncryptionAlgorithm = v
			case string:
				switch v {
				case "none":
					securityConfig.EncryptionAlgorithm = 0
				case "snow3g":
					securityConfig.EncryptionAlgorithm = 1
				case "aes":
					securityConfig.EncryptionAlgorithm = 2
				case "zuc":
					securityConfig.EncryptionAlgorithm = 3
				default:
					return fmt.Errorf("invalid encryption_algorithm value: %s", v)
				}
			default:
				return fmt.Errorf("invalid type for encryption_algorithm: %T", val)
			}
		}

		// 处理 EncryptionKey
		if val, ok := m["encryption_key"]; ok {
			securityConfig.EncryptionKey = val.(string)
		}
	}

	return nil
}

func (s *ConfigService) ValidateConfig(config map[string]interface{}) error {
	fmt.Printf("Validating config: %+v\n", config)

	// 检查配置类别
	category, ok := config["category"].(string)
	if !ok {
		return fmt.Errorf("missing required field: category")
	}

	switch category {
	case ConfigCategoryNetSetting:
		// 只验证 IP 字段
		if ip, exists := config["ip"]; exists {
			if ipStr, ok := ip.(string); ok {
				if !isValidIP(ipStr) {
					return fmt.Errorf("invalid IP address format: %s", ipStr)
				}
			} else {
				return fmt.Errorf("invalid type for ip: expected string")
			}
		}

	case ConfigCategorySecurity:
		// 检查必需字段
		requiredFields := []string{
			"device_id",
			// 移除其他字段作为必需字段，使其变为可选
		}

		for _, field := range requiredFields {
			if _, exists := config[field]; !exists {
				return fmt.Errorf("missing required field: %s", field)
			}
		}

		// 验证字段类型（只验证存在的字段）
		if _, ok := config["device_id"].(float64); !ok {
			return fmt.Errorf("invalid type for device_id: expected number")
		}

		// 验证其他字段（如果存在）
		if val, exists := config["firewall_enabled"]; exists {
			if _, ok := val.(bool); !ok {
				return fmt.Errorf("invalid type for firewall_enabled: expected boolean")
			}
		}

		if val, exists := config["ssh_enabled"]; exists {
			if _, ok := val.(bool); !ok {
				return fmt.Errorf("invalid type for ssh_enabled: expected boolean")
			}
		}

		if val, exists := config["ssh_port"]; exists {
			if _, ok := val.(float64); !ok {
				return fmt.Errorf("invalid type for ssh_port: expected number")
			}
			sshPort := int(val.(float64))
			if sshPort < 1 || sshPort > 65535 {
				return fmt.Errorf("invalid ssh_port: must be between 1 and 65535")
			}
		}

		if val, exists := config["ssh_key_auth"]; exists {
			if _, ok := val.(bool); !ok {
				return fmt.Errorf("invalid type for ssh_key_auth: expected boolean")
			}
		}

		if val, exists := config["ssh_password_auth"]; exists {
			if _, ok := val.(bool); !ok {
				return fmt.Errorf("invalid type for ssh_password_auth: expected boolean")
			}
		}

		if val, exists := config["vpn_enabled"]; exists {
			if _, ok := val.(bool); !ok {
				return fmt.Errorf("invalid type for vpn_enabled: expected boolean")
			}
		}

		if val, exists := config["vpn_type"]; exists {
			if _, ok := val.(string); !ok {
				return fmt.Errorf("invalid type for vpn_type: expected string")
			}
			vpnType := val.(string)
			validVPNTypes := map[string]bool{
				"openvpn": true,
				"ipsec":   true,
				"l2tp":    true,
				"pptp":    true,
			}
			if !validVPNTypes[vpnType] {
				return fmt.Errorf("invalid vpn_type: must be one of openvpn, ipsec, l2tp, pptp")
			}
		}

		if val, exists := config["vpn_config"]; exists {
			if _, ok := val.(string); !ok {
				return fmt.Errorf("invalid type for vpn_config: expected string")
			}
		}

		if val, exists := config["access_control_list"]; exists {
			if _, ok := val.(string); !ok {
				return fmt.Errorf("invalid type for access_control_list: expected string")
			}
		}

		if val, exists := config["security_log_level"]; exists {
			if _, ok := val.(string); !ok {
				return fmt.Errorf("invalid type for security_log_level: expected string")
			}
			logLevel := val.(string)
			validLogLevels := map[string]bool{
				"debug":   true,
				"info":    true,
				"warning": true,
				"error":   true,
			}
			if !validLogLevels[logLevel] {
				return fmt.Errorf("invalid security_log_level: must be one of debug, info, warning, error")
			}
		}

		if val, exists := config["security_alerts"]; exists {
			if _, ok := val.(bool); !ok {
				return fmt.Errorf("invalid type for security_alerts: expected boolean")
			}
		}

		if val, exists := config["security_updates"]; exists {
			if _, ok := val.(bool); !ok {
				return fmt.Errorf("invalid type for security_updates: expected boolean")
			}
		}

		if val, exists := config["security_scan_period"]; exists {
			if _, ok := val.(float64); !ok {
				return fmt.Errorf("invalid type for security_scan_period: expected number")
			}
			scanPeriod := int(val.(float64))
			if scanPeriod < 1 || scanPeriod > 365 {
				return fmt.Errorf("invalid security_scan_period: must be between 1 and 365")
			}
		}

	case ConfigCategoryWireless:
		// 验证无线配置字段
		if val, exists := config["frequency_band"]; exists {
			if _, ok := val.([]interface{}); !ok {
				return fmt.Errorf("invalid type for frequency_band: expected array")
			}
		}

		if val, exists := config["bandwidth"]; exists {
			if _, ok := val.(string); !ok {
				return fmt.Errorf("invalid type for bandwidth: expected string")
			}
		}

		if val, exists := config["building_chain"]; exists {
			if _, ok := val.(string); !ok {
				return fmt.Errorf("invalid type for building_chain: expected string")
			}
		}

		if val, exists := config["frequency_hopping"]; exists {
			if _, ok := val.(bool); !ok {
				return fmt.Errorf("invalid type for frequency_hopping: expected boolean")
			}
		}

	case ConfigCategoryUpDown:
		// 验证 UP-DOWN 配置字段
		if val, exists := config["setting"]; exists {
			if settingStr, ok := val.(string); ok {
				// 验证 TDD 设置值
				validSettings := map[string]bool{
					"2D3U": true,
					"3D2U": true,
					"4D1U": true,
					"1D4U": true,
				}
				if !validSettings[settingStr] {
					return fmt.Errorf("invalid TDD setting: must be one of 2D3U, 3D2U, 4D1U, 1D4U")
				}
			} else {
				return fmt.Errorf("invalid type for setting: expected string")
			}
		}

	case ConfigCategoryDebug:
		// 验证调试配置字段
		if val, exists := config["debug_switch"]; exists {
			if _, ok := val.(string); !ok {
				return fmt.Errorf("invalid type for debug_switch: expected string")
			}
		}

		if val, exists := config["active_escalation_check"]; exists {
			if _, ok := val.(string); !ok {
				return fmt.Errorf("invalid type for active_escalation_check: expected string")
			}
		}

	case ConfigCategorySystem:
		// 验证系统配置字段
		if val, exists := config["timezone"]; exists {
			if _, ok := val.(string); !ok {
				return fmt.Errorf("invalid type for timezone: expected string")
			}
		}

		if val, exists := config["language"]; exists {
			if _, ok := val.(string); !ok {
				return fmt.Errorf("invalid type for language: expected string")
			}
		}

		if val, exists := config["auto_update"]; exists {
			if _, ok := val.(bool); !ok {
				return fmt.Errorf("invalid type for auto_update: expected boolean")
			}
		}

		if val, exists := config["log_level"]; exists {
			if _, ok := val.(string); !ok {
				return fmt.Errorf("invalid type for log_level: expected string")
			}
		}

	default:
		return fmt.Errorf("unsupported config category: %s", category)
	}

	return nil
}

// isValidIP 验证 IP 地址格式
func isValidIP(ip string) bool {
	parts := strings.Split(ip, ".")
	if len(parts) != 4 {
		return false
	}

	for _, part := range parts {
		num, err := strconv.Atoi(part)
		if err != nil || num < 0 || num > 255 {
			return false
		}
	}

	return true
}

// isValidSubnet 验证子网掩码格式
func isValidSubnet(subnet string) bool {
	parts := strings.Split(subnet, ".")
	if len(parts) != 4 {
		return false
	}

	for _, part := range parts {
		num, err := strconv.Atoi(part)
		if err != nil || num < 0 || num > 255 {
			return false
		}
	}

	return true
}

// isValidMAC 验证 MAC 地址格式
func isValidMAC(mac string) bool {
	parts := strings.Split(mac, ":")
	if len(parts) != 6 {
		return false
	}

	for _, part := range parts {
		if len(part) != 2 {
			return false
		}
		_, err := strconv.ParseInt(part, 16, 64)
		if err != nil {
			return false
		}
	}

	return true
}

func (s *ConfigService) GetDeviceConfigOverview(deviceID uint) (map[string]interface{}, error) {
	var configs []model.Config
	err := s.db.Where("device_id = ?", deviceID).Find(&configs).Error
	if err != nil {
		return nil, err
	}

	overview := make(map[string]interface{})
	for _, config := range configs {
		if _, exists := overview[config.Category]; !exists {
			overview[config.Category] = make(map[string]interface{})
		}
		overview[config.Category].(map[string]interface{})[config.Key] = config.Value
	}

	return overview, nil
}

// Helper function to convert interface{} to string
func toString(value interface{}) string {
	switch v := value.(type) {
	case string:
		return v
	case int:
		return fmt.Sprintf("%d", v)
	case float64:
		return fmt.Sprintf("%f", v)
	case bool:
		if v {
			return "true"
		}
		return "false"
	default:
		return ""
	}
}

// IsValidCommand 检查命令是否有效
func (s *ConfigService) IsValidCommand(command string) bool {
	// 从 board_1.0.yaml 中读取命令列表
	commands, err := s.loadBoardCommands("1.0")
	if err != nil {
		return false
	}

	// 检查命令是否存在
	_, exists := commands[command]
	return exists
}

// ValidateCommandParameters 验证命令参数
func (s *ConfigService) ValidateCommandParameters(command string, parameters map[string]interface{}) error {
	// 从 board_1.0.yaml 中读取命令定义
	commands, err := s.loadBoardCommands("1.0")
	if err != nil {
		return err
	}

	cmd, exists := commands[command]
	if !exists {
		return fmt.Errorf("command %s not found", command)
	}

	// 验证必需参数
	for _, param := range cmd.Parameters {
		value, exists := parameters[param.Name]
		if !exists {
			return fmt.Errorf("missing required parameter: %s", param.Name)
		}

		// 验证参数类型
		switch param.Type {
		case "int":
			// 处理整数类型
			var intValue int
			switch v := value.(type) {
			case float64:
				intValue = int(v)
			case int:
				intValue = v
			case int64:
				intValue = int(v)
			default:
				return fmt.Errorf("parameter %s must be an integer", param.Name)
			}

			// 验证值范围
			if param.Values != nil {
				found := false
				for _, v := range param.Values {
					if intValue == v.(int) {
						found = true
						break
					}
				}
				if !found {
					return fmt.Errorf("invalid value for parameter %s", param.Name)
				}
			}
		case "string":
			if _, ok := value.(string); !ok {
				return fmt.Errorf("parameter %s must be a string", param.Name)
			}
			// 验证字符串格式
			if param.Pattern != "" {
				matched, err := regexp.MatchString(param.Pattern, value.(string))
				if err != nil || !matched {
					return fmt.Errorf("invalid format for parameter %s", param.Name)
				}
			}
		}
	}

	return nil
}

// ExecuteCommand 执行命令
func (s *ConfigService) ExecuteCommand(deviceID uint, command string, parameters map[string]interface{}) error {
	// 从 board_1.0.yaml 中读取命令定义
	commands, err := s.loadBoardCommands("1.0")
	if err != nil {
		return err
	}

	cmd, exists := commands[command]
	if !exists {
		return fmt.Errorf("command %s not found", command)
	}

	// 构建 AT 命令
	atCommand := cmd.ATCommand
	for _, param := range cmd.Parameters {
		value := parameters[param.Name]
		// 根据参数类型格式化值
		switch param.Type {
		case "int":
			// 处理整数类型
			var intValue int
			switch v := value.(type) {
			case float64:
				intValue = int(v)
			case int:
				intValue = v
			case int64:
				intValue = int(v)
			default:
				return fmt.Errorf("parameter %s must be an integer", param.Name)
			}
			atCommand = strings.Replace(atCommand, "%d", fmt.Sprintf("%d", intValue), 1)
		case "string":
			atCommand = strings.Replace(atCommand, "%s", value.(string), 1)
		}
	}

	// 发送 AT 命令到设备
	response, err := s.deviceComm.SendATCommand(deviceID, atCommand)
	if err != nil {
		return fmt.Errorf("failed to send AT command: %v", err)
	}

	// 记录命令执行结果
	err = s.deviceRepo.SaveCommandLog(deviceID, command, atCommand, response)
	if err != nil {
		return fmt.Errorf("failed to save command log: %v", err)
	}

	return nil
}

// loadBoardCommands 从 YAML 文件加载命令定义
func (s *ConfigService) loadBoardCommands(boardType string) (map[string]Command, error) {
	// 读取 YAML 文件
	data, err := os.ReadFile(fmt.Sprintf("config/boards/board_%s.yaml", boardType))
	if err != nil {
		return nil, err
	}

	var boardConfig struct {
		Commands map[string]Command `yaml:"commands"`
	}
	if err := yaml.Unmarshal(data, &boardConfig); err != nil {
		return nil, err
	}

	return boardConfig.Commands, nil
}

// Command 表示 AT 命令定义
type Command struct {
	ATCommand      string      `yaml:"at_command"`
	Description    string      `yaml:"description"`
	Parameters     []Parameter `yaml:"parameters"`
	ResponseFormat string      `yaml:"response_format,omitempty"`
}

// Parameter 表示命令参数定义
type Parameter struct {
	Name        string        `yaml:"name"`
	Type        string        `yaml:"type"`
	Values      []interface{} `yaml:"values,omitempty"`
	Range       []int         `yaml:"range,omitempty"`
	Pattern     string        `yaml:"pattern,omitempty"`
	Description string        `yaml:"description"`
}
