# AI Data Analyst Agent — Complete Technical Documentation

---

## Table of Contents

1. [Technologies Used](#1-technologies-used)
2. [Architecture Overview](#2-architecture-overview)
3. [Application Workflow (Step-by-Step)](#3-application-workflow-step-by-step)
4. [Backend Workflow](#4-backend-workflow)
5. [Frontend Workflow](#5-frontend-workflow)
6. [Data Flow Diagram (Textual)](#6-data-flow-diagram-textual-explanation)
7. [Use Cases](#7-use-cases)
8. [Conclusion](#8-conclusion)

---

## 1. Technologies Used

### 1.1 Frontend Technologies

#### React 19 — UI Framework
- **What it is:** A JavaScript library for building component-based user interfaces, maintained by Meta. Version 19 is the latest major release.
- **Why it was chosen:** React's component model naturally maps to the distinct UI regions of an analytics dashboard — sidebar, chart panels, query inputs, and result cards are each isolated, reusable components. Its virtual DOM ensures that when only one chart updates after a new query, the rest of the page remains untouched.
- **Role in the system:** Serves as the entire client-side rendering engine. Every pixel the user sees is produced by React components, from the Welcome page dropzone to the Recharts-powered chart visualizations.

#### React Router DOM v7 — Client-Side Routing
- **What it is:** The standard routing library for React single-page applications.
- **Why it was chosen:** The application has two distinct views — a Welcome/Upload page at `/` and a parameterized Dashboard page at `/dashboard/:sessionId`. React Router enables seamless navigation between these without full page reloads, preserving application state.
- **Role in the system:** Maps URL paths to page components. When a file upload succeeds and returns a session ID, React Router's `useNavigate` programmatically redirects the user to the corresponding dashboard URL.

#### Tailwind CSS v3 — Utility-First CSS Framework
- **What it is:** A utility-first CSS framework that provides low-level utility classes (like `bg-slate-900`, `p-6`, `rounded-lg`) instead of pre-built components.
- **Why it was chosen:** Tailwind enables rapid, precise styling without writing custom CSS files for every component. For a data-heavy dashboard that requires pixel-level control over spacing, colors, and responsive breakpoints, utility classes are far more maintainable than traditional BEM or module-based CSS.
- **Role in the system:** Provides the entire visual styling layer. The project defines a custom dark color palette through CSS HSL variables (`--background`, `--primary`, `--card`, etc.) in `index.css`, which Tailwind consumes through its theme configuration in `tailwind.config.js`. This creates a cohesive "Deep Ocean Quant" dark theme across all components.

#### shadcn/ui — Component Library
- **What it is:** A collection of beautifully designed, accessible UI components built on Radix UI primitives and styled with Tailwind CSS. Unlike traditional component libraries, shadcn/ui components are copied directly into your project (`/components/ui/`), giving you full ownership and customization control.
- **Why it was chosen:** It provides production-quality accessible primitives (Button, ScrollArea, Badge, Separator, Tooltip, Dialog, etc.) that integrate natively with Tailwind's class-based theming. Since components live in the project source, they can be freely modified without fighting a library's design opinions.
- **Role in the system:** Supplies 45+ foundational UI elements used throughout the application. The `Button` component is used for query submission and PDF download. `ScrollArea` provides the sidebar's scrollable query history. `Badge` displays analysis types. `Separator` divides sidebar sections.

#### Recharts v3 — Data Visualization
- **What it is:** A composable charting library built on React components and D3.js. It provides declarative chart components like `<LineChart>`, `<BarChart>`, `<PieChart>`, `<AreaChart>`, and `<ScatterChart>`.
- **Why it was chosen:** Recharts aligns perfectly with React's component model — each chart is a composition of React elements, making it trivial to conditionally render different chart types based on AI recommendations. Its `<ResponsiveContainer>` automatically sizes charts to their parent container, critical for the fluid dashboard layout.
- **Role in the system:** The `ChartPanel` component receives a `chart_type` field from the AI's analysis response and dynamically renders the appropriate Recharts chart. It supports five chart types (line, bar, pie, area, scatter), handles forecast data overlay with dashed lines, and uses a custom glassmorphic tooltip for the dark theme.

#### Framer Motion v12 — Animation Library
- **What it is:** A production-ready motion library for React that provides declarative animations via `<motion.div>` components.
- **Why it was chosen:** Smooth entrance animations and page transitions are critical for a premium analytics tool. Framer Motion's `initial`/`animate`/`transition` API makes staggered fade-up animations trivial to implement without managing CSS keyframes manually.
- **Role in the system:** Animates page-level transitions on the Welcome page (hero text, dropzone, capability cards each fade in with staggered delays) and the Dashboard page (data overview slides in, query results animate on arrival). Each new analysis result triggers a keyed animation via `key={activeQuery.id}`.

#### react-dropzone v15 — File Upload
- **What it is:** A React hook-based library that provides drag-and-drop file upload functionality with MIME type validation.
- **Why it was chosen:** It provides a clean, hook-based API (`useDropzone`) that returns `getRootProps` and `getInputProps` to create a fully accessible drag-and-drop zone without building the complex browser drag event handling from scratch.
- **Role in the system:** Powers the file upload experience on the Welcome page. It validates file types (CSV, XLSX, XLS), handles the drag-over visual feedback, and passes accepted files to the upload handler that sends them to the backend via Axios.

#### Axios — HTTP Client
- **What it is:** A promise-based HTTP client for the browser with support for request/response interceptors, progress monitoring, and automatic JSON parsing.
- **Why it was chosen:** Axios provides `onUploadProgress` callbacks that the dropzone uses to show a real-time progress bar during file uploads. It also provides cleaner error handling with `err.response.data.detail` for FastAPI's error responses.
- **Role in the system:** Handles all HTTP communication between the frontend and backend. Every API call — file upload (`POST /api/upload`), query submission (`POST /api/query`), session fetching (`GET /api/session/:id`), and session deletion (`DELETE /api/session/:id`) — goes through Axios.

#### Sonner — Toast Notifications
- **What it is:** A lightweight, beautifully animated toast notification library for React.
- **Why it was chosen:** It provides a minimal API (`toast.success()`, `toast.error()`) with smooth animations and dark theme support, matching the application's visual language without extra configuration.
- **Role in the system:** Displays success confirmations after file upload and query completion, and surfaces error messages when API calls fail.

#### Lucide React — Icon Library
- **What it is:** A comprehensive set of clean, consistent SVG icons available as individual React components.
- **Why it was chosen:** Lucide provides a large catalog of data-themed icons (`BarChart3`, `TrendingUp`, `Database`, `FileSpreadsheet`, `Activity`) that align with the analytical domain, and tree-shaking ensures only used icons are bundled.
- **Role in the system:** Provides all iconography across the application — sidebar navigation icons, capability card icons, stat card icons, button icons, and loading indicators.

#### CRACO — Create React App Configuration Override
- **What it is:** A configuration layer for Create React App that allows customizing webpack, Babel, and ESLint settings without ejecting.
- **Why it was chosen:** The project needs a webpack path alias (`@/` → `src/`) for clean imports, custom ESLint rules for React Hooks, and conditional development plugins (visual edits, health checks). CRACO provides all of this while keeping CRA's zero-config benefits.
- **Role in the system:** Configures the `@/` import alias that enables clean import paths like `import { Button } from "@/components/ui/button"` instead of relative path chains. Also sets up file watching exclusions for performance.

#### Additional Frontend Utilities

| Technology | Purpose |
|---|---|
| `clsx` + `tailwind-merge` | Combined in the `cn()` utility function to conditionally merge Tailwind classes without conflicts |
| `date-fns` | Date formatting and manipulation |
| `PostCSS` + `Autoprefixer` | CSS post-processing pipeline that Tailwind CSS requires |
| Google Fonts (Manrope, JetBrains Mono) | Custom typography — Manrope for headings, JetBrains Mono for data/numeric displays |

---

### 1.2 Backend Technologies

#### FastAPI — Web Framework
- **What it is:** A modern, high-performance Python web framework built on Starlette and Pydantic, with native support for async/await, automatic OpenAPI documentation, and type validation.
- **Why it was chosen:** FastAPI's async-first design is critical for this application because each query involves an awaited LLM API call that can take 5–15 seconds. Async handling ensures the server isn't blocked during these waits and can serve other requests concurrently. Additionally, FastAPI auto-generates interactive API docs at `/docs` (Swagger) and `/redoc`, making development and testing significantly faster.
- **Role in the system:** Serves as the central HTTP API layer. It receives file uploads, orchestrates data parsing, communicates with the LLM service, stores results in MongoDB, generates PDF reports, and returns structured JSON responses to the frontend. All endpoints are prefixed with `/api` and registered via an `APIRouter`.

#### Uvicorn — ASGI Server
- **What it is:** A lightning-fast ASGI (Asynchronous Server Gateway Interface) server implementation using `uvloop` and `httptools`.
- **Why it was chosen:** FastAPI requires an ASGI server to run (it cannot use traditional WSGI servers like Gunicorn alone). Uvicorn provides excellent performance and a `--reload` flag for development hot-reloading.
- **Role in the system:** Hosts the FastAPI application on port 8001, handling incoming HTTP connections and passing them to FastAPI's async request handlers. In production, it runs with multiple workers for concurrency.

#### Pandas v3 — Data Processing
- **What it is:** The dominant Python library for tabular data manipulation, providing the `DataFrame` abstraction for in-memory structured data operations.
- **Why it was chosen:** Pandas is the natural choice for CSV/Excel ingestion and statistical profiling. It can read CSV and Excel files in a single function call, automatically infer column types, compute statistical aggregates (min, max, mean, median, std), detect duplicates, count nulls, and convert DataFrames to JSON-ready dictionaries.
- **Role in the system:** Performs all data processing during file upload:
  - Reads CSV files via `pd.read_csv()` and Excel files via `pd.read_excel()`
  - Removes duplicate rows
  - Attempts automatic date column detection and parsing
  - Generates a complete column profile (type, null count, unique count, statistical measures for numeric columns, top values for categorical columns)
  - Converts the DataFrame to a list of dictionaries for MongoDB storage
  - During query processing, reconstructs a DataFrame from stored data to generate the text summary sent to the LLM

#### NumPy v2 — Numerical Computing
- **What it is:** The foundational numerical computing library for Python, providing N-dimensional array objects and mathematical functions.
- **Why it was chosen:** Pandas is built on top of NumPy, and many of Pandas' return types are NumPy scalars (`np.int64`, `np.float64`, `np.bool_`). These types are not JSON-serializable by default, so explicit conversion is required.
- **Role in the system:** The `clean_val()` helper function uses NumPy type checking (`isinstance(obj, np.integer)`, `isinstance(obj, np.floating)`) to safely convert NumPy scalars to Python native types before JSON serialization. It also handles `NaN` and `Inf` values, converting them to `None`.

#### Motor v3 — Async MongoDB Driver
- **What it is:** An asynchronous Python driver for MongoDB, built on top of PyMongo. It provides the same API as PyMongo but with `async/await` support.
- **Why it was chosen:** Since FastAPI is async, using a synchronous MongoDB driver (PyMongo directly) would block the event loop during database operations. Motor wraps PyMongo with async I/O, ensuring database reads and writes don't block other request handling.
- **Role in the system:** All database operations are performed through Motor:
  - `db.sessions.insert_one()` — stores uploaded file metadata and parsed data
  - `db.sessions.find_one()` — retrieves session details for queries
  - `db.queries.insert_one()` — persists each query and its AI response
  - `db.queries.find()` — loads query history for a session
  - All queries use `{"_id": 0}` projection to exclude MongoDB's internal `_id` field from responses

#### Emergent Integrations — LLM Gateway
- **What it is:** A proprietary Python library (`emergentintegrations`) provided by the Emergent platform that provides a unified interface to multiple LLM providers (OpenAI, Anthropic, Google) through a single API key.
- **Why it was chosen:** It abstracts away provider-specific SDK differences and provides a "universal key" that routes requests through the Emergent proxy. This eliminates the need to manage separate API keys for each LLM provider and simplifies model switching.
- **Role in the system:** The `LlmChat` class is initialized with the Emergent API key, a unique session ID per query, and a system prompt that instructs GPT-4o to return structured JSON. The `.with_model("openai", "gpt-4o")` call selects the model, and `await chat.send_message(UserMessage(text=prompt))` sends the data context and user question to the LLM.

#### OpenAI GPT-4o — Large Language Model
- **What it is:** OpenAI's multimodal flagship model, capable of understanding complex data patterns, generating structured analysis, and producing actionable recommendations.
- **Why it was chosen:** GPT-4o has strong capabilities in: understanding tabular data context, performing statistical reasoning, selecting appropriate chart types, generating structured JSON reliably, and incorporating macroeconomic knowledge for forecast enrichment.
- **Role in the system:** Receives a carefully constructed prompt containing the file metadata, column statistics, a 50-row data sample, and the user's natural language question. Returns a structured JSON response containing: restated query understanding, analysis type classification, chart type recommendation with plotable data, 3–5 key findings, forecast projections with confidence intervals and macroeconomic signals, a direct insight, and actionable recommendations.

#### ReportLab v4 — PDF Generation
- **What it is:** A mature Python library for programmatic PDF document generation, supporting text, tables, styles, and page layouts.
- **Why it was chosen:** Server-side PDF generation ensures consistent formatting regardless of the user's browser or device. ReportLab's `platypus` layout engine provides a high-level API for creating professional documents with styled paragraphs, tables, and spacers.
- **Role in the system:** The `/api/report/{query_id}/download` endpoint uses ReportLab to generate a multi-section PDF report containing:
  - Executive Summary (query + analysis type)
  - Data Overview (file name, dimensions, date range)
  - Analysis Findings (numbered list)
  - Visualization data as a styled table
  - Forecast section with confidence intervals and external signals (color-coded by impact)
  - Agent Insight (highlighted box)
  - Recommendations (numbered list)
  The PDF is generated into an in-memory `BytesIO` buffer and streamed back to the client.

#### OpenPyXL — Excel File Parser
- **What it is:** A Python library for reading and writing Excel 2010+ files (.xlsx).
- **Why it was chosen:** While Pandas can read Excel files, it requires an engine library. OpenPyXL is the default engine for `.xlsx` files and is necessary for `pd.read_excel()` to function.
- **Role in the system:** Acts as the backend engine when Pandas encounters an Excel upload. Users can upload either `.csv` or `.xlsx` files interchangeably.

#### Pydantic v2 — Data Validation
- **What it is:** A data validation library that uses Python type annotations to define data schemas with automatic parsing, validation, and serialization.
- **Why it was chosen:** FastAPI uses Pydantic models for request body validation. When a `POST /api/query` request arrives, Pydantic automatically validates that `session_id` and `query` are both present strings.
- **Role in the system:** Defines the `QueryRequest` model used by the query endpoint. Ensures type safety at the API boundary.

#### python-dotenv — Environment Management
- **What it is:** A library that reads key-value pairs from a `.env` file and sets them as environment variables.
- **Why it was chosen:** Secrets (MongoDB URL, LLM API key) and configuration (CORS origins, database name) should never be hardcoded. `python-dotenv` provides the standard pattern for managing these.
- **Role in the system:** Called at application startup via `load_dotenv(ROOT_DIR / '.env')` to load `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, and `EMERGENT_LLM_KEY` into the environment.

---

### 1.3 Database Technology

#### MongoDB 7 — Document Database
- **What it is:** A NoSQL document database that stores data as flexible JSON-like BSON documents within collections.
- **Why it was chosen:** The data schema varies per uploaded file — one CSV might have 5 columns of sales data while another has 20 columns of sensor readings. MongoDB's schemaless design naturally accommodates this variability without requiring migrations or ALTER TABLE statements. Additionally, storing an entire parsed dataset as a list of dictionaries within a single document is a natural fit for MongoDB's document model.
- **Role in the system:** Stores two collections:
  - **`sessions`**: Each document represents one uploaded file. Contains the file metadata (name, row count, column count, upload timestamp), the column profile (types, statistics, top values), data quality metrics, and the actual parsed data rows (up to 5,000 rows as an array of objects).
  - **`queries`**: Each document represents one user query against a session. Contains the original query text, timestamp, and the complete AI analysis response (chart data, findings, forecasts, recommendations).

---

### 1.4 Deployment & Tooling

| Technology | What it is | Role |
|---|---|---|
| **Supervisor** | A process control system for Unix that monitors and auto-restarts long-running processes | Manages three processes in production: `backend` (uvicorn on port 8001), `frontend` (yarn start on port 3000), and `mongodb` (mongod) |
| **Kubernetes Ingress** | Cloud routing layer that directs traffic based on URL path prefixes | Routes `/api/*` requests to the backend on port 8001 and all other requests to the frontend on port 3000 |
| **Yarn v1** | A fast, reliable, and secure JavaScript package manager | Manages all frontend dependencies. The `yarn.lock` file ensures deterministic installs |
| **ESLint** | A static analysis tool for identifying problematic patterns in JavaScript code | Configured via CRACO with React Hooks rules (`rules-of-hooks: error`, `exhaustive-deps: warn`) |
| **Python logging** | Python's built-in logging module | Provides structured server-side logs for debugging upload errors, query failures, and PDF generation issues |

---

## 2. Architecture Overview

### 2.1 System Architecture Diagram (Textual)

```
┌───────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                            │
│                                                                   │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐  │
│  │ WelcomePage  │───▶│  DashboardPage   │───▶│  PDF Download   │  │
│  │  (Upload)    │    │ (Query + Charts) │    │  (new tab)      │  │
│  └──────┬───────┘    └───────┬──────────┘    └────────┬────────┘  │
│         │                    │                        │           │
│         │    Axios HTTP      │    Axios HTTP          │  Direct   │
│         │    (FormData)      │    (JSON)              │  URL      │
└─────────┼────────────────────┼────────────────────────┼───────────┘
          │                    │                        │
          ▼                    ▼                        ▼
┌───────────────────────────────────────────────────────────────────┐
│                    KUBERNETES INGRESS LAYER                        │
│                 (Routes /api/* → port 8001)                        │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND (port 8001)                    │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ /upload   │  │ /query   │  │ /report  │  │ /sessions, etc.  │ │
│  │ endpoint  │  │ endpoint │  │ endpoint │  │ CRUD endpoints   │ │
│  └────┬──────┘  └────┬─────┘  └────┬─────┘  └─────────┬───────┘ │
│       │              │             │                   │         │
│       ▼              │             │                   │         │
│  ┌──────────┐        │             │                   │         │
│  │ Pandas   │        │             │                   │         │
│  │ (parse,  │        │             │                   │         │
│  │ profile) │        │             │                   │         │
│  └────┬─────┘        │             │                   │         │
│       │              ▼             │                   │         │
│       │    ┌──────────────────┐    │                   │         │
│       │    │ Emergent LLM     │    │                   │         │
│       │    │ (GPT-4o call)    │    │                   │         │
│       │    └────────┬─────────┘    │                   │         │
│       │             │              ▼                   │         │
│       │             │    ┌──────────────────┐          │         │
│       │             │    │ ReportLab        │          │         │
│       │             │    │ (PDF generation) │          │         │
│       │             │    └─────────┬────────┘          │         │
│       ▼             ▼              ▼                   ▼         │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                    Motor (async driver)                     │   │
│  └──────────────────────────┬────────────────────────────────┘   │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                   MONGODB (port 27017)                             │
│                                                                   │
│  ┌─────────────────────┐    ┌──────────────────────────┐         │
│  │ sessions collection  │    │ queries collection        │         │
│  │ • id, filename       │    │ • id, session_id          │         │
│  │ • columns, data      │    │ • query, response         │         │
│  │ • date_range         │    │ • timestamp               │         │
│  │ • data_quality       │    │                           │         │
│  └─────────────────────┘    └──────────────────────────┘         │
└───────────────────────────────────────────────────────────────────┘
                              │
                              │ (external, during /query)
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                  OPENAI API (via Emergent proxy)                   │
│                       GPT-4o Model                                 │
│  Input: Data context + column stats + sample rows + user query    │
│  Output: Structured JSON (analysis, chart data, forecast)         │
└───────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Communication

- **Frontend → Backend:** All communication is via HTTP REST over Axios. The frontend reads `REACT_APP_BACKEND_URL` from its `.env` file and appends `/api` to form the base URL. Requests use standard HTTP methods: `POST` for file uploads and queries, `GET` for data retrieval, `DELETE` for session removal.

- **Backend → Database:** The backend communicates with MongoDB through the Motor async driver. All operations are non-blocking `await` calls. The `_id` field generated by MongoDB is systematically excluded from all responses using projection (`{"_id": 0}`).

- **Backend → LLM Service:** During query processing, the backend constructs a detailed text prompt containing the data context and sends it to GPT-4o through the Emergent Integrations library. This is an async HTTP call that typically takes 5–15 seconds.

- **Data Exchange Format:** All API communication uses JSON. File uploads use `multipart/form-data`. PDF downloads return a binary stream with `application/pdf` content type.

---

## 3. Application Workflow (Step-by-Step)

### Step 1: User Opens the Web Application

1. The browser loads the React application from port 3000.
2. React Router renders the `WelcomePage` component at the `/` route.
3. Framer Motion triggers staggered entrance animations — the hero title fades in first, followed by the dropzone area, then the four capability cards.
4. The page displays a centered layout with:
   - Application branding ("AI Data Analyst Agent")
   - A prominent drag-and-drop file upload zone
   - Four capability cards: Analyze, Forecast, Visualize, Report
   - Supported file format indicators (.csv, .xlsx)

### Step 2: File Upload Process

1. The user either drags a file onto the dropzone or clicks to open a file picker.
2. `react-dropzone` validates the file type against the accepted MIME types (CSV, XLSX, XLS).
3. If the file type is unsupported, a toast error appears immediately (client-side validation).
4. For valid files, the upload state activates:
   - The dropzone transitions to show a spinning loader and progress bar
   - Axios sends a `POST /api/upload` request with the file as `multipart/form-data`
   - The `onUploadProgress` callback updates the progress bar in real-time
5. The backend endpoint receives the file bytes.

### Step 3: Backend Data Processing and Validation

1. **File Type Detection:** The backend checks the filename extension to determine whether to use `pd.read_csv()` or `pd.read_excel()`.
2. **Parsing:** Pandas reads the raw bytes from an in-memory `BytesIO` buffer into a DataFrame.
3. **Deduplication:** Duplicate rows are identified and removed. The count of removed duplicates is recorded.
4. **Date Column Detection:** For every column with an `object` dtype, the backend attempts to parse it as a datetime. If more than 50% of values successfully parse as dates, the column type is converted to `datetime64`. This auto-detection is crucial because CSV files store dates as plain strings.
5. **Error Handling:** If parsing fails for any reason (encoding issues, corrupt files, unsupported structure), a 400/500 HTTP error is returned with a descriptive message.

### Step 4: Data Profiling and Analysis

1. **Column Profiling:** Each column is analyzed independently:
   - **Numeric columns:** min, max, mean, median, standard deviation
   - **DateTime columns:** earliest date, latest date
   - **Categorical columns:** top 5 most frequent values with counts
   - **All columns:** null count, unique value count
2. **Date Range Extraction:** If any datetime column exists, the overall date range (start to end) is extracted.
3. **Data Quality Assessment:** Total null count and duplicate count are compiled into a quality summary.
4. **Data Serialization:** The DataFrame is converted to a list of dictionaries (up to 5,000 rows) with careful type conversion:
   - NumPy integers → Python ints
   - NumPy floats → Python floats (NaN → None)
   - Timestamps → ISO 8601 strings
   - Boolean NumPy values → Python bools
5. **Storage:** A session document containing all metadata, the column profile, and the serialized data is inserted into MongoDB's `sessions` collection.
6. **Response:** The session metadata (without the raw data) is returned to the frontend, including the new session ID.

### Step 5: Dashboard Navigation

1. Upon receiving the successful upload response, the frontend calls `navigate(`/dashboard/${response.data.id}`)`.
2. React Router mounts the `DashboardPage` component with the session ID from the URL params.
3. Two parallel API calls fire immediately:
   - `GET /api/session/{sessionId}` — fetches session metadata
   - `GET /api/session/{sessionId}/queries` — fetches any existing query history
4. The dashboard renders with:
   - A fixed 260px sidebar showing session info and query history
   - The main content area showing the Data Overview (stat cards + column profile)
   - A query input bar with suggested starter queries

### Step 6: AI-Powered Query Handling

1. The user types a natural language question (e.g., "What are the top selling products?") into the query input and presses Enter or clicks Send.
2. The frontend sets `analyzing: true`, showing the typing-dot animation.
3. A `POST /api/query` request is sent with `{ session_id, query }`.
4. **Backend prompt construction:**
   - The session's full data is loaded from MongoDB
   - A Pandas DataFrame is reconstructed from the stored records
   - Column statistics are formatted into a human-readable summary
   - The first 50 rows are serialized as a text table
   - All of this is assembled into a structured prompt with clear sections: DATA CONTEXT, COLUMN STATISTICS, SAMPLE DATA, and USER QUERY
5. **LLM invocation:**
   - A new `LlmChat` instance is created with a unique session ID (preventing cross-contamination between queries)
   - The system message instructs GPT-4o to return only valid JSON in a specific schema
   - The data context prompt is sent as a `UserMessage`
   - The response is awaited (typically 5–15 seconds)
6. **Response parsing:**
   - The raw text response is cleaned (markdown code fences stripped if present)
   - JSON parsing is attempted; if it fails, a regex fallback extracts the JSON object
   - If all parsing fails, a fallback response object is created with the raw text
7. **Storage:** The query document (containing the original question, timestamp, and full AI response) is stored in the `queries` collection.
8. **Response:** The complete query document is returned to the frontend.

### Step 7: Visualization Generation

1. The frontend receives the query response and updates state: the new query is prepended to the history array and set as the active query.
2. The `ChartPanel` component inspects `response.visualization`:
   - `chart_type` determines which Recharts chart component to render
   - `x_key` maps to the `dataKey` of the XAxis
   - `y_keys` determine how many data series (Lines, Bars, Areas) to render
   - `data` is the array of objects that Recharts consumes directly
3. The appropriate chart renders inside a `ResponsiveContainer` at 360px height:
   - **Line charts:** Smooth monotone curves with colored dots
   - **Bar charts:** Bars with rounded top corners
   - **Pie charts:** Donut style (inner radius 60, outer 120) with percentage labels
   - **Area charts:** Gradient fills fading from 30% opacity to near-transparent
   - **Scatter charts:** Colored dots on a Cartesian grid
4. All charts share:
   - A custom glassmorphic tooltip (dark background, blur effect)
   - JetBrains Mono font for axis tick labels
   - Manrope font for legends
   - A consistent color palette: Cyan, Emerald, Violet, Amber, Rose

### Step 8: Forecasting and Macro-Signal Integration

1. If the user's query involves future predictions, the LLM sets `forecast.available: true` in its response.
2. The forecast section contains:
   - `time_horizon`: e.g., "Next 3 months"
   - `data`: array of `{ period, value, lower, upper }` for confidence intervals
   - `confidence`: e.g., "85%"
   - `signals`: array of macroeconomic factors, each with:
     - `name`: e.g., "GST Rate Reduction"
     - `value`: e.g., "-2% effective January 2025"
     - `source`: e.g., "Ministry of Finance"
     - `impact`: "positive", "negative", or "neutral"
3. In charts, forecast data points are appended after historical data and rendered with dashed lines (strokeDasharray="8 4") at 60% opacity to visually distinguish predictions from actual data.
4. The `AnalysisResult` component renders the External Signals section with color-coded impact indicators (green dot = positive, red dot = negative, gray dot = neutral).

### Step 9: Report/PDF Generation

1. The user clicks "Download PDF Report" at the bottom of the analysis results.
2. This opens `GET /api/report/{queryId}/download` in a new browser tab.
3. The backend:
   - Loads the query document and its parent session from MongoDB
   - Creates an A4-sized PDF using ReportLab's `SimpleDocTemplate`
   - Defines custom paragraph styles with branded colors
   - Builds the document section by section:
     - Title and timestamp
     - Executive Summary (query and analysis type)
     - Data Overview (file metadata and date range)
     - Analysis Findings (numbered list)
     - Visualization data as a formatted table (cyan header)
     - Forecast table (emerald header) with signals color-coded by impact
     - Agent Insight (highlighted blue background box)
     - Recommendations (numbered list)
   - Writes the PDF to an in-memory buffer
4. The buffer is returned as a `StreamingResponse` with `Content-Disposition: attachment`, triggering a browser download.

### Step 10: Result Delivery to the User

1. The complete analysis is displayed in the dashboard's main content area:
   - **Query Understood** card — showing the AI's restated interpretation
   - **Key Findings** card — 3–5 numbered insights
   - **Agent Insight** card — highlighted direct answer
   - **External Signals** card — (if forecast was requested)
   - **Recommendations** card — actionable suggestions
   - **Download PDF** button
2. The query appears in the sidebar's history list with a timestamp.
3. The user can click any previous query in the history to instantly switch the displayed results without re-running the analysis.

---

## 4. Backend Workflow

### 4.1 Request Lifecycle

1. **Ingress:** An HTTP request arrives at the Kubernetes ingress layer. Requests with paths starting with `/api` are routed to port 8001 (backend). All others go to port 3000 (frontend).

2. **CORS Middleware:** The `CORSMiddleware` processes the request first, allowing cross-origin requests from the frontend domain. For preflight `OPTIONS` requests, it returns immediately with appropriate CORS headers.

3. **Router Matching:** FastAPI's router matches the request path and method against registered endpoints. The `APIRouter(prefix="/api")` ensures all endpoints are accessible under `/api/*`.

4. **Request Validation:** For `POST` endpoints, Pydantic validates the request body against the defined model. For file uploads, FastAPI's `UploadFile` type handles multipart parsing.

5. **Handler Execution:** The async handler function executes. For database operations, Motor's async methods are awaited. For LLM calls, the Emergent Integrations library's async `send_message` is awaited.

6. **Response Serialization:** The return value is automatically serialized to JSON by FastAPI. For PDF downloads, a `StreamingResponse` bypasses JSON serialization and streams raw bytes.

7. **Error Handling:** Unhandled exceptions within handlers are caught by a try/except block, logged via Python's logging module, and returned as HTTP 500 responses with descriptive error messages.

### 4.2 API Endpoints Usage

| Endpoint | Method | Request | Response | Purpose |
|---|---|---|---|---|
| `/api/` | GET | — | `{"message": "AI Data Analyst Agent API"}` | Health check |
| `/api/upload` | POST | `multipart/form-data` with `file` field | Session metadata JSON (id, filename, columns, quality) | Ingest and profile a data file |
| `/api/query` | POST | `{"session_id": "uuid", "query": "text"}` | Query document with AI analysis response | Process a natural language question |
| `/api/sessions` | GET | — | Array of session summaries (no data field) | List all uploaded files |
| `/api/session/{id}` | GET | — | Session metadata (no data field) | Get details of one session |
| `/api/session/{id}/data` | GET | `?limit=100` | `{"data": [...]}` | Get raw parsed rows |
| `/api/session/{id}/queries` | GET | — | Array of query documents | Get query history for a session |
| `/api/report/{query_id}/download` | GET | — | PDF binary stream | Generate and download report |
| `/api/session/{id}` | DELETE | — | `{"message": "Session deleted"}` | Delete session and its queries |

### 4.3 Database Interactions

All database operations follow a consistent pattern:

- **Writes** use `insert_one()` and always construct the document in Python with a `uuid4()` ID field before insertion. The MongoDB-generated `_id` is never used as the application identifier.
- **Reads** always include `{"_id": 0}` in the projection to prevent `ObjectId` serialization errors.
- **Heavy reads** (session detail for queries, session list) exclude the `data` field from projections to avoid transferring megabytes of parsed row data when only metadata is needed.
- **Deletes** use `delete_one()` for the session and `delete_many()` for its associated queries, ensuring cascade cleanup.
- **Sorting** uses MongoDB's native `sort()` with `-1` (descending) on timestamp fields to show most recent items first.

### 4.4 AI/LLM Invocation Flow

1. **Session Loading:** The full session document (including all data rows) is loaded from MongoDB.
2. **Context Assembly:** The backend constructs a text prompt with four sections:
   - File metadata (name, row count, column count, date range, quality metrics)
   - Column-level statistics (formatted as a bulleted list)
   - A 50-row data sample (rendered as a text table via `DataFrame.to_string()`)
   - The user's original query
3. **Chat Initialization:** A new `LlmChat` instance is created with:
   - `api_key`: The Emergent universal key from the environment
   - `session_id`: A unique `f"analyst-{query_id}"` string to isolate this conversation
   - `system_message`: The 30-line analysis system prompt that defines the expected JSON schema
4. **Model Selection:** `.with_model("openai", "gpt-4o")` configures the Emergent proxy to route to OpenAI's GPT-4o model.
5. **Message Sending:** `await chat.send_message(UserMessage(text=prompt))` makes the async HTTP call to the LLM.
6. **Response Parsing:** A multi-stage parser handles the response:
   - Strip leading/trailing whitespace
   - Detect and remove markdown code fences (` ```json ... ``` `)
   - Attempt `json.loads()` on the cleaned string
   - If that fails, use regex to extract the outermost `{...}` JSON object
   - If all parsing fails, construct a fallback response with the raw text
7. **Storage:** The parsed analysis is stored alongside the original query in MongoDB.

### 4.5 Error Handling Strategy

The backend employs a **layered error handling** approach:

- **HTTP Exceptions:** Explicit `HTTPException` raises (400 for bad input, 404 for missing resources) are re-raised without catching.
- **General Exceptions:** A broad `except Exception as e` catches unexpected errors, logs the full error message via Python's logging, and returns a 500 response with a descriptive message.
- **LLM Response Failures:** The JSON parser has a graceful fallback — if the LLM returns malformed JSON, the system still creates a usable response object with the raw text, ensuring the user always sees some result.
- **Data Type Edge Cases:** The `clean_val()` function explicitly handles every NumPy and Pandas type that could cause JSON serialization failures, including `NaN`, `Inf`, `np.bool_`, and `pd.Timestamp`.

---

## 5. Frontend Workflow

### 5.1 UI Interaction Flow

The frontend has two primary views:

**Welcome Page (`/`):**
1. User arrives → sees animated hero section
2. User drops or selects a file → progress bar appears
3. Upload succeeds → automatic navigation to dashboard
4. Upload fails → toast error, dropzone resets

**Dashboard Page (`/dashboard/:sessionId`):**
1. Page loads → loading spinner while session + queries fetch
2. Data overview cards display → column profile grid below
3. User types or clicks a suggested query → analyzing animation starts
4. Analysis completes → chart + result cards animate into view
5. User clicks sidebar history item → active query switches instantly (no API call)
6. User clicks "Download PDF" → PDF opens in new tab
7. User clicks "New Upload" → navigates back to Welcome page
8. User clicks "Delete Session" → session removed, redirected to Welcome

### 5.2 API Calls

All API calls are centralized through the `API` constant:

```
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
```

| Component | Trigger | API Call | On Success | On Error |
|---|---|---|---|---|
| WelcomePage | File dropped | `POST ${API}/upload` | Navigate to `/dashboard/{id}` | Toast error, reset state |
| DashboardPage | Page mount | `GET ${API}/session/{id}` | Set session state | Show error view |
| DashboardPage | Page mount | `GET ${API}/session/{id}/queries` | Set queries + activeQuery | Silent |
| DashboardPage | Query submit | `POST ${API}/query` | Prepend to queries, set active | Toast error |
| DashboardPage | Delete click | `DELETE ${API}/session/{id}` | Navigate to `/` | Toast error |
| AnalysisResult | PDF click | `window.open(${API}/report/{id}/download)` | Browser downloads PDF | — |

### 5.3 State Management

The application uses **React's built-in state management** (useState + useCallback) rather than an external state library. The DashboardPage component serves as the state container for the dashboard view:

| State Variable | Type | Purpose |
|---|---|---|
| `session` | Object or null | Current session metadata (filename, columns, quality) |
| `queries` | Array | All queries for the current session, sorted newest-first |
| `activeQuery` | Object or null | The currently displayed query (drives chart + analysis rendering) |
| `loading` | Boolean | True during initial page load |
| `analyzing` | Boolean | True while an LLM query is in progress |
| `error` | String or null | Error message if session fails to load |

State transitions follow a predictable pattern:
- `loading: true` → fetch session + queries → `loading: false`
- Query submitted → `analyzing: true` → API returns → update `queries` and `activeQuery` → `analyzing: false`
- History item clicked → `setActiveQuery(selectedQuery)` (immediate, no API call)

### 5.4 Chart Rendering

The `ChartPanel` component implements a **dynamic chart factory pattern**:

1. It receives `visualization` and `forecast` props from the active query's response.
2. It extracts `chart_type`, `data`, `x_key`, and `y_keys` from the visualization object.
3. A `useMemo` hook processes chart data and forecast data, merging them if forecast is available.
4. The `xDataKey` and `yDataKeys` are computed — if the LLM didn't provide explicit keys, it falls back to auto-detecting numeric keys from the first data object.
5. A `switch(chart_type)` statement renders the appropriate Recharts component.
6. Each chart type shares common configuration:
   - `CartesianGrid` with dashed lines on a semi-transparent border color
   - `XAxis` and `YAxis` with JetBrains Mono font at 11px
   - `CustomTooltip` with glassmorphic styling
   - `Legend` with Manrope font
7. For line charts with forecast data, additional dashed `<Line>` components are rendered at reduced opacity.

### 5.5 User Feedback and Loading States

The application provides continuous visual feedback at every stage:

- **File Upload:** Progress bar with percentage, animated spinner, "Processing your data..." text
- **Query Processing:** Three animated typing dots (bouncing with staggered delays) + "Analyzing data..." text in monospace
- **Page Loading:** Full-screen centered spinner with "Loading session..." text
- **Error States:** AlertCircle icon with descriptive message and "Go back" link
- **Empty State:** Globe icon with "Ready to analyze" message and guidance text
- **Success:** Toast notifications for completed uploads and analyses
- **Errors:** Toast notifications with specific error messages from the backend

---

## 6. Data Flow Diagram (Textual Explanation)

### Complete Data Journey: From File Upload to Final Output

```
USER ACTION                FRONTEND                    BACKEND                     EXTERNAL
═══════════              ═══════════                 ═══════════                 ═══════════

1. Drop CSV file    ──▶  FormData + Axios POST  ──▶  FastAPI receives bytes
                                                      │
                                                      ├── Pandas reads CSV/Excel
                                                      ├── Drop duplicates
                                                      ├── Auto-detect date columns
                                                      ├── Profile each column
                                                      ├── Serialize to dict list
                                                      ├── Insert into MongoDB    ──▶  MongoDB
                                                      │   (sessions collection)       stores
                                                      │                               document
                                                      ◀── Return session metadata
                         ◀── Receive session ID
                         Navigate to /dashboard/{id}

2. Type question    ──▶  Axios POST /api/query   ──▶  FastAPI receives JSON
                                                      │
                                                      ├── Load session from MongoDB ◀── MongoDB
                                                      ├── Reconstruct DataFrame        returns
                                                      ├── Build stats summary          document
                                                      ├── Format 50-row sample
                                                      ├── Assemble prompt
                                                      │
                                                      ├── Send to LLM            ──▶  GPT-4o via
                                                      │   (await 5-15 seconds)         Emergent
                                                      │                                proxy
                                                      ◀── Receive JSON response   ◀──
                                                      │
                                                      ├── Parse/validate JSON
                                                      ├── Store query + response  ──▶  MongoDB
                                                      │   (queries collection)         stores
                                                      │                                document
                                                      ◀── Return query document
                         ◀── Receive full analysis
                         │
                         ├── Render ChartPanel
                         │   (Recharts selects chart type
                         │    from response.visualization)
                         │
                         ├── Render AnalysisResult
                         │   (findings, insight, signals,
                         │    recommendations)
                         │
                         └── Update sidebar history

3. Click PDF        ──▶  window.open(URL)        ──▶  FastAPI receives GET
                                                      │
                                                      ├── Load query from MongoDB  ◀── MongoDB
                                                      ├── Load session from MongoDB ◀──
                                                      ├── Build PDF with ReportLab
                                                      │   (title, summary, tables,
                                                      │    forecast, recommendations)
                                                      ├── Write to BytesIO buffer
                                                      │
                                                      ◀── Stream PDF response
                         ◀── Browser downloads PDF
```

### Key Data Transformations

| Stage | Input Format | Output Format | Transformation |
|---|---|---|---|
| File Upload | Raw CSV/XLSX bytes | MongoDB document (JSON) | Pandas parse → profile → serialize |
| Query Prompt | MongoDB JSON document | Text string | DataFrame reconstruction → text formatting |
| LLM Analysis | Text prompt | Structured JSON | GPT-4o reasoning + formatting |
| Chart Rendering | JSON data array | SVG elements | Recharts component mapping |
| PDF Generation | MongoDB JSON document | PDF binary | ReportLab platypus layout engine |

---

## 7. Use Cases

### 7.1 Typical User Scenarios

#### Scenario 1: Sales Manager Monthly Review
A regional sales manager uploads a CSV export from their CRM containing 12 months of sales data (date, product, region, salesperson, revenue, quantity). They ask: "Which product category had the highest growth rate this quarter compared to last?" The AI returns a bar chart comparing category growth rates, identifies the top performer with exact percentages, and recommends increasing inventory for the growth leader.

#### Scenario 2: Financial Analyst Forecasting
A financial analyst uploads quarterly revenue data for the past 3 years. They ask: "Forecast revenue for the next 2 quarters." The AI generates a line chart with historical data as solid lines and projected values as dashed lines with confidence bands. The forecast includes macroeconomic signals such as central bank rate decisions and industry-specific regulatory changes.

#### Scenario 3: Operations Team Data Profiling
An operations team receives a large dataset from a new vendor and needs to understand its structure. They upload the file and ask: "Give me a summary of this dataset." The AI returns descriptive statistics, identifies data quality issues (null columns, unexpected distributions), and recommends data cleaning steps.

#### Scenario 4: Executive Report Generation
A VP needs to include data analysis in a board presentation. After running several queries and reviewing charts, they click "Download PDF Report" to get a professionally formatted document with executive summary, key findings, visualizations (as data tables), and recommendations — ready to attach to an email or embed in a slide deck.

#### Scenario 5: Multi-Session Comparative Analysis
A market researcher uploads separate CSV files for different market segments. They create a session for each file, ask similar questions across sessions, and use the query history to review and compare findings.

### 7.2 Real-World Applications

| Domain | Application |
|---|---|
| **Retail & E-commerce** | Sales trend analysis, inventory optimization, seasonal demand forecasting |
| **Finance & Banking** | Revenue forecasting, expense analysis, portfolio performance review |
| **Healthcare** | Patient data profiling, treatment outcome analysis, resource utilization |
| **Manufacturing** | Production efficiency analysis, defect rate trending, supply chain optimization |
| **Human Resources** | Workforce analytics, attrition pattern detection, compensation benchmarking |
| **Marketing** | Campaign performance analysis, customer segmentation, ROI attribution |
| **Government & Policy** | Budget allocation analysis, demographic trend forecasting, program effectiveness |
| **Education** | Student performance analysis, enrollment trend forecasting, curriculum impact assessment |

---

## 8. Conclusion

### 8.1 Technology Synergy

The AI Data Analyst Agent achieves its mission through a carefully orchestrated technology stack where each layer plays a distinct, non-overlapping role:

- **React + Recharts + Framer Motion** create a responsive, visually rich frontend that can dynamically render any chart type the AI recommends, with smooth animations that make data exploration feel fluid rather than mechanical.

- **FastAPI + Pandas + Motor** provide an async backend pipeline where file parsing, database I/O, and LLM calls all happen without blocking — critical for an application where individual AI queries can take 10+ seconds.

- **MongoDB** provides the schemaless flexibility necessary for storing arbitrarily structured uploaded data without requiring schema migrations for every new file format.

- **GPT-4o** acts as the analytical brain, transforming raw data context into structured, chart-ready analysis that the frontend can render directly — eliminating the need for hardcoded statistical algorithms for every possible query type.

- **ReportLab** ensures that insights don't stay trapped in the browser — every analysis can be exported as a professional PDF for offline consumption, sharing, and archival.

### 8.2 Scalability

- **Horizontal Backend Scaling:** Uvicorn supports multiple workers (`--workers N`), and since all state is in MongoDB (not in-process memory), additional backend instances can be added behind a load balancer.
- **Database Scaling:** MongoDB supports replica sets for high availability and sharding for horizontal data distribution. The current 5,000-row storage limit per session can be increased or the architecture can shift to storing data references rather than inline data.
- **LLM Scaling:** The Emergent Integration proxy handles rate limiting and model routing. The per-query unique session ID ensures no state leakage between concurrent users.

### 8.3 Flexibility

- **Model Swappable:** Changing from GPT-4o to Claude or Gemini requires only modifying the `.with_model()` call — the Emergent Integration library abstracts the provider differences.
- **Chart Types Extensible:** Adding a new chart type (e.g., heatmap, waterfall) requires adding one new case to the `ChartPanel` switch statement and updating the LLM system prompt.
- **File Formats Extensible:** Supporting new file formats (e.g., Parquet, JSON) requires adding one new conditional branch in the upload endpoint.

### 8.4 Extensibility

The architecture supports natural extension in several directions:

- **Authentication:** Adding user sessions and per-user data isolation via JWT middleware.
- **Real-Time Signals:** Integrating live macroeconomic APIs (news feeds, central bank rates) for real-time forecast enrichment instead of relying solely on LLM knowledge.
- **Collaborative Analysis:** Sharing session URLs with team members for collaborative querying.
- **Scheduled Reports:** Adding a scheduler that runs predefined queries against updated data and emails PDF reports periodically.
- **Streaming Responses:** Implementing server-sent events for streaming LLM responses token-by-token, reducing perceived latency for long analyses.

The system is designed as a foundation — every major component (data ingestion, AI analysis, visualization, report generation) is isolated behind clean API boundaries, making it straightforward to enhance any individual capability without disrupting the others.
