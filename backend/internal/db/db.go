package db

import (
	"backend/internal/model"
	"log"

	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB(db *gorm.DB) {
	DB = db

	// Auto migrate the schema
	err := DB.AutoMigrate(
		&model.User{},
		&model.Device{},
		&model.Node{},
		&model.Config{},
		&model.Topology{},
		&model.MonitorData{},
		&model.CommandLog{},
		&model.SecurityConfig{},
		&model.NetworkConfig{},
		&model.WirelessConfig{},
		&model.SystemConfig{},
		&model.UpDownConfig{},
		&model.DebugConfig{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
}

func GetDB() *gorm.DB {
	return DB
}
