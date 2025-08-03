package service

import (
	"backend/internal/model"
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

// DeviceCommService 设备通信服务
type DeviceCommService struct {
	db             *gorm.DB
	boardConfigMgr *BoardConfigManager
	cookieManager  *CookieManager
}

// NewDeviceCommService 创建设备通信服务实例
func NewDeviceCommService(db *gorm.DB) *DeviceCommService {
	// 获取配置目录路径
	configDir := filepath.Join("config", "boards")

	return &DeviceCommService{
		db:             db,
		boardConfigMgr: NewBoardConfigManager(configDir),
		cookieManager:  NewCookieManager(),
	}
}

// ATCommandRequest AT指令请求结构
type ATCommandRequest struct {
	Command string                 `json:"command"`
	Params  map[string]interface{} `json:"params,omitempty"`
	Timeout int                    `json:"timeout,omitempty"`
}

// ATCommandResponse AT指令响应结构
type ATCommandResponse struct {
	Success  bool   `json:"success"`
	Response string `json:"response"`
	Error    string `json:"error,omitempty"`
}

// min 返回两个整数中的较小值
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// 检查设备 IP:80 是否可达
func isDeviceReachable(ip string, port string, timeout time.Duration) bool {
	address := net.JoinHostPort(ip, port)
	fmt.Printf("=== Device Reachability Check ===\n")
	fmt.Printf("Checking connection to: %s\n", address)
	fmt.Printf("Timeout: %v\n", timeout)

	// 方法1: 尝试TCP连接
	conn, err := net.DialTimeout("tcp", address, timeout)
	if err != nil {
		fmt.Printf("TCP connection failed: %v\n", err)
		// 方法2: 如果TCP连接失败，尝试HTTP请求
		fmt.Printf("Trying HTTP request as fallback...\n")
		client := &http.Client{Timeout: timeout}
		resp, err := client.Get(fmt.Sprintf("http://%s/", ip))
		if err != nil {
			fmt.Printf("HTTP request also failed: %v\n", err)
			return false
		}
		defer resp.Body.Close()
		fmt.Printf("HTTP request successful (status: %d)\n", resp.StatusCode)
		return true
	}
	conn.Close()
	fmt.Printf("TCP connection successful\n")
	return true
}

// SendATCommand 发送 AT 命令到设备
func (s *DeviceCommService) SendATCommand(deviceID uint, command string) (string, error) {
	// 获取设备信息
	device, err := s.getDeviceByID(deviceID)
	if err != nil {
		return "", fmt.Errorf("failed to get device: %v", err)
	}

	// 检查设备可达性，但不作为主要错误判断
	deviceReachable := isDeviceReachable(device.IP, "80", 3*time.Second)
	if !deviceReachable {
		return "", fmt.Errorf("Device is unreachable, cannot send AT command")
	}

	// 检查命令格式
	if len(command) < 2 || command[:2] != "AT" {
		return "", fmt.Errorf("invalid AT command format: %s", command)
	}

	// 构建AT指令请求
	atRequest := ATCommandRequest{
		Command: command,
		Timeout: 30, // 30秒超时
	}

	// 发送HTTP请求到设备
	response, err := s.sendHTTPRequestToDevice(device, atRequest)
	if err != nil {
		// 记录错误日志
		s.logCommandExecution(deviceID, command, "", fmt.Sprintf("Error: %v", err))
		// 如果设备可达但AT命令执行失败，返回具体的AT命令错误
		if strings.Contains(err.Error(), "AT command execution failed") {
			return "", err
		}
		// 其他错误（如网络错误）仍然返回设备不可达错误
		return "", fmt.Errorf("Device is unreachable. Please check network connection and device status.")
	}

	// 记录成功日志
	s.logCommandExecution(deviceID, command, response, "")

	return response, nil
}

// SendATCommandByName 根据命令名称发送AT指令（支持参数）
func (s *DeviceCommService) SendATCommandByName(deviceID uint, commandName string, params map[string]interface{}) (string, error) {
	// 获取设备信息
	device, err := s.getDeviceByID(deviceID)
	if err != nil {
		return "", fmt.Errorf("failed to get device: %v", err)
	}

	// 检查设备可达性，但不作为主要错误判断
	deviceReachable := isDeviceReachable(device.IP, "80", 3*time.Second)
	if !deviceReachable {
		return "", fmt.Errorf("Device is unreachable, cannot send AT command")
	}

	// 格式化AT命令
	formattedCommand, err := s.boardConfigMgr.FormatATCommand(device.BoardType, commandName, params)
	if err != nil {
		return "", fmt.Errorf("failed to format AT command: %v", err)
	}

	// 构建AT指令请求
	atRequest := ATCommandRequest{
		Command: formattedCommand,
		Params:  params,
		Timeout: 30,
	}

	// 发送HTTP请求到设备
	response, err := s.sendHTTPRequestToDevice(device, atRequest)
	if err != nil {
		// 记录错误日志
		s.logCommandExecution(deviceID, formattedCommand, "", fmt.Sprintf("Error: %v", err))
		// 如果设备可达但AT命令执行失败，返回具体的AT命令错误
		if strings.Contains(err.Error(), "AT command execution failed") {
			return "", err
		}
		// 其他错误（如网络错误）仍然返回设备不可达错误
		return "", fmt.Errorf("Device is unreachable. Please check network connection and device status.")
	}

	// 记录成功日志
	s.logCommandExecution(deviceID, formattedCommand, response, "")

	// 如果是设置命令，尝试验证设置是否生效
	if strings.HasPrefix(commandName, "set_") {
		// 构造对应的查询命令名
		queryCommandName := strings.Replace(commandName, "set_", "get_", 1)

		// 尝试发送查询命令验证
		if verifyResponse, err := s.verifySetting(deviceID, device, queryCommandName); err == nil {
			response = fmt.Sprintf("%s\nVerification: %s", response, verifyResponse)
		} else {
			// 验证失败不影响主操作，只记录日志
			fmt.Printf("Verification failed for %s: %v\n", queryCommandName, err)
		}
	}

	return response, nil
}

// verifySetting 验证设置是否生效
func (s *DeviceCommService) verifySetting(deviceID uint, device *model.Device, queryCommandName string) (string, error) {
	// 格式化查询命令
	queryCommand, err := s.boardConfigMgr.FormatATCommand(device.BoardType, queryCommandName, nil)
	if err != nil {
		return "", fmt.Errorf("failed to format query command: %v", err)
	}

	// 构建查询请求
	queryRequest := ATCommandRequest{
		Command: queryCommand,
		Timeout: 10,
	}

	// 发送查询请求
	response, err := s.sendHTTPRequestToDevice(device, queryRequest)
	if err != nil {
		return "", fmt.Errorf("verification query failed: %v", err)
	}

	// 记录验证日志
	s.logCommandExecution(deviceID, queryCommand, response, "")

	return response, nil
}

// sendHTTPRequestToDevice 发送HTTP请求到设备，自动降级兼容脏HTTP响应
func (s *DeviceCommService) sendHTTPRequestToDevice(device *model.Device, request ATCommandRequest) (string, error) {
	// 1.0 star设备必须严格用老协议（兼容所有包含1.0和star的写法）
	if (strings.Contains(device.BoardType, "1.0") && strings.Contains(strings.ToLower(device.BoardType), "star")) || device.BoardType == "1.0" {
		deviceURL := fmt.Sprintf("http://%s/boafrm/formAtcmdProcess", device.IP)
		formData := url.Values{}
		formData.Set("FormAtcmd_Param_Atcmd", request.Command)
		// 1. 标准库优先
		body, err := s.sendATCommandStandard(deviceURL, formData, time.Duration(request.Timeout)*time.Second)
		if err == nil {
			return s.parseATResponse(request.Command, body), nil
		}
		if isMimeHeaderError(err) {
			// 2. 降级为原始TCP
			body, err2 := sendATCommandRawTCP(device.IP, 80, "/boafrm/formAtcmdProcess", formData.Encode(), time.Duration(request.Timeout)*time.Second)
			if err2 == nil {
				return s.parseATResponse(request.Command, body), nil
			}
			return "", fmt.Errorf("standard: %v; raw tcp: %v", err, err2)
		}
		return "", err
	}
	// 其它设备（2.0/6680等）走新协议
	if strings.Contains(device.BoardType, "2.0") || strings.Contains(strings.ToLower(device.BoardType), "star") {
		deviceURL := fmt.Sprintf("http://%s/atservice.fcgi", device.IP)
		jsonBody := fmt.Sprintf(`{"action":"sendcmd","AT":"%s"}`, request.Command)

		// 添加调试信息
		fmt.Printf("=== 2.0 Device HTTP Request ===\n")
		fmt.Printf("Device IP: %s\n", device.IP)
		fmt.Printf("Device Board Type: %s\n", device.BoardType)
		fmt.Printf("Request URL: %s\n", deviceURL)
		fmt.Printf("Request Body: %s\n", jsonBody)

		req, err := http.NewRequest("POST", deviceURL, strings.NewReader(jsonBody))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "text/plain")
		client := &http.Client{Timeout: time.Duration(request.Timeout) * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("HTTP request failed: %v\n", err)
			return "", err
		}
		defer resp.Body.Close()
		b, err := io.ReadAll(resp.Body)
		if err != nil {
			return "", err
		}

		// 添加调试信息
		fmt.Printf("HTTP Response Status: %d\n", resp.StatusCode)
		fmt.Printf("HTTP Response Body (raw): %q\n", string(b))
		fmt.Printf("HTTP Response Body (hex): %x\n", b)

		// 处理响应体：去除前后空白字符
		responseBody := strings.TrimSpace(string(b))
		fmt.Printf("HTTP Response Body (trimmed): %q\n", responseBody)

		// 如果是带引号的JSON字符串，需要先去掉外层引号
		if len(responseBody) >= 2 && responseBody[0] == '"' && responseBody[len(responseBody)-1] == '"' {
			// 去掉外层引号
			responseBody = responseBody[1 : len(responseBody)-1]
			// 处理转义字符
			responseBody = strings.ReplaceAll(responseBody, `\"`, `"`)
			fmt.Printf("Unquoted response body: %q\n", responseBody)
		}

		// 再次去除空白字符
		responseBody = strings.TrimSpace(responseBody)
		fmt.Printf("Final response body for JSON parsing: %q\n", responseBody)

		// 手动解析响应体，因为设备的msg字段不是有效的JSON字符串
		var retcode int
		var msgContent string

		// 尝试使用正则表达式提取retcode和msg内容
		retcodeMatch := regexp.MustCompile(`"retcode":\s*(\d+)`).FindStringSubmatch(responseBody)
		if len(retcodeMatch) > 1 {
			retcode, _ = strconv.Atoi(retcodeMatch[1])
		}

		// 提取msg字段的内容 - 更精确的匹配模式
		// 匹配 "msg": 后面的内容，直到遇到 } 或 ," 或字符串结束
		msgMatch := regexp.MustCompile(`"msg":\s*([^}]*?)(?:\s*,\s*"[^"]+"\s*:|})`).FindStringSubmatch(responseBody)
		if len(msgMatch) > 1 {
			msgContent = strings.TrimSpace(msgMatch[1])
			// 如果msg内容以换行符开始，去掉开头的换行符
			msgContent = strings.TrimPrefix(msgContent, "\r\n")
			msgContent = strings.TrimPrefix(msgContent, "\n")
			// 去掉末尾的换行符
			msgContent = strings.TrimSuffix(msgContent, "\r\n")
			msgContent = strings.TrimSuffix(msgContent, "\n")
		}

		fmt.Printf("Manually parsed retcode: %d\n", retcode)
		fmt.Printf("Manually parsed msg content: %q\n", msgContent)

		// 检查retcode
		if retcode != 1 {
			return "", fmt.Errorf("device returned error retcode: %d", retcode)
		}

		// 检查msg内容是否包含AT命令错误
		if strings.Contains(msgContent, "+CME ERROR:") || strings.Contains(msgContent, "ERROR:") {
			return "", fmt.Errorf("AT command execution failed: %s", msgContent)
		}

		return msgContent, nil
	}
	// 兜底：未知类型也走老协议
	deviceURL := fmt.Sprintf("http://%s/boafrm/formAtcmdProcess", device.IP)
	formData := url.Values{}
	formData.Set("FormAtcmd_Param_Atcmd", request.Command)
	body, err := s.sendATCommandStandard(deviceURL, formData, time.Duration(request.Timeout)*time.Second)
	if err == nil {
		return s.parseATResponse(request.Command, body), nil
	}
	if isMimeHeaderError(err) {
		body, err2 := sendATCommandRawTCP(device.IP, 80, "/boafrm/formAtcmdProcess", formData.Encode(), time.Duration(request.Timeout)*time.Second)
		if err2 == nil {
			return s.parseATResponse(request.Command, body), nil
		}
		return "", fmt.Errorf("standard: %v; raw tcp: %v", err, err2)
	}
	return "", err
}

// sendATCommandStandard 用标准库发送POST
func (s *DeviceCommService) sendATCommandStandard(deviceURL string, formData url.Values, timeout time.Duration) (string, error) {
	// 创建带有连接池的HTTP客户端
	transport := &http.Transport{
		MaxIdleConns:        10,
		MaxIdleConnsPerHost: 5,
		IdleConnTimeout:     30 * time.Second,
		DisableCompression:  true,
	}

	client := &http.Client{
		Timeout:   timeout,
		Transport: transport,
	}

	resp, err := client.PostForm(deviceURL, formData)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("device returned HTTP %d: %s", resp.StatusCode, string(b))
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	responseText := string(b)

	// 添加调试日志
	fmt.Printf("=== HTTP Response Debug ===\n")
	fmt.Printf("Status Code: %d\n", resp.StatusCode)
	fmt.Printf("Content-Type: %s\n", resp.Header.Get("Content-Type"))
	fmt.Printf("Raw response body: %q\n", responseText)
	fmt.Printf("Response body length: %d\n", len(responseText))

	// 如果响应包含HTTP头信息，尝试提取响应体
	if strings.Contains(responseText, "HTTP/1.1") {
		parts := strings.Split(responseText, "\r\n\r\n")
		if len(parts) > 1 {
			responseText = parts[1]
			fmt.Printf("Extracted response body: %q\n", responseText)
		}
	}

	fmt.Printf("Final response text: %q\n", responseText)
	fmt.Printf("=== End HTTP Response Debug ===\n")

	return responseText, nil
}

// sendATCommandRawTCP 用原始TCP方式发送HTTP请求，兼容脏响应
func sendATCommandRawTCP(ip string, port int, path, body string, timeout time.Duration) (string, error) {
	addr := fmt.Sprintf("%s:%d", ip, port)

	// 使用更短的连接超时
	dialer := &net.Dialer{
		Timeout:   timeout,
		KeepAlive: 30 * time.Second,
	}

	conn, err := dialer.Dial("tcp", addr)
	if err != nil {
		return "", fmt.Errorf("failed to connect to %s: %v", addr, err)
	}
	defer conn.Close()

	// 设置连接超时
	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		return "", fmt.Errorf("failed to set connection deadline: %v", err)
	}

	req := fmt.Sprintf("POST %s HTTP/1.1\r\nHost: %s\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s", path, ip, len(body), body)
	_, err = conn.Write([]byte(req))
	if err != nil {
		return "", fmt.Errorf("failed to write request: %v", err)
	}

	reader := bufio.NewReader(conn)
	// 跳过header
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return "", fmt.Errorf("failed to read header: %v", err)
		}
		if line == "\r\n" {
			break
		}
	}
	// 读取body
	respBody, err := io.ReadAll(reader)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %v", err)
	}
	// 去除body前后的\0
	return strings.Trim(string(respBody), "\x00\r\n "), nil
}

// parseATResponse 解析AT响应内容
func (s *DeviceCommService) parseATResponse(command, responseText string) string {
	// 添加调试日志
	fmt.Printf("=== parseATResponse Debug ===\n")
	fmt.Printf("Command: %s\n", command)
	fmt.Printf("Response text: %q\n", responseText)

	// 检查是否包含 AT 命令数据
	if strings.Contains(responseText, "^DSONSBR:") {
		return responseText
	} else if strings.Contains(responseText, "^") {
		fmt.Printf("Found AT command data, returning raw response\n")
		return responseText
	}

	// 检查是否包含 OK 或 SUCCESS
	if strings.Contains(strings.ToUpper(responseText), "OK") ||
		strings.Contains(strings.ToUpper(responseText), "SUCCESS") {
		fmt.Printf("Found OK/SUCCESS, returning: OK: %s executed successfully\n", command)
		return fmt.Sprintf("OK: %s executed successfully", command)
	}

	// 其他情况，返回原始响应
	fmt.Printf("No special cases, returning raw response\n")
	return responseText
}

// getDeviceByID 根据ID获取设备
func (s *DeviceCommService) getDeviceByID(deviceID uint) (*model.Device, error) {
	var device model.Device
	err := s.db.Where("id = ?", deviceID).First(&device).Error
	if err != nil {
		return nil, err
	}
	return &device, nil
}

// logCommandExecution 记录命令执行日志
func (s *DeviceCommService) logCommandExecution(deviceID uint, command, response, error string) {
	log := &model.CommandLog{
		DeviceID:   deviceID,
		Command:    command,
		ATCommand:  command,
		Response:   response,
		ExecutedAt: time.Now(),
	}

	if error != "" {
		log.Response = error
	}

	s.db.Create(log)
}

// GetDeviceStatus 获取设备状态
func (s *DeviceCommService) GetDeviceStatus(deviceID uint) (string, error) {
	device, err := s.getDeviceByID(deviceID)
	if err != nil {
		return "", err
	}

	// 尝试多种方式检测设备状态
	status, err := s.checkDeviceStatusMultiMethod(device)
	if err != nil {
		// 如果所有检测方法都失败，标记为离线
		s.updateDeviceStatus(deviceID, "Offline")
		return "Offline", nil
	}

	// 更新设备状态
	s.updateDeviceStatus(deviceID, status)
	return status, nil
}

// checkDeviceStatusMultiMethod 使用多种方法检测设备状态
func (s *DeviceCommService) checkDeviceStatusMultiMethod(device *model.Device) (string, error) {
	// 方法1: HTTP ping
	if status, err := s.checkDeviceStatusHTTP(device); err == nil {
		return status, nil
	}

	// 方法2: ICMP ping (如果系统支持)
	if status, err := s.checkDeviceStatusICMP(device); err == nil {
		return status, nil
	}

	// 方法3: AT命令检测
	if status, err := s.checkDeviceStatusAT(device); err == nil {
		return status, nil
	}

	return "Offline", fmt.Errorf("all detection methods failed")
}

// checkDeviceStatusHTTP 使用HTTP ping检测设备状态
func (s *DeviceCommService) checkDeviceStatusHTTP(device *model.Device) (string, error) {
	client := &http.Client{
		Timeout: 3 * time.Second,
	}

	// 尝试多个常见的HTTP端点
	endpoints := []string{
		fmt.Sprintf("http://%s/", device.IP),
		fmt.Sprintf("http://%s:80/", device.IP),
		fmt.Sprintf("http://%s:8080/", device.IP),
	}

	for _, endpoint := range endpoints {
		resp, err := client.Get(endpoint)
		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNotFound {
				return "Online", nil
			}
		}
	}

	return "Offline", fmt.Errorf("HTTP ping failed")
}

// checkDeviceStatusICMP 使用ICMP ping检测设备状态
func (s *DeviceCommService) checkDeviceStatusICMP(device *model.Device) (string, error) {
	// 注意：ICMP ping需要root权限，这里提供一个基础实现
	// 在实际部署中，可能需要使用sudo或配置适当的权限

	// 使用系统ping命令
	cmd := exec.Command("ping", "-c", "1", "-W", "3", device.IP)
	err := cmd.Run()
	if err != nil {
		return "Offline", fmt.Errorf("ICMP ping failed: %v", err)
	}

	return "Online", nil
}

// checkDeviceStatusAT 使用AT命令检测设备状态
func (s *DeviceCommService) checkDeviceStatusAT(device *model.Device) (string, error) {
	// 发送一个简单的AT命令来检测设备是否响应
	response, err := s.SendATCommand(device.ID, "AT")
	if err != nil {
		return "Offline", fmt.Errorf("AT command failed: %v", err)
	}

	// 检查响应是否包含OK
	if strings.Contains(strings.ToUpper(response), "OK") {
		return "Online", nil
	}

	return "Offline", fmt.Errorf("AT command response invalid")
}

// updateDeviceStatus 更新设备状态
func (s *DeviceCommService) updateDeviceStatus(deviceID uint, status string) {
	s.db.Model(&model.Device{}).Where("id = ?", deviceID).Update("status", status)
}

// GetDeviceConfig 获取设备配置
func (s *DeviceCommService) GetDeviceConfig(deviceID uint) (map[string]interface{}, error) {
	device, err := s.getDeviceByID(deviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %v", err)
	}

	// 从板级配置管理器获取可用命令
	commands, err := s.boardConfigMgr.GetAvailableCommands(device.BoardType)
	if err != nil {
		return nil, fmt.Errorf("failed to get available commands: %v", err)
	}

	// 转换为 interface{} 类型
	result := make(map[string]interface{})
	for name, cmd := range commands {
		result[name] = map[string]interface{}{
			"at_command":      cmd.ATCommand,
			"description":     cmd.Description,
			"response_format": cmd.ResponseFormat,
			"parameters":      cmd.Parameters,
		}
	}

	return result, nil
}

// GetAvailableCommands 获取设备可用命令
func (s *DeviceCommService) GetAvailableCommands(deviceID uint) (map[string]interface{}, error) {
	device, err := s.getDeviceByID(deviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %v", err)
	}

	// 从板级配置管理器获取可用命令
	commands, err := s.boardConfigMgr.GetAvailableCommands(device.BoardType)
	if err != nil {
		return nil, fmt.Errorf("failed to get available commands: %v", err)
	}

	result := make(map[string]interface{})
	for name, cmd := range commands {
		result[name] = map[string]interface{}{
			"at_command":      cmd.ATCommand,
			"description":     cmd.Description,
			"response_format": cmd.ResponseFormat,
			"parameters":      cmd.Parameters,
		}
	}

	return result, nil
}

// LoginDevice 登录设备
func (s *DeviceCommService) LoginDevice(deviceID uint, username, password string) error {
	device, err := s.getDeviceByID(deviceID)
	if err != nil {
		return err
	}

	return s.cookieManager.LoginDevice(device.IP, username, password)
}

// isMimeHeaderError 判断是否为MIME header解析错误
func isMimeHeaderError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "malformed MIME header line") || strings.Contains(msg, "mime: ")
}

// SyncDeviceConfig 同步设备配置从单板到数据库
func (s *DeviceCommService) SyncDeviceConfig(deviceID uint) (map[string]interface{}, error) {
	device, err := s.getDeviceByID(deviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %v", err)
	}

	// 获取板级配置
	boardConfig, err := s.boardConfigMgr.GetBoardConfig(device.BoardType)
	if err != nil {
		return nil, fmt.Errorf("failed to get board config: %v", err)
	}

	// 存储同步结果
	syncResults := make(map[string]interface{})
	configData := make(map[string]interface{})
	var radioParamsBandwidth interface{} = nil
	letHasDeviceType := false

	// 对于2.0 mesh设备，使用简化的同步逻辑
	if device.BoardType == "board_2.0_mesh" {
		fmt.Printf("[SyncDeviceConfig] Using simplified sync for 2.0 mesh device\n")

		// 定义2.0mesh的所有配置类型，确保同步所有子页面的配置信息
		configTypes := []string{
			"network",    // Network Status
			"basic",      // Net Setting
			"radio",      // Wireless
			"encryption", // Security
			"up_down",    // Up/Down
			"debug",      // Debug
			"system",     // System Control
		}

		// 遍历所有配置类型
		for _, configType := range configTypes {
			commands := s.getCommandsForConfigType(configType, boardConfig.Commands)
			fmt.Printf("[SyncDeviceConfig] Processing 2.0 mesh config type: %s, commands: %v\n", configType, commands)

			for _, commandName := range commands {
				if commandName == "get_device_type" {
					letHasDeviceType = true
				}

				// 发送查询命令
				response, err := s.SendATCommandByName(deviceID, commandName, nil)
				if err != nil {
					syncResults[commandName] = map[string]interface{}{
						"success": false,
						"error":   err.Error(),
					}
					continue
				}

				// 解析响应并保存到数据库
				parsedConfig, err := s.parseATResponseToConfig(commandName, response, device.BoardType)
				if err != nil {
					syncResults[commandName] = map[string]interface{}{
						"success": false,
						"error":   err.Error(),
					}
					continue
				}

				// 保存配置到数据库
				if err := s.saveConfigToDatabase(deviceID, commandName, parsedConfig); err != nil {
					syncResults[commandName] = map[string]interface{}{
						"success": false,
						"error":   err.Error(),
					}
					continue
				}

				syncResults[commandName] = map[string]interface{}{
					"success": true,
					"config":  parsedConfig,
				}

				// 将配置数据添加到总配置中
				for k, v := range parsedConfig {
					configData[k] = v
					if commandName == "get_radio_params" && k == "bandwidth" {
						radioParamsBandwidth = v
					}
				}
			}
		}

		// 如果未包含get_device_type，补充执行
		if !letHasDeviceType {
			if _, ok := boardConfig.Commands["get_device_type"]; ok {
				response, err := s.SendATCommandByName(deviceID, "get_device_type", nil)
				if err == nil {
					parsedConfig, err := s.parseATResponseToConfig("get_device_type", response, device.BoardType)
					if err == nil {
						s.saveConfigToDatabase(deviceID, "get_device_type", parsedConfig)
						for k, v := range parsedConfig {
							configData[k] = v
						}
						syncResults["get_device_type"] = map[string]interface{}{
							"success": true,
							"config":  parsedConfig,
						}
					}
				}
			}
		}
	} else {
		// 对于其他设备类型，使用原有的完整同步逻辑
		fmt.Printf("[SyncDeviceConfig] Using full sync for device type: %s\n", device.BoardType)

		// 遍历所有get命令，获取配置
		for commandName := range boardConfig.Commands {
			if strings.HasPrefix(commandName, "get_") {
				if commandName == "get_radio_params_store" {
					continue // 跳过 radio params store
				}
				if commandName == "get_device_type" {
					letHasDeviceType = true
				}

				// 发送查询命令
				response, err := s.SendATCommandByName(deviceID, commandName, nil)
				if err != nil {
					syncResults[commandName] = map[string]interface{}{
						"success": false,
						"error":   err.Error(),
					}
					continue
				}

				// 解析响应并保存到数据库
				parsedConfig, err := s.parseATResponseToConfig(commandName, response, device.BoardType)
				if err != nil {
					syncResults[commandName] = map[string]interface{}{
						"success": false,
						"error":   err.Error(),
					}
					continue
				}

				// 保存配置到数据库
				if err := s.saveConfigToDatabase(deviceID, commandName, parsedConfig); err != nil {
					syncResults[commandName] = map[string]interface{}{
						"success": false,
						"error":   err.Error(),
					}
					continue
				}

				syncResults[commandName] = map[string]interface{}{
					"success": true,
					"config":  parsedConfig,
				}

				// 将配置数据添加到总配置中
				for k, v := range parsedConfig {
					configData[k] = v
					if commandName == "get_radio_params" && k == "bandwidth" {
						radioParamsBandwidth = v
					}
				}
			}
		}

		// 如果未包含get_device_type，补充执行（仅对非2.0 mesh设备）
		if !letHasDeviceType {
			if _, ok := boardConfig.Commands["get_device_type"]; ok {
				response, err := s.SendATCommandByName(deviceID, "get_device_type", nil)
				if err == nil {
					parsedConfig, err := s.parseATResponseToConfig("get_device_type", response, device.BoardType)
					if err == nil {
						s.saveConfigToDatabase(deviceID, "get_device_type", parsedConfig)
						for k, v := range parsedConfig {
							configData[k] = v
						}
						syncResults["get_device_type"] = map[string]interface{}{
							"success": true,
							"config":  parsedConfig,
						}
					}
				}
			}
		}
	}
	// 如果未包含get_device_type，补充执行
	if !letHasDeviceType {
		if _, ok := boardConfig.Commands["get_device_type"]; ok {
			response, err := s.SendATCommandByName(deviceID, "get_device_type", nil)
			if err == nil {
				parsedConfig, err := s.parseATResponseToConfig("get_device_type", response, device.BoardType)
				if err == nil {
					s.saveConfigToDatabase(deviceID, "get_device_type", parsedConfig)
					for k, v := range parsedConfig {
						configData[k] = v
					}
					syncResults["get_device_type"] = map[string]interface{}{
						"success": true,
						"config":  parsedConfig,
					}
				}
			}
		}
	}

	// 更新设备配置字段
	if len(configData) > 0 {
		configJSON, _ := json.Marshal(configData)
		s.db.Model(&model.Device{}).Where("id = ?", deviceID).Update("config", string(configJSON))
		// 新增：同步所有字段到 WirelessConfig，只用 get_radio_params 的 bandwidth
		var wc model.WirelessConfig
		wc.DeviceID = deviceID
		if radioParamsBandwidth != nil {
			wc.Bandwidth = fmt.Sprintf("%v", radioParamsBandwidth)
		}
		if v, ok := configData["frequency_band"]; ok {
			if bands, ok := v.([]string); ok {
				wc.SetFrequencyBandArray(bands)
			} else if s, ok := v.(string); ok {
				wc.FrequencyBand = s
			}
		}
		if v, ok := configData["frequency"]; ok {
			wc.Channel, _ = strconv.Atoi(fmt.Sprintf("%v", v))
		}
		if v, ok := configData["power"]; ok {
			wc.TransmitPower, _ = strconv.Atoi(fmt.Sprintf("%v", v))
		}
		if v, ok := configData["frequency_hopping"]; ok {
			wc.FrequencyHopping = v == "1" || v == 1 || v == true
		}
		fmt.Printf("[SyncDeviceConfig] Writing WirelessConfig: deviceID=%d, bandwidth=%v\n", deviceID, wc.Bandwidth)
		var count int64
		s.db.Model(&model.WirelessConfig{}).Where("device_id = ?", deviceID).Count(&count)
		if count == 0 {
			s.db.Create(&wc)
		} else {
			s.db.Model(&model.WirelessConfig{}).Where("device_id = ?", deviceID).Updates(&wc)
		}
	}

	return map[string]interface{}{
		"device_id":      deviceID,
		"board_type":     device.BoardType,
		"sync_results":   syncResults,
		"total_commands": len(syncResults),
		"success_count":  s.countSuccessResults(syncResults),
		"config_data":    configData,
	}, nil
}

// SyncDeviceConfigByType 按配置类型同步设备配置
func (s *DeviceCommService) SyncDeviceConfigByType(deviceID uint, configType string) (map[string]interface{}, error) {
	device, err := s.getDeviceByID(deviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %v", err)
	}

	// 获取板级配置
	boardConfig, err := s.boardConfigMgr.GetBoardConfig(device.BoardType)
	if err != nil {
		return nil, fmt.Errorf("failed to get board config: %v", err)
	}

	// 根据配置类型获取对应的命令
	commandsForType := s.getCommandsForConfigType(configType, boardConfig.Commands)
	if len(commandsForType) == 0 {
		return nil, fmt.Errorf("no commands found for config type: %s", configType)
	}

	// 存储同步结果
	syncResults := make(map[string]interface{})
	configData := make(map[string]interface{})

	// 遍历指定类型的get命令，获取配置
	for _, commandName := range commandsForType {
		if strings.HasPrefix(commandName, "get_") {
			fmt.Printf("=== Processing command: %s ===\n", commandName)

			// 发送查询命令
			response, err := s.SendATCommandByName(deviceID, commandName, nil)
			if err != nil {
				fmt.Printf("Command %s failed with error: %v\n", commandName, err)
				syncResults[commandName] = map[string]interface{}{
					"success": false,
					"error":   err.Error(),
				}
				continue
			}

			fmt.Printf("Command %s response: %q\n", commandName, response)

			// 解析响应并保存到数据库
			parsedConfig, err := s.parseATResponseToConfig(commandName, response, device.BoardType)
			if err != nil {
				fmt.Printf("Command %s parsing failed with error: %v\n", commandName, err)
				syncResults[commandName] = map[string]interface{}{
					"success": false,
					"error":   err.Error(),
				}
				continue
			}

			fmt.Printf("Command %s parsed config: %+v\n", commandName, parsedConfig)

			// 检查解析结果是否包含有效数据
			if len(parsedConfig) == 0 || (len(parsedConfig) == 1 && parsedConfig["raw_response"] != nil) {
				fmt.Printf("Command %s: No valid config data parsed, marking as failed\n", commandName)
				syncResults[commandName] = map[string]interface{}{
					"success":       false,
					"error":         "No valid configuration data parsed",
					"response":      response,
					"parsed_config": parsedConfig,
				}
				continue
			}

			// 保存配置到数据库
			if err := s.saveConfigToDatabase(deviceID, commandName, parsedConfig); err != nil {
				fmt.Printf("Command %s database save failed with error: %v\n", commandName, err)
				syncResults[commandName] = map[string]interface{}{
					"success": false,
					"error":   err.Error(),
				}
				continue
			}

			fmt.Printf("Command %s completed successfully\n", commandName)
			syncResults[commandName] = map[string]interface{}{
				"success":  true,
				"response": response,
				"config":   parsedConfig,
			}

			// 将配置数据添加到总配置中
			for k, v := range parsedConfig {
				configData[k] = v
			}
		}
	}

	// 更新设备配置字段
	if len(configData) > 0 {
		configJSON, _ := json.Marshal(configData)
		s.db.Model(&model.Device{}).Where("id = ?", deviceID).Update("config", string(configJSON))
	}

	return map[string]interface{}{
		"device_id":      deviceID,
		"board_type":     device.BoardType,
		"config_type":    configType,
		"sync_results":   syncResults,
		"total_commands": len(syncResults),
		"success_count":  s.countSuccessResults(syncResults),
		"config_data":    configData,
	}, nil
}

// getCommandsForConfigType 根据配置类型获取对应的命令
func (s *DeviceCommService) getCommandsForConfigType(configType string, commands map[string]CommandDef) []string {
	var result []string

	// 添加调试日志
	fmt.Printf("=== DEBUG: Getting commands for config type: %s ===\n", configType)
	fmt.Printf("Available commands: %v\n", getCommandNames(commands))

	switch configType {
	case "basic":
		// 基础配置 - 包含网络配置、IP地址、接入状态等核心配置
		for cmdName := range commands {
			if strings.HasPrefix(cmdName, "get_") && (strings.Contains(cmdName, "network_config") ||
				strings.Contains(cmdName, "access_password") ||
				strings.Contains(cmdName, "ip_address") ||
				strings.Contains(cmdName, "access_state") ||
				strings.Contains(cmdName, "accessible_nodes")) {
				result = append(result, cmdName)
				fmt.Printf("  -> basic: %s\n", cmdName)
			}
		}
	case "radio":
		// 无线参数配置 - 包含无线参数、频段配置、跳频控制等
		for cmdName := range commands {
			if strings.HasPrefix(cmdName, "get_") && (strings.Contains(cmdName, "radio_params") ||
				strings.Contains(cmdName, "band_config") ||
				strings.Contains(cmdName, "frequency_hopping")) &&
				!strings.Contains(cmdName, "radio_params_store") &&
				!strings.Contains(cmdName, "tdd_config") {
				result = append(result, cmdName)
				fmt.Printf("  -> radio: %s\n", cmdName)
			}
		}
	case "device_type":
		// 设备类型配置
		for cmdName := range commands {
			if strings.HasPrefix(cmdName, "get_") && strings.Contains(cmdName, "device_type") {
				result = append(result, cmdName)
				fmt.Printf("  -> device_type: %s\n", cmdName)
			}
		}
	case "encryption":
		// 加密算法配置
		for cmdName := range commands {
			if strings.HasPrefix(cmdName, "get_") && strings.Contains(cmdName, "encryption_algorithm") {
				result = append(result, cmdName)
				fmt.Printf("  -> encryption: %s\n", cmdName)
			}
		}
	case "wireless":
		// 无线相关命令 - 包含核心无线配置
		for cmdName := range commands {
			if (strings.Contains(cmdName, "band") && !strings.Contains(cmdName, "param")) ||
				strings.Contains(cmdName, "radio") ||
				strings.Contains(cmdName, "frequency_hopping") ||
				strings.Contains(cmdName, "building_chain") ||
				strings.Contains(cmdName, "sub_band_range") ||
				strings.Contains(cmdName, "lock_frequency") ||
				strings.Contains(cmdName, "fixed_tx_power") ||
				strings.Contains(cmdName, "continuous_tx") {
				result = append(result, cmdName)
				fmt.Printf("  -> wireless: %s\n", cmdName)
			}
		}
	case "security":
		// 安全相关命令 - 只包含可以通过AT指令获取的配置，排除Key相关命令
		for cmdName := range commands {
			if (strings.Contains(cmdName, "encryption_algorithm") ||
				strings.Contains(cmdName, "slave_max_tx_power") ||
				strings.Contains(cmdName, "access_password")) &&
				!strings.Contains(cmdName, "key") && !strings.Contains(cmdName, "set_config") {
				result = append(result, cmdName)
				fmt.Printf("  -> security: %s\n", cmdName)
			}
		}
	case "system":
		// 系统配置相关命令
		for cmdName := range commands {
			if strings.HasPrefix(cmdName, "get_") && (strings.Contains(cmdName, "device_info") ||
				strings.Contains(cmdName, "device_type") ||
				strings.Contains(cmdName, "ue_type") ||
				strings.Contains(cmdName, "elog_function") ||
				strings.Contains(cmdName, "aplog_function") ||
				strings.Contains(cmdName, "reboot_device") ||
				strings.Contains(cmdName, "restore_factory_settings")) {
				result = append(result, cmdName)
				fmt.Printf("  -> system: %s\n", cmdName)
			}
		}
	case "up_down":
		// 上下行相关命令
		for cmdName := range commands {
			if strings.HasPrefix(cmdName, "get_") && (strings.Contains(cmdName, "tdd") ||
				strings.Contains(cmdName, "up_down")) {
				result = append(result, cmdName)
				fmt.Printf("  -> up_down: %s\n", cmdName)
			}
		}
	case "network":
		// 网络状态相关命令 - 包含网络状态、IP地址、设备类型、接入状态等
		for cmdName := range commands {
			if strings.HasPrefix(cmdName, "get_") && ((strings.Contains(cmdName, "net") && !strings.Contains(cmdName, "access")) ||
				strings.Contains(cmdName, "ip_address") ||
				strings.Contains(cmdName, "device_type") ||
				strings.Contains(cmdName, "access_state") ||
				strings.Contains(cmdName, "accessible_nodes")) {
				result = append(result, cmdName)
				fmt.Printf("  -> network: %s\n", cmdName)
			}
		}
	case "network_settings":
		// 网络设置相关命令
		for cmdName := range commands {
			if strings.Contains(cmdName, "network_config") ||
				strings.Contains(cmdName, "net_setting") {
				result = append(result, cmdName)
				fmt.Printf("  -> network_settings: %s\n", cmdName)
			}
		}
	case "network_status":
		// 网络状态相关命令 - 已合并到network类型中，保留此类型以兼容旧代码
		for cmdName := range commands {
			if strings.Contains(cmdName, "accessible_nodes") ||
				strings.Contains(cmdName, "access_state") ||
				strings.Contains(cmdName, "access_nodes") {
				result = append(result, cmdName)
				fmt.Printf("  -> network_status: %s\n", cmdName)
			}
		}
	case "debug":
		// 调试相关命令 - 包含ELog、DRPR、调试功能等
		for cmdName := range commands {
			if strings.HasPrefix(cmdName, "get_") && (strings.Contains(cmdName, "elog_function") ||
				strings.Contains(cmdName, "aplog_function") ||
				strings.Contains(cmdName, "radio_param_report") ||
				strings.Contains(cmdName, "all_radio_param_report") ||
				(strings.Contains(cmdName, "report") && strings.Contains(cmdName, "radio"))) {
				result = append(result, cmdName)
				fmt.Printf("  -> debug: %s\n", cmdName)
			}
		}
	case "ca_mimo":
		// CA MIMO能力相关命令
		for cmdName := range commands {
			if strings.Contains(cmdName, "ca_mimo_capability") ||
				strings.Contains(cmdName, "ca_flag") ||
				strings.Contains(cmdName, "mimo_flag") {
				result = append(result, cmdName)
				fmt.Printf("  -> ca_mimo: %s\n", cmdName)
			}
		}
	case "routing":
		// 路由相关命令
		for cmdName := range commands {
			if strings.Contains(cmdName, "route") ||
				strings.Contains(cmdName, "master_node") ||
				strings.Contains(cmdName, "network_nodes_ip") {
				result = append(result, cmdName)
				fmt.Printf("  -> routing: %s\n", cmdName)
			}
		}
	case "uart":
		// UART相关命令
		for cmdName := range commands {
			if strings.Contains(cmdName, "uart_baud_rate") {
				result = append(result, cmdName)
				fmt.Printf("  -> uart: %s\n", cmdName)
			}
		}
	default:
		// 默认返回所有get命令
		for cmdName := range commands {
			if strings.HasPrefix(cmdName, "get_") {
				result = append(result, cmdName)
				fmt.Printf("  -> default: %s\n", cmdName)
			}
		}
	}

	fmt.Printf("=== END DEBUG: Found %d commands for %s ===\n", len(result), configType)
	return result
}

// getCommandNames 获取命令名称列表（用于调试）
func getCommandNames(commands map[string]CommandDef) []string {
	var names []string
	for name := range commands {
		names = append(names, name)
	}
	return names
}

// parseATResponseToConfig 解析AT响应为配置数据
func (s *DeviceCommService) parseATResponseToConfig(commandName, response, boardType string) (map[string]interface{}, error) {
	config := make(map[string]interface{})

	// 添加详细的调试日志
	fmt.Printf("=== DEBUG: Parsing command: %s ===\n", commandName)
	fmt.Printf("Raw response: %q\n", response)
	fmt.Printf("Response length: %d\n", len(response))
	fmt.Printf("Contains '^DRPR:': %v\n", strings.Contains(response, "^DRPR:"))
	fmt.Printf("Contains '^DRPC:': %v\n", strings.Contains(response, "^DRPC:"))
	fmt.Printf("Contains '^DRPS:': %v\n", strings.Contains(response, "^DRPS:"))
	fmt.Printf("Contains '^DSSMTP:': %v\n", strings.Contains(response, "^DSSMTP:"))
	fmt.Printf("Contains '^DCIAC:': %v\n", strings.Contains(response, "^DCIAC:"))
	fmt.Printf("Contains '^DACS:': %v\n", strings.Contains(response, "^DACS:"))
	fmt.Printf("Contains '^DDTC:': %v\n", strings.Contains(response, "^DDTC:"))
	fmt.Printf("Contains '^DAOCNDI:': %v\n", strings.Contains(response, "^DAOCNDI:"))
	fmt.Printf("Contains '^DSTC:': %v\n", strings.Contains(response, "^DSTC:"))
	fmt.Printf("Contains '^DFHC:': %v\n", strings.Contains(response, "^DFHC:"))
	fmt.Printf("Contains '^DAPR:': %v\n", strings.Contains(response, "^DAPR:"))
	fmt.Printf("Contains '^DGMR:': %v\n", strings.Contains(response, "^DGMR:"))
	fmt.Printf("Contains '^DUIP:': %v\n", strings.Contains(response, "^DUIP:"))
	fmt.Printf("Response lines:\n")
	for i, line := range strings.Split(response, "\n") {
		fmt.Printf("  Line %d: %q\n", i+1, line)
	}
	fmt.Printf("=== END DEBUG ===\n")

	// 如果响应只包含执行成功信息，说明设备没有返回具体数据
	if strings.Contains(response, "executed successfully") && !strings.Contains(response, ":") {
		config["status"] = "command_executed"
		config["message"] = response
		config["note"] = "Device returned execution status only, no configuration data"
		return config, nil
	}

	// 根据命令名称和响应格式解析配置
	switch commandName {
	case "get_device_info":
		// 解析 AT^DGMR? 响应
		// 示例响应：^DGMR: "版本号"\r\n\r\nOK
		if strings.Contains(response, "^DGMR:") {
			parts := strings.Split(response, "^DGMR:")
			if len(parts) > 1 {
				// 提取版本信息，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				value = strings.Trim(value, "\"")     // 去除引号
				config["device_version"] = value
				fmt.Printf("Parsed device version: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_ip_address":
		// 解析 AT^DUIP? 响应
		// 示例响应：^DUIP: 0,"192.168.1.27",FB880200,"00:01:00:02:88:fb",B140411\r\n\r\nOK
		if strings.Contains(response, "^DUIP:") {
			// 使用正则表达式提取IP地址
			re := regexp.MustCompile(`\^DUIP:\s*\d+,"([^"]+)"`)
			matches := re.FindStringSubmatch(response)
			if len(matches) >= 2 {
				config["ip_address"] = matches[1]
				fmt.Printf("Parsed IP address: %s\n", matches[1])
			} else {
				// 如果正则匹配失败，尝试旧的解析方法
				parts := strings.Split(response, "^DUIP:")
				if len(parts) > 1 {
					value := strings.TrimSpace(parts[1])
					value = strings.Split(value, "\r")[0] // 去除\r\n
					value = strings.Split(value, "\n")[0] // 去除换行
					value = strings.Trim(value, "\"")     // 去除引号
					config["ip_address"] = value
					fmt.Printf("Parsed IP address (fallback): %s\n", value)
				}
			}
		} else {
			config["raw_response"] = response
		}

	case "get_access_state":
		// 解析 AT^DACS? 响应
		// 示例响应：^DACS: 1,2\r\n\r\nOK
		if strings.Contains(response, "^DACS:") {
			parts := strings.Split(response, "^DACS:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行

				values := strings.Split(value, ",")
				if len(values) >= 2 {
					config["access_state_enabled"] = strings.TrimSpace(values[0])
					config["access_state"] = strings.TrimSpace(values[1])
					fmt.Printf("Parsed access state enabled: %s, access state: %s\n", values[0], values[1])
				}
			}
		} else {
			// 如果没有找到预期的响应格式，保存原始响应
			config["raw_response"] = response
		}

	case "get_radio_params":
		// 解析 AT^DRPC? 响应
		// 示例响应：^DRPC: 24020,2,"27"\r\n\r\nOK
		if strings.Contains(response, "^DRPC:") {
			parts := strings.Split(response, "^DRPC:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				value = strings.Split(value, "OK")[0] // 去除OK

				values := strings.Split(value, ",")
				if len(values) >= 3 {
					// 清理频率值，去除所有括号和空格
					frequency := strings.TrimSpace(values[0])
					frequency = strings.ReplaceAll(frequency, "(", "")
					frequency = strings.ReplaceAll(frequency, ")", "")
					config["frequency"] = frequency

					// 清理带宽值，去除所有括号和空格
					bandwidth := strings.TrimSpace(values[1])
					bandwidth = strings.ReplaceAll(bandwidth, "(", "")
					bandwidth = strings.ReplaceAll(bandwidth, ")", "")
					config["bandwidth"] = bandwidth

					// 清理功率值，去除引号、括号和空格
					power := strings.TrimSpace(values[2])
					power = strings.Trim(power, "\"")
					power = strings.ReplaceAll(power, "(", "")
					power = strings.ReplaceAll(power, ")", "")
					config["power"] = power

					fmt.Printf("Parsed radio params - frequency: %s, bandwidth: %s, power: %s\n", frequency, bandwidth, power)
				}
			}
		} else {
			config["raw_response"] = response
		}

	case "get_radio_params_store":
		// 解析 AT^DRPS? 响应
		// 示例响应：^DRPS: 24020,2,"27"\r\n\r\nOK
		if strings.Contains(response, "^DRPS:") {
			parts := strings.Split(response, "^DRPS:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				value = strings.Split(value, "OK")[0] // 去除OK

				values := strings.Split(value, ",")
				if len(values) >= 3 {
					// 清理频率值，去除所有括号和空格
					frequency := strings.TrimSpace(values[0])
					frequency = strings.ReplaceAll(frequency, "(", "")
					frequency = strings.ReplaceAll(frequency, ")", "")
					config["stored_frequency"] = frequency

					// 清理带宽值，去除所有括号和空格
					bandwidth := strings.TrimSpace(values[1])
					bandwidth = strings.ReplaceAll(bandwidth, "(", "")
					bandwidth = strings.ReplaceAll(bandwidth, ")", "")
					config["stored_bandwidth"] = bandwidth

					// 清理功率值，去除引号、括号和空格
					power := strings.TrimSpace(values[2])
					power = strings.Trim(power, "\"")
					power = strings.ReplaceAll(power, "(", "")
					power = strings.ReplaceAll(power, ")", "")
					config["stored_power"] = power

					fmt.Printf("Parsed stored radio params - frequency: %s, bandwidth: %s, power: %s\n", frequency, bandwidth, power)
				}
			}
		}
		// 如果没有有效 stored_* 字段，返回空 map
		if len(config) == 0 {
			return config, nil
		}

	case "get_slave_max_tx_power":
		// 解析 AT^DSSMTP? 响应
		// 示例响应：^DSSMTP: 27\r\n\r\nOK
		if strings.Contains(response, "^DSSMTP:") {
			parts := strings.Split(response, "^DSSMTP:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				// 去除多余的引号
				value = strings.Trim(value, "\"")
				config["slave_max_tx_power"] = value
				fmt.Printf("Parsed slave max tx power: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_radio_param_report":
		// 解析 AT^DRPR? 响应
		// 示例响应：^DRPR: 0\r\n\r\nOK
		if strings.Contains(response, "^DRPR:") {
			parts := strings.Split(response, "^DRPR:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				config["radio_param_report"] = value
				fmt.Printf("Parsed radio param report: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_all_radio_param_report":
		// 解析 AT^DAPR? 响应
		if strings.Contains(response, "^DAPR:") {
			parts := strings.Split(response, "^DAPR:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				config["all_radio_param_report"] = value
				fmt.Printf("Parsed all radio param report: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_band_config":
		// 解析 AT^DAOCNDI? 响应
		if strings.Contains(response, "^DAOCNDI:") {
			parts := strings.Split(response, "^DAOCNDI:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行

				// 保存原始字段名
				config["band_config"] = value

				// 将十六进制位图转换为频段数组
				// Bit0: 800M频段, Bit2: 1.4G频段, Bit3: 2.4G频段
				var frequencyBands []string
				bandBitmap, err := strconv.ParseUint(value, 16, 32)
				if err == nil {
					if bandBitmap&(1<<0) != 0 {
						frequencyBands = append(frequencyBands, "800M")
					}
					if bandBitmap&(1<<2) != 0 {
						frequencyBands = append(frequencyBands, "1.4G")
					}
					if bandBitmap&(1<<3) != 0 {
						frequencyBands = append(frequencyBands, "2.4G")
					}
				}

				// 映射到前端期望的字段名
				config["frequency_band"] = frequencyBands

				fmt.Printf("Parsed band config: %s -> %v\n", value, frequencyBands)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_device_type":
		// 解析 AT^DDTC? 响应
		// 示例响应：^DDTC: 1,2\r\n\r\nOK
		if strings.Contains(response, "^DDTC:") {
			parts := strings.Split(response, "^DDTC:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行

				values := strings.Split(value, ",")
				if len(values) >= 2 {
					config["device_type"] = strings.TrimSpace(values[0])
					config["working_type"] = strings.TrimSpace(values[1])
					fmt.Printf("Parsed device type: %s, working type: %s\n", values[0], values[1])
				}
			}
		} else {
			config["raw_response"] = response
		}

	case "get_encryption_algorithm":
		// 解析 AT^DCIAC? 响应
		// 示例响应：^DCIAC: 2\r\n\r\nOK
		if strings.Contains(response, "^DCIAC:") {
			parts := strings.Split(response, "^DCIAC:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				// 转为数字类型
				if alg, err := strconv.Atoi(value); err == nil {
					config["encryption_algorithm"] = alg
				} else {
					config["encryption_algorithm"] = value
				}
				fmt.Printf("Parsed encryption algorithm: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_tdd_config":
		// 解析 AT^DSTC? 响应
		// 示例响应：^DSTC: 3\r\n\r\nOK
		if strings.Contains(response, "^DSTC:") {
			parts := strings.Split(response, "^DSTC:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				// 映射为TDD配置字符串
				var tddSetting string
				switch value {
				case "0":
					tddSetting = "2D3U"
				case "1":
					tddSetting = "3D2U"
				case "2":
					tddSetting = "4D1U"
				case "3":
					tddSetting = "1D4U"
				default:
					tddSetting = value
				}
				config["current_setting"] = tddSetting
			}
		} else {
			config["raw_response"] = response
		}

	case "get_frequency_hopping":
		// 解析 AT^DFHC? 响应
		// 示例响应：^DFHC: 1\r\n\r\nOK
		if strings.Contains(response, "^DFHC:") {
			parts := strings.Split(response, "^DFHC:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n和OK
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				config["frequency_hopping"] = value
				fmt.Printf("Parsed frequency hopping: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_network_config":
		// 解析 AT^NETIFCFG? 响应
		// 示例响应：^NETIFCFG: <0>,<ip_address>,<ip_address> ^NETIFCFG: <1>,<ip_address>,<ip_address> ^NETIFCFG: <2>,<ip_address>,<ip_address> OK
		// 或者：^NETIFCFG: 2,"192.168.1.100" OK
		if strings.Contains(response, "^NETIFCFG:") {
			// 提取所有网络接口配置
			lines := strings.Split(response, "\n")
			for _, line := range lines {
				if strings.Contains(line, "^NETIFCFG:") {
					parts := strings.Split(line, "^NETIFCFG:")
					if len(parts) > 1 {
						value := strings.TrimSpace(parts[1])
						values := strings.Split(value, ",")

						// 处理至少有2个参数的情况（接口类型和主IP）
						if len(values) >= 2 {
							interfaceType := strings.TrimSpace(values[0])
							masterIP := strings.Trim(strings.TrimSpace(values[1]), "\"") // 去除引号

							// 保存到配置中，使用接口类型作为key
							config[fmt.Sprintf("interface_%s_type", interfaceType)] = interfaceType
							config[fmt.Sprintf("interface_%s_master_ip", interfaceType)] = masterIP

							// 如果有第3个参数（从IP），也保存
							if len(values) >= 3 {
								slaveIP := strings.Trim(strings.TrimSpace(values[2]), "\"")
								config[fmt.Sprintf("interface_%s_slave_ip", interfaceType)] = slaveIP
							} else {
								config[fmt.Sprintf("interface_%s_slave_ip", interfaceType)] = ""
							}

							// 如果是接口类型2（模块IP），保存为主IP
							if interfaceType == "2" {
								config["ip"] = masterIP
								config["master_ip"] = masterIP
							}

							fmt.Printf("Parsed network config - interface: %s, master_ip: %s\n", interfaceType, masterIP)
						}
					}
				}
			}
		} else {
			config["raw_response"] = response
		}

	case "get_accessible_nodes":
		// 解析 AT^DIPAN 响应
		// 示例响应：^DIPAN: <m>[,<IP Type>,<IP address_1>[,IP address_2>,...[,<IP address_m>]]]
		if strings.Contains(response, "^DIPAN:") {
			parts := strings.Split(response, "^DIPAN:")
			if len(parts) > 1 {
				// 提取数值部分，去除\r\n、\n、OK等
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				value = strings.Split(value, "OK")[0] // 去除OK
				value = strings.TrimSpace(value)      // 再次清理空格

				values := strings.Split(value, ",")
				if len(values) >= 1 {
					nodeCount := strings.TrimSpace(values[0])
					config["access_node_count"] = nodeCount

					// 解析IP地址列表
					var ipAddresses []string
					for i := 2; i < len(values); i++ { // 从索引2开始，跳过节点数和IP类型
						ip := strings.Trim(strings.TrimSpace(values[i]), "\"")
						// 过滤掉非IP地址的字符（如OK、数字等）
						if ip != "" && !strings.Contains(ip, "OK") && !strings.Contains(ip, " ") {
							// 简单的IP地址格式验证
							if strings.Contains(ip, ".") {
								ipAddresses = append(ipAddresses, ip)
							}
						}
					}

					if len(ipAddresses) > 0 {
						config["access_node_ips"] = ipAddresses
					}

					fmt.Printf("Parsed access nodes - count: %s, IPs: %v\n", nodeCount, ipAddresses)
				}
			}
		} else {
			config["raw_response"] = response
		}

	case "get_building_chain":
		// 解析 AT^DSONSBR? 响应
		// 示例响应：^DSONSBR: 64,24015,24814,66,14280,14470\r\n\r\nOK
		fmt.Printf("Parsing get_building_chain response: %q\n", response)
		if strings.Contains(response, "^DSONSBR:") {
			parts := strings.Split(response, "^DSONSBR:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				// 以逗号分割
				fields := strings.Split(value, ",")
				var ranges []string
				for i := 0; i+2 < len(fields); i += 3 {
					band := strings.TrimSpace(fields[i])
					start := strings.TrimSpace(fields[i+1])
					end := strings.TrimSpace(fields[i+2])
					ranges = append(ranges, fmt.Sprintf("BAND%s: %s-%s", band, start, end))
				}
				buildingChain := strings.Join(ranges, "; ")
				fmt.Printf("Parsed building_chain: %s\n", buildingChain)
				config["building_chain"] = buildingChain
			}
		} else {
			fmt.Printf("Response doesn't contain ^DSONSBR:, setting raw_response\n")
			config["raw_response"] = response
		}

	case "get_access_password":
		// 解析 AT^DAPI? 响应
		// 示例响应：^DAPI: "密钥内容"\r\n\r\nOK
		if strings.Contains(response, "^DAPI:") {
			parts := strings.Split(response, "^DAPI:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				value = strings.Trim(value, "\"")     // 去除引号
				config["access_password"] = value
				fmt.Printf("Parsed access password: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_phone_functionality":
		// 解析 AT+CFUN? 响应
		// 示例响应：+CFUN: 1\r\n\r\nOK
		if strings.Contains(response, "+CFUN:") {
			parts := strings.Split(response, "+CFUN:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				config["phone_functionality"] = value
				fmt.Printf("Parsed phone functionality: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_ue_type":
		// 解析 AT^DUET? 响应
		// 示例响应：^DUET: 1\r\n\r\nOK
		if strings.Contains(response, "^DUET:") {
			parts := strings.Split(response, "^DUET:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				config["ue_type"] = value
				fmt.Printf("Parsed UE type: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_elog_function":
		// 解析 AT^DELOG? 响应
		// 示例响应：^DELOG: 1\r\n\r\nOK
		if strings.Contains(response, "^DELOG:") {
			parts := strings.Split(response, "^DELOG:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				config["elog_function"] = value
				fmt.Printf("Parsed elog function: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_aplog_function":
		// 解析 AT^DAPLOG? 响应
		// 示例响应：^DAPLOG: 1\r\n\r\nOK
		if strings.Contains(response, "^DAPLOG:") {
			parts := strings.Split(response, "^DAPLOG:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				config["aplog_function"] = value
				fmt.Printf("Parsed aplog function: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_sub_band_range":
		// 解析 AT^DSBR? 响应
		// 示例响应：^DSBR: 24015,24814\r\n\r\nOK
		if strings.Contains(response, "^DSBR:") {
			parts := strings.Split(response, "^DSBR:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				values := strings.Split(value, ",")
				if len(values) >= 2 {
					config["sub_band_start"] = strings.TrimSpace(values[0])
					config["sub_band_end"] = strings.TrimSpace(values[1])
					fmt.Printf("Parsed sub band range: %s-%s\n", values[0], values[1])
				}
			}
		} else {
			config["raw_response"] = response
		}

	case "get_lock_frequency":
		// 解析 AT^DLF? 响应
		// 示例响应：^DLF: 1\r\n\r\nOK
		if strings.Contains(response, "^DLF:") {
			parts := strings.Split(response, "^DLF:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				config["lock_frequency"] = value
				fmt.Printf("Parsed lock frequency: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_fixed_tx_power":
		// 解析 AT^DFTP? 响应
		// 示例响应：^DFTP: 1\r\n\r\nOK
		if strings.Contains(response, "^DFTP:") {
			parts := strings.Split(response, "^DFTP:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				config["fixed_tx_power"] = value
				fmt.Printf("Parsed fixed tx power: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_continuous_tx":
		// 解析 AT^DCTX? 响应
		// 示例响应：^DCTX: 1\r\n\r\nOK
		if strings.Contains(response, "^DCTX:") {
			parts := strings.Split(response, "^DCTX:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				config["continuous_tx"] = value
				fmt.Printf("Parsed continuous tx: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_ca_mimo_capability":
		// 解析 AT^DCMC? 响应
		// 示例响应：^DCMC: 1,1\r\n\r\nOK
		if strings.Contains(response, "^DCMC:") {
			parts := strings.Split(response, "^DCMC:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				values := strings.Split(value, ",")
				if len(values) >= 2 {
					config["ca_flag"] = strings.TrimSpace(values[0])
					config["mimo_flag"] = strings.TrimSpace(values[1])
					fmt.Printf("Parsed CA MIMO capability: CA=%s, MIMO=%s\n", values[0], values[1])
				}
			}
		} else {
			config["raw_response"] = response
		}

	case "get_master_node":
		// 解析 AT^DMN? 响应
		// 示例响应：^DMN: "192.168.1.100"\r\n\r\nOK
		if strings.Contains(response, "^DMN:") {
			parts := strings.Split(response, "^DMN:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				value = strings.Trim(value, "\"")     // 去除引号
				config["master_node"] = value
				fmt.Printf("Parsed master node: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_network_nodes_ip":
		// 解析 AT^DNNI? 响应
		// 示例响应：^DNNI: "192.168.1.100,192.168.1.101"\r\n\r\nOK
		if strings.Contains(response, "^DNNI:") {
			parts := strings.Split(response, "^DNNI:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				value = strings.Trim(value, "\"")     // 去除引号
				config["network_nodes_ip"] = value
				fmt.Printf("Parsed network nodes IP: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_uart_baud_rate":
		// 解析 AT^DUART? 响应
		// 示例响应：^DUART: 115200\r\n\r\nOK
		if strings.Contains(response, "^DUART:") {
			parts := strings.Split(response, "^DUART:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				config["uart_baud_rate"] = value
				fmt.Printf("Parsed UART baud rate: %s\n", value)
			}
		} else {
			config["raw_response"] = response
		}

	case "get_net_setting":
		// 解析 AT^DNS? 响应
		// 示例响应：^DNS: 1,2,3\r\n\r\nOK
		if strings.Contains(response, "^DNS:") {
			parts := strings.Split(response, "^DNS:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				values := strings.Split(value, ",")
				if len(values) >= 3 {
					config["net_setting_type"] = strings.TrimSpace(values[0])
					config["net_setting_master_ip"] = strings.TrimSpace(values[1])
					config["net_setting_sub_mask"] = strings.TrimSpace(values[2])
					fmt.Printf("Parsed net setting: type=%s, master_ip=%s, sub_mask=%s\n", values[0], values[1], values[2])
				}
			}
		} else {
			config["raw_response"] = response
		}

	case "get_access_nodes":
		// 解析 AT^DAN? 响应
		// 示例响应：^DAN: 2,"192.168.1.100","192.168.1.101"\r\n\r\nOK
		if strings.Contains(response, "^DAN:") {
			parts := strings.Split(response, "^DAN:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				value = strings.Split(value, "\r")[0] // 去除\r\n
				value = strings.Split(value, "\n")[0] // 去除换行
				values := strings.Split(value, ",")
				if len(values) >= 1 {
					nodeCount := strings.TrimSpace(values[0])
					config["access_node_count"] = nodeCount

					// 解析IP地址列表
					var ipAddresses []string
					for i := 1; i < len(values); i++ {
						ip := strings.Trim(strings.TrimSpace(values[i]), "\"")
						if ip != "" {
							ipAddresses = append(ipAddresses, ip)
						}
					}

					if len(ipAddresses) > 0 {
						config["access_node_ips"] = ipAddresses
					}

					fmt.Printf("Parsed access nodes: count=%s, IPs=%v\n", nodeCount, ipAddresses)
				}
			}
		} else {
			config["raw_response"] = response
		}

	default:
		// 通用解析：尝试提取响应中的值
		config["raw_response"] = response
	}

	// 如果没有解析到任何配置，至少保存原始响应
	if len(config) == 0 {
		config["raw_response"] = response
		// 只有在没有解析到配置时才添加执行状态信息
		if strings.Contains(response, "executed successfully") {
			config["status"] = "command_executed"
			config["message"] = response
		}
	}

	return config, nil
}

// saveConfigToDatabase 保存配置到数据库
func (s *DeviceCommService) saveConfigToDatabase(deviceID uint, commandName string, config map[string]interface{}) error {
	// 根据命令名称确定配置类别
	var category string
	switch {
	case commandName == "get_building_chain":
		category = "wireless"
	case strings.Contains(commandName, "radio") || strings.Contains(commandName, "band") || strings.Contains(commandName, "hopping"):
		category = "wireless"
	case strings.Contains(commandName, "encryption") || strings.Contains(commandName, "security"):
		category = "security"
	case strings.Contains(commandName, "access") || strings.Contains(commandName, "device_type"):
		category = "system"
	case strings.Contains(commandName, "tdd"):
		category = "up_down"
	case strings.Contains(commandName, "network_config"):
		category = "network_settings"
	case strings.Contains(commandName, "access_nodes"):
		category = "network_status"
	default:
		category = "debug"
	}

	// 保存每个配置项
	for key, value := range config {
		// TDD配置特殊处理：current_setting要转为tdd_config索引写入
		if key == "current_setting" && (category == "up_down" || strings.Contains(commandName, "tdd")) {
			var idx string
			switch value {
			case "2D3U":
				idx = "0"
			case "3D2U":
				idx = "1"
			case "4D1U":
				idx = "2"
			case "1D4U":
				idx = "3"
			default:
				idx = ""
			}
			if idx != "" {
				key = "tdd_config"
				value = idx
			}
		}

		if key == "device_type" || key == "working_type" {
			category = "device_type"
			// 不再自动更新devices表的type字段，保持创建时master/slave
		}
		// 检查是否已存在
		var existingConfig model.DeviceConfig
		err := s.db.Where("device_id = ? AND category = ? AND key = ?", deviceID, category, key).First(&existingConfig).Error

		// 将值转换为字符串，特殊处理数组类型
		var valueStr string
		if arr, ok := value.([]string); ok {
			// 对于字符串数组，转换为JSON格式
			if jsonBytes, err := json.Marshal(arr); err == nil {
				valueStr = string(jsonBytes)
			} else {
				valueStr = fmt.Sprintf("%v", value)
			}
		} else {
			valueStr = fmt.Sprintf("%v", value)
		}

		// 新增详细日志
		fmt.Printf("[saveConfigToDatabase] deviceID=%d, category=%s, key=%s, value=%s\n", deviceID, category, key, valueStr)

		if err == gorm.ErrRecordNotFound {
			// 创建新配置
			deviceConfig := &model.DeviceConfig{
				DeviceID: deviceID,
				Category: category,
				Key:      key,
				Value:    valueStr,
				Type:     "string",
			}
			if err := s.db.Create(deviceConfig).Error; err != nil {
				return fmt.Errorf("failed to create config %s: %v", key, err)
			}
		} else if err == nil {
			// 更新现有配置
			existingConfig.Value = valueStr
			if err := s.db.Save(&existingConfig).Error; err != nil {
				return fmt.Errorf("failed to update config %s: %v", key, err)
			}
		} else {
			return fmt.Errorf("failed to check existing config %s: %v", key, err)
		}
	}

	return nil
}

// countSuccessResults 统计成功的结果数量
func (s *DeviceCommService) countSuccessResults(results map[string]interface{}) int {
	count := 0
	for _, result := range results {
		if resultMap, ok := result.(map[string]interface{}); ok {
			if success, ok := resultMap["success"].(bool); ok && success {
				count++
			}
		}
	}
	return count
}
