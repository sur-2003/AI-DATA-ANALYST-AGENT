# How to Run This Project Locally

## AI Data Analyst Agent — Full-Stack Setup Guide

A full-stack AI-powered data analyst web application.  
**Frontend:** React 19 (CRA + CRACO) · **Backend:** Python FastAPI · **Database:** MongoDB 7  
**AI:** OpenAI GPT-4o via Emergent Integrations · **PDF:** ReportLab · **Charts:** Recharts

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure Explanation](#2-project-structure-explanation)
3. [Backend Setup](#3-backend-setup-step-by-step)
4. [Frontend Setup](#4-frontend-setup-step-by-step)
5. [Database Setup](#5-database-setup)
6. [Common Errors & Fixes](#6-common-errors--fixes)
7. [Production Run](#7-production-run-optional)
8. [Final Verification Steps](#8-final-verification-steps)
9. [VS Code Specific Instructions](#9-vs-code-specific-instructions)

---

## 1. Prerequisites

| Requirement         | Version / Notes                                                               |
|---------------------|-------------------------------------------------------------------------------|
| **OS**              | Linux (Debian 12 in prod), macOS, or WSL2 on Windows                         |
| **Node.js**         | v20.x LTS (`v20.20.0` in production)                                         |
| **Yarn**            | v1.22.x (classic). **Do NOT use `npm`** — the project uses Yarn exclusively  |
| **Python**          | 3.11.x (`3.11.14` in production)                                             |
| **MongoDB**         | 7.x (Community Edition). `mongod` must be reachable at `localhost:27017`     |
| **pip / venv**      | Bundled with Python 3.11                                                      |
| **Git**             | Any modern version                                                            |

### Install prerequisites (macOS example)

```bash
# Node 20 via nvm
nvm install 20 && nvm use 20

# Yarn classic
npm install -g yarn

# Python 3.11 via pyenv
pyenv install 3.11.14 && pyenv local 3.11.14

# MongoDB via Homebrew
brew tap mongodb/brew && brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

### Install prerequisites (Ubuntu / Debian)

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g yarn

# Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# MongoDB 7
# Follow: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
sudo systemctl start mongod
```

---

## 2. Project Structure Explanation

```
/app/
├── backend/                         # Python FastAPI backend
│   ├── server.py                    # Single-file FastAPI app (all routes)
│   ├── .env                         # Backend environment variables
│   └── requirements.txt             # Python dependencies (pip freeze output)
│
├── frontend/                        # React 19 + CRACO frontend
│   ├── public/
│   │   └── index.html               # HTML shell
│   ├── src/
│   │   ├── index.js                 # React entry point
│   │   ├── index.css                # Tailwind directives + CSS variables (dark theme)
│   │   ├── App.js                   # Root component, BrowserRouter, Toaster
│   │   ├── App.css                  # Chart tooltip overrides, dropzone styles
│   │   ├── lib/
│   │   │   └── utils.js             # cn() utility (clsx + tailwind-merge)
│   │   ├── pages/
│   │   │   ├── WelcomePage.jsx      # Landing page with file upload dropzone
│   │   │   └── DashboardPage.jsx    # Main analysis dashboard
│   │   ├── components/
│   │   │   ├── GlassCard.jsx        # Reusable glassmorphism card wrapper
│   │   │   ├── ChartPanel.jsx       # Multi-type Recharts renderer (line/bar/pie/area/scatter)
│   │   │   ├── QueryInput.jsx       # Natural language query bar
│   │   │   ├── AnalysisResult.jsx   # AI analysis display (findings, insight, recommendations)
│   │   │   ├── Sidebar.jsx          # Session info + query history
│   │   │   └── DataOverview.jsx     # Data profiling stat cards
│   │   └── components/ui/           # 45+ shadcn/ui primitives (button, card, badge, etc.)
│   ├── .env                         # Frontend environment variables
│   ├── package.json                 # Yarn dependencies & scripts
│   ├── yarn.lock                    # Deterministic lockfile
│   ├── tailwind.config.js           # Tailwind v3 config with CSS variable colors
│   ├── postcss.config.js            # PostCSS (Tailwind + Autoprefixer)
│   ├── craco.config.js              # CRA overrides: `@/` path alias, ESLint, dev plugins
│   ├── jsconfig.json                # Editor path alias for `@/*` → `src/*`
│   └── components.json              # shadcn/ui configuration
│
├── design_guidelines.json           # UI/UX design spec ("Deep Ocean Quant" theme)
├── tests/                           # Test directory
└── README.md
```

### Key Config Files

| File                      | Purpose                                                                  |
|---------------------------|--------------------------------------------------------------------------|
| `backend/.env`            | MongoDB URL, DB name, CORS origins, LLM API key                         |
| `frontend/.env`           | Backend API URL, WebSocket port, health check toggle                     |
| `craco.config.js`         | Overrides CRA webpack — adds `@/` path alias, ESLint, visual-edits      |
| `jsconfig.json`           | Tells VS Code about the `@/` alias so autocomplete/go-to-definition work|
| `tailwind.config.js`      | Extends Tailwind with CSS variable–based colors and shadcn animations    |
| `components.json`         | shadcn/ui config — style: `new-york`, no RSC, no TSX                    |

### Environment Variables

**`backend/.env`**

| Variable            | Description                                         | Example Value                               |
|---------------------|-----------------------------------------------------|---------------------------------------------|
| `MONGO_URL`         | MongoDB connection string                           | `mongodb://localhost:27017`                 |
| `DB_NAME`           | Database name (auto-created by MongoDB)             | `test_database`                             |
| `CORS_ORIGINS`      | Comma-separated allowed origins (or `*`)            | `*`                                         |
| `EMERGENT_LLM_KEY`  | API key for OpenAI GPT-4o via Emergent Integrations | `sk-emergent-XXXXX` (or your own OpenAI key)|

**`frontend/.env`**

| Variable                  | Description                               | Example Value                              |
|---------------------------|-------------------------------------------|--------------------------------------------|
| `REACT_APP_BACKEND_URL`   | Full URL to backend (used by Axios calls) | `http://localhost:8001` for local dev      |
| `WDS_SOCKET_PORT`         | WebSocket port for hot reload             | `3000` for local dev, `443` for HTTPS prod |
| `ENABLE_HEALTH_CHECK`     | Enable CRA health-check endpoint          | `false`                                    |

---

## 3. Backend Setup (Step-by-Step)

```bash
# 1. Navigate to backend
cd /app/backend

# 2. Create & activate virtual environment
python3.11 -m venv .venv
source .venv/bin/activate        # Linux / macOS
# .venv\Scripts\activate         # Windows PowerShell

# 3. Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# The emergentintegrations package is hosted on a private index.
# If installation fails for that package:
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# 4. Create/edit the .env file
cat > .env << 'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY=sk-emergent-YOUR_KEY_HERE
EOF
```

> **Note on `EMERGENT_LLM_KEY`:** This is a universal API key provided by the Emergent
> platform that proxies requests to OpenAI GPT-4o. If you have your own OpenAI key you
> can use it directly — but you must also change the model wiring in `server.py`
> (line 253–258) to use the `openai` SDK directly instead of `emergentintegrations`.

### Run the backend server

```bash
# From /app/backend with venv active:
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

The `--reload` flag enables hot-reload on file changes.  
Backend will be available at: **http://localhost:8001**

### Quick health check

```bash
curl http://localhost:8001/api/
# Expected: {"message":"AI Data Analyst Agent API"}
```

---

## 4. Frontend Setup (Step-by-Step)

```bash
# 1. Navigate to frontend
cd /app/frontend

# 2. Install dependencies (MUST use yarn, not npm)
yarn install

# 3. Create/edit the .env file for LOCAL development
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
EOF

# 4. Start the dev server
yarn start
```

Frontend will be available at: **http://localhost:3000**

### Important notes

- The `@/` import alias (e.g., `import { Button } from "@/components/ui/button"`) is
  configured in `craco.config.js` (webpack alias) and `jsconfig.json` (editor support).
- **Never use `npm`** — the project lockfile is `yarn.lock` and the `packageManager` field
  in `package.json` enforces Yarn.
- All API calls in the frontend use `process.env.REACT_APP_BACKEND_URL` — this is baked
  in at build time (CRA behavior). Restart the dev server after changing `.env`.

---

## 5. Database Setup

### MongoDB — No Migration Required

MongoDB is schema-less. Collections and documents are created automatically on first write.
There are **no migration scripts** — the backend's `server.py` creates documents on the fly
via `motor` (async MongoDB driver).

### Collections created at runtime

| Collection    | Created When            | Purpose                                        |
|---------------|-------------------------|-------------------------------------------------|
| `sessions`    | `POST /api/upload`      | Uploaded file metadata + parsed data as JSON    |
| `queries`     | `POST /api/query`       | User queries + LLM analysis responses           |

### Connection string examples

```
# Local default
mongodb://localhost:27017

# With authentication
mongodb://user:pass@localhost:27017/test_database?authSource=admin

# MongoDB Atlas (cloud)
mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/test_database
```

### Verify MongoDB is running

```bash
# Check service
mongosh --eval "db.runCommand({ ping: 1 })"
# Expected: { ok: 1 }

# Or via the backend
curl http://localhost:8001/api/sessions
# Expected: [] (empty array)
```

### Seed / Sample Data

There is no seed script. The application is data-driven by user uploads. To test:

1. Create a sample CSV:

```bash
cat > /tmp/sample_sales.csv << 'EOF'
date,product,region,quantity,revenue
2024-01-15,Laptop,North,45,67500
2024-02-15,Laptop,North,52,78000
2024-03-15,Laptop,South,38,57000
2024-04-15,Phone,North,120,60000
2024-05-15,Phone,South,95,47500
2024-06-15,Tablet,North,65,32500
EOF
```

2. Upload it via the UI or curl:

```bash
curl -X POST http://localhost:8001/api/upload \
  -F "file=@/tmp/sample_sales.csv"
```

---

## 6. Common Errors & Fixes

### Port Conflicts

| Error                                      | Fix                                                  |
|--------------------------------------------|------------------------------------------------------|
| `[Errno 48] Address already in use` (8001) | `lsof -ti:8001 \| xargs kill -9` then restart       |
| Port 3000 in use (frontend)                | `lsof -ti:3000 \| xargs kill -9` or set `PORT=3001` |

### Missing Environment Variables

| Error message                             | Fix                                                          |
|-------------------------------------------|--------------------------------------------------------------|
| `KeyError: 'MONGO_URL'`                  | Ensure `backend/.env` exists with `MONGO_URL` set            |
| `KeyError: 'DB_NAME'`                    | Add `DB_NAME="test_database"` to `backend/.env`              |
| `REACT_APP_BACKEND_URL` is `undefined`   | Ensure `frontend/.env` has it set; **restart** the dev server|
| `EMERGENT_LLM_KEY` is `None`             | Add the key to `backend/.env`; restart backend               |

### Dependency Issues

| Error                                           | Fix                                                                          |
|-------------------------------------------------|------------------------------------------------------------------------------|
| `ModuleNotFoundError: emergentintegrations`     | `pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` |
| `ModuleNotFoundError: reportlab`                | `pip install reportlab openpyxl matplotlib statsmodels`                      |
| `Cannot find module 'framer-motion'`            | `cd frontend && yarn add framer-motion react-dropzone`                       |
| `npm ERR!` anything                             | **Stop.** Use `yarn` instead of `npm`. Delete `package-lock.json` if exists  |
| `craco: command not found`                      | Run `yarn install` — craco is a devDependency                                |
| Python `pandas` date parsing warnings           | Safe to ignore; handled in code via `format='mixed'`                         |

### MongoDB Connection

| Error                                       | Fix                                                   |
|---------------------------------------------|--------------------------------------------------------|
| `ServerSelectionTimeoutError`               | Start MongoDB: `mongod --bind_ip_all` or `brew services start mongodb-community` |
| `Authentication failed`                     | Check MONGO_URL has correct user/pass; ensure `authSource` param              |

### LLM / AI Query Errors

| Symptom                                  | Fix                                                                |
|------------------------------------------|--------------------------------------------------------------------|
| `Analysis failed: 401` or `Invalid key`  | Verify `EMERGENT_LLM_KEY` in `.env` is valid and has balance       |
| LLM returns non-JSON                     | Already handled by fallback parser in `server.py` (line 264–291)   |
| `Key budget running low`                 | Go to Emergent Profile → Universal Key → Add Balance               |

---

## 7. Production Run (Optional)

### Build the frontend

```bash
cd /app/frontend

# Set the production backend URL
echo 'REACT_APP_BACKEND_URL=https://your-api-domain.com' > .env

yarn build
```

This creates an optimized bundle in `frontend/build/`. Serve it with any static file
server (Nginx, Caddy, `serve`, S3 + CloudFront, etc.).

### Run the backend in production mode

```bash
cd /app/backend
source .venv/bin/activate

uvicorn server:app \
  --host 0.0.0.0 \
  --port 8001 \
  --workers 4 \
  --log-level info
```

> Remove `--reload` in production. Use `--workers N` for concurrency (N = CPU cores).

### Using Supervisor (as in production deployment)

The project includes Supervisor configs. If Supervisor is installed:

```bash
# Start all services
sudo supervisorctl start all

# Check status
sudo supervisorctl status

# Restart individual services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# View logs
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.err.log
```

---

## 8. Final Verification Steps

### URLs to test

| URL                                   | Expected Result                              |
|---------------------------------------|----------------------------------------------|
| `http://localhost:3000`               | Welcome page with file upload dropzone       |
| `http://localhost:8001/api/`          | `{"message":"AI Data Analyst Agent API"}`    |
| `http://localhost:8001/api/sessions`  | `[]` (empty array) or list of past sessions  |
| `http://localhost:8001/docs`          | FastAPI auto-generated Swagger UI            |
| `http://localhost:8001/redoc`         | FastAPI ReDoc documentation                  |

### API health check

```bash
# 1. Root endpoint
curl -s http://localhost:8001/api/ | python3 -c "import sys,json; print(json.load(sys.stdin))"

# 2. Sessions list (empty is OK)
curl -s http://localhost:8001/api/sessions

# 3. Upload a test file
curl -s -X POST http://localhost:8001/api/upload \
  -F "file=@/tmp/sample_sales.csv" | python3 -m json.tool
```

### Sample end-to-end test flow

```bash
# Step 1: Upload a CSV
SESSION_ID=$(curl -s -X POST http://localhost:8001/api/upload \
  -F "file=@/tmp/sample_sales.csv" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Session: $SESSION_ID"

# Step 2: Query the data
QUERY_RESPONSE=$(curl -s -X POST http://localhost:8001/api/query \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"query\": \"Give me a summary of this dataset\"}")
QUERY_ID=$(echo "$QUERY_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Query ID: $QUERY_ID"

# Step 3: Download the PDF report
curl -s -o report.pdf "http://localhost:8001/api/report/$QUERY_ID/download"
echo "Report saved to report.pdf ($(wc -c < report.pdf) bytes)"

# Step 4: View query history
curl -s "http://localhost:8001/api/session/$SESSION_ID/queries" | python3 -m json.tool

# Step 5: Clean up
curl -s -X DELETE "http://localhost:8001/api/session/$SESSION_ID"
```

---

## 9. VS Code Specific Instructions

### Recommended Extensions

Install these from the Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`):

| Extension                         | ID                                     | Purpose                         |
|-----------------------------------|----------------------------------------|---------------------------------|
| ESLint                            | `dbaeumer.vscode-eslint`               | JS/JSX linting                  |
| Prettier                          | `esbenp.prettier-vscode`               | Code formatting                 |
| Tailwind CSS IntelliSense         | `bradlc.vscode-tailwindcss`            | Class autocomplete + hover docs |
| Python                            | `ms-python.python`                     | Python support, venv detection  |
| Pylance                           | `ms-python.vscode-pylance`             | Python type checking            |
| MongoDB for VS Code               | `mongodb.mongodb-vscode`               | Browse collections visually     |
| Thunder Client                    | `rangav.vscode-thunder-client`         | API testing (Postman-like)      |
| Path Intellisense                 | `christian-kohler.path-intellisense`   | Path autocompletion             |

### Workspace Settings

Create `.vscode/settings.json` in the project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/.venv/bin/python",
  "python.envFile": "${workspaceFolder}/backend/.env",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "files.associations": {
    "*.jsx": "javascriptreact"
  },
  "emmet.includeLanguages": {
    "javascriptreact": "html"
  }
}
```

### Terminal Setup

Use VS Code's split terminal (`Ctrl+Shift+5`) to run both servers simultaneously:

**Terminal 1 — Backend:**

```bash
cd backend
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 — Frontend:**

```bash
cd frontend
yarn start
```

**Terminal 3 — MongoDB (if not running as a service):**

```bash
mongod --dbpath ~/data/db --bind_ip_all
```

### Launch Configurations

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Backend: FastAPI",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": ["server:app", "--host", "0.0.0.0", "--port", "8001", "--reload"],
      "cwd": "${workspaceFolder}/backend",
      "envFile": "${workspaceFolder}/backend/.env",
      "console": "integratedTerminal"
    },
    {
      "name": "Frontend: React",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "yarn",
      "runtimeArgs": ["start"],
      "cwd": "${workspaceFolder}/frontend",
      "console": "integratedTerminal"
    },
    {
      "name": "Chrome: Debug Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend/src",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*"
      }
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": ["Backend: FastAPI", "Frontend: React"]
    }
  ]
}
```

Press **F5** and select **"Full Stack"** to launch both backend and frontend with
debugging enabled.

---

## API Endpoints Reference

| Method   | Endpoint                            | Description                           |
|----------|-------------------------------------|---------------------------------------|
| `GET`    | `/api/`                            | Health check                          |
| `POST`   | `/api/upload`                      | Upload CSV/Excel file                 |
| `POST`   | `/api/query`                       | Submit natural language query          |
| `GET`    | `/api/sessions`                    | List all upload sessions              |
| `GET`    | `/api/session/{id}`                | Get session metadata                  |
| `GET`    | `/api/session/{id}/data?limit=100` | Get parsed row data                   |
| `GET`    | `/api/session/{id}/queries`        | Get query history for session         |
| `GET`    | `/api/report/{query_id}/download`  | Download PDF analysis report          |
| `DELETE` | `/api/session/{id}`                | Delete session and its queries        |

---

## Tech Stack Summary

| Layer         | Technology                                                     |
|---------------|----------------------------------------------------------------|
| Frontend      | React 19, CRACO, Tailwind CSS 3, shadcn/ui, Recharts 3, Framer Motion, react-dropzone |
| Backend       | Python 3.11, FastAPI, Motor (async MongoDB), Pandas, ReportLab |
| Database      | MongoDB 7 (schemaless, no migrations)                          |
| AI            | OpenAI GPT-4o via `emergentintegrations` library               |
| PDF           | ReportLab (server-side generation)                             |
| Process Mgmt  | Supervisor (production), uvicorn --reload (development)        |
