package device_config

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"

	"client/internal/service"
)

// NetSettingPage Network settings page
type NetSettingPage struct {
	window     fyne.Window
	httpClient *service.HTTPClient
	device     *service.Device
	container  *fyne.Container
}

// NewNetSettingPage Create network settings page
func NewNetSettingPage(window fyne.Window, httpClient *service.HTTPClient, device *service.Device) *NetSettingPage {
	nsp := &NetSettingPage{
		window:     window,
		httpClient: httpClient,
		device:     device,
	}

	// Create page
	nsp.createPage()

	return nsp
}

// Container Get container
func (nsp *NetSettingPage) Container() *fyne.Container {
	return nsp.container
}

// createPage Create page
func (nsp *NetSettingPage) createPage() {
	// Create IP configuration
	ipConfig := nsp.createIPConfig()

	// Create DNS settings
	dnsSettings := nsp.createDNSSettings()

	// Create interface settings
	interfaceSettings := nsp.createInterfaceSettings()

	// Create save button
	saveBtn := widget.NewButton("Save", func() {
		nsp.saveSettings()
	})

	// Create main container
	nsp.container = container.NewVBox(
		ipConfig,
		widget.NewSeparator(),
		dnsSettings,
		widget.NewSeparator(),
		interfaceSettings,
		widget.NewSeparator(),
		saveBtn,
	)
}

// createIPConfig Create IP configuration section
func (nsp *NetSettingPage) createIPConfig() fyne.CanvasObject {
	// Create IP configuration form
	config := nsp.device.Config.Network

	// Create IP address entry
	ipEntry := widget.NewEntry()
	ipEntry.SetText(config.IP)

	// Create subnet mask entry
	maskEntry := widget.NewEntry()
	maskEntry.SetText(config.SubnetMask)

	// Create gateway entry
	gatewayEntry := widget.NewEntry()
	gatewayEntry.SetText(config.Gateway)

	// Create DHCP mode selection
	dhcpSelect := widget.NewSelect([]string{"Static", "DHCP"}, func(mode string) {
		config.DHCPMode = mode
	})
	dhcpSelect.SetSelected(config.DHCPMode)

	// Create form
	form := widget.NewForm(
		widget.NewFormItem("IP Address", ipEntry),
		widget.NewFormItem("Subnet Mask", maskEntry),
		widget.NewFormItem("Gateway", gatewayEntry),
		widget.NewFormItem("DHCP Mode", dhcpSelect),
	)

	return container.NewVBox(
		widget.NewLabel("IP Configuration"),
		form,
	)
}

// createDNSSettings Create DNS settings section
func (nsp *NetSettingPage) createDNSSettings() fyne.CanvasObject {
	// Create DNS settings form
	config := nsp.device.Config.Network

	// Create primary DNS entry
	primaryDNSEntry := widget.NewEntry()
	primaryDNSEntry.SetText(config.PrimaryDNS)

	// Create secondary DNS entry
	secondaryDNSEntry := widget.NewEntry()
	secondaryDNSEntry.SetText(config.SecondaryDNS)

	// Create DNS mode selection
	dnsModeSelect := widget.NewSelect([]string{"Manual", "Auto"}, func(mode string) {
		config.DNSMode = mode
	})
	dnsModeSelect.SetSelected(config.DNSMode)

	// Create form
	form := widget.NewForm(
		widget.NewFormItem("Primary DNS", primaryDNSEntry),
		widget.NewFormItem("Secondary DNS", secondaryDNSEntry),
		widget.NewFormItem("DNS Mode", dnsModeSelect),
	)

	return container.NewVBox(
		widget.NewLabel("DNS Settings"),
		form,
	)
}

// createInterfaceSettings Create interface settings section
func (nsp *NetSettingPage) createInterfaceSettings() fyne.CanvasObject {
	// Create interface list
	interfaces := nsp.device.Config.Network.Interfaces
	interfaceList := widget.NewList(
		func() int {
			return len(interfaces)
		},
		func() fyne.CanvasObject {
			return container.NewHBox(
				widget.NewLabel(""), // Interface name
				widget.NewLabel(""), // Type
				widget.NewLabel(""), // Status
				widget.NewButton("Configure", nil),
			)
		},
		func(id widget.ListItemID, item fyne.CanvasObject) {
			if id < len(interfaces) {
				iface := interfaces[id]
				container := item.(*fyne.Container)
				container.Objects[0].(*widget.Label).SetText(iface.Name)
				container.Objects[1].(*widget.Label).SetText(iface.Type)
				container.Objects[2].(*widget.Label).SetText(iface.Status)
				container.Objects[3].(*widget.Button).OnTapped = func() {
					nsp.showInterfaceConfigDialog(iface)
				}
			}
		},
	)

	// Create add interface button
	addInterfaceBtn := widget.NewButton("Add Interface", func() {
		nsp.showAddInterfaceDialog()
	})

	return container.NewVBox(
		widget.NewLabel("Network Interfaces"),
		interfaceList,
		addInterfaceBtn,
	)
}

// showInterfaceConfigDialog Show interface configuration dialog
func (nsp *NetSettingPage) showInterfaceConfigDialog(iface *service.NetworkInterface) {
	// Create form fields
	nameEntry := widget.NewEntry()
	nameEntry.SetText(iface.Name)

	typeSelect := widget.NewSelect([]string{"Ethernet", "Wireless", "VLAN"}, func(ifaceType string) {
		iface.Type = ifaceType
	})
	typeSelect.SetSelected(iface.Type)

	enabledCheck := widget.NewCheck("Enabled", func(checked bool) {
		iface.Enabled = checked
	})
	enabledCheck.SetChecked(iface.Enabled)

	// Create form
	form := &widget.Form{
		Items: []*widget.FormItem{
			{Text: "Name", Widget: nameEntry},
			{Text: "Type", Widget: typeSelect},
			{Text: "Status", Widget: enabledCheck},
		},
		OnSubmit: func() {
			iface.Name = nameEntry.Text
			nsp.createPage()
		},
	}

	// Show dialog
	dialog := dialog.NewCustom("Configure Interface", "Cancel", form, nsp.window)
	dialog.Show()
}

// showAddInterfaceDialog Show add interface dialog
func (nsp *NetSettingPage) showAddInterfaceDialog() {
	// Create form fields
	nameEntry := widget.NewEntry()
	typeSelect := widget.NewSelect([]string{"Ethernet", "Wireless", "VLAN"}, nil)

	// Create form
	form := &widget.Form{
		Items: []*widget.FormItem{
			{Text: "Name", Widget: nameEntry},
			{Text: "Type", Widget: typeSelect},
		},
		OnSubmit: func() {
			// Add interface to list
			iface := &service.NetworkInterface{
				Name:    nameEntry.Text,
				Type:    typeSelect.Selected,
				Enabled: true,
				Status:  "Active",
			}
			nsp.device.Config.Network.Interfaces = append(nsp.device.Config.Network.Interfaces, iface)
			nsp.createPage()
		},
	}

	// Show dialog
	dialog := dialog.NewCustom("Add Interface", "Cancel", form, nsp.window)
	dialog.Show()
}

// saveSettings Save network settings
func (nsp *NetSettingPage) saveSettings() {
	// Call API to save settings
	err := nsp.httpClient.UpdateDeviceConfig(nsp.device.ID, nsp.device.Config)
	if err != nil {
		dialog.ShowError(err, nsp.window)
		return
	}

	dialog.ShowInformation("Success", "Network settings saved successfully", nsp.window)
} 