package gui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"

	"client/internal/service"
)

// LoginDialog 登录对话框
type LoginDialog struct {
	window     fyne.Window
	form       *widget.Form
	httpClient *service.HTTPClient
	onSuccess  func(token string)
}

// NewLoginDialog 创建登录对话框
func NewLoginDialog(parent fyne.Window, httpClient *service.HTTPClient, onSuccess func(token string)) *LoginDialog {
	d := &LoginDialog{
		window:     parent,
		httpClient: httpClient,
		onSuccess:  onSuccess,
	}

	// 创建表单
	d.form = &widget.Form{
		Items: []*widget.FormItem{
			{Text: "Username", Widget: widget.NewEntry()},
			{Text: "Password", Widget: widget.NewPasswordEntry()},
		},
		OnSubmit: d.login,
		OnCancel: func() {
			d.window.Close()
		},
		SubmitText: "Login",
		CancelText: "Cancel",
	}

	return d
}

// Show 显示对话框
func (d *LoginDialog) Show() {
	dialog.ShowCustom("Login", "Cancel", d.form, d.window)
}

// login 登录
func (d *LoginDialog) login() {
	// 获取表单值
	username := d.form.Items[0].Widget.(*widget.Entry).Text
	password := d.form.Items[1].Widget.(*widget.PasswordEntry).Text

	// 验证必填字段
	if username == "" || password == "" {
		dialog.ShowError(fmt.Errorf("Username and password are required"), d.window)
		return
	}

	// 调用API登录
	token, err := d.httpClient.Login(username, password)
	if err != nil {
		dialog.ShowError(err, d.window)
		return
	}

	// 调用成功回调
	if d.onSuccess != nil {
		d.onSuccess(token)
	}

	// 关闭对话框
	d.window.Close()
} 