package gui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"

	"client/internal/service"
)

// NetworkTopology 网络拓扑视图
type NetworkTopology struct {
	window     fyne.Window
	httpClient *service.HTTPClient
	container  *fyne.Container
	nodes      map[string]*TopologyNode
	links      []*TopologyLink
}

// TopologyNode 拓扑节点
type TopologyNode struct {
	device     *service.Device
	circle     *canvas.Circle
	label      *canvas.Text
	container  *fyne.Container
	position   fyne.Position
	isDragging bool
}

// TopologyLink 拓扑连接
type TopologyLink struct {
	source     *TopologyNode
	target     *TopologyNode
	line       *canvas.Line
	strength   float64
}

// NewNetworkTopology 创建网络拓扑视图
func NewNetworkTopology(window fyne.Window, httpClient *service.HTTPClient) *NetworkTopology {
	nt := &NetworkTopology{
		window:     window,
		httpClient: httpClient,
		nodes:      make(map[string]*TopologyNode),
		links:      make([]*TopologyLink, 0),
	}

	// 创建容器
	nt.container = container.NewWithoutLayout()
	
	// 添加刷新按钮
	refreshBtn := widget.NewButtonWithIcon("Refresh", theme.ViewRefreshIcon(), nt.refresh)
	nt.container.Add(refreshBtn)
	refreshBtn.Move(fyne.NewPos(10, 10))

	// 设置容器大小
	nt.container.Resize(fyne.NewSize(800, 600))

	// 刷新拓扑图
	nt.refresh()

	return nt
}

// Container 获取容器
func (nt *NetworkTopology) Container() *fyne.Container {
	return nt.container
}

// refresh 刷新拓扑图
func (nt *NetworkTopology) refresh() {
	// 清除现有节点和连接
	nt.clear()

	// 获取设备列表
	devices, err := nt.httpClient.GetDevices()
	if err != nil {
		return
	}

	// 创建节点
	for _, device := range devices {
		nt.createNode(device)
	}

	// 获取网络拓扑
	topology, err := nt.httpClient.GetNetworkTopology()
	if err != nil {
		return
	}

	// 创建连接
	for _, link := range topology.Links {
		nt.createLink(link)
	}

	// 布局节点
	nt.layoutNodes()
}

// clear 清除拓扑图
func (nt *NetworkTopology) clear() {
	// 清除节点
	for _, node := range nt.nodes {
		nt.container.Remove(node.container)
	}
	nt.nodes = make(map[string]*TopologyNode)

	// 清除连接
	for _, link := range nt.links {
		nt.container.Remove(link.line)
	}
	nt.links = make([]*TopologyLink, 0)
}

// createNode 创建节点
func (nt *NetworkTopology) createNode(device *service.Device) {
	// 创建节点容器
	nodeContainer := container.NewWithoutLayout()

	// 创建圆形
	circle := canvas.NewCircle(theme.PrimaryColor())
	circle.Resize(fyne.NewSize(40, 40))

	// 创建标签
	label := canvas.NewText(device.Name, theme.ForegroundColor())
	label.TextSize = 12
	label.Alignment = fyne.TextAlignCenter

	// 添加到容器
	nodeContainer.Add(circle)
	nodeContainer.Add(label)

	// 创建节点
	node := &TopologyNode{
		device:    device,
		circle:    circle,
		label:     label,
		container: nodeContainer,
	}

	// 添加拖拽支持
	if deskCanvas, ok := nt.window.Canvas().(desktop.Canvas); ok {
		circle.OnTapped = func() {
			nt.showDeviceInfo(node)
		}
		circle.OnDragged = func(e *fyne.DragEvent) {
			node.isDragging = true
			node.position = node.position.Add(fyne.NewPos(e.Dragged.DX, e.Dragged.DY))
			node.container.Move(node.position)
			nt.updateLinks()
		}
		circle.OnDragEnd = func() {
			node.isDragging = false
		}
	}

	// 保存节点
	nt.nodes[device.ID] = node
	nt.container.Add(nodeContainer)
}

// createLink 创建连接
func (nt *NetworkTopology) createLink(link *service.NetworkTopologyLink) {
	sourceNode, ok1 := nt.nodes[link.SourceID]
	targetNode, ok2 := nt.nodes[link.TargetID]
	if !ok1 || !ok2 {
		return
	}

	// 创建连接线
	line := canvas.NewLine(theme.ForegroundColor())
	line.StrokeWidth = 2

	// 创建连接
	topologyLink := &TopologyLink{
		source:   sourceNode,
		target:   targetNode,
		line:     line,
		strength: link.SignalStrength,
	}

	// 保存连接
	nt.links = append(nt.links, topologyLink)
	nt.container.Add(line)

	// 更新连接位置
	nt.updateLink(topologyLink)
}

// layoutNodes 布局节点
func (nt *NetworkTopology) layoutNodes() {
	// 简单的圆形布局
	center := fyne.NewPos(400, 300)
	radius := 200.0
	count := len(nt.nodes)
	index := 0

	for _, node := range nt.nodes {
		angle := float64(index) * 2 * 3.14159 / float64(count)
		x := center.X + float32(radius*float64(cos(angle)))
		y := center.Y + float32(radius*float64(sin(angle)))
		node.position = fyne.NewPos(x, y)
		node.container.Move(node.position)
		index++
	}

	// 更新连接
	nt.updateLinks()
}

// updateLinks 更新所有连接
func (nt *NetworkTopology) updateLinks() {
	for _, link := range nt.links {
		nt.updateLink(link)
	}
}

// updateLink 更新单个连接
func (nt *NetworkTopology) updateLink(link *TopologyLink) {
	// 计算连接线位置
	sourcePos := link.source.position
	targetPos := link.target.position

	// 设置连接线
	link.line.Position1 = sourcePos
	link.line.Position2 = targetPos

	// 根据信号强度设置颜色
	if link.strength > 0.8 {
		link.line.StrokeColor = theme.SuccessColor()
	} else if link.strength > 0.5 {
		link.line.StrokeColor = theme.WarningColor()
	} else {
		link.line.StrokeColor = theme.ErrorColor()
	}
}

// showDeviceInfo 显示设备信息
func (nt *NetworkTopology) showDeviceInfo(node *TopologyNode) {
	// 创建设备信息对话框
	content := container.NewVBox(
		widget.NewLabel("Device Information"),
		widget.NewLabel("Name: " + node.device.Name),
		widget.NewLabel("Type: " + node.device.Type),
		widget.NewLabel("IP: " + node.device.IP),
		widget.NewLabel("Status: " + node.device.Status),
	)

	dialog := widget.NewModalPopUp(content, nt.window.Canvas())
	dialog.Show()
}

// 辅助函数：计算余弦
func cos(x float64) float64 {
	return float64(int(x*1000000)) / 1000000
}

// 辅助函数：计算正弦
func sin(x float64) float64 {
	return float64(int(x*1000000)) / 1000000
} 