import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Plus, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { matchVoterForSignature } from "@/utils/matchVoter";
import { fetchCandidateVoters } from "@/utils/voterSearch";

export default function SignatureEntryForm({ sheet, campaignId, existingCount }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({
    signer_name: "", signer_address: "", signer_city: "", signer_zip: "", date_signed: "",
  });

  // Debounced voter-file lookup: fetch a small candidate set for the typed name
  // (+ city) instead of matching against a preloaded statewide file.
  const debounceRef = useRef(null);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const checkVoterMatch = (name, address, city) => {
    clearTimeout(debounceRef.current);
    if (!name || name.trim().length < 3) { setMatchResult(null); setChecking(false); return; }
    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      // The sheet's town (bottom-of-sheet certification) beats whatever the
      // signer wrote in their city box.
      const voters = await fetchCandidateVoters(campaignId, name, sheet?.town_clerk || city);
      setMatchResult(matchVoterForSignature(name, address, voters));
      setChecking(false);
    }, 600);
  };

  const handleNameChange = (name) => {
    setForm(prev => ({ ...prev, signer_name: name }));
    checkVoterMatch(name, form.signer_address, form.signer_city);
  };

  const handleAddressChange = (address) => {
    setForm(prev => ({ ...prev, signer_address: address }));
    checkVoterMatch(form.signer_name, address, form.signer_city);
  };

  const handleCityChange = (city) => {
    setForm(prev => ({ ...prev, signer_city: city }));
    checkVoterMatch(form.signer_name, form.signer_address, city);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Signature.create({
      campaign_id: campaignId,
      petition_sheet_id: sheet.id,
      line_number: existingCount + 1,
      signer_name: form.signer_name,
      signer_address: form.signer_address,
      signer_city: form.signer_city,
      signer_zip: form.signer_zip,
      date_signed: form.date_signed,
      matched_voter_id: matchResult?.voter?.id || "",
      verification_status: matchResult?.status || "pending",
      flag_reason: matchResult?.status === "flagged" ? matchResult.message : "",
    });
    queryClient.invalidateQueries({ queryKey: ["signatures"] });
    setForm({ signer_name: "", signer_address: "", signer_city: "", signer_zip: "", date_signed: "" });
    setMatchResult(null);
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Enter Signature (Line #{existingCount + 1})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              Signer Name
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="w-3 h-3 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="text-xs max-w-[200px]">Enter name exactly as written on the petition. System will auto-match against voter file.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input 
              value={form.signer_name} 
              onChange={(e) => handleNameChange(e.target.value)} 
              placeholder="Full name as signed"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Address</Label>
            <Input value={form.signer_address} onChange={(e) => handleAddressChange(e.target.value)} placeholder="Street address" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">City</Label>
            <Input value={form.signer_city} onChange={(e) => handleCityChange(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ZIP</Label>
            <Input value={form.signer_zip} onChange={(e) => setForm({...form, signer_zip: e.target.value})} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Date Signed</Label>
            <Input type="date" value={form.date_signed} onChange={(e) => setForm({...form, date_signed: e.target.value})} />
          </div>
        </div>

        {/* Real-time match feedback */}
        {checking && (
          <p className="text-xs text-muted-foreground">Checking voter file…</p>
        )}
        {!checking && matchResult && (
          <div className={`flex items-start gap-2.5 p-3 rounded-lg text-sm ${
            matchResult.status === "matched" ? "bg-green-50 border border-green-200" :
            matchResult.status === "flagged" ? "bg-amber-50 border border-amber-200" :
            "bg-red-50 border border-red-200"
          }`}>
            {matchResult.status === "matched" && <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />}
            {matchResult.status === "flagged" && <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />}
            {matchResult.status === "unmatched" && <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />}
            <span className={`${
              matchResult.status === "matched" ? "text-green-700" :
              matchResult.status === "flagged" ? "text-amber-700" : "text-red-700"
            }`}>
              {matchResult.message}
            </span>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving || !form.signer_name} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          {saving ? "Saving..." : "Save & Next"}
        </Button>
      </CardContent>
    </Card>
  );
}