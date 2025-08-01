package service

import (
	"backend/internal/model"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
)

// DRPRMonitorService 处理DRPR消息监控
type DRPRMonitorService struct {
	db                *gorm.DB
	deviceService     *DeviceService
	deviceCommService *DeviceCommService
	clients           map[uint][]chan DRPRMessage
	activeDevices     map[uint]*time.Ticker // 设备ID -> 定时器映射
	mu                sync.RWMutex
}

// DRPRMessage DRPR消息结构
type DRPRMessage struct {
	DeviceID        uint      `json:"device_id"`
	Timestamp       time.Time `json:"timestamp"`
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
	RawMessage      string    `json:"raw_message"`
}

// NewDRPRMonitorService 创建DRPR监控服务
func NewDRPRMonitorService(db *gorm.DB, deviceService *DeviceService, deviceCommService *DeviceCommService) *DRPRMonitorService {
	return &DRPRMonitorService{
		db:                db,
		deviceService:     deviceService,
		deviceCommService: deviceCommService,
		clients:           make(map[uint][]chan DRPRMessage),
		activeDevices:     make(map[uint]*time.Ticker),
	}
}

// StartDRPRMonitoring 开始DRPR监控（每5秒发送一次请求）
func (s *DRPRMonitorService) StartDRPRMonitoring(deviceID uint) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 检查是否已经在监控
	if _, exists := s.activeDevices[deviceID]; exists {
		return fmt.Errorf("DRPR monitoring already active for device %d", deviceID)
	}

	// 获取设备信息
	device, err := s.deviceService.GetDeviceByID(deviceID)
	if err != nil {
		return fmt.Errorf("failed to get device: %v", err)
	}

	// 创建定时器，每5秒执行一次
	ticker := time.NewTicker(5 * time.Second)
	s.activeDevices[deviceID] = ticker

	log.Printf("Starting DRPR monitoring for device %d (%s)", deviceID, device.IP)

	// 启动goroutine处理定时任务
	go func() {
		defer ticker.Stop()

		// 立即执行一次
		s.fetchDRPRData(deviceID, device.IP)

		for range ticker.C {
			s.fetchDRPRData(deviceID, device.IP)
		}
	}()

	return nil
}

// StopDRPRMonitoring 停止DRPR监控
func (s *DRPRMonitorService) StopDRPRMonitoring(deviceID uint) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if ticker, exists := s.activeDevices[deviceID]; exists {
		ticker.Stop()
		delete(s.activeDevices, deviceID)
		log.Printf("Stopped DRPR monitoring for device %d", deviceID)
		return nil
	}

	return fmt.Errorf("DRPR monitoring not active for device %d", deviceID)
}

// IsDRPRMonitoringActive 检查DRPR监控是否活跃
func (s *DRPRMonitorService) IsDRPRMonitoringActive(deviceID uint) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	_, exists := s.activeDevices[deviceID]
	return exists
}

// fetchDRPRData 获取DRPR数据
func (s *DRPRMonitorService) fetchDRPRData(deviceID uint, deviceIP string) {
	log.Printf("Fetching DRPR data for device %d (%s)", deviceID, deviceIP)

	// 只周期性通过HTTP接口获取DRPR数据
	err := s.fetchDRPRViaHTTP(deviceID, deviceIP)
	if err != nil {
		log.Printf("Failed to fetch DRPR via HTTP: %v", err)
	} else {
		log.Printf("Successfully sent DRPR request via HTTP for device %d", deviceID)
	}
}

// fetchDRPRViaAT 通过AT命令获取DRPR数据
func (s *DRPRMonitorService) fetchDRPRViaAT(deviceID uint) error {
	// 发送AT^DRPR?命令查询当前状态
	response, err := s.deviceCommService.SendATCommand(deviceID, "AT^DRPR?")
	if err != nil {
		return fmt.Errorf("failed to send AT^DRPR? command: %v", err)
	}

	log.Printf("AT^DRPR? response for device %d: %s", deviceID, response)

	// 如果DRPR已启用，尝试获取最新的DRPR数据
	if strings.Contains(response, "^DRPR: 1") {
		// 发送一个查询命令来触发DRPR数据上报
		_, err = s.deviceCommService.SendATCommand(deviceID, "AT^DRPC?")
		if err != nil {
			return fmt.Errorf("failed to send AT^DRPC? command: %v", err)
		}
	}

	return nil
}

// fetchDRPRViaHTTP 通过HTTP接口获取DRPR数据
func (s *DRPRMonitorService) fetchDRPRViaHTTP(deviceID uint, deviceIP string) error {
	// 构建HTTP请求URL
	requestURL := fmt.Sprintf("http://%s/boafrm/formDRPRMonitor", deviceIP)

	// 创建HTTP客户端
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// 构建POST请求数据
	formData := url.Values{}
	formData.Set("DdtcType", "1")

	// 发送POST请求获取DRPR数据
	resp, err := client.PostForm(requestURL, formData)
	if err != nil {
		return fmt.Errorf("failed to send HTTP POST request: %v", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %v", err)
	}

	responseText := string(body)
	log.Printf("HTTP DRPR response for device %d: %s", deviceID, responseText)

	// 如果响应包含DRPR数据，处理它
	if strings.Contains(responseText, "^DRPR:") {
		log.Printf("Found DRPR data in HTTP response for device %d, processing...", deviceID)
		return s.ProcessDRPRMessage(deviceID, responseText)
	} else {
		log.Printf("No DRPR data found in HTTP response for device %d", deviceID)
	}

	return nil
}

// Subscribe 订阅DRPR消息
func (s *DRPRMonitorService) Subscribe(deviceID uint) chan DRPRMessage {
	s.mu.Lock()
	defer s.mu.Unlock()

	ch := make(chan DRPRMessage, 100)
	s.clients[deviceID] = append(s.clients[deviceID], ch)

	log.Printf("DRPR client subscribed for device %d, total clients: %d", deviceID, len(s.clients[deviceID]))
	return ch
}

// Unsubscribe 取消订阅DRPR消息
func (s *DRPRMonitorService) Unsubscribe(deviceID uint, ch chan DRPRMessage) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if clients, exists := s.clients[deviceID]; exists {
		for i, client := range clients {
			if client == ch {
				s.clients[deviceID] = append(clients[:i], clients[i+1:]...)
				close(ch)
				log.Printf("DRPR client unsubscribed for device %d, remaining clients: %d", deviceID, len(s.clients[deviceID]))
				break
			}
		}
	}
}

// ProcessDRPRMessage 处理DRPR消息
func (s *DRPRMonitorService) ProcessDRPRMessage(deviceID uint, rawMessage string) error {
	log.Printf("Processing DRPR message for device %d: %s", deviceID, rawMessage)

	message, err := s.parseDRPRMessage(rawMessage)
	if err != nil {
		log.Printf("Failed to parse DRPR message: %v", err)
		return fmt.Errorf("failed to parse DRPR message: %v", err)
	}

	message.DeviceID = deviceID
	message.Timestamp = time.Now()
	message.RawMessage = rawMessage

	log.Printf("Saving DRPR message for device %d: %+v", deviceID, message)

	err = s.saveDRPRMessage(message)
	if err != nil {
		log.Printf("Failed to save DRPR message: %v", err)
		return err
	}

	log.Printf("Successfully saved DRPR message for device %d", deviceID)
	s.broadcastMessage(deviceID, message)
	return nil
}

// ParseDRPRMessage 解析DRPR消息（公开方法，用于测试）
func (s *DRPRMonitorService) ParseDRPRMessage(rawMessage string) (DRPRMessage, error) {
	return s.parseDRPRMessage(rawMessage)
}

// parseDRPRMessage 解析DRPR消息
func (s *DRPRMonitorService) parseDRPRMessage(rawMessage string) (DRPRMessage, error) {
	message := DRPRMessage{}

	// 去除前缀和换行符
	msg := strings.TrimSpace(rawMessage)
	if strings.HasPrefix(msg, "^DAPRI:") {
		msg = strings.TrimPrefix(msg, "^DAPRI:")
		msg = strings.TrimSpace(msg)
	} else if strings.HasPrefix(msg, "^DRPR:") {
		msg = strings.TrimPrefix(msg, "^DRPR:")
		msg = strings.TrimSpace(msg)
	}

	// 分割字段
	fields := strings.Split(msg, ",")
	if len(fields) < 19 {
		return message, fmt.Errorf("invalid DRPR message format: expected at least 19 fields, got %d", len(fields))
	}

	// 清理字段中的引号和空格
	for i := range fields {
		fields[i] = strings.Trim(fields[i], "\" ")
	}

	var err error

	// 根据实际^DRPR格式映射字段
	// 格式: <device_id>,<index>,<rssi>,<pathloss>,<rsrp>,<rsrq>,<snr>,<distance>,<tx_power>,<dl_throughput>,<ul_throughput>,<dlsch_error_per>,<mcs>,<rb_num>,<wide_cqi>,<dlsch_error_per_total>,<max_snr>,<min_snr>,<dl_total_tbs_g_rnti>

	// 字段0: DeviceID - 跳过，不解析
	// 字段1: Index
	message.Index, err = strconv.Atoi(fields[1])
	if err != nil {
		return message, fmt.Errorf("failed to parse index: %v", err)
	}

	// 字段2: RSSI
	message.Rssi = fields[2]

	// 字段3: Pathloss
	message.Pathloss, err = strconv.Atoi(fields[3])
	if err != nil {
		return message, fmt.Errorf("failed to parse pathloss: %v", err)
	}

	// 根据AT文档的^DRPRI格式，正确的字段映射：
	// 字段0: Index
	// 字段1: Earfcn
	// 字段2: CellID
	// 字段3: RSSI
	// 字段4: Pathloss
	// 字段5: RSRP
	// 字段6: RSRQ
	// 字段7: SNR
	// 字段8: Distance
	// 字段9: TxPower

	// 字段5: RSRP
	message.Rsrp = fields[5]

	// 字段6: RSRQ
	message.Rsrq = fields[6]

	// 字段7: SNR
	message.Snr = fields[7]

	// 字段8: Distance
	message.Distance, err = strconv.Atoi(fields[8])
	if err != nil {
		return message, fmt.Errorf("failed to parse distance: %v", err)
	}

	// 字段9: TxPower
	message.TxPower = fields[9]

	// 字段10: DlThroughput
	message.DlThroughput, err = strconv.Atoi(fields[10])
	if err != nil {
		return message, fmt.Errorf("failed to parse dl_throughput: %v", err)
	}

	// 字段11: UlThroughput
	message.UlThroughput, err = strconv.Atoi(fields[11])
	if err != nil {
		return message, fmt.Errorf("failed to parse ul_throughput: %v", err)
	}

	// 字段12: DlschErrorPer
	message.DlschError, err = strconv.Atoi(fields[12])
	if err != nil {
		return message, fmt.Errorf("failed to parse dlsch_error_per: %v", err)
	}

	// 字段13: Mcs
	message.Mcs, err = strconv.Atoi(fields[13])
	if err != nil {
		return message, fmt.Errorf("failed to parse mcs: %v", err)
	}

	// 字段14: RbNum
	message.RbNum, err = strconv.Atoi(fields[14])
	if err != nil {
		return message, fmt.Errorf("failed to parse rb_num: %v", err)
	}

	// 字段15: WideCqi
	message.WideCqi, err = strconv.Atoi(fields[15])
	if err != nil {
		return message, fmt.Errorf("failed to parse wide_cqi: %v", err)
	}

	// 字段16: DlschErrorPerTotal
	message.DlschErrorPer, err = strconv.Atoi(fields[16])
	if err != nil {
		return message, fmt.Errorf("failed to parse dlsch_error_per_total: %v", err)
	}

	// 字段17: MaxSnr
	message.MaxSnr = fields[17]

	// 字段18: MinSnr
	message.MinSnr = fields[18]

	// 字段19: DlTotalTbsGrnti
	message.DlTotalTbsGrnti, err = strconv.Atoi(fields[19])
	if err != nil {
		return message, fmt.Errorf("failed to parse dl_total_tbs_g_rnti: %v", err)
	}

	// 设置默认值
	message.Earfcn = 0 // 不在DAPRI消息中
	message.CellID = 0 // 不在DAPRI消息中

	return message, nil
}

// SaveDRPRMessage 保存DRPR消息到数据库（公开方法，用于测试）
func (s *DRPRMonitorService) SaveDRPRMessage(message DRPRMessage) error {
	return s.saveDRPRMessage(message)
}

// saveDRPRMessage 保存DRPR消息到数据库
func (s *DRPRMonitorService) saveDRPRMessage(message DRPRMessage) error {
	log.Printf("Attempting to save DRPR message to database: DeviceID=%d, Timestamp=%s",
		message.DeviceID, message.Timestamp.Format(time.RFC3339))

	drprRecord := &model.DRPRMessage{
		DeviceID:        message.DeviceID,
		Timestamp:       message.Timestamp,
		Index:           message.Index,
		CellIndex:       message.CellIndex,
		Earfcn:          message.Earfcn,
		CellID:          message.CellID,
		Rssi:            message.Rssi,
		Pathloss:        message.Pathloss,
		Rsrp:            message.Rsrp,
		Rsrq:            message.Rsrq,
		UlEarfcn:        message.UlEarfcn,
		Snr:             message.Snr,
		Distance:        message.Distance,
		TxPower:         message.TxPower,
		DlThroughput:    message.DlThroughput,
		UlThroughput:    message.UlThroughput,
		DlschError:      message.DlschError,
		DlschErrorPer:   message.DlschErrorPer,
		Mcs:             message.Mcs,
		RbNum:           message.RbNum,
		WideCqi:         message.WideCqi,
		MaxSnr:          message.MaxSnr,
		MinSnr:          message.MinSnr,
		DlTotalTbsGrnti: message.DlTotalTbsGrnti,
		RawMessage:      message.RawMessage,
	}

	err := s.db.Create(drprRecord).Error
	if err != nil {
		log.Printf("Failed to save DRPR message to database: %v", err)
		return err
	}

	log.Printf("Successfully saved DRPR message to database with ID: %d", drprRecord.ID)
	return nil
}

// broadcastMessage 广播消息给所有订阅的客户端
func (s *DRPRMonitorService) broadcastMessage(deviceID uint, message DRPRMessage) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if clients, exists := s.clients[deviceID]; exists {
		for _, ch := range clients {
			select {
			case ch <- message:
			default:
				log.Printf("DRPR message channel full for device %d", deviceID)
			}
		}
	}
}

// GetDRPRMessages 获取设备的DRPR消息历史
func (s *DRPRMonitorService) GetDRPRMessages(deviceID uint, limit int) ([]DRPRMessage, error) {
	log.Printf("Querying DRPR messages for device %d with limit %d", deviceID, limit)

	var records []model.DRPRMessage

	err := s.db.Where("device_id = ?", deviceID).
		Order("timestamp DESC").
		Limit(limit).
		Find(&records).Error

	if err != nil {
		log.Printf("Database error when querying DRPR messages for device %d: %v", deviceID, err)
		return nil, err
	}

	log.Printf("Found %d DRPR records for device %d", len(records), deviceID)

	messages := make([]DRPRMessage, len(records))
	for i, record := range records {
		messages[i] = DRPRMessage{
			DeviceID:        record.DeviceID,
			Timestamp:       record.Timestamp,
			Index:           record.Index,
			CellIndex:       record.CellIndex,
			Earfcn:          record.Earfcn,
			CellID:          record.CellID,
			Rssi:            record.Rssi,
			Pathloss:        record.Pathloss,
			Rsrp:            record.Rsrp,
			Rsrq:            record.Rsrq,
			UlEarfcn:        record.UlEarfcn,
			Snr:             record.Snr,
			Distance:        record.Distance,
			TxPower:         record.TxPower,
			DlThroughput:    record.DlThroughput,
			UlThroughput:    record.UlThroughput,
			DlschError:      record.DlschError,
			DlschErrorPer:   record.DlschErrorPer,
			Mcs:             record.Mcs,
			RbNum:           record.RbNum,
			WideCqi:         record.WideCqi,
			MaxSnr:          record.MaxSnr,
			MinSnr:          record.MinSnr,
			DlTotalTbsGrnti: record.DlTotalTbsGrnti,
			RawMessage:      record.RawMessage,
		}
	}

	log.Printf("Successfully converted %d DRPR messages for device %d", len(messages), deviceID)
	return messages, nil
}

// HandleDRPRWebhook 处理设备发送的DRPR消息webhook
func (s *DRPRMonitorService) HandleDRPRWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	deviceIDStr := r.URL.Query().Get("device_id")
	if deviceIDStr == "" {
		http.Error(w, "device_id parameter required", http.StatusBadRequest)
		return
	}

	deviceID, err := strconv.ParseUint(deviceIDStr, 10, 32)
	if err != nil {
		http.Error(w, "invalid device_id", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	rawMessage := string(body)
	log.Printf("Received DRPR message from device %d: %s", deviceID, rawMessage)

	err = s.ProcessDRPRMessage(uint(deviceID), rawMessage)
	if err != nil {
		log.Printf("Failed to process DRPR message: %v", err)
		http.Error(w, "failed to process message", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}
