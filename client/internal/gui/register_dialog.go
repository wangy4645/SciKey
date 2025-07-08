package gui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"

	"client/internal/service"
)

// RegisterDialog 注册对话框
type RegisterDialog struct {
	window     fyne.Window
	form       *widget.Form
	httpClient *service.HTTPClient
}

// NewRegisterDialog 创建注册对话框
func NewRegisterDialog(parent fyne.Window, httpClient *service.HTTPClient) *RegisterDialog {
	d := &RegisterDialog{
		window:     parent,
		httpClient: httpClient,
	}

	// 创建表单
	d.form = &widget.Form{
		Items: []*widget.FormItem{
			{Text: "Username", Widget: widget.NewEntry()},
			{Text: "Password", Widget: widget.NewPasswordEntry()},
			{Text: "Confirm Password", Widget: widget.NewPasswordEntry()},
		},
		OnSubmit: d.register,
		OnCancel: func() {
			d.window.Close()
		},
		SubmitText: "Register",
		CancelText: "Cancel",
	}

	return d
}

// Show 显示对话框
func (d *RegisterDialog) Show() {
	dialog.ShowCustom("Register", "Cancel", d.form, d.window)
}

// register 注册
func (d *RegisterDialog) register() {
	// 获取表单值
	username := d.form.Items[0].Widget.(*widget.Entry).Text
	password := d.form.Items[1].Widget.(*widget.PasswordEntry).Text
	confirmPassword := d.form.Items[2].Widget.(*widget.PasswordEntry).Text

	// 验证必填字段
	if username == "" || password == "" || confirmPassword == "" {
		dialog.ShowError(fmt.Errorf("All fields are required"), d.window)
		return
	}

	// 验证密码匹配
	if password != confirmPassword {
		dialog.ShowError(fmt.Errorf("Passwords do not match"), d.window)
		return
	}

	// 调用API注册
	if err := d.httpClient.Register(username, password); err != nil {
		dialog.ShowError(err, d.window)
		return
	}

	// 显示成功消息
	dialog.ShowInformation("Success", "Registration successful. Please login.", d.window)

	// 关闭对话框
	d.window.Close()
} 