import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileCheck, Target, TrendingUp } from "lucide-react";

export default function SignatureTracker({ campaign, signatures }) {
  const threshold = campaign?.signature_threshold || 0;
  const certified = signatures?.filter(s => s.verification_status === "certified").length || 0;
  const raw = signatures?.length || 0;
  const certifiedPct = threshold > 0 ? Math.min((certified / threshold) * 100, 100) : 0;
  const rawPct = threshold > 0 ? Math.min((raw / threshold) * 100, 100) : 0;

  if (!threshold) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-6 text-center">
          <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Set your signature threshold to track progress</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-accent" />
          Ballot Access Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Certified</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-display font-bold">{certified}</span>
              <span className="text-sm text-muted-foreground">/ {threshold}</span>
            </div>
          </div>
          <Progress value={certifiedPct} className="h-3 bg-muted" />
          <p className="text-xs text-muted-foreground mt-1">{certifiedPct.toFixed(1)}% of goal</p>
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Raw Collected</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-display font-semibold text-foreground/70">{raw}</span>
              <span className="text-sm text-muted-foreground">/ {threshold}</span>
            </div>
          </div>
          <Progress value={rawPct} className="h-2 bg-muted" />
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {raw > 0 ? `${((certified / raw) * 100).toFixed(0)}% certification rate` : "No signatures yet"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}