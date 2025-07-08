package gui

import (
	"fmt"
	"net"
	"regexp"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"
	"server/models"
	"client/internal/service"
)

// AddDeviceDialog 添加设备对话框
type AddDeviceDialog struct {
	window     fyne.Window
	form       *widget.Form
	httpClient *service.HTTPClient
}

// NewAddDeviceDialog 创建添加设备对话框
func NewAddDeviceDialog(parent fyne.Window, httpClient *service.HTTPClient) *AddDeviceDialog {
	d := &AddDeviceDialog{
		window:     parent,
		httpClient: httpClient,
	}

	// 创建设备类型选择
	deviceType := widget.NewSelect([]string{"Router", "Switch", "AP", "Client"}, nil)

	// 创建表单
	d.form = &widget.Form{
		Items: []*widget.FormItem{
			{Text: "Name", Widget: widget.NewEntry()},
			{Text: "Type", Widget: deviceType},
			{Text: "IP", Widget: widget.NewEntry()},
			{Text: "Location", Widget: widget.NewEntry()},
			{Text: "Description", Widget: widget.NewMultiLineEntry()},
		},
		OnSubmit: d.addDevice,
		OnCancel: func() {
			d.window.Close()
		},
		SubmitText: "Add",
		CancelText: "Cancel",
	}

	return d
}

// Show 显示对话框
func (d *AddDeviceDialog) Show() {
	dialog.ShowCustom("Add Device", "Cancel", d.form, d.window)
}

// addDevice 添加设备
func (d *AddDeviceDialog) addDevice() {
	// 获取表单值
	name := d.form.Items[0].Widget.(*widget.Entry).Text
	deviceType := d.form.Items[1].Widget.(*widget.Select).Selected
	ip := d.form.Items[2].Widget.(*widget.Entry).Text
	location := d.form.Items[3].Widget.(*widget.Entry).Text
	description := d.form.Items[4].Widget.(*widget.MultiLineEntry).Text

	// 验证必填字段
	if name == "" || deviceType == "" || ip == "" {
		dialog.ShowError(fmt.Errorf("Name, Type and IP are required"), d.window)
		return
	}

	// 验证IP地址格式
	if !isValidIP(ip) {
		dialog.ShowError(fmt.Errorf("Invalid IP address format"), d.window)
		return
	}

	// 创建设备对象
	device := &models.Device{
		Name:        name,
		Type:        deviceType,
		IP:          ip,
		Location:    location,
		Description: description,
		Status:      "offline", // 初始状态为离线
	}

	// 调用API添加设备
	if err := d.httpClient.AddDevice(device); err != nil {
		dialog.ShowError(err, d.window)
		return
	}

	// 显示成功消息
	dialog.ShowInformation("Success", "Device added successfully", d.window)

	// 关闭对话框
	d.window.Close()
}

// isValidIP 验证IP地址格式
func isValidIP(ip string) bool {
	ipRegex := regexp.MustCompile(`^(\d{1,3}\.){3}\d{1,3}$`)
	if !ipRegex.MatchString(ip) {
		return false
	}

	parts := strings.Split(ip, ".")
	for _, part := range parts {
		num := 0
		for _, c := range part {
			if c < '0' || c > '9' {
				return false
			}
			num = num*10 + int(c-'0')
		}
		if num > 255 {
			return false
		}
	}

	return true
}

// isValidPort 验证端口号
func isValidPort(port string) bool {
	num, err := strconv.Atoi(port)
	if err != nil {
		return false
	}
	return num >= 1 && num <= 65535
}

// isValidMAC 验证MAC地址
func isValidMAC(mac string) bool {
	macRegex := regexp.MustCompile(`^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$`)
	return macRegex.MatchString(mac)
}

// isValidHostname 验证主机名
func isValidHostname(hostname string) bool {
	hostnameRegex := regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$`)
	return hostnameRegex.MatchString(hostname)
} 