package handler

import (
	"backend/internal/model"
	"backend/internal/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TopologyHandler struct {
	topologyService *service.TopologyService
}

func NewTopologyHandler(topologyService *service.TopologyService) *TopologyHandler {
	return &TopologyHandler{
		topologyService: topologyService,
	}
}

// GetTopology handles GET /api/topology
func (h *TopologyHandler) GetTopology(c *gin.Context) {
	data, err := h.topologyService.GetTopologyData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

// UpdateNodePosition handles PUT /api/topology/nodes/:id/position
func (h *TopologyHandler) UpdateNodePosition(c *gin.Context) {
	nodeID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid node ID"})
		return
	}

	var position struct {
		X float64 `json:"x" binding:"required"`
		Y float64 `json:"y" binding:"required"`
	}

	if err := c.ShouldBindJSON(&position); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.topologyService.UpdateNodePosition(uint(nodeID), position.X, position.Y); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Node position updated successfully"})
}

// UpdateNodeSignalStrength handles PUT /api/topology/nodes/:id/signal
func (h *TopologyHandler) UpdateNodeSignalStrength(c *gin.Context) {
	nodeID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid node ID"})
		return
	}

	var signal struct {
		Strength float64 `json:"strength" binding:"required"`
	}

	if err := c.ShouldBindJSON(&signal); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.topologyService.UpdateNodeSignalStrength(uint(nodeID), signal.Strength); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Node signal strength updated successfully"})
}

// UpdateLinkSignalStrength handles PUT /api/topology/links/:id/signal
func (h *TopologyHandler) UpdateLinkSignalStrength(c *gin.Context) {
	linkID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid link ID"})
		return
	}

	var signal struct {
		Strength float64 `json:"strength" binding:"required"`
	}

	if err := c.ShouldBindJSON(&signal); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.topologyService.UpdateLinkSignalStrength(uint(linkID), signal.Strength); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Link signal strength updated successfully"})
}

// AddNode handles POST /api/topology/nodes
func (h *TopologyHandler) AddNode(c *gin.Context) {
	var node model.TopologyNode
	if err := c.ShouldBindJSON(&node); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.topologyService.AddNode(&node); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, node)
}

// AddLink handles POST /api/topology/links
func (h *TopologyHandler) AddLink(c *gin.Context) {
	var link model.TopologyLink
	if err := c.ShouldBindJSON(&link); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.topologyService.AddLink(&link); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, link)
}

// RemoveNode handles DELETE /api/topology/nodes/:id
func (h *TopologyHandler) RemoveNode(c *gin.Context) {
	nodeID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid node ID"})
		return
	}

	if err := h.topologyService.RemoveNode(uint(nodeID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Node removed successfully"})
}

// RemoveLink handles DELETE /api/topology/links/:id
func (h *TopologyHandler) RemoveLink(c *gin.Context) {
	linkID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid link ID"})
		return
	}

	if err := h.topologyService.RemoveLink(uint(linkID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Link removed successfully"})
}
