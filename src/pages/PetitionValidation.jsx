import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertTriangle, FileText, Search, Plus, HelpCircle, BadgeCheck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import SignatureEntryForm from "../components/validation/SignatureEntryForm";
import MatchPendingButton from "../components/validation/MatchPendingButton";

// Scans are stored per side (scan_url_front / scan_url_back, plus legacy
// scan_url on older sheets). Shows whichever sides exist with a toggle.
function SheetScanViewer({ sheet }) {
  const [side, setSide] = useState("front");

  const scans = [];
  if (sheet?.scan_url_front || sheet?.scan_url) {
    scans.push({ key: "front", label: "Front", url: sheet.scan_url_front || sheet.scan_url });
  }
  if (sheet?.scan_url_back) {
    scans.push({ key: "back", label: "Back", url: sheet.scan_url_back });
  }

  const active = scans.find(s => s.key === side) || scans[0];

  if (!sheet || scans.length === 0) {
    return (
      <Card className="flex-1 border-dashed bg-muted/30">
        <CardContent className="h-full flex flex-col items-center justify-center text-center p-6">
          <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {sheet ? "No scan uploaded for this sheet" : "Select a petition sheet to begin validation"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 overflow-hidden flex flex-col">
      {scans.length > 1 && (
        <div className="flex gap-1 p-2 border-b">
          {scans.map(s => (
            <Button
              key={s.key}
              variant={active?.key === s.key ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setSide(s.key)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      )}
      <CardContent className="p-0 flex-1 min-h-0">
        <a href={active.url} target="_blank" rel="noreferrer" title="Open full size in a new tab">
          <img
            src={active.url}
            alt={`Petition scan — ${active.label.toLowerCase()}`}
            className="w-full h-full object-contain bg-muted"
          />
        </a>
      </CardContent>
    </Card>
  );
}

export default function PetitionValidation() {
  const [selectedSheet, setSelectedSheet] = useState(null);
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

  const scannedSheets = sheets.filter(s => ["scanned", "at_clerk", "certified"].includes(s.pipeline_status));

  // Fetch all signatures for the campaign to build sheet identifiers
  const { data: allSignatures = [] } = useQuery({
    queryKey: ["allSignatures", campaign?.id],
    queryFn: () => campaign ? base44.entities.Signature.filter({ campaign_id: campaign.id }) : [],
    enabled: !!campaign,
  });

  // Build a map of sheet_id → first signature (by line_number)
  const firstSigBySheet = {};
  allSignatures.forEach(sig => {
    const existing = firstSigBySheet[sig.petition_sheet_id];
    if (!existing || (sig.line_number || 0) < (existing.line_number || 0)) {
      firstSigBySheet[sig.petition_sheet_id] = sig;
    }
  });

  const sheetLabel = (s) => {
    const firstSig = firstSigBySheet[s.id];
    const town = s.town_clerk || "";
    const name = firstSig?.signer_name || "";
    if (town || name) return `${town}${town && name ? " · " : ""}${name}`;
    return `Sheet #${s.sheet_number}`;
  };

  const { data: signatures = [] } = useQuery({
    queryKey: ["signatures", selectedSheet?.id],
    queryFn: () => selectedSheet ? base44.entities.Signature.filter({ petition_sheet_id: selectedSheet.id }) : [],
    enabled: !!selectedSheet,
  });

  // Manual clerk certification — for signatures the clerk checked off on the
  // returned sheet that the automatic voter-file match didn't already catch.
  const certifyMutation = useMutation({
    mutationFn: ({ id, certified }) =>
      base44.entities.Signature.update(id, {
        verification_status: certified ? "certified" : "matched",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signatures", selectedSheet?.id] });
      queryClient.invalidateQueries({ queryKey: ["allSignatures", campaign?.id] });
    },
  });

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Signature Validation</h1>
          <p className="text-sm text-muted-foreground">Verify petition signatures against the voter file</p>
        </div>
        <MatchPendingButton campaignId={campaign?.id} signatures={allSignatures} sheets={sheets} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-160px)]">
        {/* Left: Sheet selector & scan preview */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Select Petition Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSheet?.id || ""} onValueChange={(id) => setSelectedSheet(sheets.find(s => s.id === id))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a scanned sheet..." />
                </SelectTrigger>
                <SelectContent>
                  {scannedSheets.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {sheetLabel(s)} · {s.raw_signature_count || 0} sigs · {s.pipeline_status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <SheetScanViewer sheet={selectedSheet} />
        </div>

        {/* Right: Data entry & verification */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {selectedSheet ? (
            <>
              {/* Signature entry stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-display font-bold">{signatures.length}</p>
                    <p className="text-xs text-muted-foreground">Entered</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-display font-bold text-green-600">{signatures.filter(s => s.verification_status === "matched").length}</p>
                    <p className="text-xs text-muted-foreground">Matched</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-display font-bold text-amber-600">{signatures.filter(s => s.verification_status === "flagged" || s.verification_status === "unmatched").length}</p>
                    <p className="text-xs text-muted-foreground">Flagged</p>
                  </CardContent>
                </Card>
              </div>

              {/* Entry form */}
              <SignatureEntryForm
                sheet={selectedSheet}
                campaignId={campaign?.id}
                existingCount={signatures.length}
              />

              {/* Entered signatures list */}
              <Card className="flex-1 overflow-auto">
                <CardHeader className="pb-2 sticky top-0 bg-card z-10">
                  <CardTitle className="text-sm font-medium">Entered Signatures</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {signatures.map((sig) => (
                    <div key={sig.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm">
                      <span className="text-xs text-muted-foreground w-6">#{sig.line_number}</span>
                      <span className="font-medium flex-1">{sig.signer_name}</span>
                      <span className="text-xs text-muted-foreground flex-1 truncate">{sig.signer_address}</span>
                      {sig.verification_status === "certified" && <BadgeCheck className="w-4 h-4 text-emerald-600" />}
                      {sig.verification_status === "matched" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {sig.verification_status === "unmatched" && <XCircle className="w-4 h-4 text-red-500" />}
                      {sig.verification_status === "flagged" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      {sig.verification_status === "pending" && <div className="w-4 h-4 rounded-full bg-muted" />}
                      {sig.verification_status === "certified" ? (
                        <Button
                          variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground"
                          onClick={() => certifyMutation.mutate({ id: sig.id, certified: false })}
                        >
                          Undo
                        </Button>
                      ) : (
                        <Button
                          variant="outline" size="sm" className="h-6 px-2 text-xs"
                          onClick={() => certifyMutation.mutate({ id: sig.id, certified: true })}
                          title="Mark this signature as certified by the town clerk"
                        >
                          Certify
                        </Button>
                      )}
                    </div>
                  ))}
                  {signatures.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No signatures entered yet</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex-1 border-dashed bg-muted/30">
              <CardContent className="h-full flex flex-col items-center justify-center text-center p-6">
                <Search className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Select a petition sheet to start entering and verifying signatures</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}