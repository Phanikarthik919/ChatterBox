# ChatterBox -- Real-Time Chat Application

A full-stack, real-time chat application built with **Java Spring Boot** and a **premium glassmorphism UI**.

## Features

- JWT Authentication (register, login)
- Real-time messaging via WebSocket (STOMP/SockJS)
- Direct messages & Group chats
- File & image sharing
- Emoji picker & reactions
- Typing indicators
- Online/offline presence
- Read receipts
- Desktop & sound notifications
- Premium dark glassmorphism UI

## Quick Start (Local Development)

```bash
# Requires Java 11+ and Maven
mvn spring-boot:run

# Open http://localhost:8080
```

## Docker Deployment

### Prerequisites
- Docker & Docker Compose installed

### 1. Clone & Configure

```bash
cd Chat-app

# Create your .env file
cp .env.example .env
# Edit .env with your production secrets
```

### 2. Build & Run

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Check status
docker-compose ps
```

### 3. Access

- **App**: http://localhost:8080
- **Database**: PostgreSQL on port 5432

### 4. Management

```bash
# Stop services
docker-compose down

# Stop and remove data (deletes all messages & users)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build app

# View app logs
docker-compose logs -f app

# Scale (if needed behind a load balancer)
docker-compose up -d --scale app=3
```

## Architecture

```
+---------------------+     +------------------+
|   Browser Client    |<--->|  Spring Boot     |
|  (HTML/CSS/JS)      |     |  (Port 8080)     |
|  SockJS + STOMP     |     |                  |
+---------------------+     |  +------------+  |
                             |  | REST APIs  |  |
                             |  +------------+  |
                             |  | WebSocket  |  |
                             |  +------------+  |
                             |  | JWT Auth   |  |
                             |  +------+-----+  |
                             +---------+--------+
                                       |
                             +---------v--------+
                             |   PostgreSQL     |
                             |   (Port 5432)    |
                             +------------------+
```

## Project Structure

```
Chat-app/
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # PostgreSQL + App
├── pom.xml                 # Maven dependencies
├── src/main/
│   ├── java/com/chatterbox/
│   │   ├── model/          # JPA entities
│   │   ├── repository/     # Data access
│   │   ├── dto/            # Request/Response objects
│   │   ├── security/       # JWT + Spring Security
│   │   ├── service/        # Business logic
│   │   ├── controller/     # REST endpoints
│   │   ├── websocket/      # Real-time messaging
│   │   └── exception/      # Error handling
│   └── resources/
│       ├── application.yml      # Dev config (H2)
│       ├── application-prod.yml # Prod config (PostgreSQL)
│       └── static/              # Frontend UI
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DB_PASSWORD` | PostgreSQL password | `chatterbox_secret_2024` |
| `JWT_SECRET` | JWT signing key (32+ chars) | Built-in dev key |
| `SPRING_PROFILES_ACTIVE` | Active profile | `default` (H2) |

## License

MIT
