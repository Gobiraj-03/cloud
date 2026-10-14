# AssetFlow — Comprehensive Viva Voce Examination Guide

**Course:** Final-Year Computer Science Capstone / Cloud Computing  
**Project:** Cloud-Based IT Asset Lifecycle & Software License Management System (AssetFlow)  
**Total Questions:** 42 Comprehensive Questions & Answers Grounded in Source Code  

---

## Category 1: Cloud Computing Fundamentals, Service Models & Economics

### Q1. What is Cloud Computing, and which cloud service model does AssetFlow represent?
**Answer:** Cloud computing is the on-demand delivery of IT resources (compute, database, storage) over the internet with pay-as-you-go pricing. AssetFlow is designed as a **SaaS (Software as a Service)** application for end users and IT administrators. When deployed to the cloud, the backend API runs on a **PaaS (Platform as a Service)** layer (such as AWS App Runner or AWS Elastic Beanstalk), and utilizes managed database services (**DBaaS**) like Amazon RDS PostgreSQL.

### Q2. Differentiate between IaaS, PaaS, and SaaS using concrete examples.
**Answer:**
- **IaaS (Infrastructure as a Service):** Provides raw virtualized hardware (VMs, storage, networks). The user manages the OS, runtime, and app. *Example: Amazon EC2.*
- **PaaS (Platform as a Service):** Provides a managed platform and runtime. The cloud provider manages the OS and patching; the developer manages only application code and configuration. *Example: AWS App Runner, Heroku.*
- **SaaS (Software as a Service):** A complete, ready-to-use software product accessed via the browser. *Example: AssetFlow, Microsoft 365, Google Workspace.*

### Q3. Why has AssetFlow not yet been deployed to the public cloud (AWS)?
**Answer:** Academic project financial safety and risk management. Cloud free tiers can incur unexpected charges (such as RDS micro instance overages, Elastic IP idle fees, or egress bandwidth costs). In accordance with our project charter, **Stage A enforces a strict ₹0 cloud budget** by running locally on Windows with an embedded SQLite engine. The application has been architected with clean abstraction layers (standard SQL parameterization, modular repositories) so it is 100% cloud-ready for **Stage B** once an institutional AWS account with budget alarms is verified.

### Q4. What are the major cost risks when hosting web applications on AWS?
**Answer:**
1. **Database Hour Overages:** Amazon RDS instances incur hourly charges if run 24/7 beyond the 750 free-tier hours or after the 12-month free tier expires.
2. **Unused Elastic IPs:** AWS charges for public IPv4 addresses allocated but not attached to a running instance.
3. **Data Egress Bandwidth:** Moving data out of an AWS region to the internet is billed per gigabyte beyond initial thresholds.
4. **Provisioned IOPS & Storage:** Provisioned SSD storage (gp3/io2) incurs fixed monthly fees regardless of database usage.

### Q5. What cloud monitoring guardrails should be put in place before cloud deployment?
**Answer:**
1. **AWS Budgets Alert:** Set a hard billing alert at **$0.01** using Amazon SNS to trigger instant email notifications upon any non-zero charge.
2. **CloudWatch Billing Alarm:** An alarm triggered when estimated charges exceed $1.00.
3. **Auto-Stop Automation:** AWS Lambda scripts configured to shut down staging RDS instances during non-working hours.

---

## Category 2: System Architecture & Technologies

### Q6. Explain the high-level architecture of AssetFlow.
**Answer:** AssetFlow implements a decoupled, 3-tier enterprise architecture:
1. **Presentation Tier:** A React 19 single-page application built using Vite, providing an accessible responsive UI and interacting exclusively via REST API calls.
2. **Application Tier:** A Node.js and Express.js REST server using a layered architecture: Route Handlers → Authentication & Rate Limit Middleware → Controllers → Domain Services → Repositories.
3. **Data Persistence Tier:** SQLite 3 in Write-Ahead Logging (WAL) mode for local development, utilizing parameterized SQL queries and ACID transactions.

### Q7. Why did you use React 19 and Vite instead of Create React App (CRA)?
**Answer:** Create React App (CRA) is deprecated, unmaintained, and relies on slow Webpack bundling. Vite uses native ES modules (ESM) in modern browsers for sub-second Cold Starts and near-instant Hot Module Replacement (HMR). React 19 provides enhanced hooks (`useCallback`, `useTransition`), simplified ref handling, and improved client-side rendering performance.

### Q8. What is the role of the Express.js layered architecture in this project?
**Answer:** Separation of concerns:
- **Routes (`routes/`):** Define URL endpoints and attach security middleware.
- **Controllers (`controllers/`):** Extract HTTP parameters, invoke domain services, and format HTTP status codes (`200`, `201`, `400`, `404`, `409`).
- **Domain Services (`services/`):** Encapsulate business logic, state machine validation, seat arithmetic, and transactional coordination.
- **Repositories (`repositories/`):** Execute raw parameterized SQL queries against the database driver. This ensures database queries are never mixed with HTTP response logic.

### Q9. Why did you choose SQLite for local development, and why can it not be used in a multi-instance cloud environment?
**Answer:**
- **Local Development Choice:** SQLite is a self-contained, serverless, zero-configuration database stored in a single file (`data/asset_management.db`). It provides ACID compliance and fast execution without requiring a background database daemon.
- **Cloud Limitation:** Modern cloud platforms (like AWS App Runner, ECS Fargate, or Kubernetes) run container instances with **ephemeral local filesystems**. When instances restart or scale out horizontally, each container instance would have its own isolated SQLite file, leading to split-brain data corruption and instant data loss on deployment. Production cloud requires a centralized managed relational database (such as Amazon RDS PostgreSQL).

---

## Category 3: Database Design, Transactions & ACID Properties

### Q10. What are the ACID properties, and how does AssetFlow guarantee them?
**Answer:**
- **Atomicity:** All operations in a transaction succeed, or all roll back. AssetFlow uses `BEGIN IMMEDIATE TRANSACTION` for multi-write operations (such as assigning an asset and inserting its `assignment_history` row).
- **Consistency:** Foreign key constraints (`PRAGMA foreign_keys = ON`), `CHECK` constraints on status enums, and unique constraints prevent illegal database states.
- **Isolation:** SQLite's serialized / immediate transactions ensure concurrent writes do not interleave.
- **Durability:** Write-Ahead Logging (WAL) mode (`PRAGMA journal_mode = WAL;`) flushes committed changes safely to disk.

### Q11. Explain SQLite's Write-Ahead Logging (WAL) mode and why you enabled it.
**Answer:** By default, SQLite uses a rollback journal which locks the entire database file during writes, blocking readers. In WAL mode (`PRAGMA journal_mode = WAL;`), changes are appended to a separate `-wal` file. This allows **concurrent readers while a writer is writing**, drastically improving read throughput and preventing database locking errors in a web API environment.

### Q12. Explain the relational schema design of AssetFlow.
**Answer:** The database schema consists of 8 core tables:
1. `administrators`: System administrators with bcrypt password hashes.
2. `sessions`: Server-managed sessions with expiry timestamps.
3. `employees`: Corporate personnel with department and employment status (`ACTIVE`, `ON_LEAVE`, `TERMINATED`).
4. `hardware_assets`: Physical equipment with foreign key `assigned_to` referencing `employees.id`.
5. `assignment_history`: Complete chronological custody records linking asset and employee.
6. `software_licenses`: Software subscriptions with seat counts (`total_quantity`, `used_quantity`) and expiry dates.
7. `license_allocations`: Individual seat allocations linking license and employee with `revoked_at` timestamp.
8. `audit_logs`: Immutable security audit trail recording IP address, admin ID, and action.

### Q13. How do you handle schema migrations safely without losing data?
**Answer:** AssetFlow implements forward-only schema migration scripts (`backend/src/db/migrate.js`). It reads schema definitions, verifies table existence via `sqlite_master`, and applies missing tables or columns using conditional DDL (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN`). In production, this would be managed using automated database migration tools like Prisma Migrate, Knex, or Flyway.

---

## Category 4: Security, Authentication & Session Management

### Q14. How does AssetFlow authenticate administrators?
**Answer:** AssetFlow uses stateful, server-managed sessions with **opaque session tokens**:
1. Administrator submits credentials to `POST /api/auth/login`.
2. Password is verified using `bcrypt.compare()` against the stored hash.
3. Upon success, a cryptographically secure 64-character token is generated (`crypto.randomBytes(32).toString('hex')`).
4. An active session row is inserted into SQLite's `sessions` table with an 8-hour TTL.
5. The token is sent to the client exclusively inside an **`HttpOnly` cookie**.

### Q15. Why is an `HttpOnly` cookie more secure than storing tokens in `localStorage`?
**Answer:** JavaScript code running in the browser (including malicious scripts injected via Cross-Site Scripting / XSS) can access `localStorage` and `sessionStorage`. An `HttpOnly` cookie is inaccessible to browser JavaScript (`document.cookie` cannot read it). The browser automatically includes the cookie with outgoing HTTP requests to the origin, completely preventing token exfiltration via XSS.

### Q16. What cookie flags are configured in AssetFlow, and what does each flag do?
**Answer:**
- `HttpOnly = true`: Blocks client-side JavaScript access.
- `SameSite = 'Lax'`: Prevents the browser from sending the cookie on cross-site subrequests (such as unauthorized images or forms), neutralizing Cross-Site Request Forgery (CSRF).
- `Path = '/'`: Ensures the cookie is valid across all API routes.
- `Secure = true` (in production): Enforces that the cookie is transmitted only over encrypted HTTPS connections.

### Q17. How does AssetFlow prevent Cross-Site Request Forgery (CSRF)?
**Answer:**
1. `SameSite = 'Lax'` on the session cookie.
2. Strict CORS origin validation in Express: state-changing requests (`POST`, `PUT`, `DELETE`) check the HTTP `Origin` header. Requests from unlisted or cross-site origins are rejected with `HTTP 403 Forbidden`.

### Q18. What is password hashing, and why is bcrypt superior to SHA-256 or MD5?
**Answer:** Standard hash functions like MD5 or SHA-256 are fast cryptographic hashes designed for integrity checks; graphics cards (GPUs) can compute billions of SHA-256 hashes per second to brute-force passwords. **Bcrypt** is a slow, computationally intensive hashing algorithm with an adaptive work factor (salt rounds). It incorporates a random 16-byte salt to prevent rainbow table lookups and consumes CPU time (e.g. 10 rounds ≈ 100ms per attempt), making brute-force attacks computationally infeasible.

### Q19. How does AssetFlow prevent user enumeration attacks during login?
**Answer:** Constant-time verification. When an administrator submits an unknown username, the authentication service executes a dummy bcrypt comparison against a pre-computed hash. Because bcrypt takes the same time to process whether the username exists or not, an attacker cannot determine valid usernames by measuring server response times.

### Q20. How is brute-force login guessing mitigated?
**Answer:** Using `express-rate-limit` attached to `/api/auth/login`. If more than 5 failed login attempts originate from the same IP address within a 15-minute window, the endpoint temporarily blocks requests with `HTTP 429 Too Many Requests`.

---

## Category 5: Business Logic, State Machines & Concurrency

### Q21. Explain the Hardware Asset Lifecycle state machine.
**Answer:** Physical assets exist in one of four mutually exclusive states:
1. `AVAILABLE`: In inventory, ready for deployment (`assigned_to = NULL`).
2. `ASSIGNED`: In active employee custody (`assigned_to = employee_id`).
3. `UNDER_MAINTENANCE`: Hardware defect or repair; blocked from assignment.
4. `RETIRED`: Decommissioned or recycled; terminal state, permanently blocked from assignment.

### Q22. What happens if two administrators attempt to assign the same available laptop simultaneously?
**Answer:** A race condition is prevented through atomic SQLite transactions:
1. The transaction executes an atomic update query with a predicate check:
   ```sql
   UPDATE hardware_assets 
   SET status = 'ASSIGNED', assigned_to = ? 
   WHERE id = ? AND status = 'AVAILABLE';
   ```
2. The first administrator's query succeeds and changes 1 row.
3. The second administrator's query finds 0 rows matching `status = 'AVAILABLE'`, causing the transaction to roll back and return `HTTP 409 Conflict` ("Asset is no longer available").

### Q23. Why does AssetFlow prevent physical deletion of assets or employees with assignment history?
**Answer:** Regulatory compliance and audit integrity. In corporate IT governance (SOC 2, ISO 27001), equipment chain-of-custody records must be preserved for several years. If an employee leaves or a device is broken, deleting the database row would orphan foreign keys in `assignment_history`. AssetFlow enforces **Safe Deletion Guards**: `DELETE` requests return `HTTP 409 Conflict` if historical records exist. Employees are marked `TERMINATED`, and assets are marked `RETIRED`.

### Q24. How is software license seat allocation managed, and what invariant is enforced?
**Answer:**
- **Invariant:** `0 <= used_quantity <= total_quantity` and `available_quantity = total_quantity - used_quantity`.
- When a seat is allocated, `used_quantity` increments atomically.
- When an allocation is revoked, `used_quantity` decrements, recycling the seat back into the available pool.
- Duplicate active seat allocations to the same employee are rejected with `HTTP 409 Conflict`.

### Q25. Why is license seat revocation non-destructive?
**Answer:** When an administrator revokes a software seat, the row in `license_allocations` is **not deleted**. Instead, its `revoked_at` column is updated with the current UTC timestamp (`CURRENT_TIMESTAMP`). This preserves complete historical proof that the employee previously held the license, which is essential during software vendor audits.

---

## Category 6: Expiry Calculations, Reporting & CSV Security

### Q26. How does AssetFlow calculate license and warranty expirations without cron jobs?
**Answer:** AssetFlow uses **on-demand UTC mathematical classification**:
1. At request time, the stored ISO date (`YYYY-MM-DD`) is parsed into a UTC millisecond timestamp at midnight (`00:00:00Z`).
2. The current date is parsed into a UTC midnight timestamp.
3. The difference in days is computed: `Math.round((expiryUTC - currentUTC) / (1000 * 60 * 60 * 24))`.
4. Discrete classification buckets are assigned:
   - `days_remaining < 0`: `EXPIRED`
   - `0 <= days_remaining <= 7`: `EXPIRING_7_DAYS`
   - `8 <= days_remaining <= 30`: `EXPIRING_30_DAYS`
   - `days_remaining > 30`: `VALID`
   - `expiry_date IS NULL`: `NO_EXPIRY`

### Q27. What is Formula Injection (CWE-1236), and how does AssetFlow defend against it?
**Answer:**
- **The Vulnerability:** When users export CSV files and open them in Microsoft Excel or Google Sheets, any cell beginning with `=`, `+`, `-`, or `@` is interpreted as a spreadsheet formula or macro. An attacker could name an asset `=cmd|' /C calc'!A0` to execute arbitrary commands on an auditor's machine.
- **AssetFlow's Defense:** In `report.service.js`, the `sanitizeCsvCell()` function inspects every string value. If a cell begins with a dangerous prefix (`=`, `+`, `-`, `@`, `\t`, `\r`), it automatically prepends an apostrophe (`'`). Excel renders `'=formula` as safe text and neutralizes macro execution.

### Q28. What 7 compliance reports are generated by AssetFlow?
**Answer:**
1. `asset_inventory`: Complete IT hardware asset inventory.
2. `assigned_assets`: Currently assigned hardware with employee and department details.
3. `assignment_history`: Complete chronological chain-of-custody transfer records.
4. `license_inventory`: Software licenses with purchased, allocated, and available seat counts.
5. `seat_utilization`: License seat utilization percentages and over-subscription metrics.
6. `expired_licenses`: High-risk expired software licenses.
7. `expiring_licenses`: Urgent subscriptions expiring within 30 days.

---

## Category 7: Software Testing & Quality Assurance

### Q29. What automated testing strategies were implemented in AssetFlow?
**Answer:** A dual-layer automated testing pyramid:
1. **Backend Integration Tests (110 tests):** Executed using Node.js's built-in test runner (`node --test`) and Supertest. Tests verify HTTP status codes, security middleware, timing attacks, atomic transactions, foreign key cascades, and CSV formula sanitization against an isolated SQLite test database.
2. **Frontend Component & Flow Tests (41 tests):** Executed using Vitest, React Testing Library, and jsdom. Tests verify login validation, session state restoration, route protection, modal workflows, search filtering, and CSV download triggers.
- **Total:** **151 automated tests passing with zero failures**.

### Q30. Why is it critical to use an isolated test database rather than the development database?
**Answer:** Test isolation ensures that running automated test suites (which create dummy assets, trigger rollbacks, and revoke licenses) does not corrupt, alter, or wipe real demonstration records in `data/asset_management.db`. Each test suite creates a temporary SQLite file (e.g. `data/test_auth_db.db`), migrates it, runs assertions, and deletes the test file upon completion.

### Q31. What is the difference between a unit test and an integration test?
**Answer:**
- **Unit Test:** Tests an isolated function or method in complete isolation, mocking external dependencies (e.g. testing `sanitizeCsvCell()` in isolation).
- **Integration Test:** Tests multiple components working together (e.g. sending an HTTP request via Supertest that traverses Express routing, rate limiting, authentication middleware, controller, domain service, and writes real rows into SQLite).

---

## Category 8: Advanced Technical Deep-Dives

### Q32. What is a race condition in web applications, and how did you prevent it during license seat allocation?
**Answer:** A race condition occurs when concurrent asynchronous requests attempt to modify shared state simultaneously. If only 1 license seat remains and two administrators submit allocations at the exact same millisecond:
- Without protection, both requests read `used_quantity = 9` (where total is 10), and both increment it to 10, resulting in 11 active allocations (an illegal over-allocation).
- AssetFlow neutralizes this by enforcing an atomic update query at the database level:
  ```sql
  UPDATE software_licenses SET used_quantity = used_quantity + 1 WHERE id = ? AND used_quantity < total_quantity;
  ```
  The database engine serializes the write: the first transaction updates 1 row; the second transaction updates 0 rows and is immediately rejected with `HTTP 409 Conflict`.

### Q33. What is transaction rollback, and how is it implemented in AssetFlow?
**Answer:** Transaction rollback cancels all pending SQL statements inside an active transaction, restoring the database to its exact pre-transaction state. In AssetFlow's `database.js`, the `transaction()` wrapper wraps operations inside `BEGIN IMMEDIATE TRANSACTION`. If any error or validation failure occurs within the callback, it executes `ROLLBACK TRANSACTION` and re-throws the error, guaranteeing zero partial writes.

### Q34. How does the frontend handle session restoration on page reload?
**Answer:** When the user refreshes their browser:
1. The React `AuthProvider` initializes with `loading: true`.
2. It sends a background request: `GET /api/auth/me` with `credentials: 'include'`.
3. If the browser holds a valid, unexpired `session_id` cookie, the backend returns HTTP 200 with the sanitized administrator profile.
4. The React context sets `isAuthenticated: true` and renders the protected route.
5. If the cookie is expired or missing, the backend returns HTTP 401, and the `ProtectedRoute` component redirects the user to `/login`.

### Q35. What is the difference between SQL injection and Parameterized Queries?
**Answer:**
- **SQL Injection:** Occurs when untrusted user input is directly concatenated into an SQL string (e.g. `"SELECT * FROM users WHERE name = '" + input + "'"`), allowing an attacker to inject arbitrary SQL statements (`' OR '1'='1`).
- **Parameterized Queries:** Separate SQL code from user data. The SQL statement is compiled by the database engine with parameter placeholders (`?`), and user values are passed as bound parameters. The database engine always treats input values strictly as literal data, never as executable SQL code.

### Q36. What is the difference between authentication and authorization in AssetFlow?
**Answer:**
- **Authentication:** Verifying *who* the user is (e.g. checking credentials and issuing an `HttpOnly` cookie).
- **Authorization:** Verifying *what* the authenticated user is permitted to do. AssetFlow stores a `role` attribute (`SUPERADMIN`, `ADMIN`) on the administrator profile and enforces role-based access control (RBAC) in route guards.

### Q37. What are HTTP status codes, and what specific codes does AssetFlow return?
**Answer:** Standard three-digit responses indicating request outcomes:
- `200 OK`: Request succeeded (GET, PUT, return asset).
- `201 Created`: Resource successfully created (POST new asset, employee, license).
- `400 Bad Request`: Input validation failed (missing required fields, negative cost).
- `401 Unauthorized`: Authentication missing, token invalid, or session expired.
- `403 Forbidden`: CORS origin violation or unauthorized privilege level.
- `404 Not Found`: Targeted resource ID does not exist in the database.
- `409 Conflict`: Business logic violation (duplicate asset tag, no remaining license seats, deleting asset with history).
- `429 Too Many Requests`: Rate limiter triggered (brute-force defense).
- `500 Internal Server Error`: Unhandled server exception.
- `503 Service Unavailable`: Backend degraded or database disconnected.

### Q38. How does AssetFlow ensure zero plaintext secrets or tokens in application logs?
**Answer:**
1. Error handling middleware sanitizes error objects before logging, stripping request bodies from authentication routes.
2. The `audit_logs` service records action names, entity IDs, timestamps, and administrator IDs, but strictly excludes password parameters and raw session tokens.
3. Repositories return sanitized profiles (`id`, `username`, `full_name`, `email`, `role`), explicitly omitting `password_hash`.

### Q39. What is the purpose of `.gitignore`, and what files are excluded in AssetFlow?
**Answer:** Git tracking ignores files that contain environment secrets, platform-specific binaries, or transient build outputs:
- `backend/.env` (contains server environment variables)
- `data/*.db` and `data/*.db-wal` (local SQLite databases)
- `node_modules/` (third-party dependencies)
- `frontend/dist/` (compiled production bundle)

### Q40. If you were given a $50/month cloud budget, what AWS services would you deploy?
**Answer:**
1. **Compute:** AWS App Runner ($5–$15/month) running the containerized Express.js API with automated zero-downtime deployments.
2. **Database:** Amazon RDS PostgreSQL (`db.t4g.micro`, ~$15–$18/month) with automated daily snapshots and Multi-AZ disabled for development.
3. **Storage & CDN:** Amazon S3 and Amazon CloudFront (~$1–$3/month) for static React SPA hosting and PDF storage.
4. **DNS & Security:** AWS Route 53 ($0.50/hosted zone) and AWS Certificate Manager (free public SSL/TLS certificates).
5. **Monitoring:** Amazon CloudWatch with a strict **$20 Budget Alarm** via SNS.

### Q41. How does the frontend handle loading and error states gracefully?
**Answer:** Every React component (`AssetsPage`, `LicensesPage`, `ReportsPage`) maintains three distinct local state variables: `data`, `loading`, and `error`.
- While fetching, UI displays accessible loading skeletons or spinner indicators.
- If an API call fails, an `AlertCircle` banner renders the exact error message with a prominent **Retry** button.
- If an API returns an empty list, a specialized empty-state card guides the user to create their first record.

### Q42. What are the key takeaways from building AssetFlow?
**Answer:**
1. Enterprise web applications require defense-in-depth security: `HttpOnly` cookies, rate limiting, and SQL parameterization.
2. Relational databases with ACID transactions and constraints are crucial for preventing business state inconsistencies (such as phantom asset custody or license over-allocation).
3. Cloud architecture requires understanding physical constraints: the transition from local SQLite to cloud containers mandates migrating to persistent managed databases (like Amazon RDS) due to container filesystem ephemerality.
4. Comprehensive automated test suites (151 tests) allow rapid, confident refactoring without regressions.
