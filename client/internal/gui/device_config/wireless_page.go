package device_config

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"

	"client/internal/service"
)

// WirelessPage Wireless configuration page
type WirelessPage struct {
	window     fyne.Window
	httpClient *service.HTTPClient
	device     *service.Device
	container  *fyne.Container
}

// NewWirelessPage Create wireless page
func NewWirelessPage(window fyne.Window, httpClient *service.HTTPClient, device *service.Device) *WirelessPage {
	wp := &WirelessPage{
		window:     window,
		httpClient: httpClient,
		device:     device,
	}

	// Create page
	wp.createPage()

	return wp
}

// Container Get container
func (wp *WirelessPage) Container() *fyne.Container {
	return wp.container
}

// createPage Create page
func (wp *WirelessPage) createPage() {
	// Create wireless status
	statusSection := wp.createStatusSection()

	// Create wireless settings
	settingsSection := wp.createSettingsSection()

	// Create wireless networks
	networksSection := wp.createNetworksSection()

	// Create save button
	saveBtn := widget.NewButton("Save", func() {
		wp.saveSettings()
	})

	// Create main container
	wp.container = container.NewVBox(
		statusSection,
		widget.NewSeparator(),
		settingsSection,
		widget.NewSeparator(),
		networksSection,
		widget.NewSeparator(),
		saveBtn,
	)
}

// createStatusSection Create wireless status section
func (wp *WirelessPage) createStatusSection() fyne.CanvasObject {
	// Create status indicators
	status := wp.device.Config.Wireless.Status
	statusForm := widget.NewForm(
		widget.NewFormItem("Wireless Status", widget.NewLabel(status.State)),
		widget.NewFormItem("Signal Strength", widget.NewLabel(status.SignalStrength)),
		widget.NewFormItem("Channel", widget.NewLabel(status.Channel)),
		widget.NewFormItem("Mode", widget.NewLabel(status.Mode)),
	)

	return container.NewVBox(
		widget.NewLabel("Wireless Status"),
		statusForm,
	)
}

// createSettingsSection Create wireless settings section
func (wp *WirelessPage) createSettingsSection() fyne.CanvasObject {
	// Create wireless settings
	settings := wp.device.Config.Wireless.Settings

	// Create mode selection
	modeSelect := widget.NewSelect([]string{"AP", "Client", "Bridge"}, func(mode string) {
		settings.Mode = mode
	})
	modeSelect.SetSelected(settings.Mode)

	// Create channel selection
	channelSelect := widget.NewSelect([]string{"1", "6", "11"}, func(channel string) {
		settings.Channel = channel
	})
	channelSelect.SetSelected(settings.Channel)

	// Create bandwidth selection
	bandwidthSelect := widget.NewSelect([]string{"20MHz", "40MHz", "80MHz"}, func(bandwidth string) {
		settings.Bandwidth = bandwidth
	})
	bandwidthSelect.SetSelected(settings.Bandwidth)

	// Create power level selection
	powerSelect := widget.NewSelect([]string{"Low", "Medium", "High"}, func(power string) {
		settings.PowerLevel = power
	})
	powerSelect.SetSelected(settings.PowerLevel)

	// Create settings form
	settingsForm := widget.NewForm(
		widget.NewFormItem("Mode", modeSelect),
		widget.NewFormItem("Channel", channelSelect),
		widget.NewFormItem("Bandwidth", bandwidthSelect),
		widget.NewFormItem("Power Level", powerSelect),
	)

	return container.NewVBox(
		widget.NewLabel("Wireless Settings"),
		settingsForm,
	)
}

// createNetworksSection Create wireless networks section
func (wp *WirelessPage) createNetworksSection() fyne.CanvasObject {
	// Create networks list
	networks := wp.device.Config.Wireless.Networks
	networkList := widget.NewList(
		func() int {
			return len(networks)
		},
		func() fyne.CanvasObject {
			return container.NewHBox(
				widget.NewLabel(""), // SSID
				widget.NewLabel(""), // Security
				widget.NewLabel(""), // Signal
				widget.NewLabel(""), // Channel
			)
		},
		func(id widget.ListItemID, item fyne.CanvasObject) {
			if id < len(networks) {
				network := networks[id]
				container := item.(*fyne.Container)
				container.Objects[0].(*widget.Label).SetText(network.SSID)
				container.Objects[1].(*widget.Label).SetText(network.Security)
				container.Objects[2].(*widget.Label).SetText(network.Signal)
				container.Objects[3].(*widget.Label).SetText(network.Channel)
			}
		},
	)

	// Create add network button
	addNetworkBtn := widget.NewButton("Add Network", func() {
		wp.showAddNetworkDialog()
	})

	// Create scan button
	scanBtn := widget.NewButton("Scan Networks", func() {
		wp.scanNetworks()
	})

	// Create button container
	buttonContainer := container.NewHBox(addNetworkBtn, scanBtn)

	return container.NewVBox(
		widget.NewLabel("Wireless Networks"),
		networkList,
		buttonContainer,
	)
}

// showAddNetworkDialog Show add network dialog
func (wp *WirelessPage) showAddNetworkDialog() {
	// Create form fields
	ssidEntry := widget.NewEntry()
	passwordEntry := widget.NewPasswordEntry()
	securitySelect := widget.NewSelect([]string{"None", "WEP", "WPA", "WPA2"}, nil)

	// Create form
	form := &widget.Form{
		Items: []*widget.FormItem{
			{Text: "SSID", Widget: ssidEntry},
			{Text: "Password", Widget: passwordEntry},
			{Text: "Security", Widget: securitySelect},
		},
		OnSubmit: func() {
			// Add network to list
			network := &service.WirelessNetwork{
				SSID:     ssidEntry.Text,
				Security: securitySelect.Selected,
				Signal:   "N/A",
				Channel:  "N/A",
			}
			wp.device.Config.Wireless.Networks = append(wp.device.Config.Wireless.Networks, network)
			wp.createPage()
		},
	}

	// Show dialog
	dialog := dialog.NewCustom("Add Network", "Cancel", form, wp.window)
	dialog.Show()
}

// scanNetworks Scan for wireless networks
func (wp *WirelessPage) scanNetworks() {
	// TODO: Implement network scanning
	dialog.ShowInformation("Scan Networks", "Network scanning will be implemented here", wp.window)
}

// saveSettings Save wireless settings
func (wp *WirelessPage) saveSettings() {
	// Call API to save settings
	err := wp.httpClient.UpdateDeviceConfig(wp.device.ID, wp.device.Config)
	if err != nil {
		dialog.ShowError(err, wp.window)
		return
	}

	dialog.ShowInformation("Success", "Wireless settings saved successfully", wp.window)
} 