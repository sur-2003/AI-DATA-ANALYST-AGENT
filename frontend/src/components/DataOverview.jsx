import { Database, Columns3, Calendar, AlertTriangle, Hash } from "lucide-react";
import { GlassCard } from "./GlassCard";

const StatCard = ({ icon: Icon, label, value, sub, color = "cyan" }) => {
  const colorMap = {
    cyan: "text-cyan-400 bg-cyan-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    violet: "text-violet-400 bg-violet-500/10",
    rose: "text-rose-400 bg-rose-500/10",
  };
  const [textC, bgC] = (colorMap[color] || colorMap.cyan).split(" ");

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${bgC} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-4 w-4 ${textC}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-lg font-bold text-slate-100 font-mono leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-slate-500 truncate">{sub}</p>}
        </div>
      </div>
    </GlassCard>
  );
};

export const DataOverview = ({ session }) => {
  if (!session) return null;

  const dateRange = session.date_range;
  const quality = session.data_quality || {};

  return (
    <div className="space-y-4" data-testid="data-overview">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Database} label="Total Rows" value={session.row_count?.toLocaleString()} color="cyan" />
        <StatCard icon={Columns3} label="Columns" value={session.column_count} color="violet" />
        <StatCard
          icon={Calendar}
          label="Date Range"
          value={dateRange ? `${dateRange.start?.slice(0, 10) || '—'}` : "N/A"}
          sub={dateRange ? `to ${dateRange.end?.slice(0, 10)}` : "No date column detected"}
          color="emerald"
        />
        <StatCard
          icon={AlertTriangle}
          label="Data Quality"
          value={quality.total_nulls === 0 ? "Clean" : `${quality.total_nulls} nulls`}
          sub={`${quality.duplicates_removed || 0} duplicates removed`}
          color={quality.total_nulls === 0 ? "emerald" : "amber"}
        />
      </div>

      {/* Column Details */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Column Profile</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {(session.columns || []).map((col, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 rounded bg-slate-800/30 border border-slate-800/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-slate-200 truncate">{col.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-mono text-slate-500">{col.type}</span>
                {col.null_count > 0 && (
                  <span className="text-[10px] font-mono text-amber-400/70">{col.null_count} null</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
