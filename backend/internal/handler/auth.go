package handler

import (
	"backend/internal/middleware"
	"backend/internal/model"
	"backend/internal/service"
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	// 读取原始请求体
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Failed to read request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}
	log.Printf("Raw request body: %s", string(body))

	// 重置请求体，以便后续处理
	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

	// 解析请求体
	var requestData struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.Unmarshal(body, &requestData); err != nil {
		log.Printf("Failed to parse request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	log.Printf("Parsed request data: username=%s, password=%s", requestData.Username, requestData.Password)

	// 创建用户对象
	user := model.User{
		Username: requestData.Username,
		Password: requestData.Password,
	}

	// Validate required fields
	if user.Username == "" || user.Password == "" {
		log.Printf("Missing required fields: username=%v, password=%v", user.Username, user.Password)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
		return
	}

	if err := h.authService.Register(&user); err != nil {
		if err.Error() == "username already exists" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username already exists"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Registration failed"})
		}
		return
	}

	// Generate token directly
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	// Sign token with secret key
	tokenString, err := token.SignedString([]byte(middleware.JWTSecret))
	if err != nil {
		log.Printf("Token generation error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Registration successful but failed to generate token"})
		return
	}

	log.Printf("Registration successful for user: %s", user.Username)
	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
		},
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var loginRequest struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&loginRequest); err != nil {
		log.Printf("Login request error: %v", err)
		log.Printf("Request body: %v", c.Request.Body)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Login attempt for user: %s", loginRequest.Username)
	token, user, err := h.authService.Login(loginRequest.Username, loginRequest.Password)
	if err != nil {
		log.Printf("Login failed for user %s: %v", loginRequest.Username, err)

		// 根据错误类型返回不同的错误信息
		if err.Error() == "user not found" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found. Please register first."})
		} else if err.Error() == "invalid password" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		}
		return
	}

	log.Printf("Login successful for user: %s", loginRequest.Username)
	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
		},
	})
}

func (h *AuthHandler) DeleteUser(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username is required"})
		return
	}

	if err := h.authService.DeleteUser(username); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// ValidateToken 验证token有效性
func (h *AuthHandler) ValidateToken(c *gin.Context) {
	// 如果请求能到达这里，说明token已经通过了AuthMiddleware的验证
	// 我们只需要返回用户信息即可
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
		return
	}

	userModel := user.(model.User)
	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"user": gin.H{
			"id":       userModel.ID,
			"username": userModel.Username,
		},
	})
}
