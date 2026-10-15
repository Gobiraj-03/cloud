# AssetFlow — Local Setup & Troubleshooting Guide (Windows PowerShell)

This guide provides step-by-step instructions for running, testing, building, and troubleshooting the **AssetFlow** application on a local Windows machine at strict **₹0 cost**.

---

## 1. Prerequisites Verification

Before starting, verify that **Node.js** and **npm** are installed and available in your PowerShell path:

```powershell
# Open Windows PowerShell and verify versions:
node --version
# Expected: v20.x or v22.x (Verified with v22.15.1)

npm --version
# Expected: v9.x or v10.x (Verified with v10.9.2)
```

If Node.js is not installed, download the **LTS version** from [nodejs.org](https://nodejs.org/).

---

## 2. Dependency Installation

From the project root directory (`D:\cloud`):

```powershell
# 1. Install root dependencies (if applicable):
npm install

# 2. Install backend dependencies:
cd backend
npm install
cd ..

# 3. Install frontend dependencies:
cd frontend
npm install
cd ..
```

---

## 3. Environment Configuration

### Backend Configuration (`backend/.env`)

Verify or create `backend/.env` using the template provided in `backend/.env.example`:

```powershell
# Verify backend/.env exists:
Get-Content backend\.env
```

If it does not exist, copy from the example template:
```powershell
Copy-Item backend\.env.example backend\.env
```

**Standard Development Configuration (`backend/.env`):**
```ini
PORT=5000
NODE_ENV=development
DB_PATH=../data/asset_management.db
CORS_ORIGIN=http://localhost:5173
```

> [!NOTE]
> `backend/.env` is excluded from Git tracking via `.gitignore` to safeguard local development configurations.

---

## 4. Database Setup & Safe Migration

The application uses an embedded SQLite database located at `data/asset_management.db`.

```powershell
# Run safe database migration (creates tables if missing, non-destructive):
npm --prefix backend run db:migrate

# Optional: Seed realistic demonstration data (only if starting fresh):
# Note: Seed is idempotent and will not duplicate existing records.
npm --prefix backend run db:seed

# Optional: Provision an administrator account safely:
npm --prefix backend run admin:create
```

---

## 5. Starting the Application Locally

To run the application, two local processes are required: the Express backend and the Vite frontend dev server.

### Option A: Separate PowerShell Windows (Recommended for Development)

**Terminal 1 — Start the Backend (Port 5000):**
```powershell
cd D:\cloud\backend
npm run dev
# Expected output:
# [Server] IT Asset Lifecycle Backend running on http://localhost:5000
# [Server] Environment: development
# [Server] Database target: D:\cloud\data\asset_management.db
```

**Terminal 2 — Start the Frontend (Port 5173):**
```powershell
cd D:\cloud\frontend
npm run dev
# Expected output:
#   VITE v8.3.4  ready in 598 ms
#   ➜  Local:   http://localhost:5173/
```

### Option B: Unified Root Scripts

From the repository root (`D:\cloud`):
```powershell
# Start backend from root:
npm run backend:dev

# Start frontend from root (in a separate terminal):
npm run frontend:dev
```

### Accessing the Web Application

1. Open your web browser (Chrome, Edge, Firefox).
2. Navigate to: **`http://localhost:5173`**
3. Log in with the demonstration credentials:
   - **Username:** `admin` (or `itadmin`)
   - **Password:** `AdminPassword123!`

---

## 6. Running Automated Tests

AssetFlow includes 151 automated tests that run against isolated, in-memory databases and never mutate your development data.

### 6.1 Run the Full Test Suite (Recommended)

From the project root (`D:\cloud`):
```powershell
npm test
# Executes all 110 backend tests followed by all 41 frontend tests
```

### 6.2 Run Test Suites Separately

**Backend Integration Tests (110 Tests):**
```powershell
npm --prefix backend test
# or from backend/:
cd backend
npm test
```

**Frontend Component & Flow Tests (41 Tests):**
```powershell
npm --prefix frontend test
# or from frontend/:
cd frontend
npm test
```

---

## 7. Production Build Verification

To verify that the frontend compiles cleanly for production deployment:

```powershell
npm --prefix frontend run build
# Expected output:
# ✓ built in ~1.0s
# Output directory: frontend/dist/
```

---

## 8. Common Troubleshooting Scenarios

### Error 1: `EADDRINUSE: address already in use :::5000`
- **Cause:** Another Node.js process or earlier server instance is already running on port 5000.
- **Solution in Windows PowerShell:**
  ```powershell
  # Find the Process ID (PID) occupying port 5000:
  Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
  
  # Terminate the process (replace <PID> with the actual process ID):
  Stop-Process -Id <PID> -Force
  ```

### Error 2: `SQLITE_BUSY: database is locked`
- **Cause:** An unclosed connection or an open database viewer has locked the SQLite file.
- **Solution:**
  1. Close any external SQLite viewers (e.g. DB Browser for SQLite).
  2. Verify that Write-Ahead Logging (WAL) mode is active:
     ```powershell
     node -e "const db = require('./backend/src/config/database'); db.getDb().get('PRAGMA journal_mode', (e, r) => { console.log(r); db.close(); });"
     # Output should be: { journal_mode: 'wal' }
     ```

### Error 3: Frontend Shows "Unable to load inventory metrics" or Health Check "DOWN"
- **Cause:** The Express backend is not running on port 5000, or CORS origin is mismatched.
- **Solution:**
  1. Verify backend health endpoint directly in PowerShell:
     ```powershell
     curl http://localhost:5000/api/health
     ```
  2. Confirm `backend/.env` has `CORS_ORIGIN=http://localhost:5173`.
  3. Ensure Vite proxy in `frontend/vite.config.js` is proxying `/api` to `http://localhost:5000`.

### Error 4: "Invalid administrator username or password"
- **Cause:** Stored administrator hash was modified or credentials were typed incorrectly.
- **Solution:** Reset the administrator password safely using the CLI provisioning tool:
  ```powershell
  cd D:\cloud\backend
  $env:ADMIN_USERNAME='admin'
  $env:ADMIN_PASSWORD='AdminPassword123!'
  $env:ADMIN_OVERWRITE='true'
  node src/scripts/createAdmin.js
  ```

### Error 5: Vitest / JSDOM Module Not Found
- **Cause:** Missing frontend development dependencies.
- **Solution:**
  ```powershell
  cd D:\cloud\frontend
  npm install
  npm test
  ```
