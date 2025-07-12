package handler

import (
	"backend/internal/model"
	"backend/internal/service"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"log"

	"github.com/gin-gonic/gin"
)

type ConfigHandler struct {
	configService *service.ConfigService
}

func NewConfigHandler(configService *service.ConfigService) *ConfigHandler {
	return &ConfigHandler{
		configService: configService,
	}
}

func (h *ConfigHandler) GetConfigCategories(c *gin.Context) {
	categories, err := h.configService.GetConfigCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, categories)
}

func (h *ConfigHandler) GetConfigTemplate(c *gin.Context) {
	category := c.Param("category")
	template, err := h.configService.GetConfigTemplate(category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, template)
}

func (h *ConfigHandler) GetDeviceConfigs(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	category := c.Param("category")
	configs, err := h.configService.GetDeviceConfigs(uint(deviceID), category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, configs)
}

func (h *ConfigHandler) SaveDeviceConfigs(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	category := c.Param("category")
	var configs map[string]interface{}
	if err := c.ShouldBindJSON(&configs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.configService.SaveDeviceConfigs(uint(deviceID), category, configs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Configurations saved successfully"})
}

func (h *ConfigHandler) ValidateConfig(c *gin.Context) {
	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.configService.ValidateConfig(config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Configuration is valid"})
}

func (h *ConfigHandler) GetDeviceConfigOverview(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	overview, err := h.configService.GetDeviceConfigOverview(uint(deviceID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, overview)
}

// GetNetworkConfig handles GET /api/devices/:id/configs/net_setting
func (h *ConfigHandler) GetNetworkConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	configs, err := h.configService.GetDeviceConfigs(uint(deviceID), "net_setting")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"config": configs,
	})
}

// UpdateNetworkConfig handles PUT /api/devices/:id/configs/net_setting
func (h *ConfigHandler) UpdateNetworkConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证 IP 地址格式
	if ip, exists := config["ip"]; exists {
		if ipStr, ok := ip.(string); ok {
			// 简单的 IP 地址验证
			if !isValidIP(ipStr) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid IP address format"})
				return
			}
		}
	}

	if err := h.configService.SaveDeviceConfigs(uint(deviceID), "net_setting", config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Network configuration updated successfully"})
}

// isValidIP 验证 IP 地址格式
func isValidIP(ip string) bool {
	// 简单的 IP 地址验证
	parts := strings.Split(ip, ".")
	if len(parts) != 4 {
		return false
	}

	for _, part := range parts {
		if num, err := strconv.Atoi(part); err != nil || num < 0 || num > 255 {
			return false
		}
	}
	return true
}

// GetSecurityConfig handles GET /api/devices/:id/configs/security
func (h *ConfigHandler) GetSecurityConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	configs, err := h.configService.GetDeviceConfigs(uint(deviceID), "security")
	if err != nil {
		log.Printf("Error getting security config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"config": configs})
}

// UpdateSecurityConfig handles PUT /api/devices/:id/configs/security
func (h *ConfigHandler) UpdateSecurityConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var configs map[string]interface{}
	if err := c.ShouldBindJSON(&configs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.configService.SaveDeviceConfigs(uint(deviceID), "security", configs); err != nil {
		log.Printf("Error updating security config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Security configuration updated successfully"})
}

// GetWirelessConfig handles GET /api/devices/:id/configs/wireless
func (h *ConfigHandler) GetWirelessConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	config, err := h.configService.GetDeviceConfigs(uint(deviceID), "wireless")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("GetWirelessConfig: Raw config type: %T", config)
	log.Printf("GetWirelessConfig: Raw config value: %+v", config)

	// 将配置转换为前端期望的格式
	if wirelessConfig, ok := config.(model.WirelessConfig); ok {
		log.Printf("GetWirelessConfig: Successfully cast to WirelessConfig")
		// 解析frequency_band字符串为数组
		var frequencyBandArray []string
		log.Printf("Original FrequencyBand string: %s", wirelessConfig.FrequencyBand)
		if wirelessConfig.FrequencyBand != "" {
			err := json.Unmarshal([]byte(wirelessConfig.FrequencyBand), &frequencyBandArray)
			if err != nil {
				log.Printf("Error parsing frequency_band: %v", err)
			} else {
				log.Printf("Parsed frequency_band array: %+v", frequencyBandArray)
			}
		}

		responseConfig := gin.H{
			"device_id":         wirelessConfig.DeviceID,
			"ssid":              wirelessConfig.SSID,
			"password":          wirelessConfig.Password,
			"security_type":     wirelessConfig.SecurityType,
			"channel":           wirelessConfig.Channel,
			"channel_width":     wirelessConfig.ChannelWidth,
			"transmit_power":    wirelessConfig.TransmitPower,
			"hidden_ssid":       wirelessConfig.HiddenSSID,
			"mac_filtering":     wirelessConfig.MACFiltering,
			"mac_filter_list":   wirelessConfig.MACFilterList,
			"wps_enabled":       wirelessConfig.WPSEnabled,
			"guest_network":     wirelessConfig.GuestNetwork,
			"guest_ssid":        wirelessConfig.GuestSSID,
			"guest_password":    wirelessConfig.GuestPassword,
			"guest_isolation":   wirelessConfig.GuestIsolation,
			"band_steering":     wirelessConfig.BandSteering,
			"auto_channel":      wirelessConfig.AutoChannel,
			"roaming_enabled":   wirelessConfig.RoamingEnabled,
			"roaming_threshold": wirelessConfig.RoamingThreshold,
			"frequency_band":    frequencyBandArray,
			"bandwidth":         wirelessConfig.Bandwidth,
			"building_chain":    wirelessConfig.BuildingChain,
			"frequency_hopping": wirelessConfig.FrequencyHopping,
		}

		log.Printf("Response config: %+v", responseConfig)

		c.JSON(http.StatusOK, gin.H{"config": responseConfig})
	} else {
		log.Printf("GetWirelessConfig: Failed to cast to WirelessConfig, returning raw config")
		c.JSON(http.StatusOK, gin.H{"config": config})
	}
}

// UpdateWirelessConfig handles PUT /api/devices/:id/configs/wireless
func (h *ConfigHandler) UpdateWirelessConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.configService.SaveDeviceConfigs(uint(deviceID), "wireless", config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Wireless configuration updated successfully"})
}

// GetSystemConfig handles GET /api/devices/:id/configs/system
func (h *ConfigHandler) GetSystemConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	config, err := h.configService.GetDeviceConfigs(uint(deviceID), "system")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"config": config})
}

// UpdateSystemConfig handles PUT /api/devices/:id/configs/system
func (h *ConfigHandler) UpdateSystemConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.configService.SaveDeviceConfigs(uint(deviceID), "system", config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "System configuration updated successfully"})
}

// GetUpDownConfig handles GET /api/devices/:id/configs/updown
func (h *ConfigHandler) GetUpDownConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	config, err := h.configService.GetDeviceConfigs(uint(deviceID), "up_down")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"config": config})
}

// UpdateUpDownConfig handles PUT /api/devices/:id/configs/updown
func (h *ConfigHandler) UpdateUpDownConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		log.Printf("Error binding JSON in UpdateUpDownConfig: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Updating UP-DOWN config for device %d: %+v", deviceID, config)

	if err := h.configService.SaveDeviceConfigs(uint(deviceID), "up_down", config); err != nil {
		log.Printf("Error updating UP-DOWN config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("UP-DOWN config updated successfully for device %d", deviceID)
	c.JSON(http.StatusOK, gin.H{"message": "UP-DOWN configuration updated successfully"})
}

// GetDebugConfig handles GET /api/devices/:id/configs/debug
func (h *ConfigHandler) GetDebugConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	config, err := h.configService.GetDeviceConfigs(uint(deviceID), "debug")
	if err != nil {
		log.Printf("Error getting debug config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Debug config for device %d: %+v", deviceID, config)
	c.JSON(http.StatusOK, gin.H{"config": config})
}

// UpdateDebugConfig handles PUT /api/devices/:id/configs/debug
func (h *ConfigHandler) UpdateDebugConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.configService.SaveDeviceConfigs(uint(deviceID), "debug", config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Debug configuration updated successfully"})
}

// GetDeviceConfig 获取设备配置
func (h *ConfigHandler) GetDeviceConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	configType := c.Param("type")
	if configType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Config type is required"})
		return
	}

	config, err := h.configService.GetDeviceConfigs(uint(deviceID), configType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"config": config,
	})
}

// GetDeviceTypeConfig handles GET /api/devices/:id/configs/device_type
func (h *ConfigHandler) GetDeviceTypeConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	config, err := h.configService.GetDeviceConfigs(uint(deviceID), "device_type")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"config": config})
}

// UpdateDeviceTypeConfig handles PUT /api/devices/:id/configs/device_type
func (h *ConfigHandler) UpdateDeviceTypeConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Updating device type config for device %d: %+v", deviceID, config)

	if err := h.configService.SaveDeviceConfigs(uint(deviceID), "device_type", config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Device type configuration updated successfully"})
}
