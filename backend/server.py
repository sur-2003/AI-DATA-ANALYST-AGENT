from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
from datetime import datetime, timezone
import os, uuid, json, io, logging, math, re
import pandas as pd
import numpy as np
from openai import OpenAI

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors as rl_colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database Setup - Supports both PostgreSQL (production) and SQLite (development/preview)
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    # Default to SQLite for easy local development
    DATABASE_URL = f"sqlite:///{ROOT_DIR}/data_analyst.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# SQLAlchemy Models
class FileSession(Base):
    __tablename__ = "file_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    row_count = Column(Integer, nullable=False)
    column_count = Column(Integer, nullable=False)
    columns = Column(JSON, nullable=False)
    date_range = Column(JSON, nullable=True)
    data_quality = Column(JSON, nullable=True)
    data = Column(JSON, nullable=False)


class QueryRecord(Base):
    __tablename__ = "query_records"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=False, index=True)
    query = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    response = Column(JSON, nullable=True)


# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Data Analyst Agent", version="1.0.0")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# OpenAI Client
openai_client = None
def get_openai_client():
    global openai_client
    if openai_client is None:
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
        openai_client = OpenAI(api_key=api_key)
    return openai_client


# --- Pydantic Models ---
class QueryRequest(BaseModel):
    session_id: str
    query: str


# --- Helpers ---
def clean_val(obj):
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    if isinstance(obj, np.bool_):
        return bool(obj)
    try:
        if pd.isna(obj):
            return None
    except (TypeError, ValueError):
        pass
    return obj


def profile_dataframe(df):
    columns = []
    for col in df.columns:
        info = {
            "name": col,
            "type": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
            "unique_count": int(df[col].nunique()),
        }
        if pd.api.types.is_numeric_dtype(df[col]):
            info["min"] = clean_val(df[col].min())
            info["max"] = clean_val(df[col].max())
            info["mean"] = clean_val(df[col].mean())
            info["median"] = clean_val(df[col].median())
            info["std"] = clean_val(df[col].std())
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            info["min"] = str(df[col].min())
            info["max"] = str(df[col].max())
        else:
            top = df[col].value_counts().head(5).to_dict()
            info["top_values"] = {str(k): int(v) for k, v in top.items()}
        columns.append(info)

    date_range = None
    date_cols = df.select_dtypes(include=['datetime64']).columns
    if len(date_cols) > 0:
        dc = date_cols[0]
        date_range = {"column": dc, "start": str(df[dc].min()), "end": str(df[dc].max())}

    quality = {
        "total_nulls": int(df.isnull().sum().sum()),
        "duplicates_found": int(df.duplicated().sum())
    }
    return columns, date_range, quality


def df_to_records(df, max_rows=5000):
    df_c = df.head(max_rows).copy()
    for col in df_c.columns:
        if pd.api.types.is_datetime64_any_dtype(df_c[col]):
            df_c[col] = df_c[col].astype(str)
    df_c = df_c.where(pd.notnull(df_c), None)
    records = df_c.to_dict(orient='records')
    return [{k: clean_val(v) for k, v in r.items()} for r in records]


# --- LLM System Prompt ---
ANALYSIS_SYSTEM_PROMPT = """You are an elite AI Data Analyst Agent. You analyze structured data and provide actionable insights with professional precision.

When given data context and a user query, respond with ONLY valid JSON (no markdown fences, no extra text) in this format:

{
  "query_understood": "Your restated understanding of the query",
  "analysis_type": "descriptive|diagnostic|predictive|prescriptive",
  "visualization": {
    "chart_type": "line|bar|pie|scatter|area",
    "reason": "Why this chart type",
    "title": "Chart title",
    "x_key": "Key for x-axis in data objects",
    "y_keys": ["key1", "key2"],
    "data": [{"name": "Label", "value": 123}]
  },
  "analysis_summary": ["Finding 1", "Finding 2", "Finding 3"],
  "forecast": {
    "available": false,
    "time_horizon": "",
    "data": [],
    "confidence": "",
    "signals": []
  },
  "agent_insight": "Direct, precise answer with numeric rationale",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

CRITICAL RULES:
- Return ONLY valid JSON. No markdown code fences. No text outside JSON.
- Chart data MUST be an array of objects with consistent keys.
- For line/bar/area: use descriptive key names like "month", "sales", "revenue".
- For pie charts: use "name" and "value" keys.
- x_key should match a key in data objects for x-axis labels.
- y_keys should list the numeric value keys to plot.
- Numbers must be actual numbers, not strings.
- Include 3-5 analysis findings.
- If the query involves future predictions, set forecast.available=true and include realistic projections with confidence intervals and macroeconomic signals.
- Signals format: {"name": "Signal Name", "value": "Change/Value", "source": "Source", "impact": "positive|negative|neutral"}
- Never fabricate data points not derivable from the provided data.
- For descriptive queries, provide thorough statistical summaries.
"""


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Endpoints ---
@api_router.get("/")
async def root():
    return {"message": "AI Data Analyst Agent API", "version": "1.0.0"}


@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    db = SessionLocal()
    try:
        filename = file.filename or "unknown.csv"
        
        # Extension-based validation (Windows-friendly)
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        if ext not in ('csv', 'xlsx', 'xls'):
            raise HTTPException(status_code=400, detail="Unsupported format. Use .csv or .xlsx files only.")
        
        content = await file.read()

        if ext == 'csv':
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))

        initial_rows = len(df)
        df = df.drop_duplicates()
        dups_removed = initial_rows - len(df)

        for col in df.columns:
            if df[col].dtype == 'object':
                try:
                    parsed = pd.to_datetime(df[col], format='mixed', dayfirst=False)
                    if parsed.notna().sum() > len(df) * 0.5:
                        df[col] = parsed
                except Exception:
                    pass

        columns_info, date_range, quality = profile_dataframe(df)
        quality["duplicates_removed"] = dups_removed

        session_id = str(uuid.uuid4())
        records = df_to_records(df)

        # Create session in PostgreSQL
        session_obj = FileSession(
            id=session_id,
            filename=filename,
            uploaded_at=datetime.now(timezone.utc),
            row_count=len(df),
            column_count=len(df.columns),
            columns=columns_info,
            date_range=date_range,
            data_quality=quality,
            data=records
        )
        db.add(session_obj)
        db.commit()

        return {
            "id": session_id,
            "filename": filename,
            "uploaded_at": session_obj.uploaded_at.isoformat(),
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": columns_info,
            "date_range": date_range,
            "data_quality": quality
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")
    finally:
        db.close()


@api_router.post("/query")
async def process_query(request: QueryRequest):
    db = SessionLocal()
    try:
        session = db.query(FileSession).filter(FileSession.id == request.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        data = session.data or []
        df = pd.DataFrame(data)

        stats = ""
        for ci in session.columns:
            stats += f"\n- {ci['name']} ({ci['type']}): "
            if "min" in ci and ci.get("min") is not None:
                stats += f"min={ci['min']}, max={ci['max']}, mean={ci.get('mean','N/A')}, median={ci.get('median','N/A')}"
            if "top_values" in ci:
                stats += f"top values={ci['top_values']}"

        sample = df.head(50).to_string(index=False, max_cols=15)

        prompt = f"""DATA CONTEXT:
File: {session.filename}
Rows: {session.row_count} | Columns: {session.column_count}
Date Range: {json.dumps(session.date_range)}
Data Quality: {json.dumps(session.data_quality)}

COLUMN STATISTICS:{stats}

SAMPLE DATA (first 50 rows):
{sample}

USER QUERY: {request.query}

Analyze the data thoroughly and respond with the structured JSON format as specified."""

        query_id = str(uuid.uuid4())
        
        # Use OpenAI API
        client = get_openai_client()
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        response_text = completion.choices[0].message.content

        # Parse JSON
        analysis = None
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            parts = cleaned.split("```")
            if len(parts) >= 2:
                cleaned = parts[1]
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
            cleaned = cleaned.strip()

        try:
            analysis = json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r'\{[\s\S]*\}', cleaned)
            if match:
                try:
                    analysis = json.loads(match.group())
                except json.JSONDecodeError:
                    pass

        if not analysis:
            analysis = {
                "query_understood": request.query,
                "analysis_type": "descriptive",
                "visualization": {"chart_type": "bar", "reason": "Default fallback", "title": "Analysis", "x_key": "name", "y_keys": ["value"], "data": []},
                "analysis_summary": [response_text[:500] if response_text else "Analysis could not be parsed"],
                "forecast": {"available": False},
                "agent_insight": response_text[:300] if response_text else "Unable to generate insight",
                "recommendations": []
            }

        # Save query to PostgreSQL
        query_obj = QueryRecord(
            id=query_id,
            session_id=request.session_id,
            query=request.query,
            timestamp=datetime.now(timezone.utc),
            response=analysis
        )
        db.add(query_obj)
        db.commit()

        return {
            "id": query_id,
            "session_id": request.session_id,
            "query": request.query,
            "timestamp": query_obj.timestamp.isoformat(),
            "response": analysis
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        db.close()


@api_router.get("/sessions")
async def list_sessions():
    db = SessionLocal()
    try:
        sessions = db.query(FileSession).order_by(FileSession.uploaded_at.desc()).limit(100).all()
        return [
            {
                "id": s.id,
                "filename": s.filename,
                "uploaded_at": s.uploaded_at.isoformat() if s.uploaded_at else None,
                "row_count": s.row_count,
                "column_count": s.column_count,
                "columns": s.columns,
                "date_range": s.date_range,
                "data_quality": s.data_quality
            }
            for s in sessions
        ]
    finally:
        db.close()


@api_router.get("/session/{session_id}")
async def get_session(session_id: str):
    db = SessionLocal()
    try:
        session = db.query(FileSession).filter(FileSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return {
            "id": session.id,
            "filename": session.filename,
            "uploaded_at": session.uploaded_at.isoformat() if session.uploaded_at else None,
            "row_count": session.row_count,
            "column_count": session.column_count,
            "columns": session.columns,
            "date_range": session.date_range,
            "data_quality": session.data_quality
        }
    finally:
        db.close()


@api_router.get("/session/{session_id}/data")
async def get_session_data(session_id: str, limit: int = 100):
    db = SessionLocal()
    try:
        session = db.query(FileSession).filter(FileSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"data": (session.data or [])[:limit]}
    finally:
        db.close()


@api_router.get("/session/{session_id}/queries")
async def get_session_queries(session_id: str):
    db = SessionLocal()
    try:
        queries = db.query(QueryRecord).filter(
            QueryRecord.session_id == session_id
        ).order_by(QueryRecord.timestamp.desc()).limit(100).all()
        return [
            {
                "id": q.id,
                "session_id": q.session_id,
                "query": q.query,
                "timestamp": q.timestamp.isoformat() if q.timestamp else None,
                "response": q.response
            }
            for q in queries
        ]
    finally:
        db.close()


@api_router.get("/report/{query_id}/download")
async def download_report(query_id: str):
    db = SessionLocal()
    try:
        query_doc = db.query(QueryRecord).filter(QueryRecord.id == query_id).first()
        if not query_doc:
            raise HTTPException(status_code=404, detail="Query not found")

        session = db.query(FileSession).filter(FileSession.id == query_doc.session_id).first()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.75*inch, bottomMargin=0.75*inch, leftMargin=0.75*inch, rightMargin=0.75*inch)

        styles = getSampleStyleSheet()
        title_s = ParagraphStyle('Title2', parent=styles['Title'], fontSize=22, textColor=rl_colors.HexColor('#0284C7'), spaceAfter=20)
        heading_s = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=13, textColor=rl_colors.HexColor('#0369A1'), spaceBefore=14, spaceAfter=8)
        body_s = ParagraphStyle('Body2', parent=styles['Normal'], fontSize=10, textColor=rl_colors.HexColor('#1E293B'), leading=14)
        insight_s = ParagraphStyle('Insight2', parent=styles['Normal'], fontSize=11, textColor=rl_colors.HexColor('#0F172A'), backColor=rl_colors.HexColor('#E0F2FE'), borderPadding=10, leading=16)
        meta_s = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=9, textColor=rl_colors.HexColor('#64748B'))

        elements = []
        resp = query_doc.response or {}

        elements.append(Paragraph("AI Data Analyst Report", title_s))
        elements.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}", meta_s))
        elements.append(Spacer(1, 20))

        elements.append(Paragraph("Executive Summary", heading_s))
        elements.append(Paragraph(f"<b>Query:</b> {resp.get('query_understood', query_doc.query or '')}", body_s))
        elements.append(Paragraph(f"<b>Analysis Type:</b> {resp.get('analysis_type', 'N/A').title()}", body_s))
        elements.append(Spacer(1, 10))

        if session:
            elements.append(Paragraph("Data Overview", heading_s))
            elements.append(Paragraph(f"<b>File:</b> {session.filename or 'N/A'}", body_s))
            elements.append(Paragraph(f"<b>Dimensions:</b> {session.row_count or 0} rows x {session.column_count or 0} columns", body_s))
            dr = session.date_range
            if dr:
                elements.append(Paragraph(f"<b>Date Range:</b> {dr.get('start', '')} to {dr.get('end', '')}", body_s))
            elements.append(Spacer(1, 10))

        elements.append(Paragraph("Analysis Findings", heading_s))
        for i, finding in enumerate(resp.get("analysis_summary", []), 1):
            elements.append(Paragraph(f"{i}. {finding}", body_s))
        elements.append(Spacer(1, 10))

        viz = resp.get("visualization", {})
        if viz.get("data"):
            elements.append(Paragraph(f"Visualization: {viz.get('title', 'Chart')}", heading_s))
            elements.append(Paragraph(f"<i>Chart Type: {viz.get('chart_type', 'bar')} - {viz.get('reason', '')}</i>", meta_s))
            chart_data = viz["data"]
            if chart_data and len(chart_data) > 0:
                headers = list(chart_data[0].keys())
                tdata = [headers] + [[str(row.get(h, ''))[:30] for h in headers] for row in chart_data[:25]]
                t = Table(tdata, repeatRows=1)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), rl_colors.HexColor('#0284C7')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), rl_colors.white),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, rl_colors.HexColor('#CBD5E1')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [rl_colors.HexColor('#F8FAFC'), rl_colors.white]),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ]))
                elements.append(t)
            elements.append(Spacer(1, 10))

        forecast = resp.get("forecast", {})
        if forecast.get("available"):
            elements.append(Paragraph("Forecast", heading_s))
            elements.append(Paragraph(f"<b>Horizon:</b> {forecast.get('time_horizon', 'N/A')} | <b>Confidence:</b> {forecast.get('confidence', 'N/A')}", body_s))
            if forecast.get("data"):
                fh = ["Period", "Forecast", "Lower", "Upper"]
                fd = [fh] + [[str(fp.get("period", "")), str(fp.get("value", "")), str(fp.get("lower", "")), str(fp.get("upper", ""))] for fp in forecast["data"]]
                ft = Table(fd, repeatRows=1)
                ft.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), rl_colors.HexColor('#059669')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), rl_colors.white),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, rl_colors.HexColor('#CBD5E1')),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ]))
                elements.append(ft)
            if forecast.get("signals"):
                elements.append(Spacer(1, 5))
                elements.append(Paragraph("<b>External Signals Applied:</b>", body_s))
                for sig in forecast["signals"]:
                    impact_color = '#059669' if sig.get('impact') == 'positive' else '#DC2626' if sig.get('impact') == 'negative' else '#64748B'
                    elements.append(Paragraph(f"<font color='{impact_color}'>{sig.get('name', '')}</font>: {sig.get('value', '')} - <i>{sig.get('source', '')}</i>", body_s))
            elements.append(Spacer(1, 10))

        elements.append(Paragraph("Agent Insight", heading_s))
        elements.append(Paragraph(resp.get("agent_insight", "N/A"), insight_s))
        elements.append(Spacer(1, 10))

        if resp.get("recommendations"):
            elements.append(Paragraph("Recommendations", heading_s))
            for i, rec in enumerate(resp.get("recommendations", []), 1):
                elements.append(Paragraph(f"{i}. {rec}", body_s))

        doc.build(elements)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=analysis_report_{query_id[:8]}.pdf"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report error: {e}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
    finally:
        db.close()


@api_router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    db = SessionLocal()
    try:
        session = db.query(FileSession).filter(FileSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Delete queries first
        db.query(QueryRecord).filter(QueryRecord.session_id == session_id).delete()
        # Delete session
        db.delete(session)
        db.commit()
        
        return {"message": "Session deleted"}
    finally:
        db.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
