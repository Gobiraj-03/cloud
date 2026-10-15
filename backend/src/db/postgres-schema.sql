-- ==============================================================================
-- DATABASE SCHEMA: IT ASSET LIFECYCLE & SOFTWARE LICENSE MANAGEMENT SYSTEM
-- Target: PostgreSQL 14+ / Amazon RDS PostgreSQL
-- ==============================================================================

-- 1. ADMINISTRATORS TABLE
-- Internal IT administrators authorized to manage assets and software licenses
CREATE TABLE IF NOT EXISTS administrators (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'SUPERADMIN' CHECK (role IN ('SUPERADMIN', 'OPERATOR')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ NULL
);

-- 2. EMPLOYEES TABLE
-- Directory of corporate personnel eligible to receive assets and licenses
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. ASSETS TABLE
-- Hardware assets across procurement, assignment, maintenance, and retirement
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_tag VARCHAR(50) NOT NULL UNIQUE,
    serial_number VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('LAPTOP', 'DESKTOP', 'MONITOR', 'PRINTER', 'NETWORKING', 'MOBILE', 'OTHER')),
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    purchase_date VARCHAR(50) NOT NULL,
    purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_cost >= 0),
    warranty_expiry VARCHAR(50) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED')),
    current_employee_id INTEGER NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (current_employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
    CHECK (
        (status = 'ASSIGNED' AND current_employee_id IS NOT NULL) OR
        (status != 'ASSIGNED' AND current_employee_id IS NULL)
    )
);

-- 4. ASSET ASSIGNMENT HISTORY TABLE
-- Immutable audit log recording all custody changes, repairs, and returns
CREATE TABLE IF NOT EXISTS asset_assignment_history (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    employee_id INTEGER NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('ASSIGNED', 'RETURNED', 'SENT_TO_MAINTENANCE', 'RETURNED_FROM_MAINTENANCE', 'RETIRED')),
    action_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_by_admin_id INTEGER NULL,
    notes TEXT NULL,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
    FOREIGN KEY (performed_by_admin_id) REFERENCES administrators(id) ON DELETE SET NULL
);

-- 5. SOFTWARE LICENSES TABLE
-- Software products, subscriptions, seat caps, and compliance metadata
CREATE TABLE IF NOT EXISTS software_licenses (
    id SERIAL PRIMARY KEY,
    license_code VARCHAR(100) NOT NULL UNIQUE,
    software_name VARCHAR(255) NOT NULL,
    vendor VARCHAR(100) NOT NULL,
    license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('PERPETUAL', 'ANNUAL_SUBSCRIPTION', 'MONTHLY_SUBSCRIPTION', 'VOLUME_SEAT', 'OEM')),
    total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
    used_quantity INTEGER NOT NULL DEFAULT 0 CHECK (used_quantity >= 0 AND used_quantity <= total_quantity),
    purchase_date VARCHAR(50) NOT NULL,
    expiry_date VARCHAR(50) NULL,
    purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_cost >= 0),
    renewal_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (renewal_status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED')),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. LICENSE ALLOCATIONS TABLE
-- Tracks individual seat allocations to specific employees or hardware assets
CREATE TABLE IF NOT EXISTS license_allocations (
    id SERIAL PRIMARY KEY,
    license_id INTEGER NOT NULL,
    employee_id INTEGER NULL,
    asset_id INTEGER NULL,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    FOREIGN KEY (license_id) REFERENCES software_licenses(id) ON DELETE RESTRICT,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
    CHECK (employee_id IS NOT NULL OR asset_id IS NOT NULL)
);

-- 7. AUDIT LOGS TABLE
-- Append-only system activity log for administrative tracking and security compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('AUTH', 'ASSET', 'EMPLOYEE', 'LICENSE', 'SYSTEM')),
    entity_id INTEGER NULL,
    details TEXT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES administrators(id) ON DELETE SET NULL
);

-- 8. SESSIONS TABLE
-- Server-managed session store for active administrator authentication sessions
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50) NULL,
    user_agent TEXT NULL,
    FOREIGN KEY (admin_id) REFERENCES administrators(id) ON DELETE CASCADE
);

-- ==============================================================================
-- INDEXES FOR HIGH-FREQUENCY QUERY OPTIMIZATION
-- ==============================================================================

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
CREATE INDEX IF NOT EXISTS idx_sessions_admin ON sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
