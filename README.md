# AI Data Analyst Agent

A full-stack AI-powered data analysis platform that transforms raw CSV/Excel data into actionable insights with beautiful visualizations and professional PDF reports.

![AI Data Analyst Agent](./docs/screenshot.png)

## Features

- **Smart Data Ingestion** - Upload CSV or Excel files with automatic schema detection and data profiling
- **AI-Powered Analysis** - Natural language queries powered by GPT-4o for descriptive, diagnostic, predictive, and prescriptive analysis
- **Dynamic Visualizations** - Auto-generated charts (Line, Bar, Pie, Area, Scatter) using Recharts
- **Professional Reports** - One-click PDF report generation with charts, insights, and recommendations
- **Forecasting** - Predictive modeling with real-world economic signal integration

## Tech Stack

### Frontend
- React 19 with React Router
- Tailwind CSS + Shadcn/UI components
- Recharts for data visualization
- Framer Motion for animations
- Axios for API communication

### Backend
- FastAPI (Python)
- SQLAlchemy 2.0 ORM
- PostgreSQL (production) / SQLite (development)
- OpenAI GPT-4o for AI analysis
- Pandas for data processing
- ReportLab for PDF generation

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+ and Yarn
- PostgreSQL 14+ (optional, SQLite works out of the box)
- OpenAI API Key

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ai-data-analyst
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Configure environment
cp .env.example .env.local
# The default REACT_APP_BACKEND_URL=http://localhost:8001 should work
```

### 4. Database Setup

#### Option A: SQLite (Recommended for Development)
No setup required! The app will automatically create `data_analyst.db` in the backend folder.

#### Option B: PostgreSQL (Recommended for Production)
```bash
# Create database
createdb data_analyst

# Update backend/.env with your PostgreSQL connection string
DATABASE_URL=postgresql://username:password@localhost:5432/data_analyst
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
yarn start
```

Open http://localhost:3000 in your browser.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | No (defaults to SQLite) |
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `CORS_ORIGINS` | Allowed origins for CORS | No (defaults to `*`) |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | `http://localhost:8001` |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/` | Health check |
| `POST` | `/api/upload` | Upload CSV/Excel file |
| `POST` | `/api/query` | Submit analysis query |
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/session/{id}` | Get session details |
| `GET` | `/api/session/{id}/data` | Get session data |
| `GET` | `/api/session/{id}/queries` | Get session queries |
| `GET` | `/api/report/{query_id}/download` | Download PDF report |
| `DELETE` | `/api/session/{id}` | Delete session |

## Usage Guide

1. **Upload Data** - Drag & drop or click to upload a CSV or Excel file
2. **View Profile** - See automatic data profiling with column statistics
3. **Ask Questions** - Type natural language queries like:
   - "What are the top selling products?"
   - "Show me sales trends over time"
   - "Forecast the next 3 months"
   - "Compare revenue by region"
4. **Visualize** - View auto-generated charts based on your query
5. **Download Report** - Generate a professional PDF with all insights

## Project Structure

```
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   ├── .env.example       # Environment template
│   └── data_analyst.db    # SQLite database (auto-generated)
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   └── App.js         # Main application
│   ├── package.json       # Node dependencies
│   └── .env.example       # Environment template
│
└── README.md
```

## Troubleshooting

### "OPENAI_API_KEY not configured"
Make sure you've added your OpenAI API key to `backend/.env`:
```
OPENAI_API_KEY=sk-your-key-here
```

### File upload fails on Windows
The app uses extension-based file validation, which should work on all platforms. Ensure your file has a `.csv`, `.xlsx`, or `.xls` extension.

### Database connection errors
If using PostgreSQL, ensure:
1. PostgreSQL service is running
2. Database `data_analyst` exists
3. Connection string in `.env` is correct

For SQLite (default), simply delete `data_analyst.db` to reset.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for your portfolio or any other purpose.

## Acknowledgments

- OpenAI for GPT-4o API
- Shadcn/UI for beautiful components
- Recharts for data visualization
