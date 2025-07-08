package service

import (
	"backend/internal/db"
	"backend/internal/middleware"
	"backend/internal/model"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db *gorm.DB
}

func NewAuthService() *AuthService {
	return &AuthService{
		db: db.GetDB(),
	}
}

func (s *AuthService) Register(user *model.User) error {
	log.Printf("Attempting to register user: %s", user.Username)

	// Check if username already exists
	var existingUser model.User
	if err := s.db.Where("username = ?", user.Username).First(&existingUser).Error; err == nil {
		log.Printf("Username already exists: %s", user.Username)
		return errors.New("username already exists")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("Database error while checking username: %v", err)
		return err
	}

	log.Printf("Username is available, hashing password for: %s", user.Username)
	log.Printf("Original password: %s", user.Password)

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Failed to hash password: %v", err)
		return err
	}
	user.Password = string(hashedPassword)
	log.Printf("Hashed password: %s", user.Password)

	log.Printf("Creating user in database: %s", user.Username)
	// Create user
	if err := s.db.Create(user).Error; err != nil {
		log.Printf("Failed to create user: %v", err)
		return err
	}

	log.Printf("User created successfully, refreshing user data: %s", user.Username)
	// Refresh user data to get the ID
	if err := s.db.First(user, user.ID).Error; err != nil {
		log.Printf("Failed to refresh user data: %v", err)
		return err
	}

	log.Printf("User registration completed successfully: ID=%d, Username=%s", user.ID, user.Username)
	return nil
}

func (s *AuthService) Login(username, password string) (string, *model.User, error) {
	log.Printf("Attempting login for user: %s", username)

	var user model.User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("User not found: %s", username)
			return "", nil, errors.New("user not found")
		}
		log.Printf("Database error while finding user: %v", err)
		return "", nil, err
	}

	log.Printf("User found in database: ID=%d, Username=%s", user.ID, user.Username)
	log.Printf("Stored password hash: %s", user.Password)
	log.Printf("User found, verifying password for: %s", username)
	log.Printf("Input password length: %d", len(password))

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		log.Printf("Invalid password for user: %s, error: %v", username, err)
		log.Printf("Input password: %s", password)
		log.Printf("Password comparison failed: %v", err)
		return "", nil, errors.New("invalid password")
	}

	log.Printf("Password verified for user: %s", username)
	// Update last login time
	user.LastLoginAt = time.Now()
	if err := s.db.Save(&user).Error; err != nil {
		log.Printf("Failed to update last login time: %v", err)
		// Don't return error here, as login was successful
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	// Sign token with secret key
	tokenString, err := token.SignedString([]byte(middleware.JWTSecret))
	if err != nil {
		log.Printf("Failed to generate token: %v", err)
		return "", nil, fmt.Errorf("failed to sign token: %v", err)
	}

	log.Printf("Login successful for user: %s", username)
	return tokenString, &user, nil
}

func (s *AuthService) DeleteUser(username string) error {
	return s.db.Where("username = ?", username).Delete(&model.User{}).Error
}
