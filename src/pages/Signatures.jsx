import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertTriangle, Clock, Search, FileText } from "lucide-react";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   icon: Clock,         color: "bg-muted text-muted-foreground" },
  matched:   { label: "Matched",   icon: CheckCircle2,  color: "bg-green-100 text-green-700" },
  unmatched: { label: "Unmatched", icon: XCircle,       color: "bg-red-100 text-red-700" },
  flagged:   { label: "Flagged",   icon: AlertTriangle, color: "bg-amber-100 text-amber-700" },
  certified: { label: "Certified", icon: CheckCircle2,  color: "bg-blue-100 text-blue-700" },
  rejected:  { label: "Rejected",  icon: XCircle,       color: "bg-red-100 text-red-700" },
};

export default function Signatures() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date", 1),
  });
  const campaign = campaigns[0];

  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ["all-signatures", campaign?.id],
    queryFn: () => base44.entities.Signature.filter({ campaign_id: campaign.id }, "-created_date", 500),
    enabled: !!campaign?.id,
  });

  const { data: sheets = [] } = useQuery({
    queryKey: ["sheets", campaign?.id],
    queryFn: () => base44.entities.PetitionSheet.filter({ campaign_id: campaign.id }),
    enabled: !!campaign?.id,
  });

  const sheetMap = useMemo(() => {
    const m = {};
    for (const s of sheets) m[s.id] = s;
    return m;
  }, [sheets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return signatures.filter(sig => {
      const matchesSearch =
        !q ||
        sig.signer_name?.toLowerCase().includes(q) ||
        sig.signer_address?.toLowerCase().includes(q) ||
        sig.signer_city?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || sig.verification_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [signatures, search, statusFilter]);

  // Summary counts
  const counts = useMemo(() => {
    const c = { total: signatures.length };
    for (const key of Object.keys(STATUS_CONFIG)) {
      c[key] = signatures.filter(s => s.verification_status === key).length;
    }
    return c;
  }, [signatures]);

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-[1200px]">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Signatures</h1>
        <p className="text-sm text-muted-foreground">All extracted signature records across every petition sheet</p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="px-3 py-1 rounded-full bg-muted text-xs font-medium">{counts.total} total</span>
        {counts.certified > 0 && <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{counts.certified} certified</span>}
        {counts.matched > 0 && <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">{counts.matched} matched</span>}
        {counts.pending > 0 && <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">{counts.pending} pending</span>}
        {counts.flagged > 0 && <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">{counts.flagged} flagged</span>}
        {counts.rejected > 0 && <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">{counts.rejected} rejected</span>}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, address, or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{signatures.length === 0 ? "No signatures extracted yet." : "No signatures match your filters."}</p>
          {signatures.length === 0 && (
            <p className="text-sm mt-1">Process signature sheets in the Documents page to populate this list.</p>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Address</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">City</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Date Signed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Sheet</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((sig) => {
                const cfg = STATUS_CONFIG[sig.verification_status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                const sheet = sheetMap[sig.petition_sheet_id];
                return (
                  <tr key={sig.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{sig.signer_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[180px]">{sig.signer_address || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{sig.signer_city || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{sig.date_signed || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {sheet ? `#${sheet.sheet_number}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t text-xs text-muted-foreground bg-muted/20">
            Showing {filtered.length} of {signatures.length} signatures
          </div>
        </div>
      )}
    </div>
  );
}