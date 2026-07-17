import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, FileText, ArrowRight, Target } from "lucide-react";
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

export default function BallotEngine() {
  const [showDialog, setShowDialog] = useState(false);
  const [editSheet, setEditSheet] = useState(null);
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
        <Button onClick={() => { setEditSheet(null); setShowDialog(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="w-4 h-4 mr-1.5" /> Issue Sheet
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

      {/* Pipeline Kanban */}
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

      <PetitionSheetDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        sheet={editSheet}
        campaignId={campaign?.id}
      />
    </div>
  );
}