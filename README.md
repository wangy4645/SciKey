# MESH Platform (自组网平台)

A comprehensive device management platform for MESH network devices.

## Features

- Device Management
- Network Topology Visualization
- Device Configuration
- Real-time Monitoring
- Security Management
- Multi-language Support (English/Chinese)

## Technology Stack

### Frontend
- React 18
- TypeScript
- Ant Design
- Redux Toolkit
- React Router
- i18next (Internationalization)

### Backend
- Go 1.24
- Gin Framework
- GORM (SQLite)
- JWT Authentication

## Getting Started

### Prerequisites
- Node.js 16+
- Go 1.24+
- SQLite

### Installation

1. Clone the repository
2. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   go mod tidy
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   go run main.go
   ```

2. Start the frontend development server:
   ```bash
   cd client
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Build for Production

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```

2. The built files will be automatically copied to `backend/static/`

3. Run the backend server for production:
   ```bash
   cd backend
   go run main.go
   ```

## License

This project is proprietary software. 