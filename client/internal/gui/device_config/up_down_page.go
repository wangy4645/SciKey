package device_config

import (
	"fmt"
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"

	"client/internal/service"
)

// UpDownPage UP-DOWN settings page
type UpDownPage struct {
	window     fyne.Window
	httpClient *service.HTTPClient
	device     *service.Device
	container  *fyne.Container
}

// NewUpDownPage Create UP-DOWN settings page
func NewUpDownPage(window fyne.Window, httpClient *service.HTTPClient, device *service.Device) *UpDownPage {
	udp := &UpDownPage{
		window:     window,
		httpClient: httpClient,
		device:     device,
	}

	// Create page
	udp.createPage()

	return udp
}

// Container Get container
func (udp *UpDownPage) Container() *fyne.Container {
	return udp.container
}

// createPage Create page
func (udp *UpDownPage) createPage() {
	// Create bandwidth settings
	bandwidthSettings := udp.createBandwidthSettings()

	// Create QoS settings
	qosSettings := udp.createQoSSettings()

	// Create traffic control
	trafficControl := udp.createTrafficControl()

	// Create save button
	saveBtn := widget.NewButton("Save", func() {
		udp.saveSettings()
	})

	// Create main container
	udp.container = container.NewVBox(
		bandwidthSettings,
		widget.NewSeparator(),
		qosSettings,
		widget.NewSeparator(),
		trafficControl,
		widget.NewSeparator(),
		saveBtn,
	)
}

// createBandwidthSettings Create bandwidth settings section
func (udp *UpDownPage) createBandwidthSettings() fyne.CanvasObject {
	// Create bandwidth settings form
	config := udp.device.Config.UpDown

	// Create upload bandwidth entry
	uploadEntry := widget.NewEntry()
	uploadEntry.SetText(fmt.Sprintf("%d", config.UploadBandwidth))

	// Create download bandwidth entry
	downloadEntry := widget.NewEntry()
	downloadEntry.SetText(fmt.Sprintf("%d", config.DownloadBandwidth))

	// Create bandwidth unit selection
	unitSelect := widget.NewSelect([]string{"Kbps", "Mbps", "Gbps"}, func(unit string) {
		config.BandwidthUnit = unit
	})
	unitSelect.SetSelected(config.BandwidthUnit)

	// Create form
	form := widget.NewForm(
		widget.NewFormItem("Upload Bandwidth", uploadEntry),
		widget.NewFormItem("Download Bandwidth", downloadEntry),
		widget.NewFormItem("Bandwidth Unit", unitSelect),
	)

	return container.NewVBox(
		widget.NewLabel("Bandwidth Settings"),
		form,
	)
}

// createQoSSettings Create QoS settings section
func (udp *UpDownPage) createQoSSettings() fyne.CanvasObject {
	// Create QoS settings
	config := udp.device.Config.UpDown

	// Create QoS enabled checkbox
	qosEnabled := widget.NewCheck("Enable QoS", func(checked bool) {
		config.QoSEnabled = checked
	})
	qosEnabled.SetChecked(config.QoSEnabled)

	// Create QoS rules list
	rules := config.QoSRules
	ruleList := widget.NewList(
		func() int {
			return len(rules)
		},
		func() fyne.CanvasObject {
			return container.NewHBox(
				widget.NewLabel(""), // Rule name
				widget.NewLabel(""), // Priority
				widget.NewLabel(""), // Protocol
				widget.NewLabel(""), // Port range
				widget.NewButton("Edit", nil),
				widget.NewButton("Delete", nil),
			)
		},
		func(id widget.ListItemID, item fyne.CanvasObject) {
			if id < len(rules) {
				rule := rules[id]
				container := item.(*fyne.Container)
				container.Objects[0].(*widget.Label).SetText(rule.Name)
				container.Objects[1].(*widget.Label).SetText(rule.Priority)
				container.Objects[2].(*widget.Label).SetText(rule.Protocol)
				container.Objects[3].(*widget.Label).SetText(rule.PortRange)
				container.Objects[4].(*widget.Button).OnTapped = func() {
					udp.showEditQoSRuleDialog(rule)
				}
				container.Objects[5].(*widget.Button).OnTapped = func() {
					udp.deleteQoSRule(id)
				}
			}
		},
	)

	// Create add rule button
	addRuleBtn := widget.NewButton("Add QoS Rule", func() {
		udp.showAddQoSRuleDialog()
	})

	return container.NewVBox(
		widget.NewLabel("QoS Settings"),
		qosEnabled,
		ruleList,
		addRuleBtn,
	)
}

// createTrafficControl Create traffic control section
func (udp *UpDownPage) createTrafficControl() fyne.CanvasObject {
	// Create traffic control settings
	config := udp.device.Config.UpDown

	// Create traffic shaping enabled checkbox
	shapingEnabled := widget.NewCheck("Enable Traffic Shaping", func(checked bool) {
		config.TrafficShapingEnabled = checked
	})
	shapingEnabled.SetChecked(config.TrafficShapingEnabled)

	// Create traffic monitoring enabled checkbox
	monitoringEnabled := widget.NewCheck("Enable Traffic Monitoring", func(checked bool) {
		config.TrafficMonitoringEnabled = checked
	})
	monitoringEnabled.SetChecked(config.TrafficMonitoringEnabled)

	// Create traffic limits
	limitsForm := widget.NewForm(
		widget.NewFormItem("Max Connections", widget.NewEntry()),
		widget.NewFormItem("Connection Timeout", widget.NewEntry()),
		widget.NewFormItem("Rate Limit", widget.NewEntry()),
	)

	return container.NewVBox(
		widget.NewLabel("Traffic Control"),
		shapingEnabled,
		monitoringEnabled,
		limitsForm,
	)
}

// showAddQoSRuleDialog Show add QoS rule dialog
func (udp *UpDownPage) showAddQoSRuleDialog() {
	// Create form fields
	nameEntry := widget.NewEntry()
	prioritySelect := widget.NewSelect([]string{"High", "Medium", "Low"}, nil)
	protocolSelect := widget.NewSelect([]string{"TCP", "UDP", "ICMP", "Any"}, nil)
	portRangeEntry := widget.NewEntry()

	// Create form
	form := &widget.Form{
		Items: []*widget.FormItem{
			{Text: "Rule Name", Widget: nameEntry},
			{Text: "Priority", Widget: prioritySelect},
			{Text: "Protocol", Widget: protocolSelect},
			{Text: "Port Range", Widget: portRangeEntry},
		},
		OnSubmit: func() {
			// Add rule to list
			rule := &service.QoSRule{
				Name:      nameEntry.Text,
				Priority:  prioritySelect.Selected,
				Protocol:  protocolSelect.Selected,
				PortRange: portRangeEntry.Text,
			}
			udp.device.Config.UpDown.QoSRules = append(udp.device.Config.UpDown.QoSRules, rule)
			udp.createPage()
		},
	}

	// Show dialog
	dialog := dialog.NewCustom("Add QoS Rule", "Cancel", form, udp.window)
	dialog.Show()
}

// showEditQoSRuleDialog Show edit QoS rule dialog
func (udp *UpDownPage) showEditQoSRuleDialog(rule *service.QoSRule) {
	// Create form fields
	nameEntry := widget.NewEntry()
	nameEntry.SetText(rule.Name)

	prioritySelect := widget.NewSelect([]string{"High", "Medium", "Low"}, func(priority string) {
		rule.Priority = priority
	})
	prioritySelect.SetSelected(rule.Priority)

	protocolSelect := widget.NewSelect([]string{"TCP", "UDP", "ICMP", "Any"}, func(protocol string) {
		rule.Protocol = protocol
	})
	protocolSelect.SetSelected(rule.Protocol)

	portRangeEntry := widget.NewEntry()
	portRangeEntry.SetText(rule.PortRange)

	// Create form
	form := &widget.Form{
		Items: []*widget.FormItem{
			{Text: "Rule Name", Widget: nameEntry},
			{Text: "Priority", Widget: prioritySelect},
			{Text: "Protocol", Widget: protocolSelect},
			{Text: "Port Range", Widget: portRangeEntry},
		},
		OnSubmit: func() {
			rule.Name = nameEntry.Text
			rule.PortRange = portRangeEntry.Text
			udp.createPage()
		},
	}

	// Show dialog
	dialog := dialog.NewCustom("Edit QoS Rule", "Cancel", form, udp.window)
	dialog.Show()
}

// deleteQoSRule Delete QoS rule
func (udp *UpDownPage) deleteQoSRule(id int) {
	// Remove rule from list
	rules := udp.device.Config.UpDown.QoSRules
	udp.device.Config.UpDown.QoSRules = append(rules[:id], rules[id+1:]...)
	udp.createPage()
}

// saveSettings Save UP-DOWN settings
func (udp *UpDownPage) saveSettings() {
	// Call API to save settings
	err := udp.httpClient.UpdateDeviceConfig(udp.device.ID, udp.device.Config)
	if err != nil {
		dialog.ShowError(err, udp.window)
		return
	}

	dialog.ShowInformation("Success", "UP-DOWN settings saved successfully", udp.window)
} 