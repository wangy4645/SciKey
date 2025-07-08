package service

import (
	"backend/internal/model"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

// MonitorService handles monitoring-related operations
type MonitorService struct {
	db *gorm.DB
}

// NewMonitorService creates a new monitor service
func NewMonitorService(db *gorm.DB) *MonitorService {
	return &MonitorService{db: db}
}

// GetDB returns the database instance
func (s *MonitorService) GetDB() *gorm.DB {
	return s.db
}

// GetMonitorData retrieves monitoring data for a device
func (s *MonitorService) GetMonitorData(deviceID uint, startTime, endTime time.Time) ([]model.MonitorData, error) {
	var data []model.MonitorData
	err := s.db.Where("device_id = ? AND created_at BETWEEN ? AND ?", deviceID, startTime, endTime).
		Order("created_at DESC").
		Find(&data).Error
	return data, err
}

// AddMonitorData adds new monitoring data
func (s *MonitorService) AddMonitorData(data *model.MonitorData) error {
	return s.db.Create(data).Error
}

// GetMonitorConfig retrieves monitoring configuration for a device
func (s *MonitorService) GetMonitorConfig(deviceID uint) (*model.MonitorConfig, error) {
	var config model.MonitorConfig
	err := s.db.Where("device_id = ?", deviceID).First(&config).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create default config if not exists
			config = model.MonitorConfig{
				DeviceID:         deviceID,
				EnableMonitoring: true,
				MonitorInterval:  60, // 1 minute
				RetentionPeriod:  30, // 30 days
				AlertThresholds:  "{}",
			}
			err = s.db.Create(&config).Error
		}
	}
	return &config, err
}

// UpdateMonitorConfig updates monitoring configuration
func (s *MonitorService) UpdateMonitorConfig(config *model.MonitorConfig) error {
	return s.db.Save(config).Error
}

// GetAlerts retrieves alerts for a device
func (s *MonitorService) GetAlerts(deviceID uint, status string) ([]model.MonitorAlert, error) {
	var alerts []model.MonitorAlert
	query := s.db.Where("device_id = ?", deviceID)
	if status != "" {
		query = query.Where("status = ?", status)
	}
	err := query.Order("created_at DESC").Find(&alerts).Error
	return alerts, err
}

// AddAlert adds a new alert
func (s *MonitorService) AddAlert(alert *model.MonitorAlert) error {
	return s.db.Create(alert).Error
}

// UpdateAlertStatus updates the status of an alert
func (s *MonitorService) UpdateAlertStatus(alertID uint, status string) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}
	if status == "resolved" {
		now := time.Now()
		updates["resolved_at"] = now
	}
	return s.db.Model(&model.MonitorAlert{}).Where("id = ?", alertID).Updates(updates).Error
}

// CheckThresholds checks if monitoring data exceeds thresholds and creates alerts if necessary
func (s *MonitorService) CheckThresholds(data *model.MonitorData) error {
	config, err := s.GetMonitorConfig(data.DeviceID)
	if err != nil {
		return err
	}

	var thresholds map[string]float64
	if err := json.Unmarshal([]byte(config.AlertThresholds), &thresholds); err != nil {
		return err
	}

	// Check CPU usage
	if threshold, ok := thresholds["cpu_usage"]; ok && data.CPUUsage > threshold {
		alert := &model.MonitorAlert{
			DeviceID:  data.DeviceID,
			Type:      "high_cpu",
			Level:     "warning",
			Message:   "CPU usage is high",
			Value:     data.CPUUsage,
			Threshold: threshold,
			Status:    "active",
		}
		if err := s.AddAlert(alert); err != nil {
			return err
		}
	}

	// Check memory usage
	if threshold, ok := thresholds["memory_usage"]; ok && data.MemoryUsage > threshold {
		alert := &model.MonitorAlert{
			DeviceID:  data.DeviceID,
			Type:      "high_memory",
			Level:     "warning",
			Message:   "Memory usage is high",
			Value:     data.MemoryUsage,
			Threshold: threshold,
			Status:    "active",
		}
		if err := s.AddAlert(alert); err != nil {
			return err
		}
	}

	// Check signal quality
	if threshold, ok := thresholds["signal_quality"]; ok && data.SignalQuality < threshold {
		alert := &model.MonitorAlert{
			DeviceID:  data.DeviceID,
			Type:      "low_signal",
			Level:     "warning",
			Message:   "Signal quality is low",
			Value:     data.SignalQuality,
			Threshold: threshold,
			Status:    "active",
		}
		if err := s.AddAlert(alert); err != nil {
			return err
		}
	}

	return nil
}

// CleanupOldData removes monitoring data older than the retention period
func (s *MonitorService) CleanupOldData() error {
	var configs []model.MonitorConfig
	if err := s.db.Find(&configs).Error; err != nil {
		return err
	}

	for _, config := range configs {
		retentionDate := time.Now().AddDate(0, 0, -config.RetentionPeriod)
		if err := s.db.Where("device_id = ? AND created_at < ?", config.DeviceID, retentionDate).
			Delete(&model.MonitorData{}).Error; err != nil {
			return err
		}
	}

	return nil
}
