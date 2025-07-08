package service

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// DeviceSession 设备会话信息
type DeviceSession struct {
	IP           string
	Cookies      []*http.Cookie
	LastLogin    time.Time
	SessionValid bool
}

// CookieManager Cookie管理器
type CookieManager struct {
	sessions map[string]*DeviceSession
	mutex    sync.RWMutex
}

// NewCookieManager 创建Cookie管理器
func NewCookieManager() *CookieManager {
	return &CookieManager{
		sessions: make(map[string]*DeviceSession),
	}
}

// GetSession 获取设备会话
func (m *CookieManager) GetSession(deviceIP string) *DeviceSession {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	return m.sessions[deviceIP]
}

// SetSession 设置设备会话
func (m *CookieManager) SetSession(deviceIP string, session *DeviceSession) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.sessions[deviceIP] = session
}

// InvalidateSession 使会话失效
func (m *CookieManager) InvalidateSession(deviceIP string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if session, exists := m.sessions[deviceIP]; exists {
		session.SessionValid = false
		session.Cookies = nil
	}
}

// LoginDevice 登录设备获取Cookie
func (m *CookieManager) LoginDevice(deviceIP, username, password string) error {
	// 构建登录URL
	loginURL := fmt.Sprintf("http://%s/login", deviceIP)

	// 创建HTTP客户端
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// 构建登录表单数据
	formData := url.Values{}
	formData.Set("username", username)
	formData.Set("password", password)
	formData.Set("submit", "Login")

	// 创建登录请求
	req, err := http.NewRequest("POST", loginURL, strings.NewReader(formData.Encode()))
	if err != nil {
		return fmt.Errorf("failed to create login request: %v", err)
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	// 发送登录请求
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send login request: %v", err)
	}
	defer resp.Body.Close()

	// 检查响应状态
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("login failed with status %d: %s", resp.StatusCode, string(body))
	}

	// 保存Cookie
	session := &DeviceSession{
		IP:           deviceIP,
		Cookies:      resp.Cookies(),
		LastLogin:    time.Now(),
		SessionValid: true,
	}

	m.SetSession(deviceIP, session)
	return nil
}

// GetDefaultHeaders 获取默认请求头
func (m *CookieManager) GetDefaultHeaders(deviceIP string) map[string]string {
	headers := map[string]string{
		"User-Agent":                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		"Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
		"Accept-Language":           "zh-CN,zh;q=0.9,en;q=0.8",
		"Accept-Encoding":           "gzip, deflate",
		"Connection":                "keep-alive",
		"Upgrade-Insecure-Requests": "1",
		"Sec-Fetch-Dest":            "document",
		"Sec-Fetch-Mode":            "navigate",
		"Sec-Fetch-Site":            "none",
		"Sec-Fetch-User":            "?1",
		"Cache-Control":             "max-age=0",
	}

	// 添加Referer和Origin
	headers["Referer"] = fmt.Sprintf("http://%s/", deviceIP)
	headers["Origin"] = fmt.Sprintf("http://%s", deviceIP)

	return headers
}

// GetCookieString 获取Cookie字符串
func (m *CookieManager) GetCookieString(deviceIP string) string {
	session := m.GetSession(deviceIP)
	if session == nil || !session.SessionValid {
		return ""
	}

	var cookieStrings []string
	for _, cookie := range session.Cookies {
		cookieStrings = append(cookieStrings, fmt.Sprintf("%s=%s", cookie.Name, cookie.Value))
	}

	return strings.Join(cookieStrings, "; ")
}

// IsSessionValid 检查会话是否有效
func (m *CookieManager) IsSessionValid(deviceIP string) bool {
	session := m.GetSession(deviceIP)
	if session == nil {
		return false
	}

	// 检查会话是否过期（30分钟）
	if time.Since(session.LastLogin) > 30*time.Minute {
		session.SessionValid = false
		return false
	}

	return session.SessionValid
}

// TryAutoLogin 尝试自动登录（使用默认凭据）
func (m *CookieManager) TryAutoLogin(deviceIP string) error {
	// 常见的默认凭据
	defaultCredentials := []struct {
		username string
		password string
	}{
		{"admin", "admin"},
		{"admin", "password"},
		{"root", "root"},
		{"root", "password"},
		{"admin", ""},
		{"root", ""},
	}

	for _, cred := range defaultCredentials {
		err := m.LoginDevice(deviceIP, cred.username, cred.password)
		if err == nil {
			return nil // 登录成功
		}
	}

	return fmt.Errorf("auto login failed for device %s", deviceIP)
}
