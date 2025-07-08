package service

import (
	"backend/internal/db"
	"backend/internal/model"
	"errors"

	"gorm.io/gorm"
)

type NodeService struct {
	db *gorm.DB
}

func NewNodeService() *NodeService {
	return &NodeService{
		db: db.GetDB(),
	}
}

// CreateNode creates a new node
func (s *NodeService) CreateNode(node *model.Node) error {
	return s.db.Create(node).Error
}

// GetNodes retrieves all nodes
func (s *NodeService) GetNodes() ([]model.Node, error) {
	var nodes []model.Node
	err := s.db.Find(&nodes).Error
	return nodes, err
}

// GetNode retrieves a node by ID
func (s *NodeService) GetNode(id uint) (*model.Node, error) {
	var node model.Node
	err := s.db.First(&node, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("node not found")
		}
		return nil, err
	}
	return &node, nil
}

// UpdateNode updates a node
func (s *NodeService) UpdateNode(node *model.Node) error {
	return s.db.Save(node).Error
}

// DeleteNode deletes a node
func (s *NodeService) DeleteNode(id uint) error {
	return s.db.Delete(&model.Node{}, id).Error
}

// UpdateNodeStatus updates the status of a node
func (s *NodeService) UpdateNodeStatus(id uint, status string) error {
	return s.db.Model(&model.Node{}).Where("id = ?", id).Update("status", status).Error
}

// SearchNodes searches nodes by name or other criteria
func (s *NodeService) SearchNodes(keyword string) ([]model.Node, error) {
	var nodes []model.Node
	err := s.db.Where("name LIKE ?", "%"+keyword+"%").Find(&nodes).Error
	return nodes, err
}

// GetNodeStats returns node statistics
func (s *NodeService) GetNodeStats() (map[string]interface{}, error) {
	var total int64
	var online int64
	var offline int64

	if err := s.db.Model(&model.Node{}).Count(&total).Error; err != nil {
		return nil, err
	}

	if err := s.db.Model(&model.Node{}).Where("status = ?", "online").Count(&online).Error; err != nil {
		return nil, err
	}

	if err := s.db.Model(&model.Node{}).Where("status = ?", "offline").Count(&offline).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total":   total,
		"online":  online,
		"offline": offline,
	}, nil
}

// GetNodeByID retrieves a node by its ID
func (s *NodeService) GetNodeByID(id uint) (*model.Node, error) {
	return s.GetNode(id)
}

// GetNodeByNodeID retrieves a node by its NodeID
func (s *NodeService) GetNodeByNodeID(nodeID string) (*model.Node, error) {
	var node model.Node
	err := s.db.Where("node_id = ?", nodeID).First(&node).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("node not found")
		}
		return nil, err
	}
	return &node, nil
}
