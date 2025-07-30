package handler

import (
	"backend/internal/model"
	"backend/internal/service"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type DeviceHandler struct {
	deviceService     *service.DeviceService
	deviceCommService *service.DeviceCommService
	configService     *service.ConfigService
	topologyService   *service.TopologyService // Add TopologyService
}

func NewDeviceHandler(
	deviceService *service.DeviceService,
	deviceCommService *service.DeviceCommService,
	configService *service.ConfigService,
	topologyService *service.TopologyService, // Add TopologyService to parameters
) *DeviceHandler {
	return &DeviceHandler{
		deviceService:     deviceService,
		deviceCommService: deviceCommService,
		configService:     configService,
		topologyService:   topologyService, // Initialize TopologyService
	}
}

// CreateDeviceRequest 创建设备请求
type CreateDeviceRequest struct {
	NodeID      string `json:"node_id" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Type        string `json:"type" binding:"required"`
	BoardType   string `json:"board_type" binding:"required"`
	IP          string `json:"ip"`
	Location    string `json:"location"`
	Description string `json:"description"`
}

// UpdateDeviceRequest 更新设备请求
type UpdateDeviceRequest struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	IP          string `json:"ip"`
	Location    string `json:"location"`
	Description string `json:"description"`
}

// CreateDevice 创建设备
func (h *DeviceHandler) CreateDevice(c *gin.Context) {
	var req CreateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if NodeID already exists
	if _, err := h.deviceService.GetDeviceByNodeID(req.NodeID); err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Node ID already exists",
		})
		return
	}

	// Create new device
	device := &model.Device{
		NodeID:      req.NodeID,
		Name:        req.Name,
		Type:        req.Type,
		BoardType:   req.BoardType,
		IP:          req.IP,
		Status:      "Offline", // Default offline status
		Location:    req.Location,
		Description: req.Description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.deviceService.CreateDevice(device); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Record operation log
	log := &model.DeviceLog{
		DeviceID:  device.ID,
		Type:      "create",
		Message:   "Device created",
		CreatedAt: time.Now(),
	}
	h.deviceService.CreateDeviceLog(log)

	c.JSON(http.StatusOK, gin.H{"message": "Device created successfully", "device": device})
}

// GetDevices 获取所有设备
func (h *DeviceHandler) GetDevices(c *gin.Context) {
	devices, err := h.deviceService.GetDevices()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"devices": devices})
}

// GetDevice 获取单个设备
func (h *DeviceHandler) GetDevice(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"device": device})
}

// UpdateDevice 更新设备
func (h *DeviceHandler) UpdateDevice(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var req UpdateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	// Update fields
	if req.Name != "" {
		device.Name = req.Name
	}
	if req.Type != "" {
		device.Type = req.Type
	}
	if req.IP != "" {
		device.IP = req.IP
	}
	if req.Location != "" {
		device.Location = req.Location
	}
	if req.Description != "" {
		device.Description = req.Description
	}
	device.UpdatedAt = time.Now()

	if err := h.deviceService.UpdateDevice(device); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Record operation log
	log := &model.DeviceLog{
		DeviceID:  device.ID,
		Type:      "update",
		Message:   "Device updated",
		CreatedAt: time.Now(),
	}
	h.deviceService.CreateDeviceLog(log)

	c.JSON(http.StatusOK, gin.H{"message": "Device updated successfully", "device": device})
}

// DeleteDevice 删除设备
func (h *DeviceHandler) DeleteDevice(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	_, err = h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	if err := h.deviceService.DeleteDevice(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Device deleted successfully"})
}

// UpdateDeviceStatus 更新设备状态
func (h *DeviceHandler) UpdateDeviceStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.deviceService.UpdateDeviceStatus(uint(id), req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Device status updated successfully"})
}

// GetDeviceStats 获取设备统计信息
func (h *DeviceHandler) GetDeviceStats(c *gin.Context) {
	stats, err := h.deviceService.GetDeviceStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

// GetDeviceLogs 获取设备日志
func (h *DeviceHandler) GetDeviceLogs(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}

	logs, err := h.deviceService.GetDeviceLogs(uint(id), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}

// SendATCommand 发送AT命令到设备
func (h *DeviceHandler) SendATCommand(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var req struct {
		Command string `json:"command" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取设备信息
	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	// 发送AT命令
	response, err := h.deviceCommService.SendATCommand(uint(id), req.Command)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 记录操作日志
	log := &model.DeviceLog{
		DeviceID:  device.ID,
		Type:      "at_command",
		Message:   "AT command sent: " + req.Command,
		CreatedAt: time.Now(),
	}
	h.deviceService.CreateDeviceLog(log)

	c.JSON(http.StatusOK, gin.H{"message": "AT command sent successfully", "response": response})
}

// SendATCommandByName 根据命令名称发送AT命令
func (h *DeviceHandler) SendATCommandByName(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var req struct {
		CommandName string                 `json:"command_name" binding:"required"`
		Params      map[string]interface{} `json:"params,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取设备信息
	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	// 发送AT命令
	response, err := h.deviceCommService.SendATCommandByName(uint(id), req.CommandName, req.Params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 记录操作日志
	log := &model.DeviceLog{
		DeviceID:  device.ID,
		Type:      "at_command",
		Message:   "AT command sent by name: " + req.CommandName,
		CreatedAt: time.Now(),
	}
	h.deviceService.CreateDeviceLog(log)

	c.JSON(http.StatusOK, gin.H{"message": "AT command sent successfully", "response": response})
}

// GetAvailableCommands 获取设备可用命令
func (h *DeviceHandler) GetAvailableCommands(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	// 获取可用命令
	commands, err := h.deviceCommService.GetAvailableCommands(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"commands": commands})
}

// SyncDeviceConfig 同步设备配置从单板到数据库
func (h *DeviceHandler) SyncDeviceConfig(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	// 获取设备信息
	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	// 同步设备配置
	syncResult, err := h.deviceCommService.SyncDeviceConfig(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 记录操作日志
	log := &model.DeviceLog{
		DeviceID:  device.ID,
		Type:      "config_sync",
		Message:   fmt.Sprintf("Device configuration synchronized from board. Success: %d/%d", syncResult["success_count"], syncResult["total_commands"]),
		CreatedAt: time.Now(),
	}
	h.deviceService.CreateDeviceLog(log)

	c.JSON(http.StatusOK, gin.H{
		"message": "Device configuration synchronized successfully",
		"result":  syncResult,
	})
}

// SyncDeviceConfigByType 按配置类型同步设备配置
func (h *DeviceHandler) SyncDeviceConfigByType(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	configType := c.Param("type")
	if configType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Config type is required"})
		return
	}

	// 获取设备信息
	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	// 按类型同步设备配置
	syncResult, err := h.deviceCommService.SyncDeviceConfigByType(uint(id), configType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 记录操作日志
	log := &model.DeviceLog{
		DeviceID:  device.ID,
		Type:      "config_sync",
		Message:   fmt.Sprintf("Device %s configuration synchronized from board. Success: %d/%d", configType, syncResult["success_count"], syncResult["total_commands"]),
		CreatedAt: time.Now(),
	}
	h.deviceService.CreateDeviceLog(log)

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Device %s configuration synchronized successfully", configType),
		"result":  syncResult,
	})
}

// RebootDevice 重启设备
func (h *DeviceHandler) RebootDevice(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	// 获取设备信息
	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	// 发送重启命令
	response, err := h.deviceCommService.SendATCommandByName(uint(id), "reboot_device", nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to reboot device: %v", err)})
		return
	}

	// 记录操作日志
	log := &model.DeviceLog{
		DeviceID:  device.ID,
		Type:      "reboot",
		Message:   "Device reboot command sent successfully",
		CreatedAt: time.Now(),
	}
	h.deviceService.CreateDeviceLog(log)

	c.JSON(http.StatusOK, gin.H{
		"message":  "Device reboot command sent successfully",
		"response": response,
	})
}

// LoginDevice 登录设备
func (h *DeviceHandler) LoginDevice(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 登录设备
	err = h.deviceCommService.LoginDevice(uint(id), req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Device logged in successfully"})
}

// GetKey 获取当前设备Key
func (h *DeviceHandler) GetKey(c *gin.Context) {
	idStr := c.Param("id")
	_, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}
	// 假设设备有Key字段，或通过AT指令获取（此处简单返回空或模拟）
	c.JSON(http.StatusOK, gin.H{"key": ""})
}

// SetKey 设置设备Key
func (h *DeviceHandler) SetKey(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}
	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}
	var req struct {
		Key string `json:"key"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	key := req.Key
	if key != "" {
		if len(key) > 64 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Key must be no more than 32 bytes (64 hex chars)"})
			return
		}
		if len(key)%2 != 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Key length must be even"})
			return
		}
		for _, ch := range key {
			if !((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Key must be hex (0-9, a-f, A-F)"})
				return
			}
		}
	}
	// 发送AT指令
	atCmd := "AT^KEY=" + key
	_, err = h.deviceCommService.SendATCommand(device.ID, atCmd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send AT command: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Key updated successfully"})
}

// GetWirelessConfig 获取无线配置
func (h *DeviceHandler) GetWirelessConfig(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	// 从配置服务获取无线配置
	configRaw, err := h.configService.GetDeviceConfigs(uint(id), "wireless")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get wireless config"})
		return
	}

	// 将配置转换为前端期望的格式
	if wirelessConfig, ok := configRaw.(model.WirelessConfig); ok {
		// 解析frequency_band字符串为数组
		var frequencyBandArray []string
		if wirelessConfig.FrequencyBand != "" {
			err := json.Unmarshal([]byte(wirelessConfig.FrequencyBand), &frequencyBandArray)
			if err != nil {
			} else {
			}
		}

		responseConfig := gin.H{
			"frequency_band":    frequencyBandArray,
			"bandwidth":         wirelessConfig.Bandwidth,
			"building_chain":    wirelessConfig.BuildingChain,
			"frequency_hopping": wirelessConfig.FrequencyHopping,
		}

		c.JSON(http.StatusOK, gin.H{
			"config": responseConfig,
		})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid config type"})
	}
}

// SetFrequencyBand 设置频段
func (h *DeviceHandler) SetFrequencyBand(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}
	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}
	var req struct {
		Bands []string `json:"bands"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 根据AT^DAOCNDI指令文档，将频段转换为十六进制位图
	// Bit0: 800M频段, Bit2: 1.4G频段, Bit3: 2.4G频段
	var bandBitmap int = 0
	for _, band := range req.Bands {
		switch band {
		case "800M":
			bandBitmap |= 1 << 0 // Bit0 = 1
		case "1.4G":
			bandBitmap |= 1 << 2 // Bit2 = 4
		case "2.4G":
			bandBitmap |= 1 << 3 // Bit3 = 8
		}
	}

	// 验证位图值是否在合理范围内 (0-15，因为只有4个bit位)
	if bandBitmap < 0 || bandBitmap > 15 {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid band bitmap value: %d (0x%X). Must be between 0-15.", bandBitmap, bandBitmap)})
		return
	}

	// 发送AT指令设置频段 - 使用十六进制字符串格式（不带引号），符合AT指令文档要求
	atCmd := fmt.Sprintf("AT^DAOCNDI=%02X", bandBitmap)
	response, err := h.deviceCommService.SendATCommand(device.ID, atCmd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send AT command"})
		return
	}

	// 检查AT指令响应
	if strings.Contains(response, "ERROR") {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set frequency band"})
		return
	}

	// 保存配置到数据库
	wirelessConfigs := map[string]interface{}{
		"frequency_band": req.Bands,
	}

	err = h.configService.SaveDeviceConfigs(uint(id), "wireless", wirelessConfigs)
	if err != nil {
	}

	c.JSON(http.StatusOK, gin.H{"message": "Frequency band set successfully"})
}

// SetBandwidth 设置带宽
func (h *DeviceHandler) SetBandwidth(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}
	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}
	var req struct {
		Bandwidth string `json:"bandwidth"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 将带宽字符串转换为AT指令中的数值
	var bandwidthValue int
	switch req.Bandwidth {
	case "1.4M":
		bandwidthValue = 0
	case "3M":
		bandwidthValue = 1
	case "5M":
		bandwidthValue = 2
	case "10M":
		bandwidthValue = 3
	case "20M":
		bandwidthValue = 5
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bandwidth value"})
		return
	}

	// 先读取当前频点和功率
	getParamsResp, err := h.deviceCommService.SendATCommand(device.ID, "AT^DRPC?")
	var currentFreq, currentPower string
	if err == nil && strings.Contains(getParamsResp, "^DRPC:") {
		parts := strings.Split(getParamsResp, "^DRPC:")
		if len(parts) > 1 {
			value := strings.TrimSpace(parts[1])
			value = strings.Split(value, "\r")[0]
			value = strings.Split(value, "\n")[0]
			values := strings.Split(value, ",")
			if len(values) >= 3 {
				currentFreq = strings.TrimSpace(values[0])
				currentPower = strings.Trim(strings.TrimSpace(values[2]), "\"")
			}
		}
	}
	if currentFreq == "" {
		currentFreq = "24020" // 默认频点
	}
	if currentPower == "" {
		currentPower = "27" // 默认功率
	}

	// 发送AT指令设置带宽 (使用AT^DRPS存储到NVRAM)
	atCmdStore := fmt.Sprintf("AT^DRPS=%s,%d,\"%s\"", currentFreq, bandwidthValue, currentPower)
	_, err = h.deviceCommService.SendATCommand(device.ID, atCmdStore)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send AT^DRPS command"})
		return
	}

	// 同时发送AT^DRPC实时生效
	atCmdActive := fmt.Sprintf("AT^DRPC=%s,%d,\"%s\"", currentFreq, bandwidthValue, currentPower)
	_, err = h.deviceCommService.SendATCommand(device.ID, atCmdActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send AT^DRPC command"})
		return
	}

	// 保存配置到数据库
	wirelessConfigs := map[string]interface{}{
		"bandwidth": req.Bandwidth,
	}

	err = h.configService.SaveDeviceConfigs(uint(id), "wireless", wirelessConfigs)
	if err != nil {
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bandwidth set successfully"})
}

// SetBuildingChain 设置建链频率点
func (h *DeviceHandler) SetBuildingChain(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}
	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}
	var req struct {
		FrequencyPoint string `json:"frequencyPoint"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if req.FrequencyPoint == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Frequency point cannot be empty"})
		return
	}

	// 解析用户输入的频点范围，格式如 "24015-24814,8060-8259,14279-14478"
	// 根据AT^DSONSBR指令文档，需要为每个频段设置对应的band编号
	frequencyRanges := strings.Split(req.FrequencyPoint, ",")
	var atCmdParts []string

	for _, rangeStr := range frequencyRanges {
		rangeStr = strings.TrimSpace(rangeStr)
		if rangeStr == "" {
			continue
		}

		// 解析频点范围，格式如 "24015-24814"
		parts := strings.Split(rangeStr, "-")
		if len(parts) != 2 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid frequency range format. Expected format: start-end"})
			return
		}

		startFreq, err := strconv.Atoi(strings.TrimSpace(parts[0]))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start frequency"})
			return
		}

		endFreq, err := strconv.Atoi(strings.TrimSpace(parts[1]))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end frequency"})
			return
		}

		// 根据频点范围确定band编号
		var band int
		switch {
		case startFreq >= 24015 && endFreq <= 24814:
			band = 64 // BAND64
		case startFreq >= 8060 && endFreq <= 8259:
			band = 65 // BAND65
		case startFreq >= 14279 && endFreq <= 14478:
			band = 66 // BAND66
		case startFreq >= 17850 && endFreq <= 18049:
			band = 67 // BAND67
		case startFreq >= 51500 && endFreq <= 58499:
			band = 69 // BAND69
		case startFreq >= 5000 && endFreq <= 6999:
			band = 71 // BAND71
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Frequency range not supported"})
			return
		}

		atCmdParts = append(atCmdParts, fmt.Sprintf("%d,%d,%d", band, startFreq, endFreq))
	}

	if len(atCmdParts) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid frequency ranges provided"})
		return
	}

	// 发送AT指令设置建链频率点
	atCmd := fmt.Sprintf("AT^DSONSBR=%s", strings.Join(atCmdParts, ","))
	_, err = h.deviceCommService.SendATCommand(device.ID, atCmd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send AT command"})
		return
	}

	// 保存配置到数据库
	wirelessConfigs := map[string]interface{}{
		"building_chain": req.FrequencyPoint,
	}

	err = h.configService.SaveDeviceConfigs(uint(id), "wireless", wirelessConfigs)
	if err != nil {
	}

	c.JSON(http.StatusOK, gin.H{"message": "Building chain set successfully"})
}

// SetFrequencyHopping 设置跳频
func (h *DeviceHandler) SetFrequencyHopping(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}
	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 发送AT指令设置跳频 (使用AT^DFHC)
	var atCmd string
	if req.Enabled {
		atCmd = "AT^DFHC=1"
	} else {
		atCmd = "AT^DFHC=0"
	}
	_, err = h.deviceCommService.SendATCommand(device.ID, atCmd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send AT command"})
		return
	}

	// 保存配置到数据库
	wirelessConfigs := map[string]interface{}{
		"frequency_hopping": req.Enabled,
	}

	err = h.configService.SaveDeviceConfigs(uint(id), "wireless", wirelessConfigs)
	if err != nil {
	}

	c.JSON(http.StatusOK, gin.H{"message": "Frequency hopping set successfully"})
}

// SetDrprReporting 设置DRPR Reporting状态
func (h *DeviceHandler) SetDrprReporting(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取设备信息
	_, err = h.deviceService.GetDeviceByID(uint(deviceID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	// 发送AT命令
	var atCommand string
	if req.Enabled {
		atCommand = "AT^DRPR=1" // 启动DRPR Reporting
	} else {
		atCommand = "AT^DRPR=0" // 停止DRPR Reporting
	}

	// 发送AT命令到设备
	result, err := h.deviceCommService.SendATCommand(uint(deviceID), atCommand)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to send AT command: %v", err)})
		return
	}

	// 更新数据库中的DebugConfig
	status := "inactive"
	if req.Enabled {
		status = "active"
	}

	// 更新DebugConfig表中的drpr_reporting字段
	debugConfigs := map[string]interface{}{
		"drpr_reporting": status,
	}

	err = h.configService.SaveDeviceConfigs(uint(deviceID), "debug", debugConfigs)
	if err != nil {
	}

	// 记录日志
	log := &model.DeviceLog{
		DeviceID:  uint(deviceID),
		Type:      "drpr_reporting",
		Message:   fmt.Sprintf("DRPR reporting %s, AT command: %s, Result: %s", status, atCommand, result),
		CreatedAt: time.Now(),
	}
	h.deviceService.CreateDeviceLog(log)

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("DRPR reporting %s successfully", status),
		"result":  result,
	})
}

// SetDebugSwitch 设置Debug Switch状态
func (h *DeviceHandler) SetDebugSwitch(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取设备信息
	_, err = h.deviceService.GetDeviceByID(uint(deviceID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	// 发送AT命令
	var atCommand string
	if req.Enabled {
		atCommand = "AT^DEBUG=1" // 启动Debug Switch
	} else {
		atCommand = "AT^DEBUG=0" // 停止Debug Switch
	}

	// 发送AT命令到设备
	result, err := h.deviceCommService.SendATCommand(uint(deviceID), atCommand)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to send AT command: %v", err)})
		return
	}

	// 更新数据库中的DebugConfig
	status := "inactive"
	if req.Enabled {
		status = "active"
	}

	// 更新DebugConfig表中的debug_switch字段
	debugConfigs := map[string]interface{}{
		"debug_switch": status,
	}

	err = h.configService.SaveDeviceConfigs(uint(deviceID), "debug", debugConfigs)
	if err != nil {
	}

	// 记录日志
	log := &model.DeviceLog{
		DeviceID:  uint(deviceID),
		Type:      "debug_switch",
		Message:   fmt.Sprintf("Debug switch %s, AT command: %s, Result: %s", status, atCommand, result),
		CreatedAt: time.Now(),
	}
	h.deviceService.CreateDeviceLog(log)

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Debug switch %s successfully", status),
		"result":  result,
	})
}

// CheckDeviceStatus 检测设备状态
func (h *DeviceHandler) CheckDeviceStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	// 获取设备信息
	device, err := h.deviceService.GetDeviceByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	// 检测设备状态
	status, err := h.deviceCommService.GetDeviceStatus(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"device_id": device.ID,
		"ip":        device.IP,
		"status":    status,
		"last_seen": time.Now(),
	})
}

// CheckAllDevicesStatus 批量检测所有设备状态
func (h *DeviceHandler) CheckAllDevicesStatus(c *gin.Context) {
	// 获取所有设备
	devices, err := h.deviceService.GetDevices()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 并发检测所有设备状态
	type deviceStatus struct {
		DeviceID uint      `json:"device_id"`
		IP       string    `json:"ip"`
		Name     string    `json:"name"`
		Status   string    `json:"status"`
		LastSeen time.Time `json:"last_seen"`
		Error    string    `json:"error,omitempty"`
	}

	results := make([]deviceStatus, 0, len(devices))
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, device := range devices {
		wg.Add(1)
		go func(d model.Device) {
			defer wg.Done()

			status, err := h.deviceCommService.GetDeviceStatus(d.ID)
			if err != nil {
				mu.Lock()
				results = append(results, deviceStatus{
					DeviceID: d.ID,
					IP:       d.IP,
					Name:     d.Name,
					Status:   "Unknown",
					LastSeen: time.Now(),
					Error:    err.Error(),
				})
				mu.Unlock()
				return
			}

			mu.Lock()
			results = append(results, deviceStatus{
				DeviceID: d.ID,
				IP:       d.IP,
				Name:     d.Name,
				Status:   status,
				LastSeen: time.Now(),
			})
			mu.Unlock()
		}(device)
	}

	wg.Wait()

	// 统计结果
	onlineCount := 0
	offlineCount := 0
	unknownCount := 0

	for _, result := range results {
		switch result.Status {
		case "Online":
			onlineCount++
		case "Offline":
			offlineCount++
		default:
			unknownCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"devices":    results,
		"total":      len(devices),
		"online":     onlineCount,
		"offline":    offlineCount,
		"unknown":    unknownCount,
		"checked_at": time.Now(),
	})
}

// ReportLinks allows a device to report its currently visible neighbors, updating the topology.
func (h *DeviceHandler) ReportLinks(c *gin.Context) {
	idStr := c.Param("id")
	sourceDeviceID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid source device ID"})
		return
	}

	var req struct {
		Neighbors []string `json:"neighbors"` // Expecting a list of neighbor NodeIDs
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	// Call the service to update the links
	err = h.topologyService.UpdateDeviceLinks(uint(sourceDeviceID), req.Neighbors)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update device links: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Device links updated successfully"})
}
