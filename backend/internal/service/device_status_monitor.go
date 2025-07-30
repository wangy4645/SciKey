package service

import (
	"log"
	"sync"
	"time"

	"gorm.io/gorm"
)

// DeviceStatusMonitor 设备状态监控服务
type DeviceStatusMonitor struct {
	db              *gorm.DB
	deviceCommSvc   *DeviceCommService
	monitorInterval time.Duration
	stopChan        chan bool
	isRunning       bool
	mu              sync.Mutex
}

// NewDeviceStatusMonitor 创建设备状态监控服务
func NewDeviceStatusMonitor(db *gorm.DB, interval time.Duration) *DeviceStatusMonitor {
	return &DeviceStatusMonitor{
		db:              db,
		deviceCommSvc:   NewDeviceCommService(db),
		monitorInterval: interval,
		stopChan:        make(chan bool),
		isRunning:       false,
	}
}

// Start 启动设备状态监控
func (m *DeviceStatusMonitor) Start() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.isRunning {
		log.Println("Device status monitor is already running")
		return
	}

	m.isRunning = true
	log.Printf("Starting device status monitor with interval: %v", m.monitorInterval)

	go m.monitorLoop()
}

// Stop 停止设备状态监控
func (m *DeviceStatusMonitor) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.isRunning {
		return
	}

	m.isRunning = false
	m.stopChan <- true
	log.Println("Device status monitor stopped")
}

// IsRunning 检查监控是否正在运行
func (m *DeviceStatusMonitor) IsRunning() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.isRunning
}

// monitorLoop 监控循环
func (m *DeviceStatusMonitor) monitorLoop() {
	ticker := time.NewTicker(m.monitorInterval)
	defer ticker.Stop()

	// 立即执行一次状态检测
	m.checkAllDevicesStatus()

	for {
		select {
		case <-ticker.C:
			m.checkAllDevicesStatus()
		case <-m.stopChan:
			return
		}
	}
}

// checkAllDevicesStatus 检测所有设备状态
func (m *DeviceStatusMonitor) checkAllDevicesStatus() {
	log.Println("Starting periodic device status check...")

	// 获取所有设备
	var devices []struct {
		ID   uint   `gorm:"column:id"`
		Name string `gorm:"column:name"`
		IP   string `gorm:"column:ip"`
	}

	if err := m.db.Model(&struct{}{}).Table("devices").Select("id, name, ip").Find(&devices).Error; err != nil {
		log.Printf("Failed to fetch devices: %v", err)
		return
	}

	if len(devices) == 0 {
		log.Println("No devices found for status check")
		return
	}

	log.Printf("Checking status for %d devices", len(devices))

	// 并发检测设备状态
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 10) // 限制并发数

	for _, device := range devices {
		wg.Add(1)
		go func(d struct {
			ID   uint   `gorm:"column:id"`
			Name string `gorm:"column:name"`
			IP   string `gorm:"column:ip"`
		}) {
			defer wg.Done()
			semaphore <- struct{}{}        // 获取信号量
			defer func() { <-semaphore }() // 释放信号量

			status, err := m.deviceCommSvc.GetDeviceStatus(d.ID)
			if err != nil {
				log.Printf("Failed to check status for device %s (ID: %d): %v", d.Name, d.ID, err)
				return
			}

			log.Printf("Device %s (ID: %d) status: %s", d.Name, d.ID, status)
		}(device)
	}

	wg.Wait()
	log.Println("Periodic device status check completed")
}
