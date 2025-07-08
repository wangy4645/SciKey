package gui

import (
	"fmt"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"
	"client/internal/service"
)

// MainWindow 主窗口
type MainWindow struct {
	app            fyne.App
	window         fyne.Window
	toolbar        *widget.Toolbar
	deviceList     *DeviceList
	networkTopology *NetworkTopology
	httpClient     *service.HTTPClient
	token          string
}

// NewMainWindow 创建主窗口
func NewMainWindow() *MainWindow {
	a := app.New()
	w := a.NewWindow("Network Management System")
	
	// 创建HTTP客户端
	httpClient := service.NewHTTPClient("http://localhost:8081")
	
	mw := &MainWindow{
		app:        a,
		window:     w,
		httpClient: httpClient,
	}
	
	// 设置窗口大小
	w.Resize(fyne.NewSize(1024, 768))
	
	// 显示登录对话框
	mw.showLoginDialog()
	
	return mw
}

// ShowAndRun 显示并运行窗口
func (mw *MainWindow) ShowAndRun() {
	mw.window.ShowAndRun()
}

// showLoginDialog 显示登录对话框
func (mw *MainWindow) showLoginDialog() {
	loginDialog := NewLoginDialog(mw.window, mw.httpClient, func(token string) {
		mw.token = token
		mw.httpClient.SetToken(token)
		mw.initializeMainWindow()
	})
	loginDialog.Show()
}

// showRegisterDialog 显示注册对话框
func (mw *MainWindow) showRegisterDialog() {
	registerDialog := NewRegisterDialog(mw.window, mw.httpClient)
	registerDialog.Show()
}

// initializeMainWindow 初始化主窗口
func (mw *MainWindow) initializeMainWindow() {
	// 创建工具栏
	mw.createToolbar()
	
	// 创建主布局
	content := container.NewBorder(mw.toolbar, nil, nil, nil, mw.createMainContent())
	mw.window.SetContent(content)
}

// createToolbar 创建工具栏
func (mw *MainWindow) createToolbar() {
	// 系统配置菜单
	systemMenu := widget.NewMenu(
		widget.NewMenuItem("Add Device", mw.showAddDeviceDialog),
		widget.NewMenuItem("Manage Devices", mw.showManageDevicesDialog),
		widget.NewMenuItem("Change Password", mw.showChangePasswordDialog),
		widget.NewMenuItem("Settings", mw.showSettingsDialog),
	)
	
	// 日志菜单
	logMenu := widget.NewMenu(
		widget.NewMenuItem("Device Logs", mw.showDeviceLogsDialog),
		widget.NewMenuItem("Operation Logs", mw.showOperationLogsDialog),
		widget.NewMenuItem("System Logs", mw.showSystemLogsDialog),
		widget.NewMenuItem("Clear Logs", mw.showClearLogsDialog),
	)
	
	// 创建工具栏
	mw.toolbar = widget.NewToolbar(
		widget.NewToolbarAction(theme.SettingsIcon(), func() {
			systemMenu.Show()
		}),
		widget.NewToolbarAction(theme.DocumentIcon(), func() {
			logMenu.Show()
		}),
		widget.NewToolbarSeparator(),
		widget.NewToolbarAction(theme.ViewFullScreenIcon(), func() {
			mw.window.SetFullScreen(!mw.window.FullScreen())
		}),
		widget.NewToolbarAction(theme.CancelIcon(), func() {
			dialog.ShowConfirm("Exit", "Are you sure you want to exit?", func(ok bool) {
				if ok {
					mw.app.Quit()
				}
			}, mw.window)
		}),
	)
}

// createMainContent 创建主内容
func (mw *MainWindow) createMainContent() fyne.CanvasObject {
	// 创建设备列表
	mw.deviceList = NewDeviceList(mw.window, mw.httpClient, nil)
	
	// 创建网络拓扑视图
	mw.networkTopology = NewNetworkTopology(mw.window, mw.httpClient)
	
	// 创建分割视图
	split := container.NewHSplit(mw.deviceList.Container(), mw.networkTopology.Container())
	split.Offset = 0.3
	
	return split
}

// showAddDeviceDialog 显示添加设备对话框
func (mw *MainWindow) showAddDeviceDialog() {
	dialog := NewAddDeviceDialog(mw.window, mw.httpClient)
	dialog.Show()
}

// showManageDevicesDialog 显示设备管理对话框
func (mw *MainWindow) showManageDevicesDialog() {
	dialog := NewDeviceManagementDialog(mw.window, mw.httpClient)
	dialog.Show()
}

// showChangePasswordDialog 显示修改密码对话框
func (mw *MainWindow) showChangePasswordDialog() {
	dialog.ShowInformation("Change Password", "Change password dialog will be implemented here.", mw.window)
}

// showSettingsDialog 显示设置对话框
func (mw *MainWindow) showSettingsDialog() {
	dialog.ShowInformation("Settings", "Settings dialog will be implemented here.", mw.window)
}

// showDeviceLogsDialog 显示设备日志对话框
func (mw *MainWindow) showDeviceLogsDialog() {
	dialog.ShowInformation("Device Logs", "Device logs dialog will be implemented here.", mw.window)
}

// showOperationLogsDialog 显示操作日志对话框
func (mw *MainWindow) showOperationLogsDialog() {
	dialog.ShowInformation("Operation Logs", "Operation logs dialog will be implemented here.", mw.window)
}

// showSystemLogsDialog 显示系统日志对话框
func (mw *MainWindow) showSystemLogsDialog() {
	dialog.ShowInformation("System Logs", "System logs dialog will be implemented here.", mw.window)
}

// showClearLogsDialog 显示清除日志对话框
func (mw *MainWindow) showClearLogsDialog() {
	dialog.ShowConfirm("Clear Logs", "Are you sure you want to clear all logs?", func(ok bool) {
		if ok {
			dialog.ShowInformation("Success", "All logs have been cleared.", mw.window)
		}
	}, mw.window)
}

// ShowInfo 显示信息对话框
func (mw *MainWindow) ShowInfo(message string) {
	dialog.ShowInformation("Info", message, mw.window)
}

// ShowError 显示错误对话框
func (mw *MainWindow) ShowError(message string) {
	dialog.ShowError(fmt.Errorf(message), mw.window)
}

// ShowConfirm 显示确认对话框
func (mw *MainWindow) ShowConfirm(title, message string, callback func(bool)) {
	dialog.ShowConfirm(title, message, callback, mw.window)
} 