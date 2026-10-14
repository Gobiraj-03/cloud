# Software License Allocation & Revocation Workflow

## Overview

Software license seat management requires strict concurrency controls to prevent license over-allocation (e.g. allocating 11 seats of a 10-seat license) and audit trails for compliance audits (BSA / vendor reviews). AssetFlow guarantees seat capacity invariants through conditional atomic SQL updates and non-destructive revocation timestamps.

## Mermaid License Invariant State Flow

```mermaid
graph TD
    subgraph LicenseCapacity ["Seat Invariant: 0 <= used_quantity <= total_quantity"]
        TotalSeats["Total Purchased Seats (total_quantity)"]
        UsedSeats["Allocated Seats (used_quantity)"]
        AvailSeats["Available Capacity = total_quantity - used_quantity"]
    end

    subgraph AllocationAction ["Seat Allocation (POST /api/licenses/:id/allocations)"]
        CheckEmp{"Is Employee ACTIVE?"}
        CheckDup{"Employee already has active seat?"}
        CheckSeats{"used_quantity < total_quantity?"}
        AllocSuccess["Atomic Allocation:\n1. INSERT license_allocations\n2. UPDATE software_licenses used_quantity = used_quantity + 1\n3. INSERT audit_log"]
    end

    subgraph RevocationAction ["Seat Revocation (POST /api/licenses/:id/allocations/:allocId/revoke)"]
        CheckActive{"Is revoked_at IS NULL?"}
        RevokeSuccess["Atomic Revocation:\n1. UPDATE license_allocations SET revoked_at = NOW\n2. UPDATE software_licenses used_quantity = used_quantity - 1\n3. INSERT audit_log"]
    end

    CheckEmp -->|No: TERMINATED/ON_LEAVE| RejectEmp[HTTP 409: Employee Inactive]
    CheckEmp -->|Yes| CheckDup
    CheckDup -->|Yes| RejectDup[HTTP 409: Seat Already Allocated]
    CheckDup -->|No| CheckSeats
    CheckSeats -->|No: Capacity Exhausted| RejectSeats[HTTP 409: No Available Seats]
    CheckSeats -->|Yes: Seats Available| AllocSuccess

    CheckActive -->|No: Already Revoked| RejectRevoke[HTTP 409: Already Revoked]
    CheckActive -->|Yes| RevokeSuccess
```

## Mermaid Concurrency & Atomic Revocation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Admin as IT Administrator
    participant API as License Service
    participant DB as SQLite Database

    %% Allocation
    Note over Admin, DB: Allocation Flow with Atomic Invariant Protection
    Admin->>API: POST /api/licenses/:id/allocations { employee_id }
    API->>DB: BEGIN IMMEDIATE TRANSACTION
    API->>DB: Check active employee & check existing active allocation
    alt Duplicate or Inactive
        API-->>Admin: HTTP 409 Conflict
    else Valid Candidate
        API->>DB: UPDATE software_licenses SET used_quantity = used_quantity + 1 WHERE id = ? AND used_quantity < total_quantity
        alt Zero rows updated (Race Condition: Another admin took last seat)
            API->>DB: ROLLBACK
            API-->>Admin: HTTP 409 Conflict ("No available seats remaining")
        else Row Updated Successfully
            API->>DB: INSERT INTO license_allocations (license_id, employee_id, allocated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
            API->>DB: INSERT INTO audit_logs (action: 'LICENSE_ALLOCATED')
            API->>DB: COMMIT TRANSACTION
            API-->>Admin: HTTP 201 Created (Allocation Details)
        end
    end

    %% Revocation
    Note over Admin, DB: Revocation Flow (Seat Recycling & History Preservation)
    Admin->>API: POST /api/licenses/:id/allocations/:allocId/revoke
    API->>DB: BEGIN IMMEDIATE TRANSACTION
    API->>DB: UPDATE license_allocations SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND license_id = ? AND revoked_at IS NULL
    alt Zero rows updated (Already revoked or non-existent)
        API->>DB: ROLLBACK
        API-->>Admin: HTTP 409 Conflict ("Allocation has already been revoked")
    else Row Updated
        API->>DB: UPDATE software_licenses SET used_quantity = used_quantity - 1 WHERE id = ? AND used_quantity > 0
        API->>DB: INSERT INTO audit_logs (action: 'LICENSE_REVOKED')
        API->>DB: COMMIT TRANSACTION
        API-->>Admin: HTTP 200 OK ("Seat successfully revoked and returned to pool")
    end
```

## Compliance Guarantees

1. **Non-Destructive Revocation:** When an employee leaves a department, their allocation record is not deleted; its `revoked_at` timestamp is recorded. This preserves complete historical evidence for vendor compliance audits.
2. **Safe Deletion Prevention:** Licenses with historical or active allocations cannot be deleted from the database (`HTTP 409 Conflict`). Administrators must mark them `CANCELLED` instead.
