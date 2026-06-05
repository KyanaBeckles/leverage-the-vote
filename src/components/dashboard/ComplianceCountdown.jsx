import React from "react";
import { Clock, AlertTriangle, CalendarCheck, Flag } from "lucide-react";
import { differenceInDays, differenceInHours, format } from "date-fns";

const deadlineConfig = [
  { key: "petition_deadline", label: "Petition Submission", icon: Flag, urgentDays: 21 },
  { key: "filing_deadline", label: "State Filing Deadline", icon: AlertTriangle, urgentDays: 14 },
  { key: "election_date", label: "Election Day", icon: CalendarCheck, urgentDays: 30 },
];

function urgencyStyle(daysLeft, urgentDays) {
  if (daysLeft < 0) return { bar: "bg-muted", text: "text-muted-foreground", bg: "bg-muted/30", badge: "bg-muted text-muted-foreground" };
  if (daysLeft < 7) return { bar: "bg-red-500", text: "text-red-600", bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700" };
  if (daysLeft < urgentDays) return { bar: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700" };
  return { bar: "bg-primary", text: "text-primary", bg: "bg-card", badge: "bg-primary/10 text-primary" };
}

export default function ComplianceCountdown({ campaign }) {
  const now = new Date();

  const deadlines = deadlineConfig
    .map(({ key, label, icon, urgentDays }) => {
      const date = campaign?.[key] ? new Date(campaign[key]) : null;
      if (!date) return null;
      return { label, icon, date, urgentDays };
    })
    .filter(Boolean);

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
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Key Deadlines</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {deadlines.map((d) => {
          const daysLeft = differenceInDays(d.date, now);
          const hoursLeft = differenceInHours(d.date, now) % 24;
          const isPast = daysLeft < 0;
          const style = urgencyStyle(daysLeft, d.urgentDays);
          const Icon = d.icon;

          return (
            <div
              key={d.label}
              className={`rounded-xl border p-5 relative overflow-hidden transition-all hover:shadow-md ${style.bg}`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 ${style.bar}`} />
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-4 h-4 ${style.text}`} />
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${style.badge}`}>
                  {isPast ? "Passed" : daysLeft < 7 ? "Urgent" : daysLeft < d.urgentDays ? "Soon" : "On track"}
                </span>
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">{d.label}</p>
              {isPast ? (
                <p className="text-2xl font-display font-bold text-muted-foreground">Passed</p>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-4xl font-display font-bold ${style.text}`}>{daysLeft}</span>
                  <span className="text-sm text-muted-foreground">days</span>
                  {hoursLeft > 0 && (
                    <span className={`text-lg font-display font-semibold ml-1 opacity-70 ${style.text}`}>{hoursLeft}h</span>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">{format(d.date, "EEE, MMM d, yyyy")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}