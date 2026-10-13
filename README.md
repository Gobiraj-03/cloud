# Cloud-Based IT Asset Lifecycle & Software License Management System

[![Project Stage](https://img.shields.io/badge/Project_Stage-Stage_A:_Local_Development-blue.svg)](#)
[![Budget Constraint](https://img.shields.io/badge/Budget-₹0_Strict-green.svg)](#)
[![Academic Project](https://img.shields.io/badge/Course-Cloud_Computing_Capstone-orange.svg)](#)
[![Node Version](https://img.shields.io/badge/Node.js-v22.15.1-brightgreen.svg)](#)

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

## 2. Core Capabilities

- **Administrator Authentication**: Secure, salted password hashing (bcrypt), token-based authorization, and protected administrative routes.
- **Interactive Dashboard**: Real-time asset counts by status (Available, Assigned, In Maintenance, Retired), software utilization percentages, 30-day expiry counts, and live database charts.
- **Hardware Asset Lifecycle Management**: Unique asset tags, serial numbers, procurement cost, warranty tracking, category filters, and state machine transitions.
- **Employee Custody & History**: Employee directory, asset assignment, asset return, and an immutable assignment history log that is never erased upon reassignment.
- **Software License Tracking**: Seat allocation tracking, utilization percentages, over-allocation prevention (`used <= total`), and support for subscription and perpetual licenses.
- **Proactive Expiry Alerts**: Visual alerts for software subscriptions and hardware warranties expiring within 30 days, plus a manual on-demand check for viva demonstrations.
- **Reporting & Data Export**: Filtered asset inventory, employee custody, and license compliance reports with instant CSV export.

---

## 3. Two-Stage Architectural Blueprint

```
+--------------------------------------------------------------------------------------------------+
| STAGE A: LOCAL DEVELOPMENT (CURRENT)                                                             |
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

| Module | Status | Next Steps |
| :---: | :---: | :--- |
| **Module 0** | **COMPLETED** | Planning, architecture, data modeling, cost guardrails, and repo setup. |
| **Module 1** | *Awaiting Authorization* | Database schema, SQLite initialization, repository layer, backend foundation. |

---

## 7. Technology Stack Summary

- **Frontend**: React (Vite), Modern Vanilla CSS / Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: Node.js (v22.15.1), Express.js, RESTful JSON API.
- **Database**: SQLite 3 (Stage A Local) / PostgreSQL on Amazon RDS (Stage B Cloud).
- **Security**: bcrypt password hashing, JWT authentication, parameterized SQL queries.
- **Version Control**: Git (`2.45.2.windows.1`) with comprehensive `.gitignore`.
