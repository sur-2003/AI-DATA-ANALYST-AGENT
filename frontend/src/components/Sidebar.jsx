import { Upload, MessageSquare, Trash2, Database, Clock, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

export const Sidebar = ({ session, queries, activeQueryId, onSelectQuery, onDeleteSession }) => {
  const navigate = useNavigate();

  return (
    <aside className="w-[260px] flex-shrink-0 h-screen border-r border-slate-800/50 bg-slate-950/60 backdrop-blur-sm flex flex-col" data-testid="sidebar">
      {/* Header */}
      <div className="p-5 border-b border-slate-800/50">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Database className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">Data Analyst</h1>
            <p className="text-[10px] font-mono text-cyan-400/70 tracking-wider">AI-POWERED</p>
          </div>
        </div>
        <Button
          data-testid="new-upload-btn"
          onClick={() => navigate("/")}
          variant="outline"
          size="sm"
          className="w-full border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-slate-400 hover:text-cyan-400 text-xs"
        >
          <Upload className="h-3.5 w-3.5 mr-2" />
          New Upload
        </Button>
      </div>

      {/* Session Info */}
      {session && (
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Current File</span>
          </div>
          <p className="text-sm text-slate-200 font-medium truncate">{session.filename}</p>
          <div className="flex gap-3 mt-1.5">
            <span className="text-[10px] font-mono text-slate-500">{session.row_count?.toLocaleString()} rows</span>
            <span className="text-[10px] font-mono text-slate-500">{session.column_count} cols</span>
          </div>
          <Button
            data-testid="delete-session-btn"
            onClick={() => onDeleteSession?.()}
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 h-7"
          >
            <Trash2 className="h-3 w-3 mr-1.5" />
            Delete Session
          </Button>
        </div>
      )}

      {/* Query History */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 pb-2 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Query History</span>
          {queries?.length > 0 && (
            <span className="ml-auto text-[10px] font-mono text-slate-600">{queries.length}</span>
          )}
        </div>
        <Separator className="bg-slate-800/50" />
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {queries?.length > 0 ? (
              queries.map((q) => (
                <button
                  key={q.id}
                  data-testid={`query-history-item-${q.id}`}
                  onClick={() => onSelectQuery(q)}
                  className={`w-full text-left p-2.5 rounded-md text-xs transition-colors duration-150 group ${
                    activeQueryId === q.id
                      ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300'
                      : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0 text-slate-600 group-hover:text-cyan-500/50" />
                    <span className="line-clamp-2 leading-relaxed">{q.query}</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-600 mt-1 ml-5">
                    {new Date(q.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              ))
            ) : (
              <div className="p-4 text-center">
                <MessageSquare className="h-6 w-6 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-600">No queries yet</p>
                <p className="text-[10px] text-slate-700 mt-1">Ask a question to get started</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
};
