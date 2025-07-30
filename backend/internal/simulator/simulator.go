package simulator

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
)

// --- Structs ---

type Device struct {
	ID        uint   `gorm:"primaryKey"`
	NodeID    string `gorm:"uniqueIndex;not null"`
	BoardType string `gorm:"not null"`
}

func (Device) TableName() string {
	return "devices"
}

// --- Public Functions ---

// Start initializes and runs the network simulator as a background service.
func Start(db *gorm.DB, backendURL, authToken string) {
	log.Println("Starting Integrated Network Simulator...")

	// Run the main simulation logic in a separate goroutine.
	go runSimulationLoop(db, backendURL, authToken)
}

// --- Internal Simulation Logic ---

func runSimulationLoop(db *gorm.DB, backendURL, authToken string) {
	// Wait a moment for the main server to be ready.
	time.Sleep(5 * time.Second)

	// 定期更新拓扑的定时器
	ticker := time.NewTicker(30 * time.Second) // 每30秒更新一次
	defer ticker.Stop()

	// 立即执行一次初始拓扑报告
	reportTopology(db, backendURL, authToken)

	// 定期更新拓扑
	for range ticker.C {
		reportTopology(db, backendURL, authToken)
	}
}

// reportTopology 报告拓扑信息
func reportTopology(db *gorm.DB, backendURL, authToken string) {
	var allDevices []Device
	if err := db.Find(&allDevices).Error; err != nil {
		log.Printf("[Simulator] ERROR: Failed to fetch devices: %v", err)
		return
	}

	rules := map[string]string{"mesh": "mesh", "star": "star"}
	groups := groupDevices(allDevices, rules)

	neighborMap := calculateAllNeighbors(groups)

	var wg sync.WaitGroup
	for _, device := range allDevices {
		wg.Add(1)
		go func(d Device) {
			defer wg.Done()
			reportLinks(d, neighborMap[d.ID], backendURL, authToken)
		}(device)
	}
	wg.Wait()
}

// --- Helper Functions (similar to standalone simulator) ---

func groupDevices(devices []Device, rules map[string]string) map[string][]Device {
	// ... (logic is the same as the standalone simulator)
	groups := make(map[string][]Device)
	for _, device := range devices {
		for groupName, keyword := range rules {
			if strings.Contains(strings.ToLower(device.BoardType), strings.ToLower(keyword)) {
				groups[groupName] = append(groups[groupName], device)
				break
			}
		}
	}
	return groups
}

func calculateAllNeighbors(groups map[string][]Device) map[uint][]string {
	// ... (logic is the same as the standalone simulator)
	neighborMap := make(map[uint][]string)
	for groupName, devices := range groups {
		switch groupName {
		case "mesh":
			for i := 0; i < len(devices); i++ {
				for j := 0; j < len(devices); j++ {
					if i == j {
						continue
					}
					neighborMap[devices[i].ID] = append(neighborMap[devices[i].ID], devices[j].NodeID)
				}
			}
		case "star":
			if len(devices) < 2 {
				continue
			}
			hub := devices[0]
			for i := 1; i < len(devices); i++ {
				spoke := devices[i]
				neighborMap[hub.ID] = append(neighborMap[hub.ID], spoke.NodeID)
				neighborMap[spoke.ID] = append(neighborMap[spoke.ID], hub.NodeID)
			}
		}
	}
	return neighborMap
}

func reportLinks(device Device, neighbors []string, backendURL, authToken string) {
	payload := map[string][]string{"neighbors": neighbors}
	payloadBytes, _ := json.Marshal(payload)
	url := fmt.Sprintf("%s/api/devices/%d/links", backendURL, device.ID)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	req.Header.Set("Content-Type", "application/json")
	if authToken != "" {
		req.Header.Set("Authorization", "Bearer "+authToken)
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Simulator Agent for %s] ERROR: Failed to send request: %v", device.NodeID, err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Printf("[Simulator Agent for %s] FAILED to report links. Status: %s", device.NodeID, resp.Status)
	}
}

func getNodeID(devices []Device, id uint) string {
	for _, d := range devices {
		if d.ID == id {
			return d.NodeID
		}
	}
	return "unknown"
}
