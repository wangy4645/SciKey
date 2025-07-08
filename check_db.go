package main

import (
	"fmt"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	db, err := gorm.Open(sqlite.Open("netmanager.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 检查device_configs表是否存在
	var count int64
	err = db.Raw("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='device_configs'").Scan(&count).Error
	if err != nil {
		log.Printf("Error checking table: %v", err)
		return
	}

	if count > 0 {
		fmt.Println("✅ device_configs table exists")

		// 检查表结构
		var columns []struct {
			Name string `gorm:"column:name"`
			Type string `gorm:"column:type"`
		}
		err = db.Raw("PRAGMA table_info(device_configs)").Scan(&columns).Error
		if err != nil {
			log.Printf("Error getting table info: %v", err)
		} else {
			fmt.Println("Table structure:")
			for _, col := range columns {
				fmt.Printf("  - %s (%s)\n", col.Name, col.Type)
			}
		}
	} else {
		fmt.Println("❌ device_configs table does not exist")
	}

	// 列出所有表
	var tables []string
	err = db.Raw("SELECT name FROM sqlite_master WHERE type='table'").Scan(&tables).Error
	if err != nil {
		log.Printf("Error listing tables: %v", err)
	} else {
		fmt.Println("\nAll tables:")
		for _, table := range tables {
			fmt.Printf("  - %s\n", table)
		}
	}
}
