import React from "react";
import { CheckCircle2, Circle, Rocket, UserPlus, Upload, FileText, Users, Calendar as CalIcon } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  { key: "candidate", label: "Set Up Candidate Profile", icon: UserPlus, link: "/settings" },
  { key: "voters", label: "Upload Voter File", icon: Upload, link: "/import" },
  { key: "team", label: "Add Team Members", icon: Users, link: "/team" },
  { key: "deadlines", label: "Set Filing Deadlines", icon: CalIcon, link: "/settings" },
  { key: "petition", label: "Issue First Petition Sheet", icon: FileText, link: "/ballot-engine" },
];

export default function SetupLaunchpad({ campaign, voterCount, memberCount, sheetCount }) {
  const progress = campaign?.setup_progress || {};

  const autoComplete = {
    candidate: !!campaign?.candidate_name && !!campaign?.office,
    voters: voterCount > 0,
    team: memberCount > 1,
    deadlines: !!campaign?.filing_deadline,
    petition: sheetCount > 0,
  };

  const completedSteps = steps.filter((s) => progress[s.key] || autoComplete[s.key]).length;
  const pct = (completedSteps / steps.length) * 100;

  if (pct >= 100) return null;

  const nextStep = steps.find((s) => !(progress[s.key] || autoComplete[s.key]));

  return (
    <div className="bg-card rounded-xl border border-accent/20 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-accent/10 to-transparent border-b border-accent/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">Campaign Setup</h3>
          </div>
          <span className="text-xs font-bold text-accent">{completedSteps}/{steps.length}</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-accent/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {nextStep && (
          <p className="text-xs text-muted-foreground mt-2">
            Next: <span className="font-medium text-foreground">{nextStep.label}</span>
          </p>
        )}
      </div>

      {/* Steps */}
      <div className="p-3 space-y-1">
        {steps.map((step) => {
          const done = progress[step.key] || autoComplete[step.key];
          const Icon = step.icon;
          return (
            <Link
              key={step.key}
              to={step.link}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                done
                  ? "opacity-50 cursor-default"
                  : "hover:bg-accent/5 hover:text-accent font-medium"
              }`}
            >
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              )}
              <Icon className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
              <span className={done ? "line-through text-muted-foreground" : ""}>{step.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}