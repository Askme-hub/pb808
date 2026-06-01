import { Calendar, Clock, TrendingUp, Lock, CheckCircle2, XCircle, MinusCircle, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Prediction = {
  id: string;
  category: string;
  match_name: string;
  league: string;
  match_date: string;
  match_time: string;
  tip: string;
  odds: number;
  confidence: "low" | "medium" | "high" | "very_high";
  status: "pending" | "won" | "lost" | "void";
  analysis?: string | null;
};

const STATUS = {
  pending: { label: "Pending", icon: Clock3, cls: "bg-muted text-muted-foreground" },
  won: { label: "Won", icon: CheckCircle2, cls: "bg-success/20 text-success border-success/40" },
  lost: { label: "Lost", icon: XCircle, cls: "bg-destructive/20 text-destructive border-destructive/40" },
  void: { label: "Void", icon: MinusCircle, cls: "bg-muted text-muted-foreground" },
} as const;

const CONF = {
  low: "text-muted-foreground",
  medium: "text-warning",
  high: "text-primary-glow",
  very_high: "text-gold",
} as const;

export function PredictionCard({ p, locked = false }: { p: Prediction; locked?: boolean }) {
  const Status = STATUS[p.status];
  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card/80 p-5 transition-all hover:border-primary/60 hover:shadow-glow">
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="outline" className="text-xs uppercase tracking-wider">
          {p.league}
        </Badge>
        <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", Status.cls)}>
          <Status.icon className="h-3 w-3" />
          {Status.label}
        </span>
      </div>

      <h3 className="text-balance text-lg font-bold leading-tight">{p.match_name}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(p.match_date)}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(p.match_time)}</span>
        <span className={cn("inline-flex items-center gap-1 font-semibold", CONF[p.confidence])}>
          <TrendingUp className="h-3 w-3" />{p.confidence.replace("_", " ")}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tip</div>
          {locked ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="select-none rounded bg-muted px-3 py-1 font-mono text-sm tracking-widest blur-sm">
                XXXXX XXXXX
              </span>
              <Lock className="h-4 w-4 text-gold" />
            </div>
          ) : (
            <div className="mt-1 truncate text-base font-bold text-foreground">{p.tip}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Odds</div>
          <div className="font-display text-2xl font-extrabold text-primary-glow">
            {locked ? "—" : p.odds.toFixed(2)}
          </div>
        </div>
      </div>
    </Card>
  );
}
