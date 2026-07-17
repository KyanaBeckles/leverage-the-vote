import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScanSearch, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { matchVoterForSignature } from "@/utils/matchVoter";
import { fetchCandidateVoters, extractLastName } from "@/utils/voterSearch";

// Runs the same name/address match used in manual signature entry against every
// signature still stuck at "pending" — the AI scan pipeline (processSignatureSheet)
// extracts signer data from photographed petition sheets but never checks it against
// the voter file, so without this, AI-scanned signatures can never be certified.
//
// Candidates are fetched per-signer (last_name + city) rather than loading the
// ~9.5M-record statewide file, with a small cache so repeated names on the same
// sheet don't refetch.
export default function MatchPendingButton({ campaignId, signatures }) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const pending = signatures.filter((s) => s.verification_status === "pending");

  const handleRun = async () => {
    setRunning(true);
    setProgress(0);
    let matched = 0, flagged = 0, unmatched = 0, skipped = 0, done = 0;
    const candidateCache = new Map();

    for (const sig of pending) {
      const cacheKey = `${extractLastName(sig.signer_name) || ""}|${(sig.signer_city || "").trim().toUpperCase()}`;
      let voters = candidateCache.get(cacheKey);
      if (!voters) {
        voters = await fetchCandidateVoters(campaignId, sig.signer_name, sig.signer_city);
        candidateCache.set(cacheKey, voters);
      }

      const result = matchVoterForSignature(sig.signer_name, sig.signer_address, voters);
      done++;
      setProgress(done);
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
      {running ? `Matching ${progress}/${pending.length}…` : `Match ${pending.length} Pending Against Voter File`}
    </Button>
  );
}
