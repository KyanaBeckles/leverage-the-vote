import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, ArrowRight, Target, Camera, Image } from "lucide-react";
import { Link } from "react-router-dom";
import PetitionSheetDialog from "../components/ballot/PetitionSheetDialog";
import PetitionSheetCard from "../components/ballot/PetitionSheetCard";

const pipelineColumns = [
  { key: "blank_issued", label: "Blank Issued", color: "bg-slate-400" },
  { key: "in_field", label: "In Field", color: "bg-blue-500" },
  { key: "returned", label: "Returned", color: "bg-amber-500" },
  { key: "scanned", label: "Scanned", color: "bg-purple-500" },
  { key: "at_clerk", label: "At Town Clerk", color: "bg-orange-500" },
  { key: "certified", label: "Certified", color: "bg-green-500" },
];

const statusBadge = {
  blank_issued: "bg-slate-100 text-slate-600",
  in_field: "bg-blue-100 text-blue-700",
  returned: "bg-amber-100 text-amber-700",
  scanned: "bg-purple-100 text-purple-700",
  at_clerk: "bg-orange-100 text-orange-700",
  certified: "bg-green-100 text-green-700",
};

export default function BallotEngine() {
  const [showDialog, setShowDialog] = useState(false);
  const [editSheet, setEditSheet] = useState(null);
  // "sheets" = the working inventory of every scanned sheet; "pipeline" = kanban.
  const [view, setView] = useState("sheets");
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date", 1),
  });
  const campaign = campaigns[0];

  const { data: sheets = [] } = useQuery({
    queryKey: ["sheets", campaign?.id],
    queryFn: () => campaign ? base44.entities.PetitionSheet.filter({ campaign_id: campaign.id }) : [],
    enabled: !!campaign,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["signatures", campaign?.id],
    queryFn: () => campaign ? base44.entities.Signature.filter({ campaign_id: campaign.id }) : [],
    enabled: !!campaign,
  });

  // Moving a sheet to "Certified" only records where the sheet is in the
  // pipeline. Per-signature certification is the CLERK's act — it gets
  // transcribed line-by-line from the red checkmarks on the returned sheet
  // (Signature Validation → "Clerk ✓"), never inferred automatically.
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PetitionSheet.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sheets"] }),
  });

  const threshold = campaign?.signature_threshold || 0;
  // Sum from sheet-level counts (populated when sheets are scanned/processed)
  const rawSigs = sheets.reduce((sum, s) => sum + (s.raw_signature_count || 0), 0);
  const certifiedSigs = signatures.filter(s => s.verification_status === "certified").length;

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-[1600px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Ballot Access Engine</h1>
          <p className="text-sm text-muted-foreground">Track petition sheets from issuance to certification</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/documents">
            <Button variant="outline">
              <Camera className="w-4 h-4 mr-1.5" /> Scan & Digitize
            </Button>
          </Link>
          <Button onClick={() => { setEditSheet(null); setShowDialog(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="w-4 h-4 mr-1.5" /> Issue Sheet
          </Button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 mb-6">
        <Button variant={view === "sheets" ? "default" : "ghost"} size="sm" onClick={() => setView("sheets")}>
          All Sheets
        </Button>
        <Button variant={view === "pipeline" ? "default" : "ghost"} size="sm" onClick={() => setView("pipeline")}>
          Pipeline Board
        </Button>
      </div>

      {/* Clerk Tracking Dashboard */}
      {threshold > 0 && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Raw Collected</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-bold">{rawSigs}</span>
                  <span className="text-sm text-muted-foreground">signatures</span>
                </div>
                <Progress value={(rawSigs / threshold) * 100} className="h-2 mt-2" />
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Certified</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-bold text-green-600">{certifiedSigs}</span>
                  <span className="text-sm text-muted-foreground">/ {threshold} needed</span>
                </div>
                <Progress value={(certifiedSigs / threshold) * 100} className="h-2 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Sheets — the working inventory: every scanned sheet at any stage */}
      {view === "sheets" && (() => {
        const sigStats = new Map();
        for (const sig of signatures) {
          const s = sigStats.get(sig.petition_sheet_id) || { total: 0, matched: 0, certified: 0, flagged: 0 };
          s.total++;
          if (sig.verification_status === "matched") s.matched++;
          else if (sig.verification_status === "certified") s.certified++;
          else if (sig.verification_status === "flagged") s.flagged++;
          sigStats.set(sig.petition_sheet_id, s);
        }
        const scanned = sheets
          .filter(s => s.scan_url_front || s.scan_url_back || s.ai_processed)
          .sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
        const unscanned = sheets.length - scanned.length;

        return (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sheet</TableHead>
                  <TableHead>Town</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Sigs</TableHead>
                  <TableHead className="text-right">Matched</TableHead>
                  <TableHead className="text-right">Clerk ✓</TableHead>
                  <TableHead className="text-right">Review</TableHead>
                  <TableHead>Scans</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanned.map((sheet) => {
                  const st = sigStats.get(sheet.id) || { total: 0, matched: 0, certified: 0, flagged: 0 };
                  return (
                    <TableRow key={sheet.id}>
                      <TableCell className="font-medium text-sm">#{sheet.sheet_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{sheet.town_clerk || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] px-1.5 py-0 ${statusBadge[sheet.pipeline_status] || ""}`}>
                          {(sheet.pipeline_status || "").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{st.total || sheet.raw_signature_count || 0}</TableCell>
                      <TableCell className="text-right text-sm text-green-600">{st.matched}</TableCell>
                      <TableCell className="text-right text-sm text-emerald-700">{st.certified}</TableCell>
                      <TableCell className="text-right text-sm text-amber-600">{st.flagged}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Image className="w-3.5 h-3.5" />
                          {[sheet.scan_url_front && "F", sheet.scan_url_back && "B"].filter(Boolean).join("+") || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Link to="/petition-validation">
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Validate</Button>
                          </Link>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setEditSheet(sheet); setShowDialog(true); }}>
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {scanned.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                      No scanned sheets yet — photograph returned sheets via Scan &amp; Digitize.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {unscanned > 0 && (
              <p className="text-xs text-muted-foreground p-3 border-t">
                {unscanned} issued sheet{unscanned === 1 ? "" : "s"} not yet scanned — see the Pipeline Board.
              </p>
            )}
          </Card>
        );
      })()}

      {/* Pipeline Kanban */}
      {view === "pipeline" && (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {pipelineColumns.map((col) => {
          const colSheets = sheets.filter(s => s.pipeline_status === col.key);
          return (
            <div key={col.key}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <span className="text-xs font-medium uppercase tracking-wider">{col.label}</span>
                <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">{colSheets.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {colSheets.map((sheet) => (
                  <PetitionSheetCard
                    key={sheet.id}
                    sheet={sheet}
                    onEdit={() => { setEditSheet(sheet); setShowDialog(true); }}
                    onAdvance={(nextStatus) => updateMutation.mutate({ id: sheet.id, data: { pipeline_status: nextStatus } })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      )}

      <PetitionSheetDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        sheet={editSheet}
        campaignId={campaign?.id}
      />
    </div>
  );
}