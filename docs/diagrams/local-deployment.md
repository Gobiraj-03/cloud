# Current Local Deployment Architecture — AssetFlow

## Overview

In Stage A (Local Development), AssetFlow runs entirely on the developer's laptop under Windows at strict ₹0 cost. No external cloud infrastructure, paid subscriptions, or container registries are required.

## Mermaid Local Deployment Topology

```mermaid
graph TB
    subgraph HostOS ["Host Machine (Windows 11 / Laptop - localhost)"]
        
        subgraph FrontendRuntime ["Frontend Process (Node.js / Vite)"]
            ViteDev["Vite Dev Server (Port 5173)\nReact 19 SPA + HMR"]
            ViteProxy["Vite Reverse Proxy (/api/* -> http://localhost:5000)"]
            BrowserTab["Web Browser (Chrome / Edge)\nhttp://localhost:5173"]
            BrowserTab -->|HTTP Requests| ViteDev
            ViteDev --> ViteProxy
        end

        subgraph BackendRuntime ["Backend Process (Node.js / Express.js)"]
            ExpressServer["Express HTTP Server (Port 5000)\nnode --watch server.js"]
            EnvFile["Local Config (.env)\nPORT=5000, CORS_ORIGIN=http://localhost:5173"]
            ExpressServer --- EnvFile
        end

        subgraph StorageLayer ["Local Filesystem Persistence"]
            DBFile["SQLite Database File\n(data/asset_management.db)\nWrite-Ahead Logging (WAL) Mode"]
            BackupFile["Safety Snapshot\n(data/asset_management.db.bak)"]
        end

        ViteProxy -->|"Proxy HTTP Traffic\ncredentials: include"| ExpressServer
        ExpressServer -->|"Synchronous / Asynchronous SQLite Calls\nPRAGMA foreign_keys = ON"| DBFile
    end

    classDef host fill:#f8fafc,stroke:#334155,stroke-width:2px;
    classDef proc fill:#eff6ff,stroke:#2563eb,stroke-width:1.5px;
    classDef store fill:#f0fdf4,stroke:#16a34a,stroke-width:1.5px;
    class HostOS host;
    class FrontendRuntime,BackendRuntime proc;
    class StorageLayer store;
```

## Local Architecture Characteristics

| Attribute | Local Implementation | Rationale |
| :--- | :--- | :--- |
| **Hosting Model** | Local processes managed by npm scripts | ₹0 cloud spending, zero cloud credential risks |
| **Frontend Server** | Vite Dev Server on `http://localhost:5173` | Instant Hot Module Replacement (HMR) and automatic API proxying |
| **Backend Server** | Node.js + Express on `http://localhost:5000` | Native Node `--watch` reload on file edits |
| **Database** | Embedded SQLite 3 file in `data/asset_management.db` | Single file, zero-configuration, atomic ACID transactions, no background database server needed |
| **Session Storage** | Dedicated `sessions` table in SQLite file | Server-managed session lifecycle with automatic database-level TTL checks |
| **Security Envelope** | `CORS_ORIGIN=http://localhost:5173`, `SameSite=Lax`, `HttpOnly=true` | Strict browser isolation with credentials support |
