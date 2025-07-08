package model

import (
	"gorm.io/gorm"
)

// ATCommandMapping AT指令映射模型
type ATCommandMapping struct {
	gorm.Model
	DeviceID    uint              `json:"device_id"`
	CommandType string            `json:"command_type"`
	ATCommand   string            `json:"at_command"`
	Parameters  map[string]string `json:"parameters" gorm:"type:json"`
}
