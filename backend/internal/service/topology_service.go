package service

import (
	"backend/internal/model"
	"strconv"

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

// GetTopologyGraph retrieves and formats data for the force-graph
func (s *TopologyService) GetTopologyGraph() (*model.GraphData, error) {
	var devices []model.Device
	if err := s.db.Find(&devices).Error; err != nil {
		return nil, err
	}

	nodes := make([]*model.GraphNode, 0)
	for _, device := range devices {
		// Ensure device ID is not nil and valid before processing
		if device.ID == 0 {
			continue
		}

		node := &model.GraphNode{
			ID:       strconv.Itoa(int(device.ID)),
			NodeID:   device.NodeID,
			Name:     device.Name,
			Type:     device.Type,
			Status:   device.Status,
			IP:       device.IP,
			Location: device.Location,
		}
		nodes = append(nodes, node)
	}

	var deviceLinks []model.DeviceLink
	if err := s.db.Find(&deviceLinks).Error; err != nil {
		return nil, err
	}

	links := make([]*model.GraphLink, 0)
	for _, deviceLink := range deviceLinks {
		link := &model.GraphLink{
			Source: strconv.Itoa(int(deviceLink.SourceDeviceID)),
			Target: strconv.Itoa(int(deviceLink.TargetDeviceID)),
		}
		links = append(links, link)
	}

	return &model.GraphData{
		Nodes: nodes,
		Links: links,
	}, nil
}

// UpdateDeviceLinks handles the reconciliation of reported neighbor links for a specific device.
func (s *TopologyService) UpdateDeviceLinks(sourceDeviceID uint, neighborNodeIDs []string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Delete all existing links originating from this device.
		// This handles cases where a neighbor is no longer reachable.
		if err := tx.Where("source_device_id = ?", sourceDeviceID).Delete(&model.DeviceLink{}).Error; err != nil {
			return err
		}

		// 2. Find the device IDs for the reported neighbor NodeIDs.
		var neighborDevices []model.Device
		if len(neighborNodeIDs) > 0 {
			if err := tx.Where("node_id IN ?", neighborNodeIDs).Find(&neighborDevices).Error; err != nil {
				return err
			}
		}

		// Create a map for quick lookup of NodeID to Device ID
		nodeIDtoDeviceID := make(map[string]uint)
		for _, dev := range neighborDevices {
			nodeIDtoDeviceID[dev.NodeID] = dev.ID
		}

		// 3. Create new links for the currently reported neighbors.
		for _, neighborNodeID := range neighborNodeIDs {
			targetDeviceID, ok := nodeIDtoDeviceID[neighborNodeID]
			if !ok {
				// If a reported neighbor node_id doesn't exist in our DB, we skip it.
				// Optionally, log this event for monitoring.
				continue
			}

			newLink := model.DeviceLink{
				SourceDeviceID: sourceDeviceID,
				TargetDeviceID: targetDeviceID,
			}
			// Using FirstOrCreate to prevent duplicate links, though the initial delete should handle this.
			if err := tx.Where(newLink).FirstOrCreate(&newLink).Error; err != nil {
				return err
			}
		}

		return nil
	})
}
