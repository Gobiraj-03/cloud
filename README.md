# Cloud-Based IT Asset Lifecycle & Software License Management System

[![Project Stage](https://img.shields.io/badge/Project_Stage-Stage_A:_Local_Development-blue.svg)](#)
[![Budget Constraint](https://img.shields.io/badge/Budget-₹0_Strict-green.svg)](#)
[![Academic Project](https://img.shields.io/badge/Course-Cloud_Computing_Capstone-orange.svg)](#)
[![Node Version](https://img.shields.io/badge/Node.js-v22.15.1-brightgreen.svg)](#)
[![Backend Tests](https://img.shields.io/badge/Backend_Tests-11%20Passed-brightgreen.svg)](#)

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

# 3. Initialize SQLite database schema (7 tables and indexes)
npm run db:migrate

# 4. Seed realistic, idempotent demonstration data
npm run db:seed

# Alternatively: Execute migration and seeding in a single command
npm run db:setup

# 5. Execute automated test suite (11 unit and integration tests)
npm test

# 6. Start the Express backend server
npm run dev
# (or: npm start)
```

The backend server listens on `http://localhost:5000`.

### 3.3 Verify System Health via HTTP

In a separate PowerShell terminal:
```powershell
# Query the live health check endpoint
Invoke-RestMethod -Uri http://localhost:5000/api/health
```

Expected output:
```json
{
  "status": "UP",
  "healthy": true,
  "timestamp": "2026-10-13T16:44:58.408Z",
  "environment": "development",
  "uptimeSeconds": 16,
  "database": {
    "status": "CONNECTED",
    "engine": "SQLite 3",
    "tablesFound": 7
  }
}
```

---

## 4. Strict ₹0 Budget Mandate

The project adheres to strict financial rules:
1. **Local-First Development**: Full development and verification take place locally before any cloud deployment is considered.
2. **Zero Cloud Spending in Modules 0–6**: No AWS resources may be created during development.
3. **Stateless Container Awareness**: SQLite is strictly used for local development because container platforms like AWS App Runner utilize ephemeral filesystems that destroy local file storage on restart.
4. **Mandatory Cost & Eligibility Audits**: AWS deployment in Module 7 is gated behind an explicit account eligibility audit (confirming account is within the 12-month free tier window). If charges could occur, a verified perpetual free-tier alternative (e.g. Render + Supabase/Neon) or local viva mode will be used instead.
5. **Zero Paid Third-Party APIs**: No paid SMS gateways, paid email delivery services, or premium domains.

---

## 5. Technical Documentation Index

Detailed architectural and engineering documentation is maintained in the `docs/` folder:

| Document | Purpose |
| :--- | :--- |
| **[docs/ARCHITECTURE.md](file:///d:/cloud/docs/ARCHITECTURE.md)** | Full local & AWS architecture, layered pattern, and ephemeral container realities. |
| **[docs/DATA_MODEL.md](file:///d:/cloud/docs/DATA_MODEL.md)** | ERD, 7 normalized database tables, schema constraints, and business invariants. |
| **[docs/COST_AND_DEPLOYMENT.md](file:///d:/cloud/docs/COST_AND_DEPLOYMENT.md)** | In-depth AWS pricing analysis, free tier pitfalls, account checklist, and fallback plans. |
| **[docs/IMPLEMENTATION_PROGRESS.md](file:///d:/cloud/docs/IMPLEMENTATION_PROGRESS.md)** | Module tracking dashboard (Modules 0–8), acceptance criteria, and status logs. |

---

## 6. Implementation Status

| Module | Status | Deliverables |
| :---: | :---: | :--- |
| **Module 0** | **COMPLETED** | Planning, architecture, data modeling, cost guardrails, and repo setup. |
| **Module 1** | **COMPLETED** | Database schema, SQLite migrations, idempotent seed data, repository layer, health API, 11 tests passed. |
| **Module 2** | *Awaiting Authorization* | Administrator authentication, bcrypt password hashing, and JWT authorization. |
