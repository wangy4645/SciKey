package model

import (
	"time"
)

// DRPRMessage DRPR消息数据模型
type DRPRMessage struct {
	ID              uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	DeviceID        uint      `json:"device_id" gorm:"not null;index"`
	Timestamp       time.Time `json:"timestamp" gorm:"not null"`
	Index           int       `json:"index"`
	CellIndex       int       `json:"cell_index"`
	Earfcn          int       `json:"earfcn"`
	CellID          int       `json:"cell_id"`
	Rssi            string    `json:"rssi"`
	Pathloss        int       `json:"pathloss"`
	Rsrp            string    `json:"rsrp"`
	Rsrq            string    `json:"rsrq"`
	UlEarfcn        string    `json:"ul_earfcn"`
	Snr             string    `json:"snr"`
	Distance        int       `json:"distance"`
	TxPower         string    `json:"tx_power"`
	DlThroughput    int       `json:"dl_throughput_total_tbs"`
	UlThroughput    int       `json:"ul_throughput_total_tbs"`
	DlschError      int       `json:"dlsch_tb_error_per"`
	DlschErrorPer   int       `json:"dlsch_tb_error_per_total"`
	Mcs             int       `json:"mcs"`
	RbNum           int       `json:"rb_num"`
	WideCqi         int       `json:"wide_cqi"`
	MaxSnr          string    `json:"max_snr"`
	MinSnr          string    `json:"min_snr"`
	DlTotalTbsGrnti int       `json:"dl_total_tbs_g_rnti"`
	RawMessage      string    `json:"raw_message" gorm:"type:text"`
	CreatedAt       time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt       time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName 指定表名
func (DRPRMessage) TableName() string {
	return "drpr_messages"
}
