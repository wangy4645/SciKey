package db

import (
	"log"

	"backend/internal/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

// Initialize database connection and auto-migrate models
func init() {
	var err error
	db, err = gorm.Open(sqlite.Open("netmanager.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto-migrate models
	err = db.AutoMigrate(
		&model.User{},
		&model.Device{},
		&model.DeviceLog{},
		&model.CommandLog{},
		&model.Node{},
		&model.Config{},
		&model.DeviceConfig{},
		&model.ConfigTemplate{},
		&model.ConfigField{},
		&model.ConfigCategory{},
		&model.ConfigHistory{},
		&model.ConfigBackup{},
		&model.ConfigImport{},
		&model.ConfigExport{},
		&model.ConfigAudit{},
		&model.ConfigSchedule{},
		&model.ConfigScheduleLog{},
		&model.ConfigTemplateGroup{},
		&model.ConfigTemplateGroupRelation{},
		&model.ConfigTemplateVersion{},
		&model.ConfigTemplateTag{},
		&model.ConfigTemplateComment{},
		&model.ConfigTemplateFavorite{},
		&model.ConfigTemplateShare{},
		&model.ConfigTemplateUsage{},
		&model.ConfigTemplateRating{},
		&model.ConfigTemplateReport{},
		&model.ConfigTemplateNotification{},
		&model.ConfigTemplateSubscription{},
		&model.ConfigTemplateCollaboration{},
		&model.ConfigTemplateChange{},
		&model.ConfigTemplateApproval{},
		&model.ConfigTemplateReview{},
		&model.ConfigTemplatePublish{},
		&model.ConfigTemplateArchive{},
		&model.ConfigTemplateRestore{},
		&model.ConfigTemplateDelete{},
		&model.Topology{},
		&model.MonitorData{},
		&model.SecurityConfig{},
		&model.NetworkConfig{},
		&model.WirelessConfig{},
		&model.SystemConfig{},
		&model.UpDownConfig{},
		&model.DebugConfig{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate database: %v", err)
	}

	// 为现有设备设置默认的 board_type
	db.Model(&model.Device{}).Where("board_type = ?", "").Updates(map[string]interface{}{
		"board_type": "board_1.0",
	})
}
