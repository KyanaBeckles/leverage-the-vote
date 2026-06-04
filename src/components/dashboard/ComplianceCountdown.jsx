import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertTriangle } from "lucide-react";
import { differenceInDays, differenceInHours, format } from "date-fns";

export default function ComplianceCountdown({ campaign }) {
  const filingDeadline = campaign?.filing_deadline ? new Date(campaign.filing_deadline) : null;
  const electionDate = campaign?.election_date ? new Date(campaign.election_date) : null;
  const now = new Date();

  const deadlines = [
    filingDeadline && { label: "Filing Deadline", date: filingDeadline },
    electionDate && { label: "Election Day", date: electionDate },
  ].filter(Boolean);

  if (deadlines.length === 0) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-6 text-center">
          <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Set your filing deadline in campaign settings to see the compliance countdown</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {deadlines.map((d) => {
        const daysLeft = differenceInDays(d.date, now);
        const hoursLeft = differenceInHours(d.date, now) % 24;
        const isUrgent = daysLeft < 14;
        const isPast = daysLeft < 0;

        return (
          <Card key={d.label} className={`relative overflow-hidden ${isUrgent && !isPast ? "border-accent/50 bg-accent/5" : ""}`}>
            {isUrgent && !isPast && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
            )}
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                {isUrgent && !isPast ? (
                  <AlertTriangle className="w-4 h-4 text-accent" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{d.label}</span>
              </div>
              {isPast ? (
                <p className="text-2xl font-display font-bold text-muted-foreground">Passed</p>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-4xl font-display font-bold ${isUrgent ? "text-accent" : "text-foreground"}`}>{daysLeft}</span>
                  <span className="text-sm text-muted-foreground">days</span>
                  <span className={`text-lg font-display font-semibold ml-1 ${isUrgent ? "text-accent/80" : "text-foreground/60"}`}>{hoursLeft}h</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">{format(d.date, "EEEE, MMMM d, yyyy")}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}