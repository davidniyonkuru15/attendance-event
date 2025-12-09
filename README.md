# Attendance Event App

[![CI](https://github.com/YOUR_ORG/attendance-event/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/attendance-event/actions/workflows/ci.yml)

A simple attendance tracking application built with Express, React/HTML, and MySQL.

## Features

- Track attendance records by user and event
- REST API for attendance data
- Web UI for managing records
- Docker support for easy deployment

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MySQL 8.1+ (or use Docker)

### Installation

```bash
git clone https://github.com/YOUR_ORG/attendance-event.git
cd attendance-event
npm install
```

### Running Locally

```bash
# Copy env file
cp .env.example .env

# Start with Docker
docker-compose up --build

# Or run directly (requires MySQL)
npm start
```

Access at `http://localhost:4000`

## Testing

```bash
npm test
```


## Git Workflow

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
progress
- Branch strategy (main, develop, feature/*)
- Commit message standards (Conventional Commits)
- Pull request guidelines
- Code review process

## API Endpoints

### GET /api/attendance

Returns all attendance records.

**Response:**
```json
[
  {
    "id": 1,
    "userId": 18,
    "eventId": 9,
    "status": "present",
    "createdAt": "2025-12-08T17:23:06.285Z",
    "date": "2025-12-08T17:23:06.285Z"
  }
]
```

### POST /api/attendance

Create a new attendance record.

**Request:**
```json
{
  "userId": 18,
  "eventId": 9,
  "status": "present"
}
```

**Response:** `201 Created` with record object.

## Project Structure

```
.
├── app.js              # Express server
├── routes/
│   └── attendance.js   # API routes
├── models/             # Sequelize models
├── public/             # Frontend (HTML, CSS, JS)
├── tests/              # Test suite
└── docker-compose.yml  # Docker configuration
```

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "feat(scope): description"`
3. Push and open a PR: `git push origin feature/my-feature`
4. Wait for CI to pass and code review approval
5. Merge to `develop`

## License

MIT
