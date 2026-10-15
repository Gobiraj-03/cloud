# AssetFlow — College Demonstration & Viva Presentation Guide

**Project Title:** Cloud-Based IT Asset Lifecycle & Software License Management System  
**Presentation Duration:** 7 – 10 Minutes  
**Target Audience:** College Faculty, External Examiners, and Project Reviewers  
**Execution Environment:** Windows Laptop (Localhost, Stage A ₹0 Cost)  

---

## 1. Quick Reference: Demo Timetable & Cue Sheet

| Time | Phase | Target Screen / Component | Core Talking Point |
| :---: | :--- | :--- | :--- |
| **0:00 – 1:30** | Introduction & Problem | Title slide / Login page | Spreadsheet chaos, missing custody, license compliance fines |
| **1:30 – 2:30** | Architecture & Security | System diagram / Code | Layered architecture, SQLite WAL mode, HttpOnly cookies |
| **2:30 – 3:30** | Auth & Live Dashboard | `/login` → `/dashboard` | Zero token in JSON, live health query, empirical metric aggregation |
| **3:30 – 5:00** | Hardware Asset Lifecycle | `/assets` & `/employees` | State machine, atomic assignment, return, custody history |
| **5:00 – 6:30** | Software License Seats | `/licenses` | Seat capacity math (`used <= total`), concurrency, revocation |
| **6:30 – 8:00** | Expiry Alerts & Reports | `/reports` | UTC boundary arithmetic, 7 audit reports, CSV formula defense |
| **8:00 – 9:00** | Testing & Engineering | Terminal (`npm test`) | 151/151 automated tests passing, isolated test DBs, Vite build |
| **9:00 – 10:00** | Cloud Transition & Viva | Q&A / Diagrams | Ephemeral container storage, RDS PostgreSQL plan, ₹0 budget |

---

## 2. Pre-Presentation Setup Checklist

Execute these steps 5 minutes before your evaluation begins:

1. **Verify Services are Running:**
   - Backend on `http://localhost:5000` (`npm run backend:dev` from workspace root)
   - Frontend on `http://localhost:5173` (`npm run frontend:dev` from workspace root)
2. **Open Web Browser:**
   - Open a fresh Chrome or Edge Incognito window to `http://localhost:5173`.
   - Ensure the browser developer tools (Network tab) are docked or easily accessible if the examiner asks to inspect cookies.
3. **Keep Demo Credentials Ready:**
   - **Username:** `admin` (or `itadmin`)
   - **Password:** `AdminPassword123!`
4. **Open Terminal Window in Background:**
   - Keep a PowerShell window open at `D:\cloud` so you can instantly demonstrate tests (`npm test`).

---

## 3. Step-by-Step Demonstration Walkthrough

### Step 1: Introduction to AssetFlow
- **What to show:** Open browser to `http://localhost:5173/login`. Point to the branding: "AssetFlow — IT Asset & License Management".
- **What to say:**
  > "Respected examiners, good morning. Today I am presenting AssetFlow, a full-stack enterprise web application designed to solve critical asset lifecycle and software license management challenges for small-to-medium enterprises and educational institutions."

### Step 2: Problem Statement & Objectives
- **What to show:** The clean, professional login card.
- **What to say:**
  > "Most growing organizations track laptops, servers, and software subscriptions using manual spreadsheets. This results in three critical operational failures:
  > 1. Missing ownership and lost historical custody when equipment changes hands.
  > 2. License compliance violations and financial waste caused by over-allocating seats or paying for unused subscriptions.
  > 3. Surprise subscription expirations and missed hardware warranty renewals.
  >
  > AssetFlow solves these challenges by providing a centralized, secure web application with an auditable finite state machine, mathematical seat capacity enforcement, dynamic expiry alerts, and compliance-ready reports."

### Step 3: Technology Stack & Two-Stage Architecture
- **What to show:** Briefly show the architecture diagram ([system-architecture.md](file:///d:/cloud/docs/diagrams/system-architecture.md)).
- **What to say:**
  > "The application is built on a modern full-stack architecture:
  > - **Frontend:** React 19 single-page application built with Vite and React Router, using a tailored CSS design system.
  > - **Backend:** Express.js REST API with layered architecture separating controllers, business domain services, and database repositories.
  > - **Database:** SQLite 3 with Write-Ahead Logging (WAL) and enforced foreign keys for local development.
  > - **Cost Constraint:** All development runs 100% locally on Windows at strict ₹0 cost, designed with modular repository abstractions ready for cloud migration to Amazon RDS PostgreSQL."

---

### Step 4: Administrator Authentication & Security
- **What to execute:**
  1. Intentionally enter an incorrect password (e.g. `WrongPass!`) and click **Sign In**.
  2. Point out the accessible red error banner: *"Invalid administrator username or password."*
  3. Enter the valid credentials: Username `admin`, Password `AdminPassword123!`. Click **Sign In**.
- **What the audience sees:** Instant authentication and redirection to the main administrative dashboard.
- **What to explain:**
  > "Notice how authentication security is hardened:
  > - Passwords are hashed with bcrypt using 10 salt rounds.
  > - Login queries use constant-time comparisons to neutralize timing side-channel attacks.
  > - The session token is stored exclusively in an `HttpOnly`, `SameSite=Lax` cookie. It is never exposed in JSON responses or accessible to JavaScript, completely protecting administrators against token exfiltration via Cross-Site Scripting (XSS)."

---

### Step 5: Dashboard Overview & Real Health Verification
- **What to show:** The `/dashboard` view with the Live Backend & Database Health Check and inventory cards.
- **What the audience sees:**
  - Health Card: Service Status `UP`, Database Connection `CONNECTED`, Tables Verified `8`.
  - 6 Key Performance Indicator (KPI) cards: Total Hardware Assets (6), Assigned Assets (2), Available Assets (2), Total Employees (5), Software Licenses (4 with seat ratio), and Licenses Near Expiry (1).
- **What to explain:**
  > "Unlike traditional student projects that show hardcoded mock numbers, every single metric on this dashboard is empirically queried and aggregated from active database records.
  > - Notice the health status banner: clicking 'Refresh' calls the backend health repository to verify active SQLite connectivity.
  > - The 'Licenses Near Expiry' card displays the live `Live Module 6 API` badge, dynamically reflecting licenses needing administrative attention."
- **Fallback if no data:** If counts show zero, click the **Refresh Metrics** button at the top right.

---

### Step 6: Employee Management & Custody Directory
- **What to execute:** Click **Employees** in the left sidebar (`/employees`).
- **What the audience sees:** The personnel directory table with employee codes (`EMP-1001`), names, departments, designations, and statuses (`ACTIVE`).
- **What to explain:**
  > "Assets and licenses cannot be assigned to arbitrary strings; they must belong to verified organizational personnel.
  > - Employees are uniquely tracked by official code and corporate email.
  > - If an employee is marked `TERMINATED` or `ON_LEAVE`, AssetFlow's domain service strictly blocks assigning new hardware or software seats to them."

---

### Step 7: Hardware Asset Lifecycle (Assignment, Return & History)
- **What to execute:**
  1. Click **Hardware Assets** in the left sidebar (`/assets`).
  2. Filter by status: select **AVAILABLE** in the dropdown. Point out available devices (e.g., `AST-HW-1002` Apple MacBook Pro).
  3. Click **Assign Asset** on an available device.
  4. Select an employee (e.g. `Marcus Rodriguez`) and enter notes: `"Assigned for Q4 Sprint"`. Click **Confirm Assignment**.
  5. Show that the asset status immediately changes to `ASSIGNED` with a green badge, and the custody name updates.
  6. Click **History** on that asset: show the chronological audit trail with timestamp, employee, and notes.
  7. Click **Return Asset**, enter return notes: `"Returned in good condition"`, and confirm.
  8. Show the asset returns to `AVAILABLE` status and is ready for reallocation.
- **What to explain:**
  > "This demonstrates AssetFlow's auditable finite state machine:
  > - State transitions are atomic: updating asset custody and logging the historical entry in `assignment_history` occur within an ACID database transaction.
  > - If hardware is damaged, it transitions to `UNDER_MAINTENANCE` and is blocked from assignment.
  > - Physical deletion is blocked if historical assignment records exist, guaranteeing compliance integrity."

---

### Step 8: Software License Inventory & Seat Allocation Math
- **What to execute:**
  1. Click **Software Licenses** in the left sidebar (`/licenses`).
  2. Point out the seat utilization progress bar (e.g. Microsoft 365 E5: 50 seats purchased, 35 allocated, 15 available).
  3. Click **Allocations** on a license.
  4. Show the list of active employees holding seats.
  5. Allocate a seat to an eligible employee.
  6. Point out that the used seat count increments, available capacity decrements, and an allocation history record is created.
  7. Click **Revoke Seat** on an allocation.
- **What to explain:**
  > "Software license compliance is enforced by mathematical invariants:
  > - The invariant `0 <= used_quantity <= total_quantity` is enforced at the database layer using atomic conditional updates.
  > - Duplicate seat allocations to the same employee are prevented.
  > - When an employee leaves, revoking their seat does not delete the record; it records a `revoked_at` timestamp. This preserves complete historical evidence for vendor compliance audits."

---

### Step 9: Expiry Alerts & License Lifecycle Monitoring
- **What to execute:**
  1. Click **Expiry Reports** in the left sidebar (`/reports`).
  2. Show the **License Expiry** tab: point out the summary cards (`Expired`, `≤ 7 Days`, `≤ 30 Days`, `Valid`, `No Expiry`).
  3. Click on the **Expired** summary card to filter only expired licenses. Click it again to clear.
  4. Type in the search box: `"JetBrains"` to filter by name.
  5. Switch to the **Hardware Warranty** tab: show warranty expiration tracking for physical machines.
- **What to explain:**
  > "Instead of running an unreliable background polling cron job that consumes memory and can miss deadlines, AssetFlow's expiry engine evaluates UTC date boundaries mathematically at query time.
  > - It categorizes items into 5 discrete buckets based on integer day differences.
  > - Missing dates are categorized as `NO_EXPIRY`, ensuring perpetual licenses are never misclassified as expired."

---

### Step 10: Compliance Reporting & Formula-Safe CSV Export
- **What to execute:**
  1. On the `/reports` page, click the **Reports & Export** tab.
  2. Point out the 7 available compliance report modules.
  3. Click **Preview** on **Asset Inventory**: show the embedded preview drawer with live table records.
  4. Click **Download CSV** on **Asset Inventory**. Show the downloaded `.csv` file in the browser tray.
- **What to explain:**
  > "AssetFlow allows administrators to export 7 specialized compliance reports for offline auditing.
  > - Critical Security Feature: Notice how CSV export is protected against Formula Injection attacks (CWE-1236). If an asset name or employee title starts with dangerous spreadsheet execution symbols like `=`, `+`, `-`, or `@`, our backend automatically prefixes the cell with a single quote. This neutralizes Excel macro execution while keeping the report completely readable."

---

### Step 11: Automated Test Suite & Code Quality Verification
- **What to execute:**
  1. Switch to the PowerShell terminal window.
  2. Run the test command:
     ```powershell
     npm test
     ```
  3. Allow the test suite to execute in front of the examiners.
- **What the audience sees:**
  - Backend test runner: `110 passed, 0 failed` across 6 test files.
  - Frontend test runner: `41 passed, 0 failed` across 4 test files.
  - Total: **151 automated tests passing with zero errors**.
- **What to explain:**
  > "Every core invariant in this system is guarded by automated regression tests:
  > - Tests run against isolated, in-memory databases and never mutate or overwrite our development data.
  > - We have 110 backend integration tests and 41 frontend React component tests, providing high confidence in system stability."

---

### Step 12: Current Limitations & Proposed Cloud Architecture
- **What to show:** Briefly show the proposed cloud diagram ([cloud-architecture-proposed.md](file:///d:/cloud/docs/diagrams/cloud-architecture-proposed.md)).
- **What to say:**
  > "To respect our strict ₹0 budget constraint for this academic project, the system runs locally. However, it is architecturally prepared for AWS:
  > - In cloud container platforms like AWS App Runner or ECS, containers are ephemeral—restarting a container wipes local files. Therefore, SQLite cannot be used across multi-instance cloud deployments.
  > - In Stage B, the application is designed to transition to Amazon RDS PostgreSQL for persistent relational storage, AWS App Runner for stateless containerized compute, and Amazon S3 with CloudFront for static web delivery, safeguarded by AWS billing alerts set at $0.01."

---

### Step 13: Conclusion & Viva Handoff
- **What to say:**
  > "To conclude: AssetFlow successfully delivers an enterprise-grade, auditable IT asset and license management platform. It fulfills all course requirements for database transactions, security, full-stack integration, and cloud-ready design while maintaining a verified ₹0 budget.
  >
  > Thank you for your time. I am now ready for your questions."
