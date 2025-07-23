package model

import (
	"time"

	"gorm.io/gorm"
)

// DeviceLink represents a direct link between two devices for Mesh topology.
type DeviceLink struct {
	ID        uint `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	// SourceDeviceID is the ID of the source device in the link.
	SourceDeviceID uint `gorm:"not null;index" json:"source_device_id"`

	// TargetDeviceID is the ID of the target device in the link.
	TargetDeviceID uint `gorm:"not null;index" json:"target_device_id"`
}
