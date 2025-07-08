package model

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// Configuration categories
const (
	ConfigCategoryNetState   = "net_state"   // Network state configuration
	ConfigCategorySecurity   = "security"    // Security configuration
	ConfigCategoryWireless   = "wireless"    // Wireless configuration
	ConfigCategoryNetSetting = "net_setting" // Network settings
	ConfigCategoryUpDown     = "up_down"     // Up/down configuration
	ConfigCategoryDebug      = "debug"       // Debug configuration
	ConfigCategorySystem     = "system"      // System configuration
)

// DeviceConfig represents a device configuration
type DeviceConfig struct {
	ID        uint      `json:"id"`
	DeviceID  uint      `json:"device_id"`
	Category  string    `json:"category"`                 // Configuration category
	Key       string    `json:"key"`                      // Configuration key
	Value     string    `json:"value"`                    // Configuration value
	Type      string    `json:"type"`                     // Configuration type: string, int, bool, select, textarea
	Required  bool      `json:"required"`                 // Whether the field is required
	Default   string    `json:"default"`                  // Default value
	Options   string    `json:"options" gorm:"type:text"` // Options (for select type) - stored as JSON string
	Hint      string    `json:"hint"`                     // Hint message
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ConfigTemplate represents a configuration template
type ConfigTemplate struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	Category    string         `gorm:"index" json:"category"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Fields      []ConfigField  `gorm:"-" json:"fields"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigField represents a configuration field definition
type ConfigField struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	TemplateID  uint           `gorm:"index" json:"template_id"`
	Name        string         `json:"name"`
	Key         string         `json:"key"`
	Type        string         `json:"type"`
	Description string         `json:"description"`
	Required    bool           `json:"required"`
	Default     string         `json:"default"`
	Options     string         `json:"options"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigRequest represents a request to save device configurations
type ConfigRequest struct {
	DeviceID uint                   `json:"device_id" binding:"required"`
	Category string                 `json:"category" binding:"required"`
	Configs  map[string]interface{} `json:"configs" binding:"required"`
}

// ConfigResponse represents a configuration response
type ConfigResponse struct {
	DeviceID uint            `json:"device_id"`
	Category string          `json:"category"`
	Configs  []*DeviceConfig `json:"configs"`
	Template *ConfigTemplate `json:"template"`
}

// ConfigValidation represents a configuration validation result
type ConfigValidation struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	FieldID   uint           `gorm:"index" json:"field_id"`
	Type      string         `json:"type"`
	Value     string         `json:"value"`
	Message   string         `json:"message"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// NetworkConfig represents network configuration for a device
type NetworkConfig struct {
	DeviceID uint   `json:"device_id" gorm:"primaryKey"`
	IP       string `json:"ip"`
}

// SecurityConfig represents security configuration for a device
type SecurityConfig struct {
	DeviceID            uint   `json:"device_id" gorm:"primaryKey"`
	EncryptionAlgorithm int    `json:"encryption_algorithm"`
	EncryptionKey       string `json:"encryption_key"`
}

// WirelessConfig represents wireless configuration for a device
type WirelessConfig struct {
	DeviceID         uint   `json:"device_id" gorm:"primaryKey"`
	SSID             string `json:"ssid"`
	Password         string `json:"password"`
	SecurityType     string `json:"security_type"`
	Channel          int    `json:"channel"`
	ChannelWidth     int    `json:"channel_width"`
	TransmitPower    int    `json:"transmit_power"`
	HiddenSSID       bool   `json:"hidden_ssid"`
	MACFiltering     bool   `json:"mac_filtering"`
	MACFilterList    string `json:"mac_filter_list"`
	WPSEnabled       bool   `json:"wps_enabled"`
	GuestNetwork     bool   `json:"guest_network"`
	GuestSSID        string `json:"guest_ssid"`
	GuestPassword    string `json:"guest_password"`
	GuestIsolation   bool   `json:"guest_isolation"`
	BandSteering     bool   `json:"band_steering"`
	AutoChannel      bool   `json:"auto_channel"`
	RoamingEnabled   bool   `json:"roaming_enabled"`
	RoamingThreshold int    `json:"roaming_threshold"`
	FrequencyBand    string `json:"frequency_band" gorm:"type:text"`
	Bandwidth        string `json:"bandwidth"`
	BuildingChain    string `json:"building_chain"`
	FrequencyHopping bool   `json:"frequency_hopping"`
}

// GetFrequencyBandArray 返回频段数组
func (w *WirelessConfig) GetFrequencyBandArray() []string {
	if w.FrequencyBand == "" {
		return []string{}
	}
	var bands []string
	json.Unmarshal([]byte(w.FrequencyBand), &bands)
	return bands
}

// SetFrequencyBandArray 设置频段数组
func (w *WirelessConfig) SetFrequencyBandArray(bands []string) {
	if len(bands) == 0 {
		w.FrequencyBand = "[]"
		return
	}
	jsonBytes, _ := json.Marshal(bands)
	w.FrequencyBand = string(jsonBytes)
}

// SystemConfig represents system configuration for a device
type SystemConfig struct {
	DeviceID         uint   `json:"device_id" gorm:"primaryKey"`
	Timezone         string `json:"timezone"`
	Language         string `json:"language"`
	AutoUpdate       bool   `json:"auto_update"`
	UpdateSchedule   string `json:"update_schedule"`
	LogLevel         string `json:"log_level"`
	LogRetention     int    `json:"log_retention"`
	BackupEnabled    bool   `json:"backup_enabled"`
	BackupSchedule   string `json:"backup_schedule"`
	BackupRetention  int    `json:"backup_retention"`
	RemoteAccess     bool   `json:"remote_access"`
	RemoteAccessPort int    `json:"remote_access_port"`
	RemoteAccessSSL  bool   `json:"remote_access_ssl"`
	SNMPEnabled      bool   `json:"snmp_enabled"`
	SNMPCommunity    string `json:"snmp_community"`
	SNMPTrapServer   string `json:"snmp_trap_server"`
	PowerManagement  bool   `json:"power_management"`
	PowerSchedule    string `json:"power_schedule"`
	TemperatureUnit  string `json:"temperature_unit"`
	FanControl       bool   `json:"fan_control"`
	FanSpeedProfile  string `json:"fan_speed_profile"`
	LEDControl       bool   `json:"led_control"`
	LEDBrightness    int    `json:"led_brightness"`
	ResetToDefaults  bool   `json:"reset_to_defaults"`
	FactoryReset     bool   `json:"factory_reset"`
}

// ConfigBackup represents a backup of device configuration
type ConfigBackup struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	DeviceID    uint           `gorm:"index" json:"device_id"`
	Category    string         `gorm:"index" json:"category"`
	Configs     string         `json:"configs"`
	Description string         `json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigOverview represents an overview of device configurations
type ConfigOverview struct {
	NetworkConfig  *NetworkConfig  `json:"network_config"`
	SecurityConfig *SecurityConfig `json:"security_config"`
	WirelessConfig *WirelessConfig `json:"wireless_config"`
	SystemConfig   *SystemConfig   `json:"system_config"`
	LastBackup     *ConfigBackup   `json:"last_backup"`
	LastUpdate     string          `json:"last_update"`
	Status         string          `json:"status"`
}

// NetworkMonitor represents network monitoring data
type NetworkMonitor struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	DeviceID  uint      `json:"device_id" gorm:"not null"`
	Type      string    `json:"type" gorm:"not null"`
	IP        string    `json:"ip" gorm:"not null"`
	EARFCN    int       `json:"earfcn"`
	RSRP      float64   `json:"rsrp"`
	SNR       float64   `json:"snr"`
	Distance  float64   `json:"distance"`
	CreatedAt time.Time `json:"created_at"`
}

// MasterSlaveConfig represents master-slave configuration
type MasterSlaveConfig struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	DeviceID      uint      `json:"device_id" gorm:"not null"`
	NowType       string    `json:"now_type" gorm:"not null"`
	ActiveType    string    `json:"active_type" gorm:"not null"`
	Configuration string    `json:"configuration" gorm:"type:text"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// FrequencyBandConfig represents frequency band configuration
type FrequencyBandConfig struct {
	ID               uint      `json:"id" gorm:"primaryKey"`
	DeviceID         uint      `json:"device_id" gorm:"not null"`
	NowConfiguration string    `json:"now_configuration" gorm:"not null"`
	SettingValue     string    `json:"setting_value" gorm:"not null"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// BandwidthConfig represents bandwidth configuration
type BandwidthConfig struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	DeviceID     uint      `json:"device_id" gorm:"not null"`
	NowBandwidth string    `json:"now_bandwidth" gorm:"not null"`
	SetBandwidth string    `json:"set_bandwidth" gorm:"not null"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// BuildingChainConfig represents building chain configuration
type BuildingChainConfig struct {
	ID                uint      `json:"id" gorm:"primaryKey"`
	DeviceID          uint      `json:"device_id" gorm:"not null"`
	NowFrequencyPoint string    `json:"now_frequency_point" gorm:"not null"`
	FrequencyPoint    string    `json:"frequency_point" gorm:"not null"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// FrequencyHoppingConfig represents frequency hopping configuration
type FrequencyHoppingConfig struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	DeviceID uint   `json:"device_id" gorm:"not null"`
	Status   string `json:"status" gorm:"not null"`
}

// UpDownConfig represents up-down configuration
type UpDownConfig struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	DeviceID       uint      `json:"device_id" gorm:"not null"`
	CurrentSetting string    `json:"current_setting" gorm:"not null"`
	Setting        string    `json:"setting" gorm:"not null"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// DebugConfig represents debug configuration
type DebugConfig struct {
	ID                    uint      `json:"id" gorm:"primaryKey"`
	DeviceID              uint      `json:"device_id" gorm:"not null"`
	DebugSwitch           string    `json:"debug_switch" gorm:"not null"`
	DrprReporting         string    `json:"drpr_reporting" gorm:"not null"`
	ActiveEscalationCheck string    `json:"active_escalation_check" gorm:"not null"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// ATCommand represents AT command execution
type ATCommand struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	DeviceID  uint      `json:"device_id" gorm:"not null"`
	Command   string    `json:"command" gorm:"not null"`
	Result    string    `json:"result" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
}

// ShellCommand represents shell command execution
type ShellCommand struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	DeviceID  uint      `json:"device_id" gorm:"not null"`
	Command   string    `json:"command" gorm:"not null"`
	Result    string    `json:"result" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
}

// Config represents a configuration record
type Config struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	DeviceID  uint           `gorm:"index" json:"device_id"`
	Category  string         `gorm:"index" json:"category"`
	Key       string         `gorm:"index" json:"key"`
	Value     string         `json:"value"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigCategory represents a configuration category
type ConfigCategory struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	Name        string         `gorm:"uniqueIndex" json:"name"`
	Description string         `json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigHistory represents configuration history
type ConfigHistory struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	ConfigID  uint           `gorm:"index" json:"config_id"`
	Value     string         `json:"value"`
	UserID    uint           `gorm:"index" json:"user_id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigImport represents configuration import record
type ConfigImport struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	DeviceID  uint           `gorm:"index" json:"device_id"`
	Category  string         `gorm:"index" json:"category"`
	File      string         `json:"file"`
	Status    string         `json:"status"`
	Message   string         `json:"message"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigExport represents configuration export record
type ConfigExport struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	DeviceID  uint           `gorm:"index" json:"device_id"`
	Category  string         `gorm:"index" json:"category"`
	File      string         `json:"file"`
	Status    string         `json:"status"`
	Message   string         `json:"message"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigAudit represents configuration audit record
type ConfigAudit struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	DeviceID  uint           `gorm:"index" json:"device_id"`
	Category  string         `gorm:"index" json:"category"`
	Action    string         `json:"action"`
	UserID    uint           `gorm:"index" json:"user_id"`
	Details   string         `json:"details"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigSchedule represents configuration schedule
type ConfigSchedule struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	DeviceID    uint           `gorm:"index" json:"device_id"`
	Category    string         `gorm:"index" json:"category"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Cron        string         `json:"cron"`
	Configs     string         `json:"configs"`
	Status      string         `json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigScheduleLog represents configuration schedule log
type ConfigScheduleLog struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	ScheduleID uint           `gorm:"index" json:"schedule_id"`
	Status     string         `json:"status"`
	Message    string         `json:"message"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateGroup represents configuration template group
type ConfigTemplateGroup struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	Name        string         `gorm:"uniqueIndex" json:"name"`
	Description string         `json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateGroupRelation represents configuration template group relation
type ConfigTemplateGroupRelation struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	GroupID    uint           `gorm:"index" json:"group_id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateVersion represents configuration template version
type ConfigTemplateVersion struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	Version    string         `json:"version"`
	Content    string         `json:"content"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateTag represents configuration template tag
type ConfigTemplateTag struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	Name       string         `gorm:"index" json:"name"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateComment represents configuration template comment
type ConfigTemplateComment struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Content    string         `json:"content"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateFavorite represents configuration template favorite
type ConfigTemplateFavorite struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateShare represents configuration template share
type ConfigTemplateShare struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	ShareType  string         `json:"share_type"`
	ShareCode  string         `json:"share_code"`
	ExpireTime time.Time      `json:"expire_time"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateUsage represents configuration template usage
type ConfigTemplateUsage struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	DeviceID   uint           `gorm:"index" json:"device_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateRating represents configuration template rating
type ConfigTemplateRating struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Rating     int            `json:"rating"`
	Comment    string         `json:"comment"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateReport represents configuration template report
type ConfigTemplateReport struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Type       string         `json:"type"`
	Content    string         `json:"content"`
	Status     string         `json:"status"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateNotification represents configuration template notification
type ConfigTemplateNotification struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Type       string         `json:"type"`
	Content    string         `json:"content"`
	Read       bool           `json:"read"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateSubscription represents configuration template subscription
type ConfigTemplateSubscription struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Type       string         `json:"type"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateCollaboration represents configuration template collaboration
type ConfigTemplateCollaboration struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Role       string         `json:"role"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateChange represents configuration template change
type ConfigTemplateChange struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Type       string         `json:"type"`
	Content    string         `json:"content"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateApproval represents configuration template approval
type ConfigTemplateApproval struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Status     string         `json:"status"`
	Comment    string         `json:"comment"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateReview represents configuration template review
type ConfigTemplateReview struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Status     string         `json:"status"`
	Comment    string         `json:"comment"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplatePublish represents configuration template publish
type ConfigTemplatePublish struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Version    string         `json:"version"`
	Status     string         `json:"status"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateArchive represents configuration template archive
type ConfigTemplateArchive struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Reason     string         `json:"reason"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateRestore represents configuration template restore
type ConfigTemplateRestore struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Reason     string         `json:"reason"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// ConfigTemplateDelete represents configuration template delete
type ConfigTemplateDelete struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TemplateID uint           `gorm:"index" json:"template_id"`
	UserID     uint           `gorm:"index" json:"user_id"`
	Reason     string         `json:"reason"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}
