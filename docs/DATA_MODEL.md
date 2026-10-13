# Database Schema and Data Model Specification

## 1. Relational Model Overview

The database design adheres to 3rd Normal Form (3NF) principles while maintaining referential integrity, indexing for high-frequency queries, and auditability.

All table designs are created with **dialect portability** in mind:
- **Development Engine**: SQLite 3 (using parameterized SQL queries).
- **Target Cloud Engine**: Amazon RDS PostgreSQL (without altering application-level business logic).

---

## 2. Entity Relationship Diagram (ERD)

```
       +-----------------------+
       |     administrators    |
       +-----------------------+
       | PK  id                |
       |     username (UQ)     |
       |     email (UQ)        |
       |     password_hash     |
       |     full_name         |
       |     created_at        |
       +-----------+-----------+
                   |
       +-----------+-----------+
       |                       |
       v                       v
+---------------+     +-----------------------+
|  audit_logs   |     |       employees       |
+---------------+     +-----------------------+
| PK id         |     | PK  id                |
| FK admin_id   |     |     employee_code (UQ)|
|    action     |     |     first_name        |
|    entity_type|     |     last_name         |
|    entity_id  |     |     email (UQ)        |
|    details    |     |     department        |
|    timestamp  |     |     designation       |
+---------------+     |     status            |
                      +---+---------------+---+
                          |               |
         +----------------+               +----------------+
         | 1:N                            | 1:N            |
         v                                v                |
+--------------------------+    +-----------------------+  |
| asset_assignment_history |    |  license_allocations  |  |
+--------------------------+    +-----------------------+  |
| PK  id                   |    | PK  id                |  |
| FK  asset_id             |    | FK  license_id        |  |
| FK  employee_id          |    | FK  employee_id (opt) |  |
|     action               |    | FK  asset_id (opt)    |  |
|     action_date          |    |     allocated_at      |  |
| FK  performed_by_admin   |    +-----------^-----------+  |
|     notes                |                |              |
+-------------^------------+                |              |
              | 1:N                         | N:1          |
+-------------+------------+    +-----------+-----------+  |
|          assets          |    |   software_licenses   |  |
+--------------------------+    +-----------------------+  |
| PK  id                   |    | PK  id                |  |
|     asset_tag (UQ)       |    |     license_code (UQ) |  |
|     serial_number (UQ)   |    |     software_name     |  |
|     name                 |    |     vendor            |  |
|     category             |    |     license_type      |  |
|     manufacturer         |    |     total_quantity    |  |
|     model                |    |     used_quantity     |  |
|     purchase_date        |    |     purchase_date     |  |
|     purchase_cost        |    |     expiry_date       |  |
|     warranty_expiry      |    |     purchase_cost     |  |
|     status               |    |     renewal_status    |  |
| FK  current_employee_id -+----+-----------------------+--+
+--------------------------+
```

---

## 3. Detailed Table Specifications

### 3.1 `administrators`
Stores credentials for authorized IT operators. Registration is restricted in production.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique admin identifier |
| `username` | VARCHAR(50) | NOT NULL, UNIQUE | Admin login username |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE | Official admin email address |
| `password_hash` | VARCHAR(255) | NOT NULL | Argon2 / bcrypt hashed password (salt included) |
| `full_name` | VARCHAR(100) | NOT NULL | Real name of administrator |
| `role` | VARCHAR(20) | NOT NULL DEFAULT 'SUPERADMIN' | Access role ('SUPERADMIN', 'OPERATOR') |
| `created_at` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Account creation date |
| `last_login` | DATETIME | NULL | Timestamp of most recent successful authentication |

---

### 3.2 `employees`
Directory of corporate staff eligible to receive hardware assets and software allocations.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique internal ID |
| `employee_code` | VARCHAR(20) | NOT NULL, UNIQUE | Corporate identifier (e.g., `EMP-1001`) |
| `first_name` | VARCHAR(50) | NOT NULL | Employee given name |
| `last_name` | VARCHAR(50) | NOT NULL | Employee surname |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE | Corporate email address |
| `department` | VARCHAR(50) | NOT NULL | Department (e.g., Engineering, HR, Finance) |
| `designation` | VARCHAR(50) | NOT NULL | Job title (e.g., Senior Systems Analyst) |
| `status` | VARCHAR(20) | NOT NULL DEFAULT 'ACTIVE' | Status: `ACTIVE`, `ON_LEAVE`, `TERMINATED` |
| `created_at` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

---

### 3.3 `assets`
Primary registry for physical computing hardware.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique internal asset ID |
| `asset_tag` | VARCHAR(30) | NOT NULL, UNIQUE | Scannable enterprise barcode/tag (e.g., `AST-2026-0042`) |
| `serial_number` | VARCHAR(60) | UNIQUE, NULL | Manufacturer hardware serial number |
| `name` | VARCHAR(100) | NOT NULL | Common asset description (e.g., `ThinkPad T14 Gen 4`) |
| `category` | VARCHAR(30) | NOT NULL | Enum: `LAPTOP`, `DESKTOP`, `MONITOR`, `PRINTER`, `NETWORKING`, `MOBILE`, `OTHER` |
| `manufacturer` | VARCHAR(50) | NOT NULL | OEM vendor (e.g., `Lenovo`, `Dell`, `Cisco`) |
| `model` | VARCHAR(50) | NOT NULL | Device model number / version |
| `purchase_date` | DATE | NOT NULL | Procurement date |
| `purchase_cost` | DECIMAL(10,2) | NOT NULL DEFAULT 0.00 | Procurement price in INR (₹) |
| `warranty_expiry`| DATE | NULL | Date on which OEM warranty expires |
| `status` | VARCHAR(25) | NOT NULL DEFAULT 'AVAILABLE' | Enum: `AVAILABLE`, `ASSIGNED`, `UNDER_MAINTENANCE`, `RETIRED` |
| `current_employee_id` | INTEGER | NULL, REFERENCES `employees(id)` | Current assignee (NULL if `AVAILABLE`, `UNDER_MAINTENANCE`, or `RETIRED`) |
| `notes` | TEXT | NULL | Administrative remarks, repair notes, or accessories included |
| `created_at` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

---

### 3.4 `asset_assignment_history`
Immutable audit log recording every custody change, maintenance transit, and asset retirement.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique log entry ID |
| `asset_id` | INTEGER | NOT NULL, REFERENCES `assets(id)` | Asset affected |
| `employee_id` | INTEGER | NULL, REFERENCES `employees(id)` | Recipient or returning employee |
| `action` | VARCHAR(30) | NOT NULL | Action: `ASSIGNED`, `RETURNED`, `SENT_TO_MAINTENANCE`, `RETURNED_FROM_MAINTENANCE`, `RETIRED` |
| `action_date` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Exact date and time of the transaction |
| `performed_by_admin_id` | INTEGER | NOT NULL, REFERENCES `administrators(id)` | Authenticated administrator executing action |
| `notes` | TEXT | NULL | Reason for return, damage report, or ticket reference |

---

### 3.5 `software_licenses`
Registry for software suites, cloud subscriptions, and volume license agreements.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique license ID |
| `license_code` | VARCHAR(40) | NOT NULL, UNIQUE | Enterprise reference code (e.g., `LIC-JETBRAINS-2026`) |
| `software_name` | VARCHAR(100) | NOT NULL | Application title (e.g., `JetBrains All Products Pack`) |
| `vendor` | VARCHAR(60) | NOT NULL | Software vendor (e.g., `JetBrains`, `Microsoft`, `Adobe`) |
| `license_type` | VARCHAR(30) | NOT NULL | Type: `PERPETUAL`, `ANNUAL_SUBSCRIPTION`, `MONTHLY_SUBSCRIPTION`, `VOLUME_SEAT`, `OEM` |
| `total_quantity` | INTEGER | NOT NULL CHECK (`total_quantity` > 0) | Total licensed seats purchased |
| `used_quantity` | INTEGER | NOT NULL DEFAULT 0 CHECK (`used_quantity` >= 0 AND `used_quantity` <= `total_quantity`) | Currently allocated seats |
| `purchase_date` | DATE | NOT NULL | Date license was procured or renewed |
| `expiry_date` | DATE | NULL | Expiration date (NULL for Perpetual licenses) |
| `purchase_cost` | DECIMAL(10,2) | NOT NULL DEFAULT 0.00 | Cost incurred in INR (₹) |
| `renewal_status` | VARCHAR(25) | NOT NULL DEFAULT 'ACTIVE' | Status: `ACTIVE`, `EXPIRING_SOON`, `EXPIRED`, `CANCELLED` |
| `notes` | TEXT | NULL | License key details, contract reference, PO numbers |
| `created_at` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

---

### 3.6 `license_allocations`
Tracks the exact assignment of individual license seats to specific employees or hardware assets.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Allocation record ID |
| `license_id` | INTEGER | NOT NULL, REFERENCES `software_licenses(id)` | Parent license record |
| `employee_id` | INTEGER | NULL, REFERENCES `employees(id)` | Employee user (if user-assigned) |
| `asset_id` | INTEGER | NULL, REFERENCES `assets(id)` | Hardware asset (if device-assigned) |
| `allocated_at` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Allocation timestamp |
| `notes` | TEXT | NULL | Special seat configuration or department tag |

---

### 3.7 `audit_logs`
System-wide immutable administrative activity trail for compliance and security viva defense.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Event log ID |
| `admin_id` | INTEGER | NULL, REFERENCES `administrators(id)` | Actor who triggered the event |
| `action` | VARCHAR(50) | NOT NULL | Action type (e.g., `LOGIN_SUCCESS`, `CREATE_ASSET`, `DELETE_EMPLOYEE`) |
| `entity_type` | VARCHAR(30) | NOT NULL | Domain entity (`AUTH`, `ASSET`, `EMPLOYEE`, `LICENSE`) |
| `entity_id` | INTEGER | NULL | Primary key ID of the affected entity |
| `details` | TEXT | NULL | JSON string capturing delta or contextual payload |
| `timestamp` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Event timestamp |

---

## 4. Key Integrity & Business Rules

1. **State Machine Invariants**:
   - An asset can only transition to `ASSIGNED` if its current status is `AVAILABLE`.
   - If an asset is `UNDER_MAINTENANCE` or `RETIRED`, `current_employee_id` MUST be set to `NULL`.
   - An employee with active asset assignments cannot be deleted without first returning or reassigning all held hardware.
2. **License Over-Allocation Invariants**:
   - `used_quantity` MUST NEVER exceed `total_quantity`.
   - Any allocation operation must verify `(total_quantity - used_quantity) > 0` within a database transaction before incrementing.
3. **Expiry Window Calculation**:
   - Licenses are categorized as `EXPIRING_SOON` when `expiry_date` is non-null and `(expiry_date - CURRENT_DATE)` falls within the range `[0, 30 days]`.
   - Licenses with `(expiry_date < CURRENT_DATE)` are categorized as `EXPIRED`.
4. **Historical Immutability**:
   - `asset_assignment_history` records are append-only. No `UPDATE` or `DELETE` operations are permitted on this table under normal operations.
