package router

import (
	"backend/internal/db"
	"backend/internal/handler"
	"backend/internal/middleware"
	"backend/internal/repository"
	"backend/internal/service"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// Add CORS middleware
	r.Use(middleware.CORS())

	// Serve static files (React build)
	workDir, err := os.Getwd()
	if err != nil {
		workDir = "."
	}
	staticDir := filepath.Join(workDir, "static")
	r.Static("/static", staticDir)
	r.LoadHTMLGlob(filepath.Join(staticDir, "*.html"))

	// Serve React app for root path
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	// Serve React app for all non-API routes
	r.NoRoute(func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	// Create service instances
	authService := service.NewAuthService()
	deviceService := service.NewDeviceService()
	deviceCommService := service.NewDeviceCommService(db.GetDB())
	nodeService := service.NewNodeService()
	deviceRepo := repository.NewDeviceRepository(db.GetDB())
	configService := service.NewConfigService(db.GetDB(), deviceRepo)
	topologyService := service.NewTopologyService(db.GetDB())
	monitorService := service.NewMonitorService(db.GetDB())

	// Create handler instances
	authHandler := handler.NewAuthHandler(authService)
	deviceHandler := handler.NewDeviceHandler(deviceService, deviceCommService, configService)
	nodeHandler := handler.NewNodeHandler(nodeService)
	configHandler := handler.NewConfigHandler(configService)
	topologyHandler := handler.NewTopologyHandler(topologyService)
	monitorHandler := handler.NewMonitorHandler(monitorService)

	// Public routes
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.DELETE("/users/:username", authHandler.DeleteUser)
	}

	// Token validation route (protected)
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// Token validation
		api.GET("/auth/validate", authHandler.ValidateToken)

		// Device routes
		api.POST("/devices", deviceHandler.CreateDevice)
		api.GET("/devices", deviceHandler.GetDevices)
		api.GET("/devices/:id", deviceHandler.GetDevice)
		api.PUT("/devices/:id", deviceHandler.UpdateDevice)
		api.DELETE("/devices/:id", deviceHandler.DeleteDevice)
		api.PUT("/devices/:id/status", deviceHandler.UpdateDeviceStatus)
		api.GET("/devices/:id/logs", deviceHandler.GetDeviceLogs)
		api.GET("/devices/stats", deviceHandler.GetDeviceStats)
		api.POST("/devices/:id/at", deviceHandler.SendATCommand)
		api.POST("/devices/:id/at/command", deviceHandler.SendATCommandByName)
		api.GET("/devices/:id/commands", deviceHandler.GetAvailableCommands)
		api.POST("/devices/:id/sync-config", deviceHandler.SyncDeviceConfig)
		api.POST("/devices/:id/sync-config/:type", deviceHandler.SyncDeviceConfigByType)
		api.POST("/devices/:id/reboot", deviceHandler.RebootDevice)
		api.POST("/devices/:id/login", deviceHandler.LoginDevice)
		api.GET("/devices/:id/key", deviceHandler.GetKey)
		api.POST("/devices/:id/key", deviceHandler.SetKey)
		api.GET("/devices/:id/check-status", deviceHandler.CheckDeviceStatus)
		api.GET("/devices/check-all-status", deviceHandler.CheckAllDevicesStatus)

		// Wireless Configuration
		api.GET("/devices/:id/wireless", deviceHandler.GetWirelessConfig)
		api.POST("/devices/:id/wireless/frequency-band", deviceHandler.SetFrequencyBand)
		api.POST("/devices/:id/wireless/bandwidth", deviceHandler.SetBandwidth)
		api.POST("/devices/:id/wireless/building-chain", deviceHandler.SetBuildingChain)
		api.POST("/devices/:id/wireless/frequency-hopping", deviceHandler.SetFrequencyHopping)

		// Node routes
		api.POST("/nodes", nodeHandler.CreateNode)
		api.GET("/nodes", nodeHandler.GetNodes)
		api.GET("/nodes/:id", nodeHandler.GetNode)
		api.PUT("/nodes/:id", nodeHandler.UpdateNode)
		api.DELETE("/nodes/:id", nodeHandler.DeleteNode)
		api.PUT("/nodes/:id/status", nodeHandler.UpdateNodeStatus)
		api.GET("/nodes/stats", nodeHandler.GetNodeStats)
		api.GET("/nodes/overview", nodeHandler.GetNodeOverview)

		// Config routes
		api.GET("/config/categories", configHandler.GetConfigCategories)
		api.GET("/config/templates/:category", configHandler.GetConfigTemplate)
		api.GET("/devices/:id/configs/:category", configHandler.GetDeviceConfigs)
		api.PUT("/devices/:id/configs/:category", configHandler.SaveDeviceConfigs)
		api.POST("/config/validate", configHandler.ValidateConfig)
		api.GET("/devices/:id/config/overview", configHandler.GetDeviceConfigOverview)

		// Network state config routes
		api.GET("/devices/:id/configs/net_state", configHandler.GetNetworkConfig)
		api.PUT("/devices/:id/configs/net_state", configHandler.UpdateNetworkConfig)

		// Network settings config routes
		api.GET("/devices/:id/configs/net_setting", configHandler.GetNetworkConfig)
		api.PUT("/devices/:id/configs/net_setting", configHandler.UpdateNetworkConfig)

		// Security config routes
		api.GET("/devices/:id/configs/security", configHandler.GetSecurityConfig)
		api.PUT("/devices/:id/configs/security", configHandler.UpdateSecurityConfig)

		// Wireless config routes
		api.GET("/devices/:id/configs/wireless", configHandler.GetWirelessConfig)
		api.PUT("/devices/:id/configs/wireless", configHandler.UpdateWirelessConfig)

		// System config routes
		api.GET("/devices/:id/configs/system", configHandler.GetSystemConfig)
		api.PUT("/devices/:id/configs/system", configHandler.UpdateSystemConfig)

		// UP-DOWN config routes
		api.GET("/devices/:id/configs/up_down", configHandler.GetUpDownConfig)
		api.PUT("/devices/:id/configs/up_down", configHandler.UpdateUpDownConfig)

		// Debug config routes
		api.GET("/devices/:id/configs/debug", configHandler.GetDebugConfig)
		api.PUT("/devices/:id/configs/debug", configHandler.UpdateDebugConfig)

		// Device Type config routes
		api.GET("/devices/:id/configs/device_type", configHandler.GetDeviceTypeConfig)
		api.PUT("/devices/:id/configs/device_type", configHandler.UpdateDeviceTypeConfig)

		// DRPR Reporting routes
		api.POST("/devices/:id/debug/drpr", deviceHandler.SetDrprReporting)
		api.POST("/devices/:id/debug/switch", deviceHandler.SetDebugSwitch)

		// Topology routes
		api.GET("/topology", topologyHandler.GetTopology)
		api.PUT("/topology/nodes/:id/position", topologyHandler.UpdateNodePosition)
		api.PUT("/topology/nodes/:id/signal", topologyHandler.UpdateNodeSignalStrength)
		api.PUT("/topology/links/:id/signal", topologyHandler.UpdateLinkSignalStrength)
		api.POST("/topology/nodes", topologyHandler.AddNode)
		api.POST("/topology/links", topologyHandler.AddLink)
		api.DELETE("/topology/nodes/:id", topologyHandler.RemoveNode)
		api.DELETE("/topology/links/:id", topologyHandler.RemoveLink)

		// Monitor routes
		api.GET("/devices/:id/monitor", monitorHandler.GetMonitorData)
		api.POST("/devices/:id/monitor", monitorHandler.AddMonitorData)
		api.GET("/devices/:id/monitor/config", monitorHandler.GetMonitorConfig)
		api.PUT("/devices/:id/monitor/config", monitorHandler.UpdateMonitorConfig)
		api.GET("/devices/:id/alerts", monitorHandler.GetAlerts)
		api.PUT("/alerts/:id/status", monitorHandler.UpdateAlertStatus)
		api.GET("/devices/monitor/all", monitorHandler.GetAllDevicesMonitorData)
	}
	return r
}
