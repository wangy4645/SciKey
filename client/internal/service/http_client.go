package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"adapter/internal/model"
)

// HTTPClient HTTP客户端
type HTTPClient struct {
	baseURL    string
	httpClient *http.Client
}

// NewHTTPClient 创建HTTP客户端
func NewHTTPClient(baseURL string) *HTTPClient {
	return &HTTPClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: time.Second * 10,
		},
	}
}

// AddDevice 添加设备
func (c *HTTPClient) AddDevice(device *model.Device) error {
	_, err := c.post("/api/devices", device)
	return err
}

// GetDevices 获取设备列表
func (c *HTTPClient) GetDevices() ([]model.Device, error) {
	resp, err := c.get("/api/devices")
	if err != nil {
		return nil, err
	}

	var devices []model.Device
	if err := json.Unmarshal(resp, &devices); err != nil {
		return nil, err
	}

	return devices, nil
}

// GetDevice 获取设备
func (c *HTTPClient) GetDevice(id uint) (*model.Device, error) {
	resp, err := c.get(fmt.Sprintf("/api/devices/%d", id))
	if err != nil {
		return nil, err
	}

	var device model.Device
	if err := json.Unmarshal(resp, &device); err != nil {
		return nil, err
	}

	return &device, nil
}

// UpdateDevice 更新设备
func (c *HTTPClient) UpdateDevice(device *model.Device) error {
	_, err := c.put(fmt.Sprintf("/api/devices/%d", device.ID), device)
	return err
}

// DeleteDevice 删除设备
func (c *HTTPClient) DeleteDevice(deviceID uint) error {
	_, err := c.delete(fmt.Sprintf("/api/devices/%d", deviceID))
	return err
}

// GetDeviceConfig 获取设备配置
func (c *HTTPClient) GetDeviceConfig(deviceID uint) (*model.DeviceConfig, error) {
	resp, err := c.get(fmt.Sprintf("/api/devices/%d/config", deviceID))
	if err != nil {
		return nil, err
	}

	var config model.DeviceConfig
	if err := json.Unmarshal(resp, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

// UpdateDeviceConfig 更新设备配置
func (c *HTTPClient) UpdateDeviceConfig(deviceID uint, config *model.DeviceConfig) error {
	_, err := c.put(fmt.Sprintf("/api/devices/%d/config", deviceID), config)
	return err
}

// GetDeviceLogs 获取设备日志
func (c *HTTPClient) GetDeviceLogs(deviceID uint, params map[string]string) ([]model.SystemLog, error) {
	query := ""
	for k, v := range params {
		if query != "" {
			query += "&"
		}
		query += fmt.Sprintf("%s=%s", k, v)
	}

	url := fmt.Sprintf("/api/devices/%d/logs", deviceID)
	if query != "" {
		url += "?" + query
	}

	resp, err := c.get(url)
	if err != nil {
		return nil, err
	}

	var logs []model.SystemLog
	if err := json.Unmarshal(resp, &logs); err != nil {
		return nil, err
	}

	return logs, nil
}

// ExecuteCommand 执行设备命令
func (c *HTTPClient) ExecuteCommand(deviceID uint, command string) (string, error) {
	data := map[string]string{
		"command": command,
	}

	resp, err := c.post(fmt.Sprintf("/api/devices/%d/execute", deviceID), data)
	if err != nil {
		return "", err
	}

	var result struct {
		Output string `json:"output"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return "", err
	}

	return result.Output, nil
}

// GetNetworkTopology 获取网络拓扑
func (c *HTTPClient) GetNetworkTopology() ([]model.NetworkTopologyNode, []model.NetworkTopologyLink, error) {
	resp, err := c.get("/api/topology")
	if err != nil {
		return nil, nil, err
	}

	var result struct {
		Nodes []model.NetworkTopologyNode `json:"nodes"`
		Links []model.NetworkTopologyLink `json:"links"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, nil, err
	}

	return result.Nodes, result.Links, nil
}

// UpdateNetworkTopology 更新网络拓扑
func (c *HTTPClient) UpdateNetworkTopology(nodes []model.NetworkTopologyNode, links []model.NetworkTopologyLink) error {
	data := struct {
		Nodes []model.NetworkTopologyNode `json:"nodes"`
		Links []model.NetworkTopologyLink `json:"links"`
	}{
		Nodes: nodes,
		Links: links,
	}

	_, err := c.put("/api/topology", data)
	return err
}

// get 发送GET请求
func (c *HTTPClient) get(path string) ([]byte, error) {
	req, err := http.NewRequest("GET", c.baseURL+path, nil)
	if err != nil {
		return nil, err
	}

	return c.do(req)
}

// post 发送POST请求
func (c *HTTPClient) post(path string, data interface{}) ([]byte, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", c.baseURL+path, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	return c.do(req)
}

// put 发送PUT请求
func (c *HTTPClient) put(path string, data interface{}) ([]byte, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("PUT", c.baseURL+path, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	return c.do(req)
}

// delete 发送DELETE请求
func (c *HTTPClient) delete(path string) ([]byte, error) {
	req, err := http.NewRequest("DELETE", c.baseURL+path, nil)
	if err != nil {
		return nil, err
	}

	return c.do(req)
}

// do 执行HTTP请求
func (c *HTTPClient) do(req *http.Request) ([]byte, error) {
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP error %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
} 