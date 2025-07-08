package handler

import (
	"backend/internal/model"
	"backend/internal/service"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// MonitorHandler handles monitoring-related HTTP requests
type MonitorHandler struct {
	monitorService *service.MonitorService
}

// NewMonitorHandler creates a new monitor handler
func NewMonitorHandler(monitorService *service.MonitorService) *MonitorHandler {
	return &MonitorHandler{
		monitorService: monitorService,
	}
}

// GetMonitorData handles GET /api/devices/:id/monitor
func (h *MonitorHandler) GetMonitorData(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	// Parse time range from query parameters
	startTimeStr := c.DefaultQuery("start_time", time.Now().AddDate(0, 0, -1).Format(time.RFC3339))
	endTimeStr := c.DefaultQuery("end_time", time.Now().Format(time.RFC3339))

	startTime, err := time.Parse(time.RFC3339, startTimeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start time"})
		return
	}

	endTime, err := time.Parse(time.RFC3339, endTimeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end time"})
		return
	}

	data, err := h.monitorService.GetMonitorData(uint(deviceID), startTime, endTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, data)
}

// AddMonitorData handles POST /api/devices/:id/monitor
func (h *MonitorHandler) AddMonitorData(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var data model.MonitorData
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	data.DeviceID = uint(deviceID)
	if err := h.monitorService.AddMonitorData(&data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Check thresholds and create alerts if necessary
	if err := h.monitorService.CheckThresholds(&data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, data)
}

// GetMonitorConfig handles GET /api/devices/:id/monitor/config
func (h *MonitorHandler) GetMonitorConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	config, err := h.monitorService.GetMonitorConfig(uint(deviceID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

// UpdateMonitorConfig handles PUT /api/devices/:id/monitor/config
func (h *MonitorHandler) UpdateMonitorConfig(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	var config model.MonitorConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DeviceID = uint(deviceID)
	if err := h.monitorService.UpdateMonitorConfig(&config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

// GetAlerts handles GET /api/devices/:id/alerts
func (h *MonitorHandler) GetAlerts(c *gin.Context) {
	deviceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	status := c.DefaultQuery("status", "")
	alerts, err := h.monitorService.GetAlerts(uint(deviceID), status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, alerts)
}

// UpdateAlertStatus handles PUT /api/alerts/:id/status
func (h *MonitorHandler) UpdateAlertStatus(c *gin.Context) {
	alertID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.monitorService.UpdateAlertStatus(uint(alertID), req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Alert status updated successfully"})
}

// GetAllDevicesMonitorData handles GET /api/devices/monitor/all
func (h *MonitorHandler) GetAllDevicesMonitorData(c *gin.Context) {
	// 获取所有设备
	var devices []model.Device
	if err := h.monitorService.GetDB().Find(&devices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 解析时间范围
	startTimeStr := c.DefaultQuery("start_time", time.Now().AddDate(0, 0, -1).Format(time.RFC3339))
	endTimeStr := c.DefaultQuery("end_time", time.Now().Format(time.RFC3339))

	startTime, err := time.Parse(time.RFC3339, startTimeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start time"})
		return
	}

	endTime, err := time.Parse(time.RFC3339, endTimeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end time"})
		return
	}

	// 为每个设备获取最新的监控数据
	type deviceMonitorSummary struct {
		DeviceID      uint      `json:"device_id"`
		DeviceName    string    `json:"device_name"`
		DeviceIP      string    `json:"device_ip"`
		Status        string    `json:"status"`
		LastSeen      time.Time `json:"last_seen"`
		CPUUsage      float64   `json:"cpu_usage"`
		MemoryUsage   float64   `json:"memory_usage"`
		NetworkIn     float64   `json:"network_in"`
		NetworkOut    float64   `json:"network_out"`
		Temperature   float64   `json:"temperature"`
		SignalQuality float64   `json:"signal_quality"`
		HasData       bool      `json:"has_data"`
	}

	var results []deviceMonitorSummary

	for _, device := range devices {
		// 获取设备的最新监控数据
		data, err := h.monitorService.GetMonitorData(device.ID, startTime, endTime)
		if err != nil {
			// 如果获取监控数据失败，添加设备基本信息
			results = append(results, deviceMonitorSummary{
				DeviceID:      device.ID,
				DeviceName:    device.Name,
				DeviceIP:      device.IP,
				Status:        device.Status,
				LastSeen:      device.LastSeen,
				CPUUsage:      0,
				MemoryUsage:   0,
				NetworkIn:     0,
				NetworkOut:    0,
				Temperature:   0,
				SignalQuality: 0,
				HasData:       false,
			})
			continue
		}

		if len(data) > 0 {
			// 获取最新的监控数据
			latestData := data[0]
			results = append(results, deviceMonitorSummary{
				DeviceID:      device.ID,
				DeviceName:    device.Name,
				DeviceIP:      device.IP,
				Status:        device.Status,
				LastSeen:      latestData.Timestamp,
				CPUUsage:      latestData.CPUUsage,
				MemoryUsage:   latestData.MemoryUsage,
				NetworkIn:     latestData.NetworkIn,
				NetworkOut:    latestData.NetworkOut,
				Temperature:   latestData.Temperature,
				SignalQuality: latestData.SignalQuality,
				HasData:       true,
			})
		} else {
			// 没有监控数据，使用设备基本信息
			results = append(results, deviceMonitorSummary{
				DeviceID:      device.ID,
				DeviceName:    device.Name,
				DeviceIP:      device.IP,
				Status:        device.Status,
				LastSeen:      device.LastSeen,
				CPUUsage:      0,
				MemoryUsage:   0,
				NetworkIn:     0,
				NetworkOut:    0,
				Temperature:   0,
				SignalQuality: 0,
				HasData:       false,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"devices": results,
		"total":   len(results),
		"period": gin.H{
			"start_time": startTime,
			"end_time":   endTime,
		},
	})
}
