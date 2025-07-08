package device_config

import (
	"fmt"
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"

	"client/internal/service"
)

// NetStatePage 网络状态页面
type NetStatePage struct {
	window     fyne.Window
	httpClient *service.HTTPClient
	device     *service.Device
	container  *fyne.Container
}

// NewNetStatePage 创建网络状态页面
func NewNetStatePage(window fyne.Window, httpClient *service.HTTPClient, device *service.Device) *NetStatePage {
	nsp := &NetStatePage{
		window:     window,
		httpClient: httpClient,
		device:     device,
	}

	// 创建页面
	nsp.createPage()

	return nsp
}

// Container 获取容器
func (nsp *NetStatePage) Container() *fyne.Container {
	return nsp.container
}

// createPage 创建页面
func (nsp *NetStatePage) createPage() {
	// 创建状态指示器
	statusIndicator := widget.NewLabel("")
	statusIndicator.TextStyle = fyne.TextStyle{Bold: true}
	nsp.updateStatusIndicator(statusIndicator)

	// 创建基本信息表单
	basicInfoForm := widget.NewForm(
		widget.NewFormItem("IP Address", widget.NewLabel(nsp.device.IP)),
		widget.NewFormItem("MAC Address", widget.NewLabel(nsp.device.MAC)),
		widget.NewFormItem("Hostname", widget.NewLabel(nsp.device.Config.Network.Hostname)),
		widget.NewFormItem("Gateway", widget.NewLabel(nsp.device.Config.Network.Gateway)),
		widget.NewFormItem("DNS", widget.NewLabel(nsp.device.Config.Network.DNS)),
	)

	// 创建网络接口信息
	interfaceInfo := nsp.createInterfaceInfo()

	// 创建连接信息
	connectionInfo := nsp.createConnectionInfo()

	// 创建刷新按钮
	refreshBtn := widget.NewButtonWithIcon("Refresh", theme.ViewRefreshIcon(), func() {
		nsp.refresh()
	})

	// 创建主容器
	nsp.container = container.NewVBox(
		container.NewHBox(statusIndicator, refreshBtn),
		widget.NewSeparator(),
		basicInfoForm,
		widget.NewSeparator(),
		interfaceInfo,
		widget.NewSeparator(),
		connectionInfo,
	)
}

// updateStatusIndicator 更新状态指示器
func (nsp *NetStatePage) updateStatusIndicator(label *widget.Label) {
	var statusText string
	var statusColor fyne.Color

	switch nsp.device.Status {
	case "online":
		statusText = "● Online"
		statusColor = theme.SuccessColor()
	case "offline":
		statusText = "● Offline"
		statusColor = theme.ErrorColor()
	default:
		statusText = "● Unknown"
		statusColor = theme.WarningColor()
	}

	label.SetText(statusText)
	label.TextStyle = fyne.TextStyle{Bold: true}
	label.Refresh()
}

// createInterfaceInfo 创建网络接口信息
func (nsp *NetStatePage) createInterfaceInfo() fyne.CanvasObject {
	// 创建接口列表
	interfaces := nsp.device.Config.Network.Interfaces
	interfaceList := widget.NewList(
		func() int {
			return len(interfaces)
		},
		func() fyne.CanvasObject {
			return container.NewHBox(
				widget.NewLabel(""), // Interface name
				widget.NewLabel(""), // IP address
				widget.NewLabel(""), // Status
			)
		},
		func(id widget.ListItemID, item fyne.CanvasObject) {
			if id < len(interfaces) {
				iface := interfaces[id]
				container := item.(*fyne.Container)
				container.Objects[0].(*widget.Label).SetText(iface.Name)
				container.Objects[1].(*widget.Label).SetText(iface.IP)
				container.Objects[2].(*widget.Label).SetText(iface.Status)
			}
		},
	)

	return container.NewVBox(
		widget.NewLabel("Network Interfaces"),
		interfaceList,
	)
}

// createConnectionInfo 创建连接信息
func (nsp *NetStatePage) createConnectionInfo() fyne.CanvasObject {
	// 创建连接统计
	stats := nsp.device.Config.Network.Stats
	statsForm := widget.NewForm(
		widget.NewFormItem("Total Connections", widget.NewLabel(fmt.Sprintf("%d", stats.TotalConnections))),
		widget.NewFormItem("Active Connections", widget.NewLabel(fmt.Sprintf("%d", stats.ActiveConnections))),
		widget.NewFormItem("Bytes Received", widget.NewLabel(fmt.Sprintf("%d", stats.BytesReceived))),
		widget.NewFormItem("Bytes Sent", widget.NewLabel(fmt.Sprintf("%d", stats.BytesSent))),
	)

	return container.NewVBox(
		widget.NewLabel("Connection Statistics"),
		statsForm,
	)
}

// refresh 刷新页面
func (nsp *NetStatePage) refresh() {
	// 获取最新设备信息
	device, err := nsp.httpClient.GetDevice(nsp.device.ID)
	if err != nil {
		return
	}

	nsp.device = device
	nsp.createPage()
} 