package main

import (
	"log"
	"time"

	"backend/internal/db"
	"backend/internal/router"
	"backend/internal/service"
	"backend/internal/simulator" // Import the new simulator package
)

func main() {
	// 1. Explicitly initialize the database
	database, err := db.Init()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	log.Println("Database initialized successfully.")

	// 2. Setup services that depend on the database
	authSvc := service.NewAuthService(database)

	// 3. Generate a token for the internal simulator
	internalToken, err := authSvc.GenerateToken(0, "internal_simulator", time.Hour*24*365*10)
	if err != nil {
		log.Fatalf("Failed to generate internal token for simulator: %v", err)
	}

	// 4. Start the integrated simulator in a background goroutine
	go simulator.Start(database, "http://localhost:8080", internalToken)

	// 5. Start device status monitor service
	deviceStatusMonitor := service.NewDeviceStatusMonitor(database, 30*time.Second) // 每30秒检测一次
	deviceStatusMonitor.Start()
	log.Println("Device status monitor started")

	// 6. Setup and run the Gin router, passing the DB instance to it
	r := router.SetupRouter(database)
	log.Println("Starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
