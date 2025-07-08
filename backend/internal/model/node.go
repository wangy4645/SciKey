package model

import (
	"time"

	"gorm.io/gorm"
)

// Node 节点模型
type Node struct {
	gorm.Model
	NodeID         string    `gorm:"uniqueIndex;not null" json:"node_id"`
	Name           string    `gorm:"not null" json:"name"`
	Type           string    `gorm:"not null" json:"type"`
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

// NodeOverview 节点概览信息
type NodeOverview struct {
	TotalCount     int `json:"total_count"`
	OnlineCount    int `json:"online_count"`
	OfflineCount   int `json:"offline_count"`
	ConnectedCount int `json:"connected_count"`
}

// NodeListRequest 节点列表请求参数
type NodeListRequest struct {
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
	Status   string `json:"status"`
	Type     string `json:"type"`
	Search   string `json:"search"`
}
