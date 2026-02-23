import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const QueryInput = ({ onSubmit, loading, disabled }) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || loading || disabled) return;
    onSubmit(query.trim());
    setQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative" data-testid="query-form">
      <div className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-950/50 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition-colors duration-200">
        <input
          data-testid="query-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about your data... e.g. 'What are the top selling products?'"
          className="flex-1 bg-transparent text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none font-sans"
          disabled={loading || disabled}
        />
        <Button
          data-testid="query-submit-btn"
          type="submit"
          size="sm"
          disabled={!query.trim() || loading || disabled}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-md shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-40 disabled:shadow-none h-9 px-4"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {loading && (
        <div className="flex items-center gap-2 mt-3 ml-1" data-testid="query-loading">
          <div className="flex gap-1">
            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </div>
          <span className="text-xs text-cyan-400/70 font-mono">Analyzing data...</span>
        </div>
      )}
    </form>
  );
};
