# Architecture Diagrams Index — AssetFlow

This directory contains comprehensive visual architecture diagrams created with standard Mermaid syntax for the **Cloud-Based IT Asset Lifecycle & Software License Management System (AssetFlow)**.

---

## Diagram Catalog

| # | Diagram Title | File | Focus Area |
| :---: | :--- | :--- | :--- |
| 1 | **System Architecture** | [system-architecture.md](file:///d:/cloud/docs/diagrams/system-architecture.md) | Layered enterprise architecture: React SPA → Gateway/Security → Express Controllers → Domain Services → Repositories → SQLite database. |
| 2 | **Authentication Sequence** | [auth-sequence.md](file:///d:/cloud/diagrams/auth-sequence.md) | End-to-end authentication lifecycle: login, timing-safe bcrypt comparison, `HttpOnly` cookie generation, protected route validation, and instant server-side revocation on logout. |
| 3 | **Asset Lifecycle State Machine** | [asset-lifecycle.md](file:///d:/cloud/docs/diagrams/asset-lifecycle.md) | Finite state machine for physical hardware assets (`AVAILABLE` ↔ `ASSIGNED` → `UNDER_MAINTENANCE` → `RETIRED`) and atomic assignment/return transactions. |
| 4 | **License Allocation & Revocation** | [license-lifecycle.md](file:///d:/cloud/docs/diagrams/license-lifecycle.md) | Software seat capacity invariant enforcement (`0 <= used <= total`), atomic seat decrement, non-destructive revocation timestamps, and race condition prevention. |
| 5 | **Expiry Classification Engine** | [expiry-engine.md](file:///d:/cloud/docs/diagrams/expiry-engine.md) | Mathematical decision tree evaluating UTC date boundaries directly against stored ISO dates without cron background polling. |
| 6 | **Report Generation & CSV Export** | [reports-csv-export.md](file:///d:/cloud/docs/diagrams/reports-csv-export.md) | Tabular preview pipeline and spreadsheet formula-injection defense (`sanitizeCsvCell` neutralizing `=, +, -, @, \t, \r`). |
| 7 | **Current Local Deployment** | [local-deployment.md](file:///d:/cloud/docs/diagrams/local-deployment.md) | Stage A local execution topology: Windows host, Vite dev proxy (5173), Express API (5000), embedded SQLite file, and WAL journal mode at ₹0 cost. |
| 8 | **Proposed Future Cloud Architecture** | [cloud-architecture-proposed.md](file:///d:/cloud/docs/diagrams/cloud-architecture-proposed.md) | Stage B prospective AWS cloud blueprint (App Runner, RDS PostgreSQL, S3/CloudFront) with in-depth analysis of why ephemeral container storage prevents using SQLite in the cloud. |

---

## Viewing Instructions
- **In IDE / Markdown Preview:** Open any `.md` file; compatible markdown viewers render Mermaid diagrams automatically.
- **In GitHub / GitLab:** Mermaid fenced code blocks (` ```mermaid `) render natively.
