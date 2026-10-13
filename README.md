# Cloud-Based IT Asset Lifecycle & Software License Management System

[![Project Stage](https://img.shields.io/badge/Project_Stage-Stage_A:_Local_Development-blue.svg)](#)
[![Budget Constraint](https://img.shields.io/badge/Budget-₹0_Strict-green.svg)](#)
[![Academic Project](https://img.shields.io/badge/Course-Cloud_Computing_Capstone-orange.svg)](#)
[![Node Version](https://img.shields.io/badge/Node.js-v22.15.1-brightgreen.svg)](#)
[![Backend Tests](https://img.shields.io/badge/Backend_Tests-24%20Passed-brightgreen.svg)](#)

A secure, full-stack enterprise web application designed for small-to-medium organizations and IT administrators to manage the complete lifecycle of physical IT hardware assets and track software license seat allocations, compliance, and upcoming renewal expirations.

This application is being implemented systematically as a final-year Computer Science Capstone project in **Cloud Computing**.

---

## 1. Problem Statement

Small and medium-sized organizations frequently track critical hardware assets (laptops, monitors, networking gear) and software licenses through disorganized spreadsheets. This leads to:
- **Missing Asset Ownership**: Difficulty identifying which employee holds which asset.
- **Lost Historical Custody**: No verifiable audit trail of who previously used an asset before it was returned or damaged.
- **License Over-Allocation / Under-Utilization**: Paying for unused software seats or violating vendor licensing terms through unmonitored installations.
- **Surprise Expirations**: Missing warranty expiration dates or software subscription renewal deadlines.

This system provides a centralized, auditable, and responsive web platform that solves these problems with automated expiry monitoring, lifecycle state machines, and real-time reporting.

---

## 2. Two-Stage Architectural Blueprint

```
+--------------------------------------------------------------------------------------------------+
| STAGE A: LOCAL DEVELOPMENT (VERIFIED ZERO-COST BASELINE)                                         |
| React (Vite) [Port 5173] ---> Express REST API [Port 5000] ---> Local SQLite (data/asset_mgmt.db) |
| - Zero external cloud cost (₹0.00)                                                              |
| - Layered architecture (Routes -> Controllers -> Services -> Repositories)                      |
| - Parameterized SQL queries for injection security                                              |
| - Server-managed session store in SQLite with HttpOnly cookies & Bearer fallback                |
| - Database abstraction ready for seamless PostgreSQL migration                                   |
+--------------------------------------------------------------------------------------------------+

+--------------------------------------------------------------------------------------------------+
| STAGE B: INTENDED AWS CLOUD ARCHITECTURE (PROVISIONAL - BLOCKED UNTIL MODULE 7)                  |
| React SPA (Amplify / S3+CloudFront) ---> AWS App Runner (Express API) ---> Amazon RDS (PostgreSQL)  |
| - S3 for optional invoices and warranty PDFs                                                    |
| - CloudWatch for logs and a strict $0.01 billing alert                                           |
| - BLOCKED: Will only be deployed if account free-tier eligibility is empirically confirmed      |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Quickstart Guide (Windows PowerShell)

### 3.1 Prerequisites
- **Node.js** v22.15.1+ and **npm** 10.9.2+ installed.
- **Windows PowerShell** terminal.

### 3.2 Backend Setup & Execution Commands

Open Windows PowerShell in the project root (`d:\cloud`):

```powershell
# 1. Navigate to the backend directory
cd d:\cloud\backend

# 2. Install dependencies (if not already installed)
npm install

# 3. Initialize SQLite database schema (8 tables and indexes)
npm run db:migrate

# 4. Seed realistic demonstration data (Preserves existing administrators)
npm run db:seed
# Or run migration and seed together:
npm run db:setup

# 5. Provision your local administrator account securely:
# Option A: Interactive prompt (masks password input)
npm run admin:create

# Option B: Non-interactive via environment variables (clean for automation)
$env:ADMIN_USERNAME="admin"; $env:ADMIN_EMAIL="admin@enterprise.local"; $env:ADMIN_PASSWORD="SecurePassword123!"; npm run admin:create

# 6. Execute automated test suite (24 unit, security, and integration tests)
npm test

# 7. Start the Express backend server
npm run dev
# (or: npm start)
```

The backend server listens on `http://localhost:5000`.

### 3.3 Verify Authentication & Health via HTTP

In a separate PowerShell terminal:

```powershell
# 1. Verify system health probe
Invoke-RestMethod -Uri http://localhost:5000/api/health

# 2. Log in with provisioned credentials
$loginBody = @{ identifier = "admin"; password = "SecurePassword123!" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.token
Write-Host "Obtained Session Token: $token"

# 3. Query current authenticated administrator profile
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri http://localhost:5000/api/auth/me -Headers $headers

# 4. Verify access to protected test route
Invoke-RestMethod -Uri http://localhost:5000/api/auth/verify -Headers $headers

# 5. Log out and invalidate session
Invoke-RestMethod -Uri http://localhost:5000/api/auth/logout -Method Post -Headers $headers

# 6. Verify previous token is immediately rejected (Returns 401 Unauthorized)
try {
    Invoke-RestMethod -Uri http://localhost:5000/api/auth/me -Headers $headers
} catch {
    Write-Host "Token successfully revoked: $($_.Exception.Message)"
}
```

---

## 4. Authentication & Security Architecture

1. **Password Security**:
   - Salting and hashing via `bcrypt` with 10 rounds of work factor.
   - Zero plaintext passwords in code, database, seed scripts, or logs.
   - Policy: Minimum 8 characters with at least one number or special character.
2. **Server-Managed Session Store**:
   - Persistent `sessions` table in SQLite with foreign key cascade to `administrators(id)`.
   - 256-bit cryptographically random tokens (`crypto.randomBytes(32)`).
   - Sessions expire after 8 hours; expired tokens are rejected in SQL.
   - True server-side revocation: Logout deletes the record from SQLite immediately.
3. **Dual Client Support (Cookies & Bearer)**:
   - Primary: `HttpOnly`, `SameSite=Lax` (Strict in prod), `Path=/` cookie named `session_id`.
   - Secondary: `Authorization: Bearer <token>` header for cross-origin API clients and tests.
4. **Brute-Force & Timing Attack Defenses**:
   - Generic authentication failure response for invalid username/email or password (prevents account enumeration).
   - Constant-time bcrypt comparison execution even when user is not found.
   - Rate limiting on `/api/auth/login`: Maximum 5 attempts per IP per 15-minute window.
5. **CSRF Mitigation**:
   - Origin and Referer validation for state-changing requests authenticated via cookies.
6. **Immutable Audit Trail**:
   - All security lifecycle events (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `ADMIN_PROVISIONED`) are appended to `audit_logs`.

---

## 5. Technical Documentation Index

Detailed architectural and engineering documentation is maintained in the `docs/` folder:

| Document | Purpose |
| :--- | :--- |
| **[docs/ARCHITECTURE.md](file:///d:/cloud/docs/ARCHITECTURE.md)** | Full local & AWS architecture, layered pattern, and ephemeral container realities. |
| **[docs/DATA_MODEL.md](file:///d:/cloud/docs/DATA_MODEL.md)** | ERD, 8 normalized database tables (including `sessions`), constraints, and business invariants. |
| **[docs/COST_AND_DEPLOYMENT.md](file:///d:/cloud/docs/COST_AND_DEPLOYMENT.md)** | In-depth AWS pricing analysis, free tier pitfalls, account checklist, and fallback plans. |
| **[docs/IMPLEMENTATION_PROGRESS.md](file:///d:/cloud/docs/IMPLEMENTATION_PROGRESS.md)** | Module tracking dashboard (Modules 0–8), acceptance criteria, and status logs. |

---

## 6. Implementation Status

| Module | Status | Deliverables |
| :---: | :---: | :--- |
| **Module 0** | **COMPLETED** | Planning, architecture, data modeling, cost guardrails, and repo setup. |
| **Module 1** | **COMPLETED** | Database schema, SQLite migrations, idempotent seed data, repository layer, health API. |
| **Module 2** | **COMPLETED** | Administrator provisioning CLI, bcrypt hashing, server-managed sessions, login/logout/me APIs, rate limiting, audit logging (24 tests passed). |
| **Module 3** | *Awaiting Authorization* | React SPA frontend setup (Vite), sidebar navigation, dynamic dashboard, and real API integration. |
