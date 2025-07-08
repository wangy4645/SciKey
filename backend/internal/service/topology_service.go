package service

import (
	"backend/internal/model"

	"gorm.io/gorm"
)

type TopologyService struct {
	db *gorm.DB
}

func NewTopologyService(db *gorm.DB) *TopologyService {
	return &TopologyService{db: db}
}

// GetTopologyData retrieves the complete network topology data
func (s *TopologyService) GetTopologyData() (*model.TopologyData, error) {
	var nodes []model.TopologyNode
	if err := s.db.Find(&nodes).Error; err != nil {
		return nil, err
	}

	var links []model.TopologyLink
	if err := s.db.Find(&links).Error; err != nil {
		return nil, err
	}

	return &model.TopologyData{
		Nodes: nodes,
		Links: links,
	}, nil
}

// UpdateNodePosition updates the position of a node in the topology
func (s *TopologyService) UpdateNodePosition(nodeID uint, x, y float64) error {
	return s.db.Model(&model.TopologyNode{}).
		Where("id = ?", nodeID).
		Updates(map[string]interface{}{
			"x": x,
			"y": y,
		}).Error
}

// UpdateNodeSignalStrength updates the signal strength of a node
func (s *TopologyService) UpdateNodeSignalStrength(nodeID uint, strength float64) error {
	return s.db.Model(&model.TopologyNode{}).
		Where("id = ?", nodeID).
		Update("signal_strength", strength).Error
}

// UpdateLinkSignalStrength updates the signal strength of a link
func (s *TopologyService) UpdateLinkSignalStrength(linkID uint, strength float64) error {
	return s.db.Model(&model.TopologyLink{}).
		Where("id = ?", linkID).
		Update("signal_strength", strength).Error
}

// AddNode adds a new node to the topology
func (s *TopologyService) AddNode(node *model.TopologyNode) error {
	return s.db.Create(node).Error
}

// AddLink adds a new link to the topology
func (s *TopologyService) AddLink(link *model.TopologyLink) error {
	return s.db.Create(link).Error
}

// RemoveNode removes a node from the topology
func (s *TopologyService) RemoveNode(nodeID uint) error {
	// First remove all links connected to this node
	if err := s.db.Where("source_id = ? OR target_id = ?", nodeID, nodeID).
		Delete(&model.TopologyLink{}).Error; err != nil {
		return err
	}

	// Then remove the node
	return s.db.Delete(&model.TopologyNode{}, nodeID).Error
}

// RemoveLink removes a link from the topology
func (s *TopologyService) RemoveLink(linkID uint) error {
	return s.db.Delete(&model.TopologyLink{}, linkID).Error
}
