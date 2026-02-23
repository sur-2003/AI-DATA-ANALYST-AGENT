from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from pathlib import Path
from datetime import datetime, timezone
import os, uuid, json, io, logging, math, re
import pandas as pd
import numpy as np

from emergentintegrations.llm.chat import LlmChat, UserMessage

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors as rl_colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


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


# --- Endpoints ---
@api_router.get("/")
async def root():
    return {"message": "AI Data Analyst Agent API"}


@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        filename = file.filename or "unknown.csv"
        content = await file.read()

        if filename.lower().endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Use .csv or .xlsx")

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

        session_doc = {
            "id": session_id,
            "filename": filename,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": columns_info,
            "date_range": date_range,
            "data_quality": quality,
            "data": records,
        }
        await db.sessions.insert_one(session_doc)

        resp = {k: v for k, v in session_doc.items() if k not in ('data', '_id')}
        return resp

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")


@api_router.post("/query")
async def process_query(request: QueryRequest):
    try:
        session = await db.sessions.find_one({"id": request.session_id}, {"_id": 0})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        data = session.get("data", [])
        df = pd.DataFrame(data)

        stats = ""
        for ci in session["columns"]:
            stats += f"\n- {ci['name']} ({ci['type']}): "
            if "min" in ci and ci.get("min") is not None:
                stats += f"min={ci['min']}, max={ci['max']}, mean={ci.get('mean','N/A')}, median={ci.get('median','N/A')}"
            if "top_values" in ci:
                stats += f"top values={ci['top_values']}"

        sample = df.head(50).to_string(index=False, max_cols=15)

        prompt = f"""DATA CONTEXT:
File: {session['filename']}
Rows: {session['row_count']} | Columns: {session['column_count']}
Date Range: {json.dumps(session.get('date_range'))}
Data Quality: {json.dumps(session.get('data_quality'))}

COLUMN STATISTICS:{stats}

SAMPLE DATA (first 50 rows):
{sample}

USER QUERY: {request.query}

Analyze the data thoroughly and respond with the structured JSON format as specified."""

        query_id = str(uuid.uuid4())
        llm_key = os.environ.get('EMERGENT_LLM_KEY')

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"analyst-{query_id}",
            system_message=ANALYSIS_SYSTEM_PROMPT
        )
        chat.with_model("openai", "gpt-4o")

        response_text = await chat.send_message(UserMessage(text=prompt))

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

        query_doc = {
            "id": query_id,
            "session_id": request.session_id,
            "query": request.query,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "response": analysis
        }
        await db.queries.insert_one(query_doc)

        return {k: v for k, v in query_doc.items() if k != '_id'}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@api_router.get("/sessions")
async def list_sessions():
    sessions = await db.sessions.find({}, {"_id": 0, "data": 0}).sort("uploaded_at", -1).to_list(100)
    return sessions


@api_router.get("/session/{session_id}")
async def get_session(session_id: str):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0, "data": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@api_router.get("/session/{session_id}/data")
async def get_session_data(session_id: str, limit: int = 100):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0, "data": 1})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"data": (session.get("data") or [])[:limit]}


@api_router.get("/session/{session_id}/queries")
async def get_session_queries(session_id: str):
    queries = await db.queries.find({"session_id": session_id}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return queries


@api_router.get("/report/{query_id}/download")
async def download_report(query_id: str):
    try:
        query_doc = await db.queries.find_one({"id": query_id}, {"_id": 0})
        if not query_doc:
            raise HTTPException(status_code=404, detail="Query not found")

        session = await db.sessions.find_one({"id": query_doc["session_id"]}, {"_id": 0, "data": 0})

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.75*inch, bottomMargin=0.75*inch, leftMargin=0.75*inch, rightMargin=0.75*inch)

        styles = getSampleStyleSheet()
        title_s = ParagraphStyle('Title2', parent=styles['Title'], fontSize=22, textColor=rl_colors.HexColor('#0284C7'), spaceAfter=20)
        heading_s = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=13, textColor=rl_colors.HexColor('#0369A1'), spaceBefore=14, spaceAfter=8)
        body_s = ParagraphStyle('Body2', parent=styles['Normal'], fontSize=10, textColor=rl_colors.HexColor('#1E293B'), leading=14)
        insight_s = ParagraphStyle('Insight2', parent=styles['Normal'], fontSize=11, textColor=rl_colors.HexColor('#0F172A'), backColor=rl_colors.HexColor('#E0F2FE'), borderPadding=10, leading=16)
        meta_s = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=9, textColor=rl_colors.HexColor('#64748B'))

        elements = []
        resp = query_doc.get("response", {})

        elements.append(Paragraph("AI Data Analyst Report", title_s))
        elements.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}", meta_s))
        elements.append(Spacer(1, 20))

        elements.append(Paragraph("Executive Summary", heading_s))
        elements.append(Paragraph(f"<b>Query:</b> {resp.get('query_understood', query_doc.get('query', ''))}", body_s))
        elements.append(Paragraph(f"<b>Analysis Type:</b> {resp.get('analysis_type', 'N/A').title()}", body_s))
        elements.append(Spacer(1, 10))

        if session:
            elements.append(Paragraph("Data Overview", heading_s))
            elements.append(Paragraph(f"<b>File:</b> {session.get('filename', 'N/A')}", body_s))
            elements.append(Paragraph(f"<b>Dimensions:</b> {session.get('row_count', 0)} rows x {session.get('column_count', 0)} columns", body_s))
            dr = session.get('date_range')
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
            elements.append(Paragraph(f"<i>Chart Type: {viz.get('chart_type', 'bar')} — {viz.get('reason', '')}</i>", meta_s))
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
                    elements.append(Paragraph(f"<font color='{impact_color}'>{sig.get('name', '')}</font>: {sig.get('value', '')} — <i>{sig.get('source', '')}</i>", body_s))
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


@api_router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    result = await db.sessions.delete_one({"id": session_id})
    await db.queries.delete_many({"session_id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
