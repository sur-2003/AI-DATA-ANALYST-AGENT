import { Download, TrendingUp, Lightbulb, BarChart3, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "./GlassCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AnalysisResult = ({ queryData }) => {
  const { response, id: queryId } = queryData || {};
  if (!response) return null;

  const handleDownloadPDF = () => {
    window.open(`${API}/report/${queryId}/download`, '_blank');
  };

  return (
    <div className="space-y-5 animate-fade-up" data-testid="analysis-result">
      {/* Query Understanding */}
      <GlassCard className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Query Understood</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{response.query_understood}</p>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-cyan-500/30 text-cyan-400 whitespace-nowrap">
            {response.analysis_type}
          </Badge>
        </div>
      </GlassCard>

      {/* Analysis Summary */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Key Findings</span>
        </div>
        <div className="space-y-2.5">
          {(response.analysis_summary || []).map((finding, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono flex items-center justify-center mt-0.5">{i + 1}</span>
              <p className="text-slate-300 text-sm leading-relaxed">{finding}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Agent Insight */}
      <GlassCard className="p-5 border-cyan-500/20 bg-cyan-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Radio className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Agent Insight</span>
        </div>
        <p className="text-slate-200 text-sm leading-relaxed font-medium">{response.agent_insight}</p>
      </GlassCard>

      {/* Forecast Signals */}
      {response.forecast?.available && response.forecast?.signals?.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">External Signals</span>
          </div>
          <div className="space-y-2">
            {response.forecast.signals.map((sig, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-slate-800/50 pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${sig.impact === 'positive' ? 'bg-emerald-400' : sig.impact === 'negative' ? 'bg-rose-400' : 'bg-slate-400'}`} />
                  <span className="text-slate-300">{sig.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-400">{sig.value}</span>
                  <span className="text-xs text-slate-600 italic">{sig.source}</span>
                </div>
              </div>
            ))}
          </div>
          {response.forecast.confidence && (
            <p className="text-xs text-slate-500 mt-3 font-mono">Confidence: {response.forecast.confidence} | Horizon: {response.forecast.time_horizon}</p>
          )}
        </GlassCard>
      )}

      {/* Recommendations */}
      {response.recommendations?.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-mono text-violet-400 uppercase tracking-wider">Recommendations</span>
          </div>
          <ul className="space-y-2">
            {response.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-violet-400 mt-0.5">&#8250;</span>
                {rec}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* Download PDF */}
      <div className="flex justify-end">
        <Button
          data-testid="download-pdf-btn"
          onClick={handleDownloadPDF}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-md shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF Report
        </Button>
      </div>
    </div>
  );
};
