import React from "react";
import { Target, TrendingUp, Award } from "lucide-react";

export default function SignatureTracker({ campaign, signatures }) {
  const threshold = campaign?.signature_threshold || 0;
  const certified = signatures?.filter((s) => s.verification_status === "certified").length || 0;
  const raw = signatures?.length || 0;
  const certifiedPct = threshold > 0 ? Math.min((certified / threshold) * 100, 100) : 0;
  const rawPct = threshold > 0 ? Math.min((raw / threshold) * 100, 100) : 0;
  const certRate = raw > 0 ? ((certified / raw) * 100).toFixed(0) : 0;

  if (!threshold) {
    return (
      <div className="bg-muted/40 border border-dashed rounded-xl p-6 text-center">
        <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Set your signature threshold to track progress
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-accent/10 rounded-lg p-1.5">
            <Award className="w-4 h-4 text-accent" />
          </div>
          <h3 className="text-sm font-semibold">Ballot Access Progress</h3>
        </div>
        <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
          {certifiedPct.toFixed(1)}%
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Certified */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certified</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-display font-bold text-foreground">{certified.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">/ {threshold.toLocaleString()}</span>
            </div>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-700"
              style={{ width: `${certifiedPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{certifiedPct.toFixed(1)}% of goal</p>
        </div>

        {/* Raw */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Raw Collected</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-display font-semibold text-foreground/70">{raw.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">/ {threshold.toLocaleString()}</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/50 rounded-full transition-all duration-700"
              style={{ width: `${rawPct}%` }}
            />
          </div>
        </div>

        {/* Cert rate */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground flex-1">Certification rate</span>
          <span className="text-xs font-bold text-foreground">{certRate}%</span>
        </div>
      </div>
    </div>
  );
}