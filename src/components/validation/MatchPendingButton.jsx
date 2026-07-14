import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScanSearch, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { matchVoterForSignature } from "@/utils/matchVoter";

// Runs the same name/address match used in manual signature entry against every
// signature still stuck at "pending" — the AI scan pipeline (processSignatureSheet)
// extracts signer data from photographed petition sheets but never checks it against
// the voter file, so without this, AI-scanned signatures can never be certified.
export default function MatchPendingButton({ campaignId, signatures, voters }) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const pending = signatures.filter((s) => s.verification_status === "pending");

  const handleRun = async () => {
    setRunning(true);
    let matched = 0, flagged = 0, unmatched = 0, skipped = 0;

    for (const sig of pending) {
      const result = matchVoterForSignature(sig.signer_name, sig.signer_address, voters);
      if (!result) { skipped++; continue; }
      if (result.status === "matched") matched++;
      else if (result.status === "flagged") flagged++;
      else if (result.status === "unmatched") unmatched++;

      await base44.entities.Signature.update(sig.id, {
        matched_voter_id: result.voter?.id || "",
        verification_status: result.status,
        flag_reason: result.status === "flagged" ? result.message : "",
      });
    }

    setRunning(false);
    queryClient.invalidateQueries({ queryKey: ["allSignatures", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["signatures"] });
    toast({
      title: "Voter file match complete",
      description: `${matched} matched, ${flagged} flagged for review, ${unmatched} not found${skipped ? `, ${skipped} skipped (no name)` : ""}.`,
    });
  };

  if (pending.length === 0) return null;

  return (
    <Button variant="outline" size="sm" onClick={handleRun} disabled={running} className="gap-1.5">
      {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
      {running ? "Matching…" : `Match ${pending.length} Pending Against Voter File`}
    </Button>
  );
}
