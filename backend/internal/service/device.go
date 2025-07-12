package service

import (
	"backend/internal/db"
	"backend/internal/model"
	"errors"
	"strings"

	"gorm.io/gorm"
)

type DeviceService struct {
	db *gorm.DB
}

func NewDeviceService() *DeviceService {
	return &DeviceService{
		db: db.GetDB(),
	}
}

// CreateDevice 创建设备
func (s *DeviceService) CreateDevice(device *model.Device) error {
	return s.db.Create(device).Error
}

func (s *DeviceService) GetDevices() ([]model.Device, error) {
	var devices []model.Device
	result := s.db.Find(&devices)
	if result.Error != nil {
		return nil, result.Error
	}
	return devices, nil
}

// GetDeviceByID retrieves a device by its ID
func (s *DeviceService) GetDeviceByID(id uint) (*model.Device, error) {
	var device model.Device

	result := s.db.Where("id = ?", id).First(&device)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("device not found")
		}
		return nil, result.Error
	}

	return &device, nil
}

// GetDeviceByNodeID 根据NodeID获取设备
func (s *DeviceService) GetDeviceByNodeID(nodeID string) (*model.Device, error) {
	var device model.Device
	err := s.db.Where("node_id = ?", nodeID).First(&device).Error
	if err != nil {
		return nil, err
	}
	return &device, nil
}

// UpdateDevice 更新设备
func (s *DeviceService) UpdateDevice(device *model.Device) error {
	return s.db.Save(device).Error
}

// DeleteDevice 删除设备（彻底删除，不使用软删除）
func (s *DeviceService) DeleteDevice(id uint) error {
	// 开启事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 删除设备相关的所有数据
	// 1. 删除设备日志
	if err := tx.Unscoped().Where("device_id = ?", id).Delete(&model.DeviceLog{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 2. 删除命令日志
	if err := tx.Unscoped().Where("device_id = ?", id).Delete(&model.CommandLog{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 3. 删除设备配置
	if err := tx.Unscoped().Where("device_id = ?", id).Delete(&model.DeviceConfig{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 4. 删除监控数据
	if err := tx.Unscoped().Where("device_id = ?", id).Delete(&model.MonitorData{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 5. 删除AT指令映射（如果表存在）
	if err := tx.Unscoped().Where("device_id = ?", id).Delete(&model.ATCommandMapping{}).Error; err != nil {
		// 如果表不存在，忽略错误继续执行
		if !strings.Contains(err.Error(), "no such table") {
			tx.Rollback()
			return err
		}
	}

	// 6. 最后删除设备本身
	if err := tx.Unscoped().Delete(&model.Device{}, id).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 提交事务
	return tx.Commit().Error
}

func (s *DeviceService) UpdateDeviceStatus(id uint, status string) error {
	device, err := s.GetDeviceByID(id)
	if err != nil {
		return err
	}
	if device == nil {
		return nil
	}
	device.Status = status
	return s.UpdateDevice(device)
}

// GetDeviceStats 获取设备统计信息
func (s *DeviceService) GetDeviceStats() (map[string]interface{}, error) {
	var total, online, offline int64

	if err := s.db.Model(&model.Device{}).Count(&total).Error; err != nil {
		return nil, err
	}

	if err := s.db.Model(&model.Device{}).Where("status = ?", "Online").Count(&online).Error; err != nil {
		return nil, err
	}

	if err := s.db.Model(&model.Device{}).Where("status = ?", "Offline").Count(&offline).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total":   total,
		"online":  online,
		"offline": offline,
	}, nil
}

// CreateDeviceLog 创建设备日志
func (s *DeviceService) CreateDeviceLog(log *model.DeviceLog) error {
	return s.db.Create(log).Error
}

// GetDeviceLogs 获取设备日志
func (s *DeviceService) GetDeviceLogs(deviceID uint, limit int) ([]*model.DeviceLog, error) {
	var logs []*model.DeviceLog
	err := s.db.Where("device_id = ?", deviceID).Limit(limit).Find(&logs).Error
	return logs, err
}

// SaveDeviceConfig 保存设备配置
func (s *DeviceService) SaveDeviceConfig(config *model.DeviceConfig) error {
	return s.db.Create(config).Error
}

// GetDeviceConfig 获取设备配置
func (s *DeviceService) GetDeviceConfig(deviceID uint, category string) ([]*model.DeviceConfig, error) {
	var configs []*model.DeviceConfig
	err := s.db.Where("device_id = ? AND category = ?", deviceID, category).Find(&configs).Error
	return configs, err
}

// SendATCommand 发送AT命令到设备
func (s *DeviceService) SendATCommand(deviceID uint, command string) (string, error) {
	// 创建设备通信服务实例
	deviceComm := NewDeviceCommService(s.db)

	// 发送AT命令
	response, err := deviceComm.SendATCommand(deviceID, command)
	if err != nil {
		return "", err
	}

	return response, nil
}
