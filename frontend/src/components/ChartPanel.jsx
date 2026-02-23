import { useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { GlassCard } from "./GlassCard";

const CHART_COLORS = ["#06B6D4", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-4 py-3 shadow-xl border border-white/10">
      <p className="text-sm font-semibold text-slate-200 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

export const ChartPanel = ({ visualization, forecast }) => {
  const { chart_type, data, title, x_key, y_keys } = visualization || {};

  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    return data;
  }, [data]);

  const forecastData = useMemo(() => {
    if (!forecast?.available || !forecast?.data?.length) return [];
    return forecast.data.map(d => ({ ...d, name: d.period || d.name }));
  }, [forecast]);

  const allData = useMemo(() => {
    if (!forecastData.length) return chartData;
    const combined = [...chartData];
    forecastData.forEach(fd => {
      combined.push({ ...fd, _forecast: true });
    });
    return combined;
  }, [chartData, forecastData]);

  const xDataKey = x_key || "name";
  const yDataKeys = y_keys?.length ? y_keys : Object.keys(chartData[0] || {}).filter(k => k !== xDataKey && k !== "_forecast" && typeof chartData[0]?.[k] === "number");

  if (!chartData.length) {
    return (
      <GlassCard className="p-6" data-testid="chart-panel-empty">
        <p className="text-slate-500 text-center text-sm">No chart data available</p>
      </GlassCard>
    );
  }

  const renderChart = () => {
    const commonProps = { data: allData, margin: { top: 10, right: 30, left: 10, bottom: 10 } };

    switch (chart_type) {
      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 24% / 0.5)" />
            <XAxis dataKey={xDataKey} tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: 'Manrope', fontSize: 12, color: '#CBD5E1' }} />
            {yDataKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }} activeDot={{ r: 5 }} />
            ))}
            {forecastData.length > 0 && yDataKeys.map((key, i) => (
              <Line key={`${key}-fc`} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} strokeDasharray="8 4" dot={false} opacity={0.6} />
            ))}
          </LineChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 24% / 0.5)" />
            <XAxis dataKey={xDataKey} tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: 'Manrope', fontSize: 12, color: '#CBD5E1' }} />
            {yDataKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );

      case "pie":
        return (
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} innerRadius={60} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#64748B' }}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: 'Manrope', fontSize: 12, color: '#CBD5E1' }} />
          </PieChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            <defs>
              {yDataKeys.map((key, i) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 24% / 0.5)" />
            <XAxis dataKey={xDataKey} tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: 'Manrope', fontSize: 12, color: '#CBD5E1' }} />
            {yDataKeys.map((key, i) => (
              <Area key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={`url(#grad-${key})`} strokeWidth={2} />
            ))}
          </AreaChart>
        );

      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 24% / 0.5)" />
            <XAxis dataKey={yDataKeys[0] || xDataKey} tick={{ fill: '#94A3B8', fontSize: 11 }} name={yDataKeys[0] || xDataKey} />
            <YAxis dataKey={yDataKeys[1] || yDataKeys[0]} tick={{ fill: '#94A3B8', fontSize: 11 }} name={yDataKeys[1] || yDataKeys[0]} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={chartData} fill={CHART_COLORS[0]} />
          </ScatterChart>
        );

      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 24% / 0.5)" />
            <XAxis dataKey={xDataKey} tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: 'Manrope', fontSize: 12, color: '#CBD5E1' }} />
            {yDataKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <GlassCard className="p-6" data-testid="chart-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-200">{title || "Visualization"}</h3>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">{chart_type?.toUpperCase()}</span>
      </div>
      <div className="w-full h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      {visualization?.reason && (
        <p className="text-xs text-slate-500 mt-3 italic">{visualization.reason}</p>
      )}
    </GlassCard>
  );
};
