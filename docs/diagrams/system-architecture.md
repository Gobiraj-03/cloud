# System Architecture Diagram — AssetFlow

## Overview

AssetFlow implements a clean, decoupled layered enterprise architecture. The React 19 single-page application (SPA) communicates via HTTPS/HTTP REST endpoints with an Express.js backend. The backend enforces defense-in-depth security with cookie authentication, origin validation, route controllers, domain services, and an abstracted repository layer querying SQLite (local development) with ACID transactions.

## Mermaid Architecture Diagram

```mermaid
graph TB
    subgraph ClientLayer ["Client Layer (Browser)"]
        UI["React 19 SPA (Vite)"]
        Router["React Router (Protected Routes)"]
        AuthContext["Auth Context (Session State)"]
        APIClient["API Client (credentials: include)"]
        UI --> Router
        Router --> AuthContext
        AuthContext --> APIClient
    end

    subgraph SecurityBoundary ["Security & Gateway Layer"]
        CORS["CORS & Origin Validation"]
        RateLimit["Brute-Force Rate Limiter"]
        CookieParser["Cookie Parser Middleware"]
        AuthGuard["Authentication Guard (authMiddleware)"]
    end

    subgraph ControllerLayer ["Express.js API Layer (Port 5000)"]
        AuthController["Auth Controller"]
        AssetController["Asset Controller"]
        EmpController["Employee Controller"]
        LicenseController["License Controller"]
        ExpiryController["Expiry Controller"]
        ReportController["Report Controller"]
        HealthController["Health Controller"]
    end

    subgraph ServiceLayer ["Domain Services & Business Logic"]
        AuthService["Auth Service (bcrypt)"]
        AssetService["Asset Service (State Machine)"]
        EmpService["Employee Service"]
        LicenseService["License Service (Seat Math)"]
        ExpiryService["Expiry Service (UTC Engine)"]
        ReportService["Report Service (CSV Sanitizer)"]
    end

    subgraph RepoLayer ["Repository Data Access Layer"]
        AdminRepo["Admin Repository"]
        AssetRepo["Asset Repository"]
        HistoryRepo["Assignment History Repository"]
        EmpRepo["Employee Repository"]
        LicenseRepo["License Repository"]
        AllocRepo["Allocation Repository"]
        AuditRepo["Audit Log Repository"]
        HealthRepo["Health Repository"]
    end

    subgraph DatabaseLayer ["Persistence Layer"]
        SQLite[("SQLite 3 Database (WAL Mode)")]
        DBConn["Database Connection Manager (PRAGMA foreign_keys=ON)"]
    end

    %% Client to Security
    APIClient -->|"HTTP Requests + HttpOnly Cookie"| CORS
    CORS --> RateLimit
    RateLimit --> CookieParser
    CookieParser --> AuthGuard

    %% Security to Controllers
    AuthGuard --> AuthController
    AuthGuard --> AssetController
    AuthGuard --> EmpController
    AuthGuard --> LicenseController
    AuthGuard --> ExpiryController
    AuthGuard --> ReportController
    CORS --> HealthController

    %% Controllers to Services
    AuthController --> AuthService
    AssetController --> AssetService
    EmpController --> EmpService
    LicenseController --> LicenseService
    ExpiryController --> ExpiryService
    ReportController --> ReportService

    %% Services to Repositories & Cross-Cutting
    AuthService --> AdminRepo
    AuthService --> AuditRepo
    AssetService --> AssetRepo
    AssetService --> HistoryRepo
    AssetService --> AuditRepo
    EmpService --> EmpRepo
    EmpService --> AuditRepo
    LicenseService --> LicenseRepo
    LicenseService --> AllocRepo
    LicenseService --> AuditRepo
    ExpiryService --> LicenseRepo
    ExpiryService --> AssetRepo
    ReportService --> SQLite
    HealthController --> HealthRepo

    %% Repositories to Database
    AdminRepo --> DBConn
    AssetRepo --> DBConn
    HistoryRepo --> DBConn
    EmpRepo --> DBConn
    LicenseRepo --> DBConn
    AllocRepo --> DBConn
    AuditRepo --> DBConn
    HealthRepo --> DBConn
    DBConn --> SQLite
```

## Architectural Characteristics

1. **Separation of Concerns:** Business rules (such as seat capacity invariants or custody status transitions) reside exclusively in domain services, keeping controllers thin and repositories focused on parameterized queries.
2. **Cookie-Only Session Security:** Session tokens are stored in `HttpOnly`, `SameSite=Lax` cookies, preventing cross-site scripting (XSS) token exfiltration.
3. **Database Portability:** Repositories use standard ANSI SQL with parameter binding (`?`), enabling zero-rewrite migration to Amazon RDS PostgreSQL in Stage B.
