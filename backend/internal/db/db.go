package db

import (
	"backend/internal/model"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

// Init initializes the database connection and performs auto-migration.
// It returns the database instance or an error.
func Init() (*gorm.DB, error) {
	var err error
	db, err = gorm.Open(sqlite.Open("netmanager.db"), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Auto-migrate all necessary models
	err = db.AutoMigrate(
		&model.User{}, &model.Device{}, &model.DeviceLink{}, &model.DeviceLog{},
		&model.CommandLog{}, &model.ATCommandMapping{}, &model.Node{}, &model.Config{},
		&model.DeviceConfig{}, &model.ConfigTemplate{}, &model.ConfigField{},
		&model.ConfigCategory{}, &model.ConfigHistory{}, &model.ConfigBackup{},
		&model.ConfigImport{}, &model.ConfigExport{}, &model.ConfigAudit{},
		&model.ConfigSchedule{}, &model.ConfigScheduleLog{}, &model.ConfigTemplateGroup{},
		&model.ConfigTemplateGroupRelation{}, &model.ConfigTemplateVersion{},
		&model.ConfigTemplateTag{}, &model.ConfigTemplateComment{}, &model.ConfigTemplateFavorite{},
		&model.ConfigTemplateShare{}, &model.ConfigTemplateUsage{}, &model.ConfigTemplateRating{},
		&model.ConfigTemplateReport{}, &model.ConfigTemplateNotification{},
		&model.ConfigTemplateSubscription{}, &model.ConfigTemplateCollaboration{},
		&model.ConfigTemplateChange{}, &model.ConfigTemplateApproval{}, &model.ConfigTemplateReview{},
		&model.ConfigTemplatePublish{}, &model.ConfigTemplateArchive{}, &model.ConfigTemplateRestore{},
		&model.ConfigTemplateDelete{}, &model.Topology{}, &model.MonitorData{},
		&model.SecurityConfig{}, &model.NetworkConfig{}, &model.WirelessConfig{},
		&model.SystemConfig{}, &model.UpDownConfig{}, &model.DebugConfig{},
		&model.DRPRMessage{},
	)
	if err != nil {
		return nil, err
	}

	log.Println("Database migration completed.")
	return db, nil
}

func GetDB() *gorm.DB {
	if db == nil {
		log.Println("Warning: DB instance is nil. Ensure Init() is called first.")
	}
	return db
}
