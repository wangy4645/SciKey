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
	conn, err := net.DialTimeout("tcp", address, timeout)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

// SendATCommand 发送 AT 命令到设备
func (s *DeviceCommService) SendATCommand(deviceID uint, command string) (string, error) {
	// 获取设备信息
	device, err := s.getDeviceByID(deviceID)
	if err != nil {
		return "", fmt.Errorf("failed to get device: %v", err)
	}

	// 新增：检测设备是否可达
	if !isDeviceReachable(device.IP, "80", 1*time.Second) {
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
		return "", fmt.Errorf("failed to send AT command to device: %v", err)
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

	// 新增：检测设备是否可达
	if !isDeviceReachable(device.IP, "80", 1*time.Second) {
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
		return "", fmt.Errorf("failed to send AT command to device: %v", err)
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
	// 注释掉自动登录，测试设备是否真的需要登录
	// 确保会话有效
	// if !s.cookieManager.IsSessionValid(device.IP) {
	// 	if err := s.cookieManager.TryAutoLogin(device.IP); err != nil {
	// 		fmt.Printf("Auto login failed for device %s: %v, continuing without login\n", device.IP, err)
	// 	}
	// }

	// 直接使用表单格式接口，不发送JSON消息
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

	// 检查CME错误
	if strings.Contains(responseText, "+CME ERROR:") {
		// 解析CME错误码
		if strings.Contains(responseText, "+CME ERROR: 100") {
			result := fmt.Sprintf("Command not supported by device: %s", command)
			fmt.Printf("Found CME ERROR 100, returning: %s\n", result)
			fmt.Printf("=== End parseATResponse Debug ===\n")
			return result
		}
		result := fmt.Sprintf("Device error: %s", responseText)
		fmt.Printf("Found CME ERROR, returning: %s\n", result)
		fmt.Printf("=== End parseATResponse Debug ===\n")
		return result
	}

	// 如果响应包含具体的AT命令数据（如 ^DRPR:），直接返回原始响应
	if strings.Contains(responseText, "^DRPR:") ||
		strings.Contains(responseText, "^DRPC:") ||
		strings.Contains(responseText, "^DRPS:") ||
		strings.Contains(responseText, "^DSSMTP:") ||
		strings.Contains(responseText, "^DCIAC:") ||
		strings.Contains(responseText, "^DACS:") ||
		strings.Contains(responseText, "^DDTC:") ||
		strings.Contains(responseText, "^DAOCNDI:") ||
		strings.Contains(responseText, "^DSTC:") ||
		strings.Contains(responseText, "^DFHC:") ||
		strings.Contains(responseText, "^DAPR:") {
		fmt.Printf("Found AT command data, returning raw response\n")
		fmt.Printf("=== End parseATResponse Debug ===\n")
		return responseText
	}

	if strings.Contains(responseText, "OK") || strings.Contains(responseText, "SUCCESS") {
		result := fmt.Sprintf("OK: %s executed successfully", command)
		fmt.Printf("Found OK/SUCCESS, returning: %s\n", result)
		fmt.Printf("=== End parseATResponse Debug ===\n")
		return result
	} else if strings.Contains(responseText, "ERROR") || strings.Contains(responseText, "FAIL") {
		result := fmt.Sprintf("device command failed: %s", responseText[:min(len(responseText), 200)])
		fmt.Printf("Found ERROR/FAIL, returning: %s\n", result)
		fmt.Printf("=== End parseATResponse Debug ===\n")
		return result
	}

	result := fmt.Sprintf("Response: %s", responseText[:min(len(responseText), 500)])
	fmt.Printf("Default case, returning: %s\n", result)
	fmt.Printf("=== End parseATResponse Debug ===\n")
	return result
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

	// 遍历所有get命令，获取配置
	for commandName := range boardConfig.Commands {
		if strings.HasPrefix(commandName, "get_") {

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
	case "wireless":
		// 无线相关命令 - 包含核心无线配置
		for cmdName := range commands {
			if (strings.Contains(cmdName, "band") && !strings.Contains(cmdName, "param")) ||
				strings.Contains(cmdName, "radio") ||
				strings.Contains(cmdName, "frequency_hopping") {
				result = append(result, cmdName)
				fmt.Printf("  -> wireless: %s\n", cmdName)
			}
		}
	case "security":
		// 安全相关命令 - 只包含可以通过AT指令获取的配置，排除Key相关命令
		for cmdName := range commands {
			if (strings.Contains(cmdName, "encryption_algorithm") || strings.Contains(cmdName, "slave_max_tx_power")) &&
				!strings.Contains(cmdName, "key") && !strings.Contains(cmdName, "set_config") {
				result = append(result, cmdName)
				fmt.Printf("  -> security: %s\n", cmdName)
			}
		}
	case "system":
		// 系统配置无法通过AT指令获取，返回空列表
		// 系统配置包括：hostname, timezone, language, backup settings, maintenance settings, security policies
		// 这些配置无法通过AT指令获取，因此不提供同步功能
		fmt.Printf("  -> system: No AT commands available for system configuration\n")
	case "device_type":
		// 设备类型相关命令
		for cmdName := range commands {
			if strings.Contains(cmdName, "device_type") {
				result = append(result, cmdName)
				fmt.Printf("  -> device_type: %s\n", cmdName)
			}
		}
	case "up_down":
		// 上下行相关命令
		for cmdName := range commands {
			if strings.Contains(cmdName, "tdd") {
				result = append(result, cmdName)
				fmt.Printf("  -> up_down: %s\n", cmdName)
			}
		}
	case "network":
		// 网络状态相关命令 - 只包含真正的网络状态命令
		for cmdName := range commands {
			if strings.Contains(cmdName, "net") && !strings.Contains(cmdName, "access") {
				result = append(result, cmdName)
				fmt.Printf("  -> network: %s\n", cmdName)
			}
		}
	case "network_settings":
		// 网络设置相关命令
		for cmdName := range commands {
			if strings.Contains(cmdName, "network_config") {
				result = append(result, cmdName)
				fmt.Printf("  -> network_settings: %s\n", cmdName)
			}
		}
	case "network_status":
		// 网络状态相关命令
		for cmdName := range commands {
			if strings.Contains(cmdName, "access_nodes") || strings.Contains(cmdName, "access_state") {
				result = append(result, cmdName)
				fmt.Printf("  -> network_status: %s\n", cmdName)
			}
		}
	case "debug":
		// 调试相关命令
		for cmdName := range commands {
			if strings.Contains(cmdName, "report") ||
				(strings.Contains(cmdName, "param") && strings.Contains(cmdName, "radio")) {
				result = append(result, cmdName)
				fmt.Printf("  -> debug: %s\n", cmdName)
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

				values := strings.Split(value, ",")
				if len(values) >= 3 {
					config["frequency"] = strings.TrimSpace(values[0])
					config["bandwidth"] = strings.TrimSpace(values[1])
					config["power"] = strings.Trim(strings.TrimSpace(values[2]), "\"")
					fmt.Printf("Parsed radio params - frequency: %s, bandwidth: %s, power: %s\n", values[0], values[1], values[2])
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

				values := strings.Split(value, ",")
				if len(values) >= 3 {
					// 同时保存原始字段名和前端期望的字段名
					config["stored_frequency"] = strings.TrimSpace(values[0])
					config["stored_bandwidth"] = strings.TrimSpace(values[1])
					config["stored_power"] = strings.Trim(strings.TrimSpace(values[2]), "\"")

					// 映射到前端期望的字段名（这些是存储的配置，应该优先显示）
					config["frequency"] = strings.TrimSpace(values[0])
					config["bandwidth"] = strings.TrimSpace(values[1])
					config["power"] = strings.Trim(strings.TrimSpace(values[2]), "\"")

					fmt.Printf("Parsed stored radio params - frequency: %s, bandwidth: %s, power: %s\n", values[0], values[1], values[2])
				}
			}
		} else {
			config["raw_response"] = response
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
				// Bit0: 800M频段, Bit1: 1.4G频段, Bit2: 2.4G频段
				var frequencyBands []string
				bandBitmap, err := strconv.ParseUint(value, 16, 32)
				if err == nil {
					fmt.Printf("Band bitmap hex: %s, decimal: %d, binary: %b\n", value, bandBitmap, bandBitmap)
					if bandBitmap&(1<<0) != 0 {
						frequencyBands = append(frequencyBands, "800M")
					}
					if bandBitmap&(1<<1) != 0 {
						frequencyBands = append(frequencyBands, "1.4G")
					}
					if bandBitmap&(1<<2) != 0 {
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
				config["encryption_algorithm"] = value
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

				// 将数值转换为对应的TDD配置字符串
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

				// 保存原始字段名
				config["tdd_config"] = value

				// 映射到前端期望的字段名（使用转换后的字符串）
				config["current_setting"] = tddSetting
				config["setting"] = tddSetting

				fmt.Printf("Parsed TDD config: %s -> %s\n", value, tddSetting)
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

	case "get_access_nodes":
		// 解析 AT^DIPAN 响应
		// 示例响应：^DIPAN: <m>[,<IP Type>,<IP address_1>[,IP address_2>,...[,<IP address_m>]]]
		if strings.Contains(response, "^DIPAN:") {
			parts := strings.Split(response, "^DIPAN:")
			if len(parts) > 1 {
				value := strings.TrimSpace(parts[1])
				values := strings.Split(value, ",")
				if len(values) >= 1 {
					nodeCount := strings.TrimSpace(values[0])
					config["access_node_count"] = nodeCount

					// 解析IP地址列表
					var ipAddresses []string
					for i := 2; i < len(values); i++ { // 从索引2开始，跳过节点数和IP类型
						ip := strings.Trim(strings.TrimSpace(values[i]), "\"")
						if ip != "" {
							ipAddresses = append(ipAddresses, ip)
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
