package repository

import (
	"backend/internal/model"

	"gorm.io/gorm"
)

// DeviceRepository 设备仓库接口
type DeviceRepository struct {
	db *gorm.DB
}

// NewDeviceRepository 创建设备仓库实例
func NewDeviceRepository(db *gorm.DB) *DeviceRepository {
	return &DeviceRepository{
		db: db,
	}
}

// GetByID 根据 ID 获取设备
func (r *DeviceRepository) GetByID(id uint) (*model.Device, error) {
	var device model.Device
	if err := r.db.First(&device, id).Error; err != nil {
		return nil, err
	}
	return &device, nil
}

// SaveCommandLog 保存命令执行日志
func (r *DeviceRepository) SaveCommandLog(deviceID uint, command string, atCommand string, response string) error {
	log := model.CommandLog{
		DeviceID:  deviceID,
		Command:   command,
		ATCommand: atCommand,
		Response:  response,
	}
	return r.db.Create(&log).Error
}
