// createNetStatePage 创建网络状态页面
func (dcd *DeviceConfigDialog) createNetStatePage() fyne.CanvasObject {
	page := NewNetStatePage(dcd.window, dcd.httpClient, dcd.device)
	return page.Container()
}

// createSecurityPage 创建安全页面
func (dcd *DeviceConfigDialog) createSecurityPage() fyne.CanvasObject {
	page := NewSecurityPage(dcd.window, dcd.httpClient, dcd.device)
	return page.Container()
}

// createWirelessPage Create wireless page
func (dcd *DeviceConfigDialog) createWirelessPage() fyne.CanvasObject {
	page := NewWirelessPage(dcd.window, dcd.httpClient, dcd.device)
	return page.Container()
}

// createNetSettingPage Create network settings page
func (dcd *DeviceConfigDialog) createNetSettingPage() fyne.CanvasObject {
	page := NewNetSettingPage(dcd.window, dcd.httpClient, dcd.device)
	return page.Container()
}

// createUpDownPage Create UP-DOWN settings page
func (dcd *DeviceConfigDialog) createUpDownPage() fyne.CanvasObject {
	upDownPage := NewUpDownPage(dcd.window, dcd.httpClient, dcd.device)
	return upDownPage.Container()
}

// createDebugPage Create debug page
func (dcd *DeviceConfigDialog) createDebugPage() fyne.CanvasObject {
	debugPage := NewDebugPage(dcd.window, dcd.httpClient, dcd.device)
	return debugPage.Container()
}

// createSystemPage Create system page
func (dcd *DeviceConfigDialog) createSystemPage() fyne.CanvasObject {
	systemPage := NewSystemPage(dcd.window, dcd.httpClient, dcd.device)
	return systemPage.Container()
}

// createTabs Create tabs
func (dcd *DeviceConfigDialog) createTabs() *container.TabContainer {
	tabs := container.NewAppTabs(
		container.NewTabItem("Net State", dcd.createNetStatePage()),
		container.NewTabItem("Security", dcd.createSecurityPage()),
		container.NewTabItem("Wireless", dcd.createWirelessPage()),
		container.NewTabItem("Net Setting", dcd.createNetSettingPage()),
		container.NewTabItem("UP-DOWN Setting", dcd.createUpDownPage()),
		container.NewTabItem("Debug", dcd.createDebugPage()),
		container.NewTabItem("System Manager", dcd.createSystemPage()),
	)

	return tabs
} 