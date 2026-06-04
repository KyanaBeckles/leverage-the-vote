import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, FileCheck, ClipboardList, MapPin } from "lucide-react";

export default function QuickStats({ voterCount, memberCount, taskCount, sheetCount }) {
  const stats = [
    { label: "Voters Loaded", value: voterCount, icon: MapPin, color: "text-blue-500" },
    { label: "Team Members", value: memberCount, icon: Users, color: "text-emerald-500" },
    { label: "Active Tasks", value: taskCount, icon: ClipboardList, color: "text-amber-500" },
    { label: "Petition Sheets", value: sheetCount, icon: FileCheck, color: "text-accent" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label} className="group hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-3xl font-display font-bold">{s.value.toLocaleString()}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}