# Cloud-Based IT Asset Lifecycle & Software License Management System

[![Project Stage](https://img.shields.io/badge/Project_Stage-Stage_A:_Local_Development-blue.svg)](#)
[![Budget Constraint](https://img.shields.io/badge/Budget-₹0_Strict-green.svg)](#)
[![Academic Project](https://img.shields.io/badge/Course-Cloud_Computing_Capstone-orange.svg)](#)
[![Node Version](https://img.shields.io/badge/Node.js-v22.15.1-brightgreen.svg)](#)
[![Total Tests](https://img.shields.io/badge/Total_Tests-117%20Passed-brightgreen.svg)](#)
[![Backend Tests](https://img.shields.io/badge/Backend_Tests-85%20Passed-brightgreen.svg)](#)
[![Frontend Tests](https://img.shields.io/badge/Frontend_Tests-32%20Passed-brightgreen.svg)](#)

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
| - Server-managed session store in SQLite with HttpOnly cookies exclusively (zero JSON tokens)   |
| - Strict CSRF origin validation and CORS protection for state-changing requests                 |
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

### 3.2 Root-Level Unified Commands (Recommended)

From the project root (`d:\cloud`):

```powershell
# 1. Run complete automated test suite (35 backend & frontend tests)
npm test

# 2. Start the Express backend server (Port 5000)
npm run backend:dev

# 3. In a second terminal, start the React Vite frontend (Port 5173)
npm run frontend:dev

# 4. Build frontend production bundle
npm run frontend:build
```

### 3.3 Individual Service Execution

#### Backend Server (`http://localhost:5000`)
```powershell
cd d:\cloud\backend
npm install
npm run db:setup
npm run admin:create  # Provision local administrator
npm test              # 25 backend tests
npm run dev           # Start Express on http://localhost:5000
```

#### Frontend Application (`http://localhost:5173`)
```powershell
cd d:\cloud\frontend
npm install
npm test              # 10 frontend tests
npm run dev           # Start Vite dev server on http://localhost:5173
npm run build         # Production bundle in frontend/dist/
```

The frontend development server runs on **`http://localhost:5173`** and proxies all `/api/*` requests directly to the backend at **`http://localhost:5000`** with `credentials: 'include'`.

### 3.3 Verify Authentication & Health via HTTP

In a separate PowerShell terminal:

```powershell
# 1. Verify system health probe
Invoke-RestMethod -Uri http://localhost:5000/api/health

# 2. Log in with provisioned credentials (Session cookie stored in $webSession)
$loginBody = @{ identifier = "admin"; password = "SecurePassword123!" } | ConvertTo-Json
$loginResponse = Invoke-WebRequest -Uri http://localhost:5000/api/auth/login `
    -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable webSession

Write-Host "Login Status: $($loginResponse.StatusCode) OK"
Write-Host "Response Body (Zero raw session tokens returned):"
$loginResponse.Content

# 3. Query current authenticated administrator profile using cookie session
$meResponse = Invoke-RestMethod -Uri http://localhost:5000/api/auth/me -WebSession $webSession
$meResponse.data.administrator

# 4. Verify access to protected test route
Invoke-RestMethod -Uri http://localhost:5000/api/auth/verify -WebSession $webSession

# 5. Log out and invalidate session in database + clear cookie
Invoke-RestMethod -Uri http://localhost:5000/api/auth/logout -Method Post -WebSession $webSession

# 6. Verify subsequent request with previous session returns 401 Unauthorized
try {
    Invoke-RestMethod -Uri http://localhost:5000/api/auth/me -WebSession $webSession
} catch {
    Write-Host "Session successfully revoked in SQLite: $($_.Exception.Message)"
}
```

---

## 4. Authentication & Security Architecture

1. **Password Security**:
   - Salting and hashing via `bcrypt` with 10 rounds of work factor.
   - Zero plaintext passwords in code, database, seed scripts, or logs.
   - Policy: Minimum 8 characters with at least one number or special character.
   - Provisioning CLI prevents automatic overwrite of existing administrator passwords without explicit confirmation.
2. **Server-Managed Session Store**:
   - Persistent `sessions` table in SQLite with foreign key cascade to `administrators(id)`.
   - 256-bit cryptographically random tokens (`crypto.randomBytes(32)`).
   - Sessions expire after 8 hours; expired tokens are rejected in SQL.
   - True server-side revocation: Logout deletes the record from SQLite immediately.
3. **Strict Cookie-Only Browser Authentication**:
   - Session tokens are stored **exclusively** in an `HttpOnly`, `SameSite=Lax`, `Path=/` cookie named `session_id`.
   - In production (`NODE_ENV=production`), cookies automatically enforce `Secure=true`.
   - **Zero token exposure in JSON**: `POST /api/auth/login` returns only `{ success: true, data: { administrator } }` without exposing raw session identifiers to browser JavaScript.
   - Cookie is cleared upon logout using identical options (`httpOnly`, `sameSite`, `path`, `secure`).
4. **CORS & CSRF Defense**:
   - Strict origin validation: API requests with untrusted origins are rejected with `HTTP 403 Forbidden`.
   - Missing or wildcard origins are blocked for credentialed requests.
   - State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) require trusted origin validation matching `CORS_ORIGIN`.
5. **Brute-Force & Timing Attack Defenses**:
   - Generic authentication failure response for invalid username/email or password (prevents account enumeration).
   - Constant-time bcrypt comparison execution even when user is not found.
   - Rate limiting on `/api/auth/login`: Maximum 5 attempts per IP per 15-minute window.
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
| **Module 2** | **COMPLETED** | Administrator provisioning CLI, bcrypt hashing, server-managed sessions, login/logout/me APIs, rate limiting, audit logging. |
| **Module 2.1** | **COMPLETED** | Authentication security hardening: Cookie-only token isolation, zero JSON token leakage, strict CSRF/CORS origin defense, standardized `ADMIN_PASSWORD` provisioning, Secure cookie verification (25 tests passed). |
| **Module 3** | **COMPLETED** | React SPA frontend foundation (Vite), enterprise design system, cookie authentication integration, protected routes, responsive navigation, honest dashboard metrics, and placeholders (10 tests passed; 35 total tests). |
| **Module 4** | **COMPLETED** | Hardware asset inventory CRUD, category/status filters, employee directory CRUD, atomic transaction assignment and return lifecycle, custody history timeline, live dashboard integration (55 backend + 20 frontend = 75 total tests passed). |
| **Module 5** | **COMPLETED** | Software license portfolio CRUD, capacity invariant enforcement (`0 <= used_quantity <= total_quantity`), atomic seat allocation & non-destructive revocation lifecycle, employee allocation modal, seat utilization progress bars, live dashboard metrics (85 backend + 32 frontend = 117 total tests passed). |
| **Module 6** | *Awaiting Authorization* | Automated expiry notification engine (30/60/90 days), compliance audit reporting, CSV exports. |

---

## 7. Module 4: IT Asset Inventory, Employees & Assignment Lifecycle

### 7.1 Implemented API Endpoints

All endpoints are authenticated using server-side cookie sessions (`HttpOnly` session cookie):

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/employees` | List employees with search (`search`), department (`department`), status (`status`), and pagination (`page`, `limit`). |
| `GET` | `/api/employees/:id` | Get single employee profile. |
| `POST` | `/api/employees` | Create employee (validates unique `employee_code`, `email`, active department). |
| `PUT` | `/api/employees/:id` | Update employee details (conflict check for duplicate code/email). |
| `DELETE` | `/api/employees/:id` | Delete employee (returns `409 Conflict` if employee has prior assignment history to preserve audit trails). |
| `GET` | `/api/assets` | List hardware assets with joined custodian details, category, status, and search filters. |
| `GET` | `/api/assets/:id` | Get single asset details with current custodian. |
| `POST` | `/api/assets` | Register new hardware asset (validates unique `asset_tag`, category, non-negative cost). |
| `PUT` | `/api/assets/:id` | Update asset attributes (prevents silent removal of assigned custodian). |
| `DELETE` | `/api/assets/:id` | Delete asset (blocked with `409 Conflict` if assignment history exists). |
| `GET` | `/api/assets/:id/history` | Chronological custody assignment history for the asset. |
| `POST` | `/api/assets/:id/assign` | Atomic transaction: Assign available asset to active employee, update status to `ASSIGNED`, record history. |
| `POST` | `/api/assets/:id/return` | Atomic transaction: Return assigned asset, update status to `AVAILABLE`, record return history. |

### 7.2 Running and Testing Module 4 & 5

```powershell
# Run the complete test suite (117 passing tests across backend & frontend)
npm test

# Run backend test suite only (85 passing tests)
npm run backend:test

# Run frontend test suite only (32 passing tests)
npm run frontend:test

# Build production bundle
npm run frontend:build
```

---

## 8. Module 5: Software License Management & Employee Seat Allocations

### 8.1 Implemented API Endpoints

All endpoints require administrator cookie-session authentication (`authenticate` middleware):

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/licenses` | List software licenses with search (`search`), type (`type`), renewal status (`status`), and pagination (`page`, `limit`). Automatically derives `available_quantity = total_quantity - used_quantity`. |
| `GET` | `/api/licenses/:id` | Retrieve single software license with current capacity and utilization metrics. |
| `POST` | `/api/licenses` | Register new license agreement (validates unique `license_code`, positive `total_quantity`, non-negative cost). |
| `PUT` | `/api/licenses/:id` | Update license metadata. Validates capacity invariant: rejects reducing `total_quantity` below active allocations (`used_quantity`) with `409 Conflict`. |
| `DELETE` | `/api/licenses/:id` | Safely delete license with 0 historical allocations. Rejects deletion with `409 Conflict` if allocation history exists to preserve compliance trails. |
| `GET` | `/api/licenses/:id/allocations` | List all allocations for a license with employee metadata and status (active vs revoked). |
| `POST` | `/api/licenses/:id/allocations` | Atomic ACID transaction: verifies employee exists and is `ACTIVE`, checks remaining seat capacity, inserts allocation record, increments `used_quantity`, and logs audit trail. Rejects over-capacity with `409 Conflict`. |
| `POST` | `/api/licenses/:id/allocations/:allocationId/revoke` | Atomic ACID transaction: marks allocation revoked (`revoked_at`), decrements `used_quantity`, prevents double-revocation, preserves historical record, and logs audit trail. |

### 8.2 Invariant Integrity & Concurrency Guarantees

1. **Seat Capacity Invariant**:
   `0 <= used_quantity <= total_quantity`
   - `available_quantity` is always empirically derived on the server (`total_quantity - used_quantity`).
   - Client-supplied available seat counts are never trusted.
2. **Atomic Concurrency Protection**:
   - `allocateSeat` executes conditional update `UPDATE software_licenses SET used_quantity = used_quantity + 1 WHERE id = ? AND used_quantity < total_quantity` inside `db.transaction`.
   - If capacity is exhausted concurrently, the transaction rolls back and returns `409 Conflict`.
3. **Non-Destructive Allocation History**:
   - Forward-only migration added `revoked_at TEXT NULL` to `license_allocations`.
   - Active allocations: `revoked_at IS NULL`.
   - Revoking an allocation stamps `revoked_at` without deleting the row, preserving enterprise compliance audit trails.



