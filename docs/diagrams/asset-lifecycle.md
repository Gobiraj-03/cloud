# Hardware Asset Lifecycle State Machine & Workflow

## Overview

Physical IT assets (laptops, servers, networking devices, monitors) transition through an audited, deterministic finite state machine. Transitions are atomic: assigning or returning an asset updates custody and writes a chronological audit trail in `assignment_history` within an ACID database transaction.

## Mermaid State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE: Asset Provisioned (POST /api/assets)

    AVAILABLE --> ASSIGNED: Assign to Active Employee (POST /api/assets/:id/assign)
    ASSIGNED --> AVAILABLE: Return to Inventory (POST /api/assets/:id/return)

    AVAILABLE --> UNDER_MAINTENANCE: Hardware Fault / Repair Needed
    UNDER_MAINTENANCE --> AVAILABLE: Repair Complete / QA Passed

    AVAILABLE --> RETIRED: End of Life / Decommissioned (PUT /api/assets/:id)
    UNDER_MAINTENANCE --> RETIRED: Beyond Economical Repair

    RETIRED --> [*]: Asset Permanently Decommissioned

    note right of AVAILABLE
        Eligible for assignment.
        assigned_to = NULL
    end note

    note right of ASSIGNED
        In employee custody.
        assigned_to = employee_id
        Active row in assignment_history
    end note

    note right of UNDER_MAINTENANCE
        Blocked from assignment.
        Cannot be assigned to personnel.
    end note

    note right of RETIRED
        Terminal status.
        Blocked from all assignments.
    end note
```

## Mermaid Assignment & Return Transaction Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Admin as IT Administrator
    participant API as Asset Controller & Service
    participant DB as SQLite (ACID Transaction)

    %% Assignment Workflow
    Note over Admin, DB: Workflow A: Assigning Asset to Employee
    Admin->>API: POST /api/assets/:id/assign { employee_id, notes }
    API->>DB: BEGIN IMMEDIATE TRANSACTION
    API->>DB: SELECT status FROM hardware_assets WHERE id = ?
    alt Asset Status != 'AVAILABLE'
        API->>DB: ROLLBACK
        API-->>Admin: HTTP 409 Conflict ("Asset is not AVAILABLE")
    else Asset is AVAILABLE
        API->>DB: SELECT status FROM employees WHERE id = ?
        alt Employee Status != 'ACTIVE'
            API->>DB: ROLLBACK
            API-->>Admin: HTTP 409 Conflict ("Employee is not ACTIVE")
        else Employee is Eligible
            API->>DB: UPDATE hardware_assets SET status = 'ASSIGNED', assigned_to = ? WHERE id = ?
            API->>DB: INSERT INTO assignment_history (asset_id, employee_id, assigned_date, notes) VALUES (?, ?, CURRENT_TIMESTAMP, ?)
            API->>DB: INSERT INTO audit_logs (action: 'ASSET_ASSIGNED', entity_id: asset_id)
            API->>DB: COMMIT TRANSACTION
            API-->>Admin: HTTP 200 OK (Updated Asset Object)
        end
    end

    %% Return Workflow
    Note over Admin, DB: Workflow B: Returning Asset from Custody
    Admin->>API: POST /api/assets/:id/return { notes }
    API->>DB: BEGIN IMMEDIATE TRANSACTION
    API->>DB: SELECT status, assigned_to FROM hardware_assets WHERE id = ?
    alt Asset Status != 'ASSIGNED'
        API->>DB: ROLLBACK
        API-->>Admin: HTTP 409 Conflict ("Asset is not currently ASSIGNED")
    else Asset is ASSIGNED
        API->>DB: UPDATE assignment_history SET return_date = CURRENT_TIMESTAMP, notes = coalesce(notes || ' | Return notes: ' || ?, notes) WHERE asset_id = ? AND return_date IS NULL
        API->>DB: UPDATE hardware_assets SET status = 'AVAILABLE', assigned_to = NULL WHERE id = ?
        API->>DB: INSERT INTO audit_logs (action: 'ASSET_RETURNED', entity_id: asset_id)
        API->>DB: COMMIT TRANSACTION
        API-->>Admin: HTTP 200 OK (Asset Returned to Pool)
    end
```

## Data Integrity Guarantees

1. **Custody Preservation:** Assets can never be deleted if an assignment record exists in `assignment_history` (HTTP 409 Conflict).
2. **Atomic Transition:** The update to `hardware_assets` and the insertion/closure of `assignment_history` occur within the same SQLite transaction. If either fails, all writes roll back.
3. **No Phantom Assignments:** Terminated employees or employees on leave cannot be assigned hardware.
