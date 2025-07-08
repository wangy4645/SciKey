package model

import (
	"time"

	"gorm.io/gorm"
)

type Device struct {
	gorm.Model
	NodeID         string    `gorm:"uniqueIndex;not null" json:"node_id"`
	Name           string    `gorm:"not null" json:"name"`
	Type           string    `gorm:"not null" json:"type"`
	BoardType      string    `gorm:"not null" json:"board_type"`
	IP             string    `gorm:"not null" json:"ip"`
	Status         string    `gorm:"not null" json:"status"`
	LastSeen       time.Time `json:"last_seen"`
	SignalStrength float64   `json:"signal_strength"`
	Location       string    `json:"location"`
	Config         string    `gorm:"type:text" json:"config"`
	Description    string    `json:"description"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// DeviceLog 存储设备日志
type DeviceLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	DeviceID  uint      `json:"device_id"`
	Type      string    `json:"type"` // operation, system, error, etc.
	Message   string    `json:"message"`
	Level     string    `json:"level"` // info, warning, error, etc.
	CreatedAt time.Time `json:"created_at"`
}

// CommandLog 命令日志模型
type CommandLog struct {
	gorm.Model
	DeviceID   uint      `json:"device_id"`
	Command    string    `json:"command"`
	ATCommand  string    `json:"at_command"`
	Response   string    `json:"response"`
	ExecutedAt time.Time `json:"executed_at"`
}
