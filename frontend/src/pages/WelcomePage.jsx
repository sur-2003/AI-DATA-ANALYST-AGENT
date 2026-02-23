import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Upload, BarChart3, TrendingUp, FileText, Zap, Database, ArrowRight, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const capabilities = [
  { icon: BarChart3, title: "Analyze", desc: "Deep statistical analysis with AI-driven insights", color: "cyan" },
  { icon: TrendingUp, title: "Forecast", desc: "Predictive modeling enriched with macro signals", color: "emerald" },
  { icon: Zap, title: "Visualize", desc: "Auto-generated charts optimized for your data", color: "amber" },
  { icon: FileText, title: "Report", desc: "Professional PDF reports with one click", color: "violet" },
];

const colorMap = {
  cyan: { icon: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  amber: { icon: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  violet: { icon: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
};

export default function WelcomePage() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      toast.error("Unsupported file format. Please use .csv or .xlsx");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      toast.success(`Data loaded: ${response.data.row_count} rows | ${response.data.column_count} columns`);
      navigate(`/dashboard/${response.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed. Check your file format.");
      setUploading(false);
      setProgress(0);
    }
  }, [navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="min-h-screen flex flex-col relative z-10" data-testid="welcome-page">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-violet-500/[0.03] blur-[100px]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 relative z-10">
        {/* Logo + Title */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Database className="h-5 w-5 text-cyan-400" />
            </div>
            <span className="text-xs font-mono text-cyan-400/70 tracking-[0.2em] uppercase">AI Data Analyst Agent</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-50 tracking-tight mb-4 leading-[1.1]">
            Transform raw data into<br />
            <span className="text-cyan-400">actionable intelligence</span>
          </h1>
          <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-xl mx-auto">
            Upload your CSV or Excel files. Get deep analysis, stunning visualizations, and AI-powered forecasts enriched with real-world economic signals.
          </p>
        </motion.div>

        {/* Dropzone */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-xl mb-14"
        >
          <div
            {...getRootProps()}
            data-testid="file-dropzone"
            className={`relative group cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all duration-300
              ${isDragActive
                ? 'border-cyan-400 bg-cyan-500/[0.06] shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)]'
                : 'border-slate-700/60 hover:border-cyan-500/40 hover:bg-slate-800/20'
              }
              ${uploading ? 'pointer-events-none opacity-70' : ''}
            `}
          >
            <input {...getInputProps()} data-testid="file-input" />
            {uploading ? (
              <div className="space-y-4">
                <Loader2 className="h-10 w-10 text-cyan-400 mx-auto animate-spin" />
                <p className="text-sm text-slate-300 font-medium">Processing your data...</p>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs font-mono text-slate-500">{progress}%</p>
              </div>
            ) : (
              <>
                <div className={`w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center transition-colors duration-300 ${isDragActive ? 'bg-cyan-500/20' : 'bg-slate-800/60 group-hover:bg-cyan-500/10'}`}>
                  <Upload className={`h-6 w-6 transition-colors duration-300 ${isDragActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'}`} />
                </div>
                <p className="text-base text-slate-300 font-medium mb-1">
                  {isDragActive ? "Drop your file here" : "Drag & drop your data file"}
                </p>
                <p className="text-sm text-slate-500 mb-3">or click to browse</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-slate-600 bg-slate-800/50 px-2.5 py-1 rounded">
                    <FileSpreadsheet className="h-3 w-3" />.csv
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-slate-600 bg-slate-800/50 px-2.5 py-1 rounded">
                    <FileSpreadsheet className="h-3 w-3" />.xlsx
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full"
        >
          {capabilities.map((cap, i) => {
            const colors = colorMap[cap.color];
            return (
              <GlassCard key={i} className={`p-4 border ${colors.border}`}>
                <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center mb-3`}>
                  <cap.icon className={`h-4 w-4 ${colors.icon}`} />
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">{cap.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{cap.desc}</p>
              </GlassCard>
            );
          })}
        </motion.div>

        {/* Sessions Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10"
        >
          <Button
            data-testid="view-sessions-btn"
            variant="ghost"
            onClick={() => {}}
            className="text-xs text-slate-600 hover:text-cyan-400"
          >
            View previous sessions <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
