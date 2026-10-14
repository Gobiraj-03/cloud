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

To move from SQLite to Amazon RDS PostgreSQL:

### Step 1: PostgreSQL Schema Definition
Create a migration file `backend/src/db/postgres-schema.sql` translating SQLite dialect:
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY` or `GENERATED ALWAYS AS IDENTITY`
- `TEXT` timestamps → `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`
- Enforce relational constraints (`ON DELETE RESTRICT`)

### Step 2: Seed & Data Transfer
Use a conversion script (`node-sqlite3` to `pg`) to export existing local assets, employees, and licenses into the RDS PostgreSQL instance within an atomic transaction.

### Step 3: Disaster Recovery & Automated Backups
On Amazon RDS:
- Enable **Automated Daily Backups** with a 7-day retention period (included in AWS Free Tier).
- Enable **Point-in-Time Recovery (PITR)**, allowing the database to be restored to any specific second in the past week.
- Take manual DB snapshots before running any production schema migrations.

---

## 6. Observability, Logging, and Audit Trails

1. **Structured JSON Logging:** Replace `console.log` with a structured logger (`pino` or `winston`) emitting JSON log events with timestamp, request ID, user ID, and HTTP method.
2. **Amazon CloudWatch Integration:**
   - App Runner automatically pipes container `stdout` and `stderr` directly into CloudWatch Log Groups.
   - Establish a **Metric Filter** searching for HTTP 500 errors or unauthorized access attempts (`LOGIN_FAILED`).
3. **Audit Log Retention:** Ensure the `audit_logs` table is backed up regularly and restricted from physical deletion, supporting corporate compliance audits (SOC 2, ISO 27001).

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
> 2. App Runner idle memory is **not free** after the initial 300 compute hours.
> 3. Cloud pricing, bandwidth limits, and free-tier inclusions are subject to change by cloud vendors at any time.
>
> **Policy Directive:** For the purposes of this Computer Science Capstone course evaluation, **AssetFlow remains safely in Stage A (Local Development)**. The system has achieved 100% functional completeness and test verification without exposing the student to financial liability.

---

## 9. Associated Cloud Deployment Guides

- **AWS Zero-Cost Checklist & Pre-Deployment Console Checks:** [docs/AWS_ZERO_COST_CHECKLIST.md](file:///d:/cloud/docs/AWS_ZERO_COST_CHECKLIST.md)
- **AWS Cloud Deployment Architecture & Implementation Plan:** [docs/AWS_DEPLOYMENT_PLAN.md](file:///d:/cloud/docs/AWS_DEPLOYMENT_PLAN.md)
- **Mermaid Proposed Cloud Diagram:** [docs/diagrams/cloud-architecture-proposed.md](file:///d:/cloud/docs/diagrams/cloud-architecture-proposed.md)
- **Cost Analysis & Free Tier Strategy:** [docs/COST_AND_DEPLOYMENT.md](file:///d:/cloud/docs/COST_AND_DEPLOYMENT.md)
