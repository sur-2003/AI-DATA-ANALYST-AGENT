import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import { Sidebar } from "@/components/Sidebar";
import { DataOverview } from "@/components/DataOverview";
import { QueryInput } from "@/components/QueryInput";
import { ChartPanel } from "@/components/ChartPanel";
import { AnalysisResult } from "@/components/AnalysisResult";
import { ScrollArea } from "@/components/ui/scroll-area";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [queries, setQueries] = useState([]);
  const [activeQuery, setActiveQuery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/session/${sessionId}`);
      setSession(res.data);
    } catch (err) {
      setError("Session not found. It may have been deleted.");
    }
  }, [sessionId]);

  const fetchQueries = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/session/${sessionId}/queries`);
      setQueries(res.data);
      if (res.data.length > 0 && !activeQuery) {
        setActiveQuery(res.data[0]);
      }
    } catch {
      // Silently handle
    }
  }, [sessionId, activeQuery]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSession(), fetchQueries()]);
      setLoading(false);
    };
    load();
  }, [fetchSession, fetchQueries]);

  const handleQuery = async (queryText) => {
    setAnalyzing(true);
    try {
      const res = await axios.post(`${API}/query`, {
        session_id: sessionId,
        query: queryText,
      });
      setQueries((prev) => [res.data, ...prev]);
      setActiveQuery(res.data);
      toast.success("Analysis complete");
    } catch (err) {
      const msg = err.response?.data?.detail || "Analysis failed. Please try again.";
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteSession = async () => {
    try {
      await axios.delete(`${API}/session/${sessionId}`);
      toast.success("Session deleted");
      navigate("/");
    } catch {
      toast.error("Failed to delete session");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="dashboard-loading">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-mono">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="dashboard-error">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={() => navigate("/")} className="text-cyan-400 text-sm mt-2 hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden relative z-10" data-testid="dashboard-page">
      <Sidebar
        session={session}
        queries={queries}
        activeQueryId={activeQuery?.id}
        onSelectQuery={setActiveQuery}
        onDeleteSession={handleDeleteSession}
      />

      <main className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1">
          <div className="p-6 md:p-8 lg:p-10 space-y-8 max-w-5xl">
            {/* Data Overview */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base md:text-lg font-semibold text-slate-200">Data Overview</h2>
                <span className="text-[10px] font-mono text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded">{session?.filename}</span>
              </div>
              <DataOverview session={session} />
            </motion.div>

            {/* Query Section */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h2 className="text-base md:text-lg font-semibold text-slate-200 mb-3">Ask Your Data</h2>
              <QueryInput onSubmit={handleQuery} loading={analyzing} disabled={!session} />

              {/* Suggested queries */}
              {queries.length === 0 && !analyzing && (
                <div className="mt-4 flex flex-wrap gap-2" data-testid="suggested-queries">
                  {[
                    "Give me a summary of this dataset",
                    "What are the key trends?",
                    "Show distribution of values",
                    "Forecast the next 3 months",
                  ].map((q, i) => (
                    <button
                      key={i}
                      data-testid={`suggested-query-${i}`}
                      onClick={() => handleQuery(q)}
                      className="text-xs text-slate-500 border border-slate-800 hover:border-cyan-500/30 hover:text-cyan-400 rounded-full px-3 py-1.5 transition-colors duration-200"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Results */}
            {activeQuery && (
              <motion.div
                key={activeQuery.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Chart */}
                {activeQuery.response?.visualization?.data?.length > 0 && (
                  <ChartPanel
                    visualization={activeQuery.response.visualization}
                    forecast={activeQuery.response.forecast}
                  />
                )}

                {/* Analysis */}
                <AnalysisResult queryData={activeQuery} />
              </motion.div>
            )}

            {/* Empty state */}
            {!activeQuery && !analyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center py-16"
                data-testid="empty-state"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600">
                    <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-slate-500 mb-1">Ready to analyze</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Type a question above or click a suggested query to start exploring your data.
                </p>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
