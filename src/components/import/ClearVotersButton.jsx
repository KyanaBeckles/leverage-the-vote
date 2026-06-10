import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";

export default function ClearVotersButton({ campaignId, onCleared }) {
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    if (!campaignId) return;
    setClearing(true);
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    let remaining = true;
    while (remaining) {
      const voters = await base44.entities.Voter.filter({ campaign_id: campaignId }, "-created_date", 5);
      if (voters.length === 0) { remaining = false; break; }
      for (const v of voters) {
        await base44.entities.Voter.delete(v.id);
        await delay(200); // pause between each delete
      }
      if (voters.length < 5) remaining = false;
      await delay(500); // pause between batches
    }
    setClearing(false);
    onCleared?.();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 mb-4">
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear All Voters
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all voter records?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete all imported voter records for this campaign. This cannot be undone. You'll need to re-import your voter file.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClear}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            disabled={clearing}
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            {clearing ? "Clearing…" : "Yes, Delete All"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}