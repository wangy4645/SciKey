package device

import (
	"backend/internal/model"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// Handler 设备处理器
type Handler struct {
	service *Service
}

// NewHandler 创建设备处理器
func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// Register 注册路由
func (h *Handler) Register(r *gin.Engine) {
	// 设备管理API
	devices := r.Group("/api/devices")
	{
		devices.POST("", h.addDevice)
		devices.GET("", h.listDevices)
		devices.GET("/:id", h.getDevice)
		devices.PUT("/:id", h.updateDevice)
		devices.DELETE("/:id", h.deleteDevice)
		devices.GET("/:id/status", h.getDeviceStatus)
		devices.POST("/:id/command", h.handleCommand)
	}

	// AT指令映射API
	mappings := r.Group("/api/at-mappings")
	{
		mappings.GET("", h.listATCommandMappings)
		mappings.POST("", h.addATCommandMapping)
		mappings.PUT("/:id", h.updateATCommandMapping)
		mappings.DELETE("/:id", h.deleteATCommandMapping)
	}
}

// addDevice 添加设备
func (h *Handler) addDevice(c *gin.Context) {
	var device Device
	if err := c.ShouldBindJSON(&device); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.SaveDevice(&device); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, device)
}

// listDevices 获取设备列表
func (h *Handler) listDevices(c *gin.Context) {
	devices, err := h.service.ListDevices()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, devices)
}

// getDevice 获取设备信息
func (h *Handler) getDevice(c *gin.Context) {
	deviceID := c.Param("id")
	device, err := h.service.GetDevice(deviceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "设备不存在"})
		return
	}

	c.JSON(http.StatusOK, device)
}

// updateDevice 更新设备信息
func (h *Handler) updateDevice(c *gin.Context) {
	var device Device
	if err := c.ShouldBindJSON(&device); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.SaveDevice(&device); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, device)
}

// deleteDevice 删除设备
func (h *Handler) deleteDevice(c *gin.Context) {
	deviceID := c.Param("id")
	if err := h.service.DeleteDevice(deviceID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "设备删除成功"})
}

// getDeviceStatus 获取设备状态
func (h *Handler) getDeviceStatus(c *gin.Context) {
	deviceID := c.Param("id")
	device, err := h.service.GetDevice(deviceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "设备不存在"})
		return
	}

	status, err := h.service.GetDeviceStatus(device)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, status)
}

// handleCommand 处理设备命令
func (h *Handler) handleCommand(c *gin.Context) {
	deviceID := c.Param("id")
	device, err := h.service.GetDevice(deviceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "设备不存在"})
		return
	}

	var req NetManagerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证参数
	if err := req.ValidateParameters(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 发送命令
	resp, err := h.service.SendCommand(device, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// listATCommandMappings 获取AT指令映射列表
func (h *Handler) listATCommandMappings(c *gin.Context) {
	deviceID := c.Query("device_id")
	mappings, err := h.service.ListATCommandMappings(deviceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, mappings)
}

// addATCommandMapping 添加AT指令映射
func (h *Handler) addATCommandMapping(c *gin.Context) {
	var mapping ATCommandMapping
	if err := c.ShouldBindJSON(&mapping); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.SaveATCommandMapping(&mapping); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapping)
}

// updateATCommandMapping 更新AT指令映射
func (h *Handler) updateATCommandMapping(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	var mapping ATCommandMapping
	if err := c.ShouldBindJSON(&mapping); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mapping.ID = uint(id)
	if err := h.service.SaveATCommandMapping(&mapping); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapping)
}

// deleteATCommandMapping 删除AT指令映射
func (h *Handler) deleteATCommandMapping(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteATCommandMapping(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "AT指令映射删除成功"})
}

// CreateDevice 创建设备
func (h *Handler) CreateDevice(c *gin.Context) {
	var device model.Device
	if err := c.ShouldBindJSON(&device); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证必填字段
	if device.NodeID == "" || device.Name == "" || device.Type == "" || device.BoardType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NodeID, Name, Type and BoardType are required"})
		return
	}

	// 设置初始状态
	device.Status = "offline"
	device.LastSeen = time.Now()

	if err := h.service.CreateDevice(&device); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, device)
}
