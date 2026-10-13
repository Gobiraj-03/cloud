# Database Schema and Data Model Specification

## 1. Relational Model Overview

The database design adheres to 3rd Normal Form (3NF) principles while maintaining strict referential integrity, indexing for high-frequency queries, and immutable auditability.

All table designs are created with **dialect portability** in mind:
- **Development Engine**: SQLite 3 (using parameterized SQL queries and `PRAGMA foreign_keys = ON;`).
- **Target Cloud Engine**: Amazon RDS PostgreSQL (convertible without altering application-level business logic).

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
         | 1:N (RESTRICT)                 | 1:N (RESTRICT) |
         v                                v                |
+--------------------------+    +-----------------------+  |
| asset_assignment_history |    |  license_allocations  |  |
+--------------------------+    +-----------------------+  |
| PK  id                   |    | PK  id                |  |
| FK  asset_id (RESTRICT)  |    | FK  license_id        |  |
| FK  employee_id          |    | FK  employee_id (opt) |  |
|     action               |    | FK  asset_id (opt)    |  |
|     action_date          |    |     allocated_at      |  |
| FK  performed_by_admin   |    +-----------^-----------+  |
|     notes                |                |              |
+-------------^------------+                |              |
              | 1:N (RESTRICT)              | N:1          |
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

## 3. Implemented DDL Table Specifications (Module 1)

### 3.1 `administrators`
Stores credentials for authorized IT operators. Password hashes use salted bcrypt (never plaintext).
```sql
CREATE TABLE IF NOT EXISTS administrators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SUPERADMIN' CHECK (role IN ('SUPERADMIN', 'OPERATOR')),
    created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
    last_login TEXT NULL
);
```

---

### 3.2 `employees`
Directory of corporate personnel eligible to receive assets and licenses.
```sql
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_code TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    designation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED')),
    created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
    updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);
```

---

### 3.3 `assets`
Primary registry for physical computing hardware. Implements a multi-column check constraint ensuring status and employee assignment invariants.
```sql
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_tag TEXT NOT NULL UNIQUE,
    serial_number TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('LAPTOP', 'DESKTOP', 'MONITOR', 'PRINTER', 'NETWORKING', 'MOBILE', 'OTHER')),
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    purchase_date TEXT NOT NULL,
    purchase_cost REAL NOT NULL DEFAULT 0.00 CHECK (purchase_cost >= 0),
    warranty_expiry TEXT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED')),
    current_employee_id INTEGER NULL,
    notes TEXT NULL,
    created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
    updated_at TEXT NOT NULL DEFAULT (DATETIME('now')),
    FOREIGN KEY (current_employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
    CHECK (
        (status = 'ASSIGNED' AND current_employee_id IS NOT NULL) OR
        (status != 'ASSIGNED' AND current_employee_id IS NULL)
    )
);
```

---

### 3.4 `asset_assignment_history`
Immutable audit log recording every custody change, maintenance transit, and asset retirement.
```sql
CREATE TABLE IF NOT EXISTS asset_assignment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    employee_id INTEGER NULL,
    action TEXT NOT NULL CHECK (action IN ('ASSIGNED', 'RETURNED', 'SENT_TO_MAINTENANCE', 'RETURNED_FROM_MAINTENANCE', 'RETIRED')),
    action_date TEXT NOT NULL DEFAULT (DATETIME('now')),
    performed_by_admin_id INTEGER NULL,
    notes TEXT NULL,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
    FOREIGN KEY (performed_by_admin_id) REFERENCES administrators(id) ON DELETE SET NULL
);
```

---

### 3.5 `software_licenses`
Registry for software suites, cloud subscriptions, and volume license agreements with seat bounds.
```sql
CREATE TABLE IF NOT EXISTS software_licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_code TEXT NOT NULL UNIQUE,
    software_name TEXT NOT NULL,
    vendor TEXT NOT NULL,
    license_type TEXT NOT NULL CHECK (license_type IN ('PERPETUAL', 'ANNUAL_SUBSCRIPTION', 'MONTHLY_SUBSCRIPTION', 'VOLUME_SEAT', 'OEM')),
    total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
    used_quantity INTEGER NOT NULL DEFAULT 0 CHECK (used_quantity >= 0 AND used_quantity <= total_quantity),
    purchase_date TEXT NOT NULL,
    expiry_date TEXT NULL,
    purchase_cost REAL NOT NULL DEFAULT 0.00 CHECK (purchase_cost >= 0),
    renewal_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (renewal_status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED')),
    notes TEXT NULL,
    created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
    updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);
```

---

### 3.6 `license_allocations`
Tracks the exact assignment of individual license seats to specific employees or hardware assets.
```sql
CREATE TABLE IF NOT EXISTS license_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER NOT NULL,
    employee_id INTEGER NULL,
    asset_id INTEGER NULL,
    allocated_at TEXT NOT NULL DEFAULT (DATETIME('now')),
    notes TEXT NULL,
    FOREIGN KEY (license_id) REFERENCES software_licenses(id) ON DELETE RESTRICT,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
    CHECK (employee_id IS NOT NULL OR asset_id IS NOT NULL)
);
```

---

### 3.7 `audit_logs`
System-wide immutable administrative activity trail for compliance and security viva defense.
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('AUTH', 'ASSET', 'EMPLOYEE', 'LICENSE', 'SYSTEM')),
    entity_id INTEGER NULL,
    details TEXT NULL,
    timestamp TEXT NOT NULL DEFAULT (DATETIME('now')),
    FOREIGN KEY (admin_id) REFERENCES administrators(id) ON DELETE SET NULL
);
```

---

## 4. Query Optimization Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_current_emp ON assets(current_employee_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_asset ON asset_assignment_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_employee ON asset_assignment_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_licenses_code ON software_licenses(license_code);
CREATE INDEX IF NOT EXISTS idx_allocations_license ON license_allocations(license_id);
CREATE INDEX IF NOT EXISTS idx_allocations_employee ON license_allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
```

---

## 5. Verified Data Integrity Rules

1. **Assignment Integrity**:
   - `ON DELETE RESTRICT` is enforced on foreign keys linking `assets` to `employees`. An employee holding an assigned asset cannot be deleted until the asset is returned.
   - The multi-column constraint `CHECK ((status = 'ASSIGNED' AND current_employee_id IS NOT NULL) OR (status != 'ASSIGNED' AND current_employee_id IS NULL))` prevents unassigned assets from holding employee IDs and prevents assigned assets from lacking an employee.
2. **License Over-Allocation Invariant**:
   - `used_quantity` is bounded at the schema level by `CHECK (used_quantity >= 0 AND used_quantity <= total_quantity)`.
   - `total_quantity` must be strictly positive: `CHECK (total_quantity > 0)`.
3. **Historical Custody Immutability**:
   - Foreign key constraint on `asset_assignment_history.asset_id` uses `ON DELETE RESTRICT`. Historical records cannot be orphaned or deleted by deleting an asset.
