# ChronoVerse: Debugging Beyond Time 🛡️🚀

**ChronoVerse** is a production-grade, cloud-native time-travel debugging platform for distributed systems. It captures application events like API calls, database operations, and system interactions using a high-throughput, event-driven architecture. 

By leveraging **Event Sourcing** and **CQRS**, ChronoVerse allows developers to deterministically reconstruct system state at any historical timestamp, explore "what-if" scenarios through timeline forking, and detect system anomalies using integrated AI strategies.

---

## 💎 Project Health & Quality
This project adheres to the highest standards of "Clean Code" and "Security-First" engineering.
- **SonarCloud Analysis**: **0 Issues** across all categories:
    - ✅ **Security**: 0 Blockers (All secrets externalized)
    - ✅ **Maintainability**: 0 Code Smells (Refactored logic)
    - ✅ **Reliability**: 0 Bugs (Robust error handling)
- **Architecture**: Decoupled Microservices orchestrated via Docker.
- **Performance**: Real-time visualization using high-speed WebSockets.

---

## 🛠️ Tech Stack Matrix

| Category | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React (Icons) |
| **Backends** | Node.js (Core API), Python FastAPI (Logic Engine) |
| **Messaging** | Apache Kafka (Event-Driven Backbone) |
| **Database** | PostgreSQL (Persistent Event Sourcing Store) |
| **Storage** | Redis (State Tracking & Anomaly Caching) |
| **Orchestration** | Docker, Docker Compose (DevOps) |
| **Real-time** | Socket.io (Bi-directional Visualization Stream) |
| **Security** | JWT (JSON Web Tokens), Externalized Env Configuration |
| **Analysis** | SonarCloud, Static Analysis Refactoring |

---

## 📐 Design Patterns Implemented
- **Event Sourcing**: Capturing all state changes as a sequence of immutable events.
- **Strategy Pattern**: Pluggable anomaly detection logic in the AI service.
- **Facade / API Gateway**: Unified interface for polyglot microservices.
- **Prototype Pattern**: State cloning for Timeline Forking simulations.
- **Microservices Architecture**: Decoupled, specialized services for high scalability.

---

## 🚀 Getting Started

### Prerequisites
- Docker Desktop
- PowerShell (for sample generation)

### 1. Launch the Environment
Run the following command from the root directory to build and start the entire lean architecture:
```powershell
docker compose up --build -d
```

### 2. Generate Demonstration Data
To populate the dashboard with realistic e-commerce traffic (Logins, Orders, Payments):
```powershell
powershell -ExecutionPolicy Bypass -File .\generate_samples.ps1
```

### 3. Access the Dashboard
- **Web UI**: [http://localhost:3000](http://localhost:3000)
- **Core API**: [http://localhost:4000/health](http://localhost:4000/health)
- **Engine Logic**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 📸 Interface Preview
*ChronoVerse offers a premium, glassmorphic dashboard for deep system inspection.*

![Dashboard Main](file:///C:/Users/Rheya%20Rajesh/.gemini/antigravity/brain/36cd8d51-02cf-492e-bbe0-162c5aa583f7/final_verification_state_1776630853503.png)
*(Fig: Live Event Stream and System Health Monitor)*

---

## 👨‍💻 Submission Notes
This project was developed as a comprehensive demonstration of **Software Patterns** and **Cloud Computing** principles. The architecture ensures that every component is isolated, scalable, and fully observable, solving the classic "Black Box" problem in distributed systems.
