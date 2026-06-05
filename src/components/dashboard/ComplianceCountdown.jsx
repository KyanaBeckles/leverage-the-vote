import React from "react";
import { Clock, AlertTriangle, CalendarCheck, Flag } from "lucide-react";
import { differenceInDays, format } from "date-fns";

const deadlineConfig = [
  { key: "petition_deadline", label: "Petition Submission", icon: Flag, urgentDays: 21 },
  { key: "filing_deadline", label: "State Filing Deadline", icon: AlertTriangle, urgentDays: 14 },
  { key: "election_date", label: "Election Day", icon: CalendarCheck, urgentDays: 30 },
];

function urgencyColor(daysLeft, urgentDays) {
  if (daysLeft < 0) return { dot: "bg-muted-foreground", text: "text-muted-foreground", badge: "bg-muted text-muted-foreground", line: "bg-muted-foreground/30" };
  if (daysLeft < 7) return { dot: "bg-red-500", text: "text-red-600", badge: "bg-red-100 text-red-700", line: "bg-red-300" };
  if (daysLeft < urgentDays) return { dot: "bg-amber-500", text: "text-amber-600", badge: "bg-amber-100 text-amber-700", line: "bg-amber-300" };
  return { dot: "bg-primary", text: "text-primary", badge: "bg-primary/10 text-primary", line: "bg-primary/30" };
}

export default function ComplianceCountdown({ campaign }) {
  const now = new Date();

  const deadlines = deadlineConfig
    .map(({ key, label, icon, urgentDays }) => {
      const date = campaign?.[key] ? new Date(campaign[key]) : null;
      if (!date) return null;
      return { label, icon, date, urgentDays };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);

  if (deadlines.length === 0) {
    return (
      <div className="bg-muted/40 border border-dashed rounded-xl p-6 text-center">
        <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Set your petition or filing deadline in campaign settings to see the compliance countdown
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Key Deadlines</p>

      <div className="bg-card border border-border rounded-xl px-6 py-6">
        {/* Timeline row */}
        <div className="relative flex items-start">
          {/* Background connector line */}
          <div className="absolute top-[18px] left-0 right-0 h-0.5 bg-border" style={{ zIndex: 0 }} />

          {deadlines.map((d, i) => {
            const daysLeft = differenceInDays(d.date, now);
            const isPast = daysLeft < 0;
            const colors = urgencyColor(daysLeft, d.urgentDays);
            const Icon = d.icon;
            const isLast = i === deadlines.length - 1;

            return (
              <React.Fragment key={d.label}>
                {/* Node */}
                <div className="relative flex flex-col items-center flex-1" style={{ zIndex: 1 }}>
                  {/* Dot */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-card ${isPast ? "bg-muted" : colors.dot} shadow-sm mb-3`}>
                    <Icon className={`w-4 h-4 ${isPast ? "text-muted-foreground" : "text-white"}`} />
                  </div>

                  {/* Label + Date */}
                  <p className="text-xs font-semibold text-center leading-tight max-w-[100px]">{d.label}</p>
                  <p className="text-[11px] text-muted-foreground text-center mt-0.5">{format(d.date, "MMM d, yyyy")}</p>

                  {/* Days remaining pill */}
                  <div className={`mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold ${colors.badge}`}>
                    {isPast ? "Passed" : `${daysLeft}d`}
                  </div>
                </div>

                {/* Connector segment (between nodes) */}
                {!isLast && (
                  <div className="flex-1" style={{ zIndex: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}