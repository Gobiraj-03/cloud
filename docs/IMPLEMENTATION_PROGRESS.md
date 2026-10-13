# Implementation Progress & Module Roadmap

## 1. Project Tracking Dashboard

| Module | Module Name | Scope & Deliverable | Status | Authorization |
| :---: | :--- | :--- | :---: | :---: |
| **0** | **Workspace Inspection & Architecture Planning** | Environment audit, system architecture, data models, cost guardrails, and project documentation | **COMPLETED (Pending Review)** | **Authorized** |
| **1** | **Database Schema & Backend Foundation** | SQLite setup, DDL tables, seed data, repository abstraction layer, health check | Not Started | Blocked |
| **2** | **Administrator Authentication & Security** | JWT/session auth, bcrypt password hashing, login/logout, route guards, audit logging | Not Started | Blocked |
| **3** | **React Frontend Foundation & Dashboard** | Vite setup, responsive layout, navigation, dynamic statistics cards, real DB charts | Not Started | Blocked |
| **4** | **IT Asset Management & Employee Assignment** | Asset CRUD, category filters, assignment workflow, return/reassign, history preservation | Not Started | Blocked |
| **5** | **Software License Management** | License CRUD, seat allocation, utilized vs total calculation, expiry classification | Not Started | Blocked |
| **6** | **Expiry Alerts, Reporting & CSV Export** | 30-day expiry engine, warranty warnings, filtered reporting tables, CSV download, tests | Not Started | Blocked |
| **7** | **AWS Cost Verification & Deployment Preparation** | Account eligibility audit, cost verification, build packaging, deployment only on approval | Not Started | **STRICTLY BLOCKED** |
| **8** | **End-to-End Testing & Viva Presentation** | E2E test suite, architecture diagrams, viva demo script, documentation polish | Not Started | Blocked |

---

## 2. Detailed Module Acceptance Criteria

### Module 0: Workspace Inspection & Architecture Planning (Current)
- [x] Inspect workspace directory, existing files, Node/npm runtime, and Git status.
- [x] Establish high-level architecture diagram and design documentation.
- [x] Document ephemeral container limitations and why SQLite is local-only.
- [x] Detail complete data schema, relationships, indexes, and constraints in `docs/DATA_MODEL.md`.
- [x] Conduct deep-dive AWS cost analysis and record ₹0 budget risks in `docs/COST_AND_DEPLOYMENT.md`.
- [x] Enforce Git hygiene with a secure `.gitignore` preventing secrets, local DBs, and dependencies.
- [x] Present comprehensive Module 0 report and pause for user review.

---

### Module 1: Database Schema, SQLite Initialization & Backend Foundation
- [ ] Initialize Express.js application in `backend/` with clean layered architecture (`routes`, `controllers`, `services`, `repositories`).
- [ ] Implement database initialization script that creates all 7 tables with strict constraints (`schema.sql`).
- [ ] Implement database seeding script with realistic initial dataset (`seed.sql`).
- [ ] Implement repository abstraction layer to decouple SQL execution from domain logic.
- [ ] Create `/api/health` and `/api/status` endpoints returning JSON system status.
- [ ] Verify parameterized SQL execution and test database initialization via automated test script.

---

### Module 2: Administrator Authentication and Authorization
- [ ] Secure password hashing using `bcrypt` (minimum 10 salt rounds).
- [ ] Seed a default admin account safely via environment variables or initialization script.
- [ ] Implement `POST /api/auth/login` endpoint returning JSON Web Token (JWT) or secure session cookie.
- [ ] Implement `POST /api/auth/logout` endpoint.
- [ ] Implement `authMiddleware` to protect restricted endpoints (`verifyToken`, `requireAdmin`).
- [ ] Implement audit logging for login attempts (success and failure).
- [ ] Disallow open, unauthenticated public registration of admin accounts in production.
- [ ] Automated tests validating valid credentials, invalid passwords, and token expiration.

---

### Module 3: React Frontend Foundation, Navigation & Dashboard
- [ ] Scaffold React SPA using Vite in `frontend/` with clean component structure.
- [ ] Configure Vite proxy to route `/api/*` to the Express backend (`http://localhost:5000`).
- [ ] Implement responsive UI layout with sidebar navigation, header, status badges, and mobile drawer.
- [ ] Create dynamic Dashboard page consuming real backend endpoints:
  - Total assets count
  - Assets by status (Available, Assigned, Under Maintenance, Retired)
  - Total software licenses & utilized seats
  - Licenses expiring within 30 days
  - Recent activity feed from audit logs
- [ ] Render data visualization charts (using Recharts or native SVG charts) linked directly to database metrics.
- [ ] Zero hardcoded dummy statistics; zero frontend-only mock simulations.

---

### Module 4: IT Asset CRUD, Employee Management & Assignment History
- [ ] Implement Employee management: Add, view, edit, search, and soft-delete employees.
- [ ] Implement Hardware Asset CRUD:
  - Unique asset tags and serial number validation
  - Categorization (Laptop, Desktop, Monitor, Printer, Networking, Other)
  - Procurement details (cost in INR, purchase date, warranty date)
- [ ] Implement Asset Assignment Workflow:
  - Assign `AVAILABLE` asset to an active employee -> updates asset status to `ASSIGNED`.
  - Return asset -> updates asset status to `AVAILABLE` and clears `current_employee_id`.
  - Send to maintenance -> updates status to `UNDER_MAINTENANCE`.
  - Retire asset -> updates status to `RETIRED`.
- [ ] Enforce business rules:
  - Cannot assign an asset already assigned, in maintenance, or retired.
  - Cannot delete an employee who currently holds assigned assets.
- [ ] Maintain immutable `asset_assignment_history` records on every action without ever erasing historical records.
- [ ] Frontend interface with search, status filters, confirmation modals, and error alerts.

---

### Module 5: Software License Management & Seat Allocation
- [ ] Implement Software License CRUD:
  - License reference code, software title, vendor, license type.
  - Total quantity (must be >= 1) and cost.
  - Purchase date and optional expiry date (handle perpetual licenses where expiry is NULL).
- [ ] Implement seat allocation workflow:
  - Allocate seat to an employee or asset -> increment `used_quantity`.
  - Revoke seat allocation -> decrement `used_quantity`.
- [ ] Enforce business invariants:
  - `used_quantity` cannot exceed `total_quantity`.
  - Available seats calculation: `available = total - used`.
  - Utilization percentage: `(used / total) * 100`.
- [ ] Automatic status classification: `ACTIVE`, `EXPIRING_SOON` (within 30 days), and `EXPIRED`.
- [ ] Unit and integration tests for allocation boundaries and over-allocation prevention.

---

### Module 6: Expiry Alerts, Reporting & CSV Export
- [ ] Implement license expiry detection engine:
  - Identify licenses expiring in $\le 30$ days.
  - Separate already-expired licenses from upcoming expirations.
  - Flag upcoming hardware warranty expirations.
- [ ] In-App Notification Center:
  - Display alert badges and actionable tables for expiring items.
  - Include manual "Run Expiry Check" button for instant demonstration during project viva.
  - Zero paid third-party SMS or email APIs.
- [ ] Reporting Module:
  - Comprehensive Asset Inventory Report (filterable by category, status, department).
  - Employee Asset Custody Report.
  - Software License Utilization & Compliance Report.
  - Expiring Warranties & Licenses Report.
- [ ] Client-side / Server-side CSV Export:
  - Export filtered reporting tables to standard CSV format.
- [ ] Comprehensive integration test suite covering end-to-end business workflows.

---

### Module 7: AWS Cost Verification & Deployment Preparation
- [ ] **PREREQUISITE GATE**: User must complete the Account Eligibility Checklist in `docs/COST_AND_DEPLOYMENT.md`.
- [ ] Audit student AWS account age, billing alarms, and credit status.
- [ ] If account is eligible and user provides explicit written authorization:
  - Package backend into production container / standalone build.
  - Configure production environment variables (`.env.production`).
  - Deploy backend to AWS App Runner (with automatic pause/stop mechanism) or evaluated ₹0 serverless alternative.
  - Deploy frontend to AWS S3 + CloudFront or verified perpetual free host.
  - Connect to Amazon RDS PostgreSQL (if free) or fallback database.
- [ ] If account is NOT eligible or budget risk exists:
  - Deploy using verified perpetual ₹0 platforms (Render + Neon/Supabase + Vercel) or configure self-contained local production mode.
  - Document all architectural trade-offs for viva examiners.

---

### Module 8: End-to-End Testing, Documentation & Viva Preparation
- [ ] Run full end-to-end integration and API verification suite.
- [ ] Generate comprehensive Architecture & Cloud Data Flow Diagrams.
- [ ] Finalize `README.md` with complete installation, configuration, and API reference documentation.
- [ ] Create Viva Defense Cheat Sheet:
  - Cloud concepts explained: IaaS vs PaaS vs CaaS, ephemeral storage, horizontal scaling, relational vs NoSQL, cost engineering.
  - Live Demonstration Script: Step-by-step 5-minute presentation guide showcasing asset lifecycle, license tracking, expiry alerts, and CSV export.
  - Common examiner questions and articulate answers.

---

## 3. Module 0 Execution Summary

- **Files Created**:
  - `.gitignore` (Root repository exclusion rules)
  - `README.md` (Project overview and quickstart)
  - `docs/ARCHITECTURE.md` (Stage A and Stage B architecture, ephemeral storage analysis)
  - `docs/DATA_MODEL.md` (7 normalized tables, constraints, foreign keys, business rules)
  - `docs/COST_AND_DEPLOYMENT.md` (AWS App Runner/RDS/S3 pricing analysis, free tier pitfalls, ₹0 contingencies)
  - `docs/IMPLEMENTATION_PROGRESS.md` (This file - Module-by-module tracking and acceptance criteria)
- **Checks Performed**:
  - Workspace directory audit: Verified `d:\cloud` was initialized empty.
  - Runtime verification: Node.js `v22.15.1`, npm `10.9.2`, git `2.45.2.windows.1`.
  - Repository initialization: Initialized local Git repository and enforced safe `.gitignore`.
- **Decisions Requiring Approval**:
  - Confirmation of local stack: React (Vite) + Express.js + SQLite.
  - Confirmation of Stage B cloud plan: Provisional App Runner + RDS with deployment blocked until Module 7.
- **Proposed Next Action**:
  - Await user approval to proceed with **Module 1** (Database schema, SQLite initialization, repository layer, backend foundation, and sample seed data).
