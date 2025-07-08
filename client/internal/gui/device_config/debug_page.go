package device_config

import (
	"fmt"
	"time"
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"

	"client/internal/service"
)

// DebugPage Debug page
type DebugPage struct {
	window     fyne.Window
	httpClient *service.HTTPClient
	device     *service.Device
	container  *fyne.Container
}

// NewDebugPage Create debug page
func NewDebugPage(window fyne.Window, httpClient *service.HTTPClient, device *service.Device) *DebugPage {
	dp := &DebugPage{
		window:     window,
		httpClient: httpClient,
		device:     device,
	}

	// Create page
	dp.createPage()

	return dp
}

// Container Get container
func (dp *DebugPage) Container() *fyne.Container {
	return dp.container
}

// createPage Create page
func (dp *DebugPage) createPage() {
	// Create log viewer
	logViewer := dp.createLogViewer()

	// Create command executor
	commandExecutor := dp.createCommandExecutor()

	// Create debug tools
	debugTools := dp.createDebugTools()

	// Create main container
	dp.container = container.NewVBox(
		logViewer,
		widget.NewSeparator(),
		commandExecutor,
		widget.NewSeparator(),
		debugTools,
	)
}

// createLogViewer Create log viewer section
func (dp *DebugPage) createLogViewer() fyne.CanvasObject {
	// Create log level filter
	levelSelect := widget.NewSelect([]string{"All", "Info", "Warning", "Error", "Debug"}, nil)
	levelSelect.SetSelected("All")

	// Create log list
	logList := widget.NewList(
		func() int {
			return len(dp.device.Logs)
		},
		func() fyne.CanvasObject {
			return container.NewHBox(
				widget.NewLabel(""), // Timestamp
				widget.NewLabel(""), // Level
				widget.NewLabel(""), // Message
			)
		},
		func(id widget.ListItemID, item fyne.CanvasObject) {
			if id < len(dp.device.Logs) {
				log := dp.device.Logs[id]
				container := item.(*fyne.Container)
				container.Objects[0].(*widget.Label).SetText(log.Timestamp.Format("2006-01-02 15:04:05"))
				container.Objects[1].(*widget.Label).SetText(log.Level)
				container.Objects[2].(*widget.Label).SetText(log.Message)
			}
		},
	)

	// Create refresh button
	refreshBtn := widget.NewButton("Refresh Logs", func() {
		dp.refreshLogs()
	})

	// Create clear button
	clearBtn := widget.NewButton("Clear Logs", func() {
		dp.clearLogs()
	})

	return container.NewVBox(
		widget.NewLabel("System Logs"),
		container.NewHBox(levelSelect, refreshBtn, clearBtn),
		logList,
	)
}

// createCommandExecutor Create command executor section
func (dp *DebugPage) createCommandExecutor() fyne.CanvasObject {
	// Create command input
	commandEntry := widget.NewEntry()
	commandEntry.SetPlaceHolder("Enter AT command...")

	// Create command history
	historyList := widget.NewList(
		func() int {
			return len(dp.device.Config.Debug.CommandHistory)
		},
		func() fyne.CanvasObject {
			return container.NewHBox(
				widget.NewLabel(""), // Timestamp
				widget.NewLabel(""), // Command
				widget.NewLabel(""), // Response
			)
		},
		func(id widget.ListItemID, item fyne.CanvasObject) {
			if id < len(dp.device.Config.Debug.CommandHistory) {
				history := dp.device.Config.Debug.CommandHistory[id]
				container := item.(*fyne.Container)
				container.Objects[0].(*widget.Label).SetText(history.Timestamp.Format("2006-01-02 15:04:05"))
				container.Objects[1].(*widget.Label).SetText(history.Command)
				container.Objects[2].(*widget.Label).SetText(history.Response)
			}
		},
	)

	// Create execute button
	executeBtn := widget.NewButton("Execute", func() {
		dp.executeCommand(commandEntry.Text)
	})

	// Create clear history button
	clearHistoryBtn := widget.NewButton("Clear History", func() {
		dp.clearCommandHistory()
	})

	return container.NewVBox(
		widget.NewLabel("AT Command Executor"),
		container.NewHBox(commandEntry, executeBtn),
		container.NewHBox(clearHistoryBtn),
		historyList,
	)
}

// createDebugTools Create debug tools section
func (dp *DebugPage) createDebugTools() fyne.CanvasObject {
	// Create ping test button
	pingBtn := widget.NewButton("Ping Test", func() {
		dp.runPingTest()
	})

	// Create traceroute button
	tracerouteBtn := widget.NewButton("Traceroute", func() {
		dp.runTraceroute()
	})

	// Create network scan button
	scanBtn := widget.NewButton("Network Scan", func() {
		dp.runNetworkScan()
	})

	// Create system info button
	infoBtn := widget.NewButton("System Info", func() {
		dp.showSystemInfo()
	})

	return container.NewVBox(
		widget.NewLabel("Debug Tools"),
		container.NewHBox(pingBtn, tracerouteBtn, scanBtn, infoBtn),
	)
}

// refreshLogs Refresh logs
func (dp *DebugPage) refreshLogs() {
	// Call API to get latest logs
	logs, err := dp.httpClient.GetDeviceLogs(dp.device.ID, "", 0, 0)
	if err != nil {
		dialog.ShowError(err, dp.window)
		return
	}

	dp.device.Logs = logs
	dp.createPage()
}

// clearLogs Clear logs
func (dp *DebugPage) clearLogs() {
	// Call API to clear logs
	err := dp.httpClient.CleanDeviceLogs(dp.device.ID)
	if err != nil {
		dialog.ShowError(err, dp.window)
		return
	}

	dp.device.Logs = nil
	dp.createPage()
}

// executeCommand Execute AT command
func (dp *DebugPage) executeCommand(command string) {
	// Call API to execute command
	response, err := dp.httpClient.ExecuteCommand(dp.device.ID, command)
	if err != nil {
		dialog.ShowError(err, dp.window)
		return
	}

	// Add to history
	history := &service.ATCommandExecution{
		Timestamp: time.Now(),
		Command:   command,
		Response:  response,
	}
	dp.device.Config.Debug.CommandHistory = append(dp.device.Config.Debug.CommandHistory, history)
	dp.createPage()
}

// clearCommandHistory Clear command history
func (dp *DebugPage) clearCommandHistory() {
	dp.device.Config.Debug.CommandHistory = nil
	dp.createPage()
}

// runPingTest Run ping test
func (dp *DebugPage) runPingTest() {
	// Call API to run ping test
	result, err := dp.httpClient.RunPingTest(dp.device.ID)
	if err != nil {
		dialog.ShowError(err, dp.window)
		return
	}

	dialog.ShowInformation("Ping Test Result", result, dp.window)
}

// runTraceroute Run traceroute
func (dp *DebugPage) runTraceroute() {
	// Call API to run traceroute
	result, err := dp.httpClient.RunTraceroute(dp.device.ID)
	if err != nil {
		dialog.ShowError(err, dp.window)
		return
	}

	dialog.ShowInformation("Traceroute Result", result, dp.window)
}

// runNetworkScan Run network scan
func (dp *DebugPage) runNetworkScan() {
	// Call API to run network scan
	result, err := dp.httpClient.RunNetworkScan(dp.device.ID)
	if err != nil {
		dialog.ShowError(err, dp.window)
		return
	}

	dialog.ShowInformation("Network Scan Result", result, dp.window)
}

// showSystemInfo Show system info
func (dp *DebugPage) showSystemInfo() {
	// Call API to get system info
	info, err := dp.httpClient.GetSystemInfo(dp.device.ID)
	if err != nil {
		dialog.ShowError(err, dp.window)
		return
	}

	dialog.ShowInformation("System Info", info, dp.window)
} 