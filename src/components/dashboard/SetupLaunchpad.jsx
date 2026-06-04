import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

  const completedSteps = steps.filter(s => progress[s.key] || autoComplete[s.key]).length;
  const pct = (completedSteps / steps.length) * 100;

  if (pct >= 100) return null;

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-card to-accent/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Rocket className="w-4 h-4 text-accent" />
            Campaign Setup
          </CardTitle>
          <span className="text-xs font-medium text-muted-foreground">{completedSteps}/{steps.length}</span>
        </div>
        <Progress value={pct} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-1.5">
        {steps.map((step) => {
          const done = progress[step.key] || autoComplete[step.key];
          return (
            <Link
              key={step.key}
              to={step.link}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                done 
                  ? "text-muted-foreground" 
                  : "text-foreground hover:bg-accent/5 cursor-pointer"
              }`}
            >
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              )}
              <step.icon className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
              <span className={done ? "line-through" : "font-medium"}>{step.label}</span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}