# Authentication Sequence Diagram — AssetFlow

## Overview

AssetFlow implements stateful server-managed sessions with timing-safe password verification and opaque `HttpOnly` session cookies. Tokens are never exposed in JSON responses, eliminating token theft via XSS or browser storage extraction (`localStorage`/`sessionStorage`).

## Mermaid Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Admin as IT Administrator
    participant Browser as React SPA (Client)
    participant AuthMW as Express Auth Middleware
    participant AuthCtrl as Auth Controller
    participant AuthSvc as Auth Service
    participant DB as SQLite Database (sessions & administrators)

    %% ----------------------------------------------------
    %% Phase 1: Login Flow
    %% ----------------------------------------------------
    Note over Admin, DB: 1. Administrator Login Flow
    Admin->>Browser: Enters credentials (username, password)
    Browser->>AuthCtrl: POST /api/auth/login { username, password }
    Note right of Browser: Origin checked by CORS guard

    AuthCtrl->>AuthSvc: authenticate(username, password)
    AuthSvc->>DB: SELECT * FROM administrators WHERE username = ?
    DB-->>AuthSvc: Returns admin record (including password_hash)
    
    AuthSvc->>AuthSvc: bcrypt.compare(password, password_hash)
    Note right of AuthSvc: Constant-time comparison prevents timing attacks

    alt Valid Credentials
        AuthSvc->>AuthSvc: crypto.randomBytes(32).toString('hex')
        AuthSvc->>DB: INSERT INTO sessions (session_token, admin_id, expires_at)
        AuthSvc->>DB: INSERT INTO audit_logs (action: 'LOGIN_SUCCESS')
        AuthSvc-->>AuthCtrl: { sessionToken, userProfile }
        AuthCtrl-->>Browser: HTTP 200 OK<br/>Set-Cookie: session_id=...; HttpOnly; SameSite=Lax; Path=/<br/>Body: { success: true, user: { id, username, full_name, role } }
        Browser-->>Admin: Redirects to /dashboard with greeting
    else Invalid Credentials
        AuthSvc->>DB: INSERT INTO audit_logs (action: 'LOGIN_FAILED')
        AuthSvc-->>AuthCtrl: Throw AuthenticationError("Invalid credentials")
        AuthCtrl-->>Browser: HTTP 401 Unauthorized { error: "Invalid credentials" }
        Browser-->>Admin: Displays accessible error banner
    end

    %% ----------------------------------------------------
    %% Phase 2: Protected Request Flow
    %% ----------------------------------------------------
    Note over Admin, DB: 2. Authenticated Protected Request Flow
    Admin->>Browser: Navigates to /assets or /licenses
    Browser->>AuthMW: GET /api/assets (Cookie: session_id=...)
    AuthMW->>AuthMW: Extract session_id from req.cookies
    AuthMW->>DB: SELECT s.*, a.* FROM sessions s JOIN administrators a ON s.admin_id = a.id WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
    
    alt Session Valid & Active
        DB-->>AuthMW: Returns session and administrator details
        AuthMW->>AuthMW: req.user = admin
        AuthMW->>Browser: Request proceeds to Domain Controller & returns data
    else Session Missing or Expired
        DB-->>AuthMW: No active session row found
        AuthMW-->>Browser: HTTP 401 Unauthorized { error: "Authentication required" }
        Browser->>Browser: Clears auth context state & redirects to /login
    end

    %% ----------------------------------------------------
    %% Phase 3: Logout Flow
    %% ----------------------------------------------------
    Note over Admin, DB: 3. Administrator Logout Flow
    Admin->>Browser: Clicks Logout button
    Browser->>AuthCtrl: POST /api/auth/logout (Cookie: session_id=...)
    AuthCtrl->>AuthSvc: logout(sessionToken)
    AuthSvc->>DB: DELETE FROM sessions WHERE session_token = ?
    AuthSvc->>DB: INSERT INTO audit_logs (action: 'LOGOUT')
    AuthCtrl-->>Browser: HTTP 200 OK<br/>Set-Cookie: session_id=; Expires=Thu, 01 Jan 1970...<br/>Body: { message: "Logged out successfully" }
    Browser->>Browser: Sets isAuthenticated=false
    Browser-->>Admin: Displays Login screen
```

## Security Invariants

1. **Zero Raw Token Exposure:** The raw session token is sent exclusively in the `Set-Cookie` header. It never appears in the JSON response body.
2. **Instant Invalidation:** Server-side revocation immediately deletes the session row from SQLite, neutralizing stolen session tokens instantly without waiting for TTL expiration.
3. **Audit Immutability:** All authentication successes, authentication failures, and logouts produce permanent records in the `audit_logs` table.
