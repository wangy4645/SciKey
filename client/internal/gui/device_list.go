package gui

import (
	"fmt"
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/layout"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"

	"adapter/internal/model"
	"client/internal/service"
)

// DeviceList 设备列表组件
type DeviceList struct {
	window     fyne.Window
	httpClient *service.HTTPClient
	container  *fyne.Container
	devices    []model.Device
	onRefresh  func()
}

// NewDeviceList 创建设备列表
func NewDeviceList(window fyne.Window, httpClient *service.HTTPClient, onRefresh func()) *DeviceList {
	dl := &DeviceList{
		window:     window,
		httpClient: httpClient,
		onRefresh:  onRefresh,
	}

	// 创建概览信息
	overview := dl.createOverview()

	// 创建设备列表
	list := dl.createDeviceList()

	// 创建容器
	dl.container = container.NewVBox(
		overview,
		widget.NewSeparator(),
		list,
	)

	return dl
}

// Container 获取容器
func (dl *DeviceList) Container() *fyne.Container {
	return dl.container
}

// Refresh 刷新设备列表
func (dl *DeviceList) Refresh() {
	// 获取设备列表
	devices, err := dl.httpClient.GetDevices()
	if err != nil {
		dialog.ShowError(err, dl.window)
		return
	}

	dl.devices = devices
	dl.container.Refresh()

	// 调用刷新回调
	if dl.onRefresh != nil {
		dl.onRefresh()
	}
}

// createOverview 创建概览信息
func (dl *DeviceList) createOverview() *fyne.Container {
	// 创建概览信息
	totalLabel := widget.NewLabel("Total Devices: 0")
	onlineLabel := widget.NewLabel("Online Devices: 0")

	// 创建刷新按钮
	refreshBtn := widget.NewButtonWithIcon("Refresh", theme.ViewRefreshIcon(), func() {
		dl.Refresh()
	})

	// 更新概览信息
	updateOverview := func() {
		total := len(dl.devices)
		online := 0
		for _, device := range dl.devices {
			if device.Status == "online" {
				online++
			}
		}
		totalLabel.SetText(fmt.Sprintf("Total Devices: %d", total))
		onlineLabel.SetText(fmt.Sprintf("Online Devices: %d", online))
	}

	// 创建概览容器
	overview := container.NewHBox(
		totalLabel,
		onlineLabel,
		layout.NewSpacer(),
		refreshBtn,
	)

	// 设置概览更新函数
	dl.onRefresh = updateOverview

	return overview
}

// createDeviceList 创建设备列表
func (dl *DeviceList) createDeviceList() *fyne.Container {
	// 创建列表
	list := widget.NewList(
		func() int {
			return len(dl.devices)
		},
		func() fyne.CanvasObject {
			// 创建设备项
			nameLabel := widget.NewLabel("")
			typeLabel := widget.NewLabel("")
			ipLabel := widget.NewLabel("")
			statusLabel := widget.NewLabel("")

			// 创建操作按钮
			editBtn := widget.NewButtonWithIcon("", theme.DocumentCreateIcon(), nil)
			deleteBtn := widget.NewButtonWithIcon("", theme.DeleteIcon(), nil)
			configBtn := widget.NewButtonWithIcon("", theme.SettingsIcon(), nil)

			// 创建设备项容器
			return container.NewHBox(
				nameLabel,
				typeLabel,
				ipLabel,
				statusLabel,
				layout.NewSpacer(),
				editBtn,
				deleteBtn,
				configBtn,
			)
		},
		func(id widget.ListItemID, item fyne.CanvasObject) {
			if id >= len(dl.devices) {
				return
			}

			device := dl.devices[id]
			box := item.(*fyne.Container)

			// 更新标签
			box.Objects[0].(*widget.Label).SetText(device.Name)
			box.Objects[1].(*widget.Label).SetText(device.Type)
			box.Objects[2].(*widget.Label).SetText(device.IP)
			box.Objects[3].(*widget.Label).SetText(device.Status)

			// 更新按钮事件
			editBtn := box.Objects[5].(*widget.Button)
			deleteBtn := box.Objects[6].(*widget.Button)
			configBtn := box.Objects[7].(*widget.Button)

			editBtn.OnTapped = func() {
				dl.showEditDeviceDialog(device)
			}

			deleteBtn.OnTapped = func() {
				dl.showDeleteDeviceDialog(device)
			}

			configBtn.OnTapped = func() {
				dl.showDeviceConfigDialog(device)
			}
		},
	)

	return container.NewVScroll(list)
}

// showEditDeviceDialog 显示编辑设备对话框
func (dl *DeviceList) showEditDeviceDialog(device model.Device) {
	dialog.ShowInformation("Edit Device", "Edit device dialog will be implemented here.", dl.window)
}

// showDeleteDeviceDialog 显示删除设备对话框
func (dl *DeviceList) showDeleteDeviceDialog(device model.Device) {
	dialog.ShowConfirm("Delete Device", fmt.Sprintf("Are you sure you want to delete device %s?", device.Name), func(ok bool) {
		if ok {
			if err := dl.httpClient.DeleteDevice(device.ID); err != nil {
				dialog.ShowError(err, dl.window)
				return
			}
			dl.Refresh()
		}
	}, dl.window)
}

// showDeviceConfigDialog 显示设备配置对话框
func (dl *DeviceList) showDeviceConfigDialog(device model.Device) {
	dialog.ShowInformation("Device Config", "Device config dialog will be implemented here.", dl.window)
} 