import { cn } from "@/lib/utils";

export const GlassCard = ({ children, className, hover = true, glow = false, ...props }) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/[0.08] bg-slate-900/40 backdrop-blur-xl shadow-xl",
        hover && "hover:border-cyan-500/30 transition-colors duration-300",
        glow && "glow-cyan",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
