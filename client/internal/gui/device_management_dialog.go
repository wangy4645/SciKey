package gui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/layout"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"

	"client/internal/service"
)

// DeviceManagementDialog 设备管理对话框
type DeviceManagementDialog struct {
	window     fyne.Window
	httpClient *service.HTTPClient
	dialog     *dialog.CustomDialog
	deviceList *widget.List
	devices    []*service.Device
}

// NewDeviceManagementDialog 创建设备管理对话框
func NewDeviceManagementDialog(window fyne.Window, httpClient *service.HTTPClient) *DeviceManagementDialog {
	dmd := &DeviceManagementDialog{
		window:     window,
		httpClient: httpClient,
	}

	// 创建对话框
	dmd.createDialog()

	return dmd
}

// Show 显示对话框
func (dmd *DeviceManagementDialog) Show() {
	dmd.refreshDeviceList()
	dmd.dialog.Show()
}

// createDialog 创建对话框
func (dmd *DeviceManagementDialog) createDialog() {
	// 创建设备列表
	dmd.deviceList = widget.NewList(
		func() int {
			return len(dmd.devices)
		},
		func() fyne.CanvasObject {
			return dmd.createDeviceItem()
		},
		func(id widget.ListItemID, item fyne.CanvasObject) {
			if id < len(dmd.devices) {
				dmd.updateDeviceItem(id, item)
			}
		},
	)

	// 创建工具栏
	toolbar := container.NewHBox(
		widget.NewButtonWithIcon("Add", theme.ContentAddIcon(), dmd.showAddDeviceDialog),
		widget.NewButtonWithIcon("Refresh", theme.ViewRefreshIcon(), dmd.refreshDeviceList),
	)

	// 创建内容
	content := container.NewBorder(
		toolbar,
		nil,
		nil,
		nil,
		dmd.deviceList,
	)

	// 创建对话框
	dmd.dialog = dialog.NewCustom("Device Management", "Close", content, dmd.window)
}

// createDeviceItem 创建设备项
func (dmd *DeviceManagementDialog) createDeviceItem() fyne.CanvasObject {
	// 创建设备信息容器
	infoContainer := container.NewHBox(
		widget.NewLabel(""), // Name
		widget.NewLabel(""), // Type
		widget.NewLabel(""), // IP
		widget.NewLabel(""), // Status
	)

	// 创建操作按钮
	editBtn := widget.NewButtonWithIcon("", theme.DocumentEditIcon(), nil)
	deleteBtn := widget.NewButtonWithIcon("", theme.DeleteIcon(), nil)
	configBtn := widget.NewButtonWithIcon("", theme.SettingsIcon(), nil)

	// 创建操作按钮容器
	actionContainer := container.NewHBox(editBtn, deleteBtn, configBtn)

	// 创建主容器
	itemContainer := container.NewBorder(
		nil,
		nil,
		infoContainer,
		actionContainer,
	)

	return itemContainer
}

// updateDeviceItem 更新设备项
func (dmd *DeviceManagementDialog) updateDeviceItem(id widget.ListItemID, item fyne.CanvasObject) {
	device := dmd.devices[id]
	container := item.(*fyne.Container)
	
	// 获取子容器
	infoContainer := container.Objects[0].(*fyne.Container)
	actionContainer := container.Objects[1].(*fyne.Container)

	// 更新设备信息
	infoContainer.Objects[0].(*widget.Label).SetText(device.Name)
	infoContainer.Objects[1].(*widget.Label).SetText(device.Type)
	infoContainer.Objects[2].(*widget.Label).SetText(device.IP)
	infoContainer.Objects[3].(*widget.Label).SetText(device.Status)

	// 更新操作按钮
	editBtn := actionContainer.Objects[0].(*widget.Button)
	deleteBtn := actionContainer.Objects[1].(*widget.Button)
	configBtn := actionContainer.Objects[2].(*widget.Button)

	// 设置编辑按钮事件
	editBtn.OnTapped = func() {
		dmd.showEditDeviceDialog(device)
	}

	// 设置删除按钮事件
	deleteBtn.OnTapped = func() {
		dmd.showDeleteDeviceDialog(device)
	}

	// 设置配置按钮事件
	configBtn.OnTapped = func() {
		dmd.showDeviceConfigDialog(device)
	}
}

// refreshDeviceList 刷新设备列表
func (dmd *DeviceManagementDialog) refreshDeviceList() {
	devices, err := dmd.httpClient.GetDevices()
	if err != nil {
		dialog.ShowError(err, dmd.window)
		return
	}

	dmd.devices = devices
	dmd.deviceList.Refresh()
}

// showAddDeviceDialog 显示添加设备对话框
func (dmd *DeviceManagementDialog) showAddDeviceDialog() {
	dialog := NewAddDeviceDialog(dmd.window, dmd.httpClient)
	dialog.Show()
}

// showEditDeviceDialog 显示编辑设备对话框
func (dmd *DeviceManagementDialog) showEditDeviceDialog(device *service.Device) {
	// 创建编辑表单
	nameEntry := widget.NewEntry()
	nameEntry.SetText(device.Name)

	typeEntry := widget.NewEntry()
	typeEntry.SetText(device.Type)

	ipEntry := widget.NewEntry()
	ipEntry.SetText(device.IP)

	macEntry := widget.NewEntry()
	macEntry.SetText(device.MAC)

	locationEntry := widget.NewEntry()
	locationEntry.SetText(device.Location)

	descriptionEntry := widget.NewMultiLineEntry()
	descriptionEntry.SetText(device.Description)

	// 创建表单
	form := &widget.Form{
		Items: []*widget.FormItem{
			{Text: "Name", Widget: nameEntry},
			{Text: "Type", Widget: typeEntry},
			{Text: "IP", Widget: ipEntry},
			{Text: "MAC", Widget: macEntry},
			{Text: "Location", Widget: locationEntry},
			{Text: "Description", Widget: descriptionEntry},
		},
		OnSubmit: func() {
			// 更新设备信息
			device.Name = nameEntry.Text
			device.Type = typeEntry.Text
			device.IP = ipEntry.Text
			device.MAC = macEntry.Text
			device.Location = locationEntry.Text
			device.Description = descriptionEntry.Text

			// 调用API更新设备
			err := dmd.httpClient.UpdateDevice(device)
			if err != nil {
				dialog.ShowError(err, dmd.window)
				return
			}

			// 刷新设备列表
			dmd.refreshDeviceList()

			// 关闭对话框
			dialog.Dismiss(dialog.NewCustom("Success", "OK", widget.NewLabel("Device updated successfully"), dmd.window))
		},
	}

	// 显示对话框
	dialog := dialog.NewCustom("Edit Device", "Cancel", form, dmd.window)
	dialog.Show()
}

// showDeleteDeviceDialog 显示删除设备对话框
func (dmd *DeviceManagementDialog) showDeleteDeviceDialog(device *service.Device) {
	dialog.ShowConfirm("Delete Device", "Are you sure you want to delete this device?", func(ok bool) {
		if ok {
			// 调用API删除设备
			err := dmd.httpClient.DeleteDevice(device.ID)
			if err != nil {
				dialog.ShowError(err, dmd.window)
				return
			}

			// 刷新设备列表
			dmd.refreshDeviceList()
		}
	}, dmd.window)
}

// showDeviceConfigDialog 显示设备配置对话框
func (dmd *DeviceManagementDialog) showDeviceConfigDialog(device *service.Device) {
	// TODO: 实现设备配置对话框
	dialog.ShowInformation("Device Configuration", "Device configuration dialog will be implemented here.", dmd.window)
} 