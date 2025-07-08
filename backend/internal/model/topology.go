package model

import (
	"time"

	"gorm.io/gorm"
)

// TopologyNode represents a node in the network topology
type TopologyNode struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	DeviceID       uint      `json:"device_id" gorm:"not null"`
	Name           string    `json:"name" gorm:"not null"`
	Type           string    `json:"type" gorm:"not null"`
	Status         string    `json:"status" gorm:"not null"`
	SignalStrength float64   `json:"signal_strength"`
	X              float64   `json:"x"`
	Y              float64   `json:"y"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// TopologyLink represents a connection between nodes in the network topology
type TopologyLink struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	SourceID       uint      `json:"source_id" gorm:"not null"`
	TargetID       uint      `json:"target_id" gorm:"not null"`
	SignalStrength float64   `json:"signal_strength"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// TopologyData represents the complete network topology data
type TopologyData struct {
	Nodes []TopologyNode `json:"nodes"`
	Links []TopologyLink `json:"links"`
}

type Topology struct {
	gorm.Model
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	Nodes       []Node    `gorm:"many2many:topology_nodes;" json:"nodes"`
	Links       []Link    `gorm:"-" json:"links"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Link struct {
	gorm.Model
	SourceNodeID   string    `gorm:"not null" json:"source_node_id"`
	TargetNodeID   string    `gorm:"not null" json:"target_node_id"`
	SignalStrength float64   `json:"signal_strength"`
	Distance       float64   `json:"distance"`
	Status         string    `gorm:"not null" json:"status"`
	LastUpdated    time.Time `json:"last_updated"`
}
