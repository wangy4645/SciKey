package device_config

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"

	"client/internal/service"
)

// SecurityPage 安全页面
type SecurityPage struct {
	window     fyne.Window
	httpClient *service.HTTPClient
	device     *service.Device
	container  *fyne.Container
}

// NewSecurityPage 创建安全页面
func NewSecurityPage(window fyne.Window, httpClient *service.HTTPClient, device *service.Device) *SecurityPage {
	sp := &SecurityPage{
		window:     window,
		httpClient: httpClient,
		device:     device,
	}

	// 创建页面
	sp.createPage()

	return sp
}

// Container 获取容器
func (sp *SecurityPage) Container() *fyne.Container {
	return sp.container
}

// createPage 创建页面
func (sp *SecurityPage) createPage() {
	// 创建防火墙设置
	firewallSettings := sp.createFirewallSettings()

	// 创建访问控制列表
	aclSettings := sp.createACLSettings()

	// 创建安全策略
	securityPolicy := sp.createSecurityPolicy()

	// 创建保存按钮
	saveBtn := widget.NewButton("Save", func() {
		sp.saveSettings()
	})

	// 创建主容器
	sp.container = container.NewVBox(
		firewallSettings,
		widget.NewSeparator(),
		aclSettings,
		widget.NewSeparator(),
		securityPolicy,
		widget.NewSeparator(),
		saveBtn,
	)
}

// createFirewallSettings 创建防火墙设置
func (sp *SecurityPage) createFirewallSettings() fyne.CanvasObject {
	// 创建防火墙开关
	firewallEnabled := widget.NewCheck("Enable Firewall", func(checked bool) {
		sp.device.Config.Security.FirewallEnabled = checked
	})
	firewallEnabled.SetChecked(sp.device.Config.Security.FirewallEnabled)

	// 创建防火墙规则列表
	rules := sp.device.Config.Security.FirewallRules
	ruleList := widget.NewList(
		func() int {
			return len(rules)
		},
		func() fyne.CanvasObject {
			return container.NewHBox(
				widget.NewLabel(""), // Rule name
				widget.NewLabel(""), // Action
				widget.NewLabel(""), // Source
				widget.NewLabel(""), // Destination
				widget.NewLabel(""), // Protocol
			)
		},
		func(id widget.ListItemID, item fyne.CanvasObject) {
			if id < len(rules) {
				rule := rules[id]
				container := item.(*fyne.Container)
				container.Objects[0].(*widget.Label).SetText(rule.Name)
				container.Objects[1].(*widget.Label).SetText(rule.Action)
				container.Objects[2].(*widget.Label).SetText(rule.Source)
				container.Objects[3].(*widget.Label).SetText(rule.Destination)
				container.Objects[4].(*widget.Label).SetText(rule.Protocol)
			}
		},
	)

	// 创建添加规则按钮
	addRuleBtn := widget.NewButton("Add Rule", func() {
		sp.showAddRuleDialog()
	})

	return container.NewVBox(
		widget.NewLabel("Firewall Settings"),
		firewallEnabled,
		ruleList,
		addRuleBtn,
	)
}

// createACLSettings 创建访问控制列表设置
func (sp *SecurityPage) createACLSettings() fyne.CanvasObject {
	// 创建ACL列表
	acls := sp.device.Config.Security.ACLs
	aclList := widget.NewList(
		func() int {
			return len(acls)
		},
		func() fyne.CanvasObject {
			return container.NewHBox(
				widget.NewLabel(""), // ACL name
				widget.NewLabel(""), // Type
				widget.NewLabel(""), // Action
				widget.NewLabel(""), // Match criteria
			)
		},
		func(id widget.ListItemID, item fyne.CanvasObject) {
			if id < len(acls) {
				acl := acls[id]
				container := item.(*fyne.Container)
				container.Objects[0].(*widget.Label).SetText(acl.Name)
				container.Objects[1].(*widget.Label).SetText(acl.Type)
				container.Objects[2].(*widget.Label).SetText(acl.Action)
				container.Objects[3].(*widget.Label).SetText(acl.MatchCriteria)
			}
		},
	)

	// 创建添加ACL按钮
	addACLBtn := widget.NewButton("Add ACL", func() {
		sp.showAddACLDialog()
	})

	return container.NewVBox(
		widget.NewLabel("Access Control Lists"),
		aclList,
		addACLBtn,
	)
}

// createSecurityPolicy 创建安全策略
func (sp *SecurityPage) createSecurityPolicy() fyne.CanvasObject {
	// 创建安全策略设置
	policy := sp.device.Config.Security.Policy

	// 创建策略选项
	options := container.NewVBox(
		widget.NewCheck("Enable Intrusion Detection", func(checked bool) {
			policy.IntrusionDetection = checked
		}),
		widget.NewCheck("Enable VPN", func(checked bool) {
			policy.VPNEnabled = checked
		}),
		widget.NewCheck("Enable SSL/TLS", func(checked bool) {
			policy.SSLEnabled = checked
		}),
		widget.NewCheck("Enable MAC Filtering", func(checked bool) {
			policy.MACFiltering = checked
		}),
	)

	return container.NewVBox(
		widget.NewLabel("Security Policy"),
		options,
	)
}

// showAddRuleDialog 显示添加规则对话框
func (sp *SecurityPage) showAddRuleDialog() {
	// TODO: 实现添加规则对话框
	dialog.ShowInformation("Add Rule", "Add rule dialog will be implemented here", sp.window)
}

// showAddACLDialog 显示添加ACL对话框
func (sp *SecurityPage) showAddACLDialog() {
	// TODO: 实现添加ACL对话框
	dialog.ShowInformation("Add ACL", "Add ACL dialog will be implemented here", sp.window)
}

// saveSettings 保存设置
func (sp *SecurityPage) saveSettings() {
	// 调用API保存设置
	err := sp.httpClient.UpdateDeviceConfig(sp.device.ID, sp.device.Config)
	if err != nil {
		dialog.ShowError(err, sp.window)
		return
	}

	dialog.ShowInformation("Success", "Security settings saved successfully", sp.window)
} 