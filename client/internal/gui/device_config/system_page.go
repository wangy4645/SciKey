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

// SystemPage System manager page
type SystemPage struct {
	window     fyne.Window
	httpClient *service.HTTPClient
	device     *service.Device
	container  *fyne.Container
}

// NewSystemPage Create system manager page
func NewSystemPage(window fyne.Window, httpClient *service.HTTPClient, device *service.Device) *SystemPage {
	sp := &SystemPage{
		window:     window,
		httpClient: httpClient,
		device:     device,
	}

	// Create page
	sp.createPage()

	return sp
}

// Container Get container
func (sp *SystemPage) Container() *fyne.Container {
	return sp.container
}

// createPage Create page
func (sp *SystemPage) createPage() {
	// Create system info section
	systemInfo := sp.createSystemInfo()

	// Create firmware update section
	firmwareUpdate := sp.createFirmwareUpdate()

	// Create backup restore section
	backupRestore := sp.createBackupRestore()

	// Create system maintenance section
	systemMaintenance := sp.createSystemMaintenance()

	// Create main container
	sp.container = container.NewVBox(
		systemInfo,
		widget.NewSeparator(),
		firmwareUpdate,
		widget.NewSeparator(),
		backupRestore,
		widget.NewSeparator(),
		systemMaintenance,
	)
}

// createSystemInfo Create system info section
func (sp *SystemPage) createSystemInfo() fyne.CanvasObject {
	// Create system info form
	config := sp.device.Config.System

	// Create form fields
	hostnameEntry := widget.NewEntry()
	hostnameEntry.SetText(config.Hostname)

	timezoneSelect := widget.NewSelect([]string{"UTC", "GMT+8", "GMT-8"}, func(timezone string) {
		config.Timezone = timezone
	})
	timezoneSelect.SetSelected(config.Timezone)

	languageSelect := widget.NewSelect([]string{"English", "中文"}, func(language string) {
		config.Language = language
	})
	languageSelect.SetSelected(config.Language)

	// Create form
	form := widget.NewForm(
		widget.NewFormItem("Hostname", hostnameEntry),
		widget.NewFormItem("Timezone", timezoneSelect),
		widget.NewFormItem("Language", languageSelect),
	)

	// Create save button
	saveBtn := widget.NewButton("Save", func() {
		sp.saveSystemInfo(hostnameEntry.Text)
	})

	return container.NewVBox(
		widget.NewLabel("System Information"),
		form,
		saveBtn,
	)
}

// createFirmwareUpdate Create firmware update section
func (sp *SystemPage) createFirmwareUpdate() fyne.CanvasObject {
	// Create current version label
	currentVersion := widget.NewLabel(fmt.Sprintf("Current Version: %s", sp.device.Config.System.FirmwareVersion))

	// Create check update button
	checkUpdateBtn := widget.NewButton("Check for Updates", func() {
		sp.checkFirmwareUpdate()
	})

	// Create update button
	updateBtn := widget.NewButton("Update Firmware", func() {
		sp.showFirmwareUpdateDialog()
	})

	return container.NewVBox(
		widget.NewLabel("Firmware Update"),
		currentVersion,
		container.NewHBox(checkUpdateBtn, updateBtn),
	)
}

// createBackupRestore Create backup restore section
func (sp *SystemPage) createBackupRestore() fyne.CanvasObject {
	// Create backup button
	backupBtn := widget.NewButton("Backup Configuration", func() {
		sp.backupConfiguration()
	})

	// Create restore button
	restoreBtn := widget.NewButton("Restore Configuration", func() {
		sp.showRestoreDialog()
	})

	// Create factory reset button
	resetBtn := widget.NewButton("Factory Reset", func() {
		sp.showFactoryResetDialog()
	})

	return container.NewVBox(
		widget.NewLabel("Backup & Restore"),
		container.NewHBox(backupBtn, restoreBtn, resetBtn),
	)
}

// createSystemMaintenance Create system maintenance section
func (sp *SystemPage) createSystemMaintenance() fyne.CanvasObject {
	// Create restart button
	restartBtn := widget.NewButton("Restart Device", func() {
		sp.showRestartDialog()
	})

	// Create shutdown button
	shutdownBtn := widget.NewButton("Shutdown Device", func() {
		sp.showShutdownDialog()
	})

	// Create clear cache button
	clearCacheBtn := widget.NewButton("Clear Cache", func() {
		sp.clearCache()
	})

	return container.NewVBox(
		widget.NewLabel("System Maintenance"),
		container.NewHBox(restartBtn, shutdownBtn, clearCacheBtn),
	)
}

// saveSystemInfo Save system info
func (sp *SystemPage) saveSystemInfo(hostname string) {
	// Update config
	sp.device.Config.System.Hostname = hostname

	// Call API to save settings
	err := sp.httpClient.UpdateDeviceConfig(sp.device.ID, sp.device.Config)
	if err != nil {
		dialog.ShowError(err, sp.window)
		return
	}

	dialog.ShowInformation("Success", "System settings saved successfully", sp.window)
}

// checkFirmwareUpdate Check for firmware updates
func (sp *SystemPage) checkFirmwareUpdate() {
	// Call API to check for updates
	update, err := sp.httpClient.CheckFirmwareUpdate(sp.device.ID)
	if err != nil {
		dialog.ShowError(err, sp.window)
		return
	}

	if update.Available {
		dialog.ShowInformation("Update Available",
			fmt.Sprintf("New version %s is available. Would you like to update now?", update.Version),
			sp.window)
	} else {
		dialog.ShowInformation("No Updates",
			"Your device is running the latest firmware version.",
			sp.window)
	}
}

// showFirmwareUpdateDialog Show firmware update dialog
func (sp *SystemPage) showFirmwareUpdateDialog() {
	// Create confirmation dialog
	dialog.ShowConfirm("Update Firmware",
		"Are you sure you want to update the firmware? This process may take several minutes and the device will restart.",
		func(update bool) {
			if update {
				sp.updateFirmware()
			}
		},
		sp.window)
}

// updateFirmware Update firmware
func (sp *SystemPage) updateFirmware() {
	// Call API to update firmware
	err := sp.httpClient.UpdateFirmware(sp.device.ID)
	if err != nil {
		dialog.ShowError(err, sp.window)
		return
	}

	dialog.ShowInformation("Success", "Firmware update started. The device will restart automatically.", sp.window)
}

// backupConfiguration Backup configuration
func (sp *SystemPage) backupConfiguration() {
	// Call API to backup configuration
	backup, err := sp.httpClient.BackupConfiguration(sp.device.ID)
	if err != nil {
		dialog.ShowError(err, sp.window)
		return
	}

	// Show save dialog
	dialog.ShowInformation("Backup Created",
		fmt.Sprintf("Configuration backup created successfully. Backup ID: %s", backup.ID),
		sp.window)
}

// showRestoreDialog Show restore dialog
func (sp *SystemPage) showRestoreDialog() {
	// Call API to get backup list
	backups, err := sp.httpClient.GetBackupList(sp.device.ID)
	if err != nil {
		dialog.ShowError(err, sp.window)
		return
	}

	// Create backup selection dialog
	backupSelect := widget.NewSelect(backups, nil)
	backupSelect.SetSelected(backups[0])

	// Create restore button
	restoreBtn := widget.NewButton("Restore", func() {
		sp.restoreConfiguration(backupSelect.Selected)
	})

	// Show dialog
	dialog := dialog.NewCustom("Select Backup", "Cancel",
		container.NewVBox(
			widget.NewLabel("Select a backup to restore:"),
			backupSelect,
			restoreBtn,
		),
		sp.window)
	dialog.Show()
}

// restoreConfiguration Restore configuration
func (sp *SystemPage) restoreConfiguration(backupID string) {
	// Call API to restore configuration
	err := sp.httpClient.RestoreConfiguration(sp.device.ID, backupID)
	if err != nil {
		dialog.ShowError(err, sp.window)
		return
	}

	dialog.ShowInformation("Success", "Configuration restored successfully. The device will restart.", sp.window)
}

// showFactoryResetDialog Show factory reset dialog
func (sp *SystemPage) showFactoryResetDialog() {
	// Create confirmation dialog
	dialog.ShowConfirm("Factory Reset",
		"Are you sure you want to reset the device to factory settings? All configurations will be lost.",
		func(reset bool) {
			if reset {
				sp.factoryReset()
			}
		},
		sp.window)
}

// factoryReset Perform factory reset
func (sp *SystemPage) factoryReset() {
	// Call API to perform factory reset
	err := sp.httpClient.FactoryReset(sp.device.ID)
	if err != nil {
		dialog.ShowError(err, sp.window)
		return
	}

	dialog.ShowInformation("Success", "Factory reset started. The device will restart automatically.", sp.window)
}

// showRestartDialog Show restart dialog
func (sp *SystemPage) showRestartDialog() {
	// Create confirmation dialog
	dialog.ShowConfirm("Restart Device",
		"Are you sure you want to restart the device?",
		func(restart bool) {
			if restart {
				sp.restartDevice()
			}
		},
		sp.window)
}

// restartDevice Restart device
func (sp *SystemPage) restartDevice() {
	// Call API to restart device
	err := sp.httpClient.RestartDevice(sp.device.ID)
	if err != nil {
		dialog.ShowError(err, sp.window)
		return
	}

	dialog.ShowInformation("Success", "Device restart initiated.", sp.window)
}

// showShutdownDialog Show shutdown dialog
func (sp *SystemPage) showShutdownDialog() {
	// Create confirmation dialog
	dialog.ShowConfirm("Shutdown Device",
		"Are you sure you want to shutdown the device?",
		func(shutdown bool) {
			if shutdown {
				sp.shutdownDevice()
			}
		},
		sp.window)
}

// shutdownDevice Shutdown device
func (sp *SystemPage) shutdownDevice() {
	// Call API to shutdown device
	err := sp.httpClient.ShutdownDevice(sp.device.ID)
	if err != nil {
		dialog.ShowError(err, sp.window)
		return
	}

	dialog.ShowInformation("Success", "Device shutdown initiated.", sp.window)
}

// clearCache Clear cache
func (sp *SystemPage) clearCache() {
	// Call API to clear cache
	err := sp.httpClient.ClearCache(sp.device.ID)
	if err != nil {
		dialog.ShowError(err, sp.window)
		return
	}

	dialog.ShowInformation("Success", "Cache cleared successfully.", sp.window)
} 