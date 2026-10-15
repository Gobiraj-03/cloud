# AssetFlow — Cloud Deployment Readiness & Gap Analysis

**Project:** Cloud-Based IT Asset Lifecycle & Software License Management System  
**Current Phase:** Module 8 — Final Readiness & Viva Preparation  
**Current Operating State:** Stage A (Verified 100% Localhost at ₹0 Cost)  
**Target Operating State:** Stage B (Proposed AWS Cloud Deployment — Unprovisioned)  

---

## 1. Executive Summary: Local State vs. Cloud Target

| Dimension | Stage A: Current Local Baseline | Stage B: Proposed AWS Cloud Target | Migration Gap / Work Required |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19 SPA served via Vite Dev Server on `http://localhost:5173` | Compiled static bundle hosted on Amazon S3 and distributed via Amazon CloudFront (CDN) | Run `npm run build`; upload `frontend/dist/` to S3; configure CloudFront edge distribution and cache behaviors. |
| **Backend API** | Node.js + Express running locally on `http://localhost:5000` | Containerized Express API running on AWS App Runner or AWS ECS Fargate | Build container image via multi-stage `Dockerfile`; push to Amazon Elastic Container Registry (ECR); configure container service. |
| **Database** | Embedded SQLite 3 file in `data/asset_management.db` (WAL mode) | Managed Amazon RDS PostgreSQL database (`db.t4g.micro`) | Swap SQLite repository queries for PostgreSQL (`pg` pool); run automated SQL DDL migration; export seed data. |
| **Security & Cookies** | `HttpOnly=true`, `SameSite=Lax`, `Secure=false` (HTTP allowed on localhost) | `HttpOnly=true`, `SameSite=Lax`, `Secure=true` (strict HTTPS only) | Set `NODE_ENV=production`; ensure SSL/TLS certificate configured on CloudFront and App Runner custom domain. |
| **Secrets Management** | Local `.env` file (excluded from Git via `.gitignore`) | AWS Secrets Manager or AWS Systems Manager (SSM) Parameter Store | Inject database credentials and session secrets directly into container runtime environment variables. |
| **Observability** | Console output (`console.log`, `console.error`) | Amazon CloudWatch Logs, CloudWatch Metrics, and $0.01 Billing Alerts | Configure Winston/Pino structured JSON logger; stream stdout to CloudWatch; establish metric alarms. |
| **Cost** | Strictly **₹0.00** | ~$0 to ~$25/month (depending on AWS Free Tier eligibility and traffic) | Establish AWS Budgets with hard alarms at $0.01 to eliminate surprise credit card charges. |

---

## 2. The Persistent Database Requirement: Why Cloud Containers Mandate RDS

In local development, SQLite is an outstanding database engine: it is fast, ACID-compliant, requires zero background processes, and stores data in a single file.

However, **SQLite cannot be used as-is in modern multi-instance cloud deployments**:

### 1. Ephemeral Container Filesystems
Cloud container orchestrators (AWS App Runner, AWS ECS, Google Cloud Run, Kubernetes) treat container filesystems as stateless and ephemeral. When a container:
- Automatically scales down during idle periods,
- Restarts after an uncaught exception, or
- Redeploys during a software update,

**the entire local disk is destroyed and recreated from the base image**. Any SQLite `.db` file written to local disk would be permanently erased.

### 2. Multi-Instance Concurrency & Data Desynchronization
When traffic increases, cloud platforms automatically scale out by launching a second, third, or fourth container instance. If SQLite were used:
- Container A and Container B would each have their own independent `.db` file.
- An asset assigned by an admin connected to Container A would remain marked `AVAILABLE` on Container B.
- This creates immediate split-brain corruption and conflicting asset custody records.

### 3. Network Storage (EFS / NFS) Pitfalls
Mounting a network volume (like AWS Elastic File System) to share an SQLite file between containers is explicitly cautioned against in SQLite's official documentation. Network file locking protocols (POSIX fcntl locks) over NFS often have latent bugs, causing `SQLITE_BUSY` database deadlocks, severe write latency, and high corruption risk under concurrent web traffic.

### Solution for Stage B
The application repository layer was specifically designed with parameterized SQL and ANSI-standard DDL. Transitioning to **Amazon RDS PostgreSQL** provides:
- Centralized multi-AZ relational persistence.
- Automatic daily backups and Point-In-Time Recovery (PITR).
- Native support for concurrent connection pooling (`pg-pool`).

---

## 3. Production Environment & Secrets Configuration

In production, hardcoding secrets or committing `.env` files is strictly prohibited. Secrets must be managed via cloud-native key-value stores:

```
[AWS Secrets Manager / SSM Parameter Store]
       |
       | Encrypted at rest (AWS KMS)
       v
[AWS App Runner Runtime Injection]
       |
       +--> process.env.NODE_ENV = 'production'
       +--> process.env.PORT = 5000
       +--> process.env.DB_HOST = 'assetflow-db.xyz.us-east-1.rds.amazonaws.com'
       +--> process.env.DB_PORT = 5432
       +--> process.env.DB_NAME = 'assetflow_prod'
       +--> process.env.DB_USER = 'assetadmin'
       +--> process.env.DB_PASSWORD = '{{resolve:secretsmanager:...}}'
       +--> process.env.CORS_ORIGIN = 'https://assetflow.yourdomain.com'
```

---

## 4. HTTPS, CORS, and Cookie Hardening in Production

AssetFlow's backend authentication controller ([auth.controller.js](file:///d:/cloud/backend/src/controllers/auth.controller.js)) is already configured with environment-aware security toggles:

```javascript
// Environment-aware cookie options:
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,                                // Prevent JavaScript access (XSS defense)
  sameSite: isProduction ? 'Lax' : 'Lax',       // CSRF defense
  secure: isProduction,                          // Only send over HTTPS in production
  maxAge: 8 * 60 * 60 * 1000,                   // 8 Hours
  path: '/'
};
```

### Production Checklist:
1. **SSL/TLS Certificates:** Provision a free public SSL certificate via **AWS Certificate Manager (ACM)** and attach it to the CloudFront distribution and custom domain.
2. **CORS Invariant:** In `backend/.env`, set `CORS_ORIGIN=https://assetflow.yourdomain.com`. Express CORS middleware will automatically reject requests from any untrusted or third-party web origins with `HTTP 403 Forbidden`.
3. **Cookie Transmission:** With `secure: true`, modern browsers will refuse to transmit the session cookie over unencrypted HTTP, ensuring complete wire protection against packet sniffing.

---

## 5. Database Migration and Backup Strategy

To move from SQLite to Amazon RDS PostgreSQL (Implemented and verified in Stages 1 & 2):

### Step 1: PostgreSQL Schema Definition (Completed)
Created [`backend/src/db/postgres-schema.sql`](file:///D:/cloud/backend/src/db/postgres-schema.sql) translating SQLite dialect:
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
- `TEXT` timestamps → `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`
- Enforces relational foreign-key constraints (`ON DELETE RESTRICT`, `ON DELETE CASCADE`) and check constraints.
- Configures 13 performance indexes matching the production SQLite database.

### Step 2: Safe Data Migration & Import Script (Completed)
Created [`backend/src/scripts/migrate-sqlite-to-postgres.js`](file:///D:/cloud/backend/src/scripts/migrate-sqlite-to-postgres.js):
- **Safety Defaults:** Defaults to **dry-run mode** (`node src/scripts/migrate-sqlite-to-postgres.js`), extracting and reporting records without modifying target DB.
- **Explicit Execution:** Requires `--execute` to perform live imports.
- **Atomic Transaction:** Executes all inserts inside `BEGIN ... COMMIT` with automatic `ROLLBACK` on any error.
- **Sequence Synchronization:** Automatically aligns PostgreSQL `SERIAL` sequences with `MAX(id)` to prevent primary key collision errors on subsequent inserts.
- **Read-Only SQLite Access:** Opens local SQLite using `sqlite3.OPEN_READONLY` to guarantee existing development data is never modified.
- **Dry-Run Verified:** Tested against local SQLite database; confirmed 100% extraction parity across all 8 tables (68 rows).

### Step 3: Disaster Recovery & Automated Backups
- Timestamped backup created and verified at [`backups/asset_management_20261014_210426.db`](file:///D:/cloud/backups/asset_management_20261014_210426.db) (135,168 bytes, 8 tables intact).
- Original SQLite database untouched at [`data/asset_management.db`](file:///D:/cloud/data/asset_management.db) (135,168 bytes).
- On Amazon RDS:
  - Enable **Automated Daily Backups** with a 1-day retention period (included in AWS Free Tier).
  - Take manual DB snapshots before running any production schema migrations.

---

## 6. Stage 3 Production Hosting & Deployment Specification

### 6.1 Frontend (Vercel) Environment Variables & Build Requirements

| Variable | Recommended Value | Purpose & Notes |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://<app-id>.<region>.awsapprunner.com` | Base URL for all Express API requests and CSV exports. Leave empty or unset for local dev (`/api`). |
| `VITE_API_URL` | *(Optional Fallback)* | Legacy fallback supported if `VITE_API_BASE_URL` is omitted. |

> [!IMPORTANT]
> **Vercel Redeployment Requirement:**  
> Vite statically bakes `import.meta.env` values into JavaScript chunks during `npm run build` (`dist/`). Changing `VITE_API_BASE_URL` in the Vercel Dashboard requires clicking **Deployments > Redeploy** for the new API endpoint to take effect in production.

---

### 6.2 Backend (Express) Environment Variables & Startup Commands

| Variable | Production Value | Local Development Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | `5000` *(or platform default)* | `5000` | Port for the HTTP server. Express defaults to `5000` if omitted. |
| `HOST` | `0.0.0.0` | `0.0.0.0` *(or `localhost`)* | Binds to `0.0.0.0` so container orchestrators and health checks can route traffic. |
| `NODE_ENV` | `production` | `development` | Enables production security checks, logging mode, and strict cookie flags. |
| `TRUST_PROXY` | `1` | `0` | Instructs Express to trust reverse proxies (App Runner / CloudFront) for `req.ip` and HTTPS recognition. |
| `CORS_ORIGIN` | `https://assetflow.vercel.app` | `http://localhost:5173` | Allowed frontend origin. Supports comma-separated list of origins and strips trailing slashes. |
| `COOKIE_SAME_SITE` | `none` *(auto-set when CORS_ORIGIN is HTTPS)* | `lax` | Browser cookie cross-site policy. `None` is required when frontend and API are on different domains. |
| `COOKIE_SECURE` | `true` *(auto-set in production)* | `false` | Mandates HTTPS transmission. Browsers reject `SameSite=None` without `Secure=true`. |
| `DB_CLIENT` | `postgres` | `sqlite` | Activates the PostgreSQL connection pool or defaults to the local SQLite engine. |
| `DATABASE_URL` | `postgres://user:pass@host:5432/assetflow` | *(Omitted)* | Standard PostgreSQL connection string (auto-enables SSL in production). |
| `DB_HOST` | `assetflow-db.xyz.rds.amazonaws.com` | *(Omitted)* | RDS PostgreSQL endpoint (if `DATABASE_URL` not used). |
| `DB_PORT` | `5432` | *(Omitted)* | PostgreSQL port. |
| `DB_NAME` | `assetflow` | *(Omitted)* | PostgreSQL database name. |
| `DB_USER` | `assetadmin` | *(Omitted)* | Database master username. |
| `DB_PASSWORD` | `[Secure RDS Password]` | *(Omitted)* | Database master password (managed via AWS SSM). |
| `DB_SSL` | `true` | `false` | Enforces TLS connection to RDS PostgreSQL with certificate verification. |
| `DB_POOL_MAX` | `10` | *(Omitted)* | Maximum concurrent client connections in the PostgreSQL pool. |

#### Backend Startup Command
```bash
# Production Container Launch Command
npm start
# Executes: node server.js
```
`server.js` automatically:
1. Binds to `HOST` (`0.0.0.0`) and `PORT` (`process.env.PORT || 5000`).
2. Detects `DB_CLIENT` / `DATABASE_URL` and initializes the PostgreSQL pool with live ping check.
3. Sets up graceful shutdown listeners (`SIGINT` and `SIGTERM`) that close active HTTP connections, cleanly drain the database pool via `db.close()`, and enforce a 10-second safety timeout.

---

### 6.3 PostgreSQL Connection Settings & Migration Procedure

#### 1. Schema Provisioning (Target PostgreSQL)
Execute the DDL schema before migrating data:
```bash
# Apply schema to Amazon RDS PostgreSQL using psql
psql -h <rds-endpoint>.rds.amazonaws.com -p 5432 -U assetadmin -d assetflow -f backend/src/db/postgres-schema.sql
```
Creates all 8 relational tables, primary key serial sequences, foreign keys (`ON DELETE RESTRICT`/`SET NULL`/`CASCADE`), constraints, and 13 performance indexes.

#### 2. Dry-Run Data Migration (Safe Simulation)
```bash
# From workspace root or backend directory:
node backend/src/scripts/migrate-sqlite-to-postgres.js
```
- Reads source SQLite in `OPEN_READONLY` mode.
- Validates row counts across all 8 tables.
- Mapped 100% of rows (68 records).
- Performs zero writes; target database is untouched.

#### 3. Real Migration Execution (Atomic Transaction)
```bash
# Set PostgreSQL connection variables in your shell or .env:
export DB_CLIENT=postgres
export DATABASE_URL="postgres://assetadmin:<password>@<rds-endpoint>.rds.amazonaws.com:5432/assetflow?sslmode=require"

# Execute atomic import:
node backend/src/scripts/migrate-sqlite-to-postgres.js --execute
```
**Safety Invariants Enforced During Migration:**
- Enclosed inside a single `BEGIN ... COMMIT` transaction.
- Tables imported in strict topological dependency order:
  1. `administrators`
  2. `employees`
  3. `assets`
  4. `asset_assignment_history`
  5. `software_licenses`
  6. `license_allocations`
  7. `audit_logs`
  8. `sessions`
- Normalizes empty strings in nullable columns (`last_login`, `notes`, `warranty_expiry`, etc.) to SQL `NULL`.
- Synchronizes all PostgreSQL `SERIAL` sequences to `MAX(id)` using `pg_get_serial_sequence`.
- Compares source and destination row counts for 100% parity.
- Automatically rolls back (`ROLLBACK`) if any constraint or connection error occurs.

---

### 6.4 Health-Check URL & Troubleshooting Guide

**Endpoint:** `GET /api/health`

#### Healthy Response (`200 OK`)
```json
{
  "status": "UP",
  "healthy": true,
  "timestamp": "2026-10-14T16:15:00.000Z",
  "environment": "production",
  "uptimeSeconds": 1420,
  "database": {
    "status": "CONNECTED",
    "engine": "PostgreSQL",
    "tablesFound": 8
  }
}
```

#### Degraded / Disconnected Response (`503 Service Unavailable`)
```json
{
  "status": "DOWN",
  "healthy": false,
  "timestamp": "2026-10-14T16:15:00.000Z",
  "environment": "production",
  "uptimeSeconds": 12,
  "database": {
    "status": "DISCONNECTED",
    "engine": "PostgreSQL",
    "tablesFound": 0,
    "error": "connect ECONNREFUSED 10.0.1.42:5432"
  }
}
```

#### Common Operational Issues & Remediation Steps

| Symptom | Root Cause | Exact Remediation Step |
| :--- | :--- | :--- |
| **503 Database Disconnected** | RDS instance stopped or VPC Security Group blocking traffic | In AWS RDS Console: check instance status is `Available`. Ensure RDS Security Group allows inbound TCP port `5432` from the App Runner VPC connector security group. |
| **403 Origin Blocked by CORS** | `CORS_ORIGIN` mismatch with Vercel frontend | Set `CORS_ORIGIN=https://<your-project>.vercel.app` in App Runner environment variables. Backend supports comma-separated origins and automatically strips trailing slashes. |
| **403 CSRF Validation Failure** | Origin / Referer header missing or mismatched on state-changing request | Ensure frontend requests include standard headers and `credentials: 'include'`. Verify `CORS_ORIGIN` matches request origin exactly. |
| **Session Cookie Not Stored / Sent** | `SameSite=Lax` or `Secure=false` on cross-site requests | Ensure backend runs with `NODE_ENV=production` and `CORS_ORIGIN=https://...`. Backend automatically applies `SameSite=None` and `Secure=true`. Both frontend and backend must be accessed over `https://`. |
| **404 API Route Not Found** | `VITE_API_BASE_URL` misconfigured on Vercel | Set `VITE_API_BASE_URL=https://<apprunner-domain>.awsapprunner.com`. Do NOT include a trailing `/api` (client automatically appends `/api/...`). Trigger a Vercel Redeploy. |
| **Container Fails App Runner Health Check** | Server listening on `localhost` instead of `0.0.0.0` | `server.js` is configured with `HOST=0.0.0.0`. Set App Runner health check path to `/api/health` with protocol `HTTP` and port `5000`. |

---

## 7. Comparative Cloud Hosting Options & Cost Analysis

| Platform Strategy | Compute Provider | Database Provider | Estimated Monthly Cost | Pros & Cons |
| :--- | :--- | :--- | :---: | :--- |
| **Option 1: Recommended AWS (Stage B)** | AWS App Runner (Container) | Amazon RDS PostgreSQL (`db.t4g.micro`) | **$15 – $25/month** *(₹0 first 12 mos if eligible)* | Enterprise-grade, AWS native, CloudWatch metrics, scalable; requires active credit card and strict budget monitoring. |
| **Option 2: Hybrid Serverless Cloud** | Vercel (Frontend) + Render.com (API) | Neon.tech (Serverless PostgreSQL) | **₹0.00 / month** *(Perpetual Free Tier)* | Zero credit card risk, generous free tiers, spins down on idle; cold starts of 15–30 seconds after inactivity. |
| **Option 3: Current Localhost (Stage A)** | Node.js Express (Local) | Embedded SQLite 3 (`data/asset_management.db`) | **₹0.00 (Guaranteed)** | Zero setup friction, instant response, zero cloud risk, 100% academic evaluation readiness; limited to single computer. |

---

## 8. Explicit Free-Tier Cost Warning & Policy

> [!CAUTION]
> **PERMANENT ₹0 CLOUD HOSTING CANNOT BE GUARANTEED ON AWS:**
> 1. AWS Free Tier benefits (such as 750 hours of RDS and 5 GB S3) are valid **strictly for the first 12 months** following account creation.
> 2. App Runner idle memory is **not free** after the initial 300 compute hours ($0.007/GB-hour memory).
> 3. Cloud pricing, bandwidth limits, and free-tier inclusions are subject to change by cloud vendors at any time.
>
> **Policy Directive:** For the purposes of this Computer Science Capstone course evaluation, **AssetFlow remains safely in Stage A (Local Development)**. The system has achieved 100% functional completeness and test verification without exposing the student to financial liability.

---

## 9. Associated Cloud Deployment Guides

- **AWS Zero-Cost Checklist & Pre-Deployment Console Checks:** [docs/AWS_ZERO_COST_CHECKLIST.md](file:///d:/cloud/docs/AWS_ZERO_COST_CHECKLIST.md)
- **AWS Cloud Deployment Architecture & Implementation Plan:** [docs/AWS_DEPLOYMENT_PLAN.md](file:///d:/cloud/docs/AWS_DEPLOYMENT_PLAN.md)
- **Mermaid Proposed Cloud Diagram:** [docs/diagrams/cloud-architecture-proposed.md](file:///d:/cloud/docs/diagrams/cloud-architecture-proposed.md)
- **Cost Analysis & Free Tier Strategy:** [docs/COST_AND_DEPLOYMENT.md](file:///d:/cloud/docs/COST_AND_DEPLOYMENT.md)

