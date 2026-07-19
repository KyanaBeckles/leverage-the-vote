import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertTriangle, BadgeCheck, Pencil, Loader2, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { matchVoterForSignature } from "@/utils/matchVoter";
import { fetchCandidateVoters } from "@/utils/voterSearch";

// One row in the "Entered Signatures" list. Adds inline correction of a
// mistyped/misread name, address, or city — saving re-runs the exact same
// voter-file match used at entry time (SignatureEntryForm) and in bulk
// pending-match (MatchPendingButton), scoped to just this one signature, so a
// fixed typo doesn't leave a stale "unmatched"/"flagged" status behind.
//
// Certified rows are the clerk's transcription of the paper sheet and must
// not be casually edited — the pencil is hidden once a line is certified.
export default function SignatureRow({ sig, campaignId, sheet, isEditing, onEdit, onCancelEdit, certifyMutation }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);

  const startEdit = () => {
    setForm({
      signer_name: sig.signer_name || "",
      signer_address: sig.signer_address || "",
      signer_city: sig.signer_city || "",
    });
    onEdit(sig.id);
  };

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      // Persist the correction first so it isn't lost even if the re-match below fails.
      await base44.entities.Signature.update(sig.id, {
        signer_name: values.signer_name,
        signer_address: values.signer_address,
        signer_city: values.signer_city,
      });

      // The sheet's town (bottom-of-sheet certification) beats the signer's own city scribble.
      const candidates = await fetchCandidateVoters(
        campaignId,
        values.signer_name,
        sheet?.town_clerk || values.signer_city
      );
      const result = matchVoterForSignature(values.signer_name, values.signer_address, candidates);

      await base44.entities.Signature.update(sig.id, {
        verification_status: result?.status ?? "unmatched",
        matched_voter_id: result?.voter?.id || "",
        flag_reason: result?.status === "flagged" ? result.message : "",
      });

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["signatures", sheet?.id] });
      queryClient.invalidateQueries({ queryKey: ["allSignatures", campaignId] });
      onCancelEdit();
      toast({
        title: "Signature updated",
        description: result?.message || "No voter found with this name",
      });
    },
    onError: () => {
      toast({
        title: "Couldn't save correction",
        description: "The correction wasn't saved — please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCancel = () => {
    setForm(null);
    onCancelEdit();
  };

  const busy = saveMutation.isPending;

  if (isEditing && form) {
    return (
      <div className="flex flex-col gap-2 px-3 py-2 rounded-lg bg-muted/40 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6 flex-shrink-0">#{sig.line_number}</span>
          <Input
            className="h-7 text-xs flex-1"
            value={form.signer_name}
            onChange={(e) => setForm({ ...form, signer_name: e.target.value })}
            placeholder="Name"
            disabled={busy}
            autoFocus
          />
          <Input
            className="h-7 text-xs flex-1"
            value={form.signer_address}
            onChange={(e) => setForm({ ...form, signer_address: e.target.value })}
            placeholder="Address"
            disabled={busy}
          />
          <Input
            className="h-7 text-xs w-28 flex-shrink-0"
            value={form.signer_city}
            onChange={(e) => setForm({ ...form, signer_city: e.target.value })}
            placeholder="City"
            disabled={busy}
          />
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => saveMutation.mutate(form)}
            disabled={busy || !form.signer_name.trim()}
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm">
      <span className="text-xs text-muted-foreground w-6">#{sig.line_number}</span>
      <span className="font-medium flex-1">{sig.signer_name}</span>
      <span className="text-xs text-muted-foreground flex-1 truncate">{sig.signer_address}</span>
      {sig.verification_status === "certified" && <BadgeCheck className="w-4 h-4 text-emerald-600" />}
      {sig.verification_status === "matched" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
      {sig.verification_status === "unmatched" && <XCircle className="w-4 h-4 text-red-500" />}
      {sig.verification_status === "flagged" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
      {sig.verification_status === "pending" && <div className="w-4 h-4 rounded-full bg-muted" />}
      {sig.verification_status !== "certified" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground flex-shrink-0"
          onClick={startEdit}
          title="Correct a misread name/address/city and re-check against the voter file"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      )}
      {sig.verification_status === "certified" ? (
        <Button
          variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground"
          onClick={() => certifyMutation.mutate({ id: sig.id, certified: false })}
          title="Remove the recorded clerk certification (entered in error)"
        >
          Undo
        </Button>
      ) : (
        <Button
          variant="outline" size="sm" className="h-6 px-2 text-xs"
          onClick={() => certifyMutation.mutate({ id: sig.id, certified: true })}
          title="Record the town clerk's certification — the red checkmark next to this line on the returned sheet"
        >
          Clerk ✓
        </Button>
      )}
    </div>
  );
}
