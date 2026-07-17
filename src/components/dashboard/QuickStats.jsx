import React from "react";
import { MapPin, PenLine, BadgeCheck, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";

// The four numbers that matter for ballot access right now:
// voters on file → raw signatures → clerk-certified → matched & likely to certify.
const stats = [
  {
    label: "Voters in System",
    sub: "statewide MA voter file",
    key: "voterCount",
    icon: MapPin,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    border: "border-l-blue-500",
    href: "/voters",
  },
  {
    label: "Signatures Signed",
    sub: "collected on petition sheets",
    key: "signedCount",
    icon: PenLine,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    border: "border-l-amber-500",
    href: "/ballot-engine",
  },
  {
    label: "Signatures Validated",
    sub: "certified by town clerks",
    key: "certifiedCount",
    icon: BadgeCheck,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    border: "border-l-emerald-500",
    href: "/ballot-engine",
  },
  {
    label: "Likely to Validate",
    sub: "matched to an active voter, awaiting clerk",
    key: "likelyCount",
    icon: UserCheck,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    border: "border-l-red-400",
    href: "/petition-validation",
  },
];

export default function QuickStats({ voterCount, signedCount, certifiedCount, likelyCount }) {
  const values = { voterCount, signedCount, certifiedCount, likelyCount };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Link
          key={s.label}
          to={s.href}
          className={`bg-card rounded-xl border border-border border-l-4 ${s.border} p-5 hover:shadow-md hover:scale-[1.02] transition-all group cursor-pointer block`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`${s.iconBg} rounded-lg p-2.5`}>
              <s.icon className={`w-5 h-5 ${s.iconColor}`} />
            </div>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">
            {typeof values[s.key] === "string" ? values[s.key] : (values[s.key] || 0).toLocaleString()}
          </p>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
            {s.label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
        </Link>
      ))}
    </div>
  );
}
