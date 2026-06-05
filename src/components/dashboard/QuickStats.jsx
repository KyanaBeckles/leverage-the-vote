import React from "react";
import { Users, FileCheck, ClipboardList, MapPin } from "lucide-react";

const stats = [
  {
    label: "Voters Loaded",
    key: "voterCount",
    icon: MapPin,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    border: "border-l-blue-500",
  },
  {
    label: "Team Members",
    key: "memberCount",
    icon: Users,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    border: "border-l-emerald-500",
  },
  {
    label: "Active Tasks",
    key: "taskCount",
    icon: ClipboardList,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    border: "border-l-amber-500",
  },
  {
    label: "Petition Sheets",
    key: "sheetCount",
    icon: FileCheck,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    border: "border-l-red-400",
  },
];

export default function QuickStats({ voterCount, memberCount, taskCount, sheetCount }) {
  const values = { voterCount, memberCount, taskCount, sheetCount };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`bg-card rounded-xl border border-border border-l-4 ${s.border} p-5 hover:shadow-md transition-shadow group`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`${s.iconBg} rounded-lg p-2.5`}>
              <s.icon className={`w-5 h-5 ${s.iconColor}`} />
            </div>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">
            {(values[s.key] || 0).toLocaleString()}
          </p>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}