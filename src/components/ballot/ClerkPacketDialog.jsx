import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileDown } from "lucide-react";
import { generateClerkPacketPdf } from "@/lib/clerkPacketPdf";

// Picks one town from among the scanned sheets and generates a hand-delivery
// "Clerk Packet" PDF for it — cover page + per-sheet scan + signature table.
export default function ClerkPacketDialog({ open, onOpenChange, campaign, sheets, signatures }) {
  const [selectedTown, setSelectedTown] = useState(null);
  const [generating, setGenerating] = useState(false);

  const { townGroups, noTownCount } = useMemo(() => {
    const scanned = (sheets || []).filter((s) => s.scan_url_front || s.scan_url_back);
    const byTown = new Map();
    let noTown = 0;
    for (const sheet of scanned) {
      const town = (sheet.town_clerk || "").trim();
      if (!town) {
        noTown++;
        continue;
      }
      const list = byTown.get(town) || [];
      list.push(sheet);
      byTown.set(town, list);
    }
    const groups = [...byTown.entries()]
      .map(([town, list]) => ({ town, sheets: list }))
      .sort((a, b) => a.town.localeCompare(b.town));
    return { townGroups: groups, noTownCount: noTown };
  }, [sheets]);

  useEffect(() => {
    if (open) {
      setSelectedTown(townGroups[0]?.town || null);
    }
  }, [open, townGroups]);

  const selectedGroup = townGroups.find((g) => g.town === selectedTown);
  const generateDisabled = !selectedGroup || selectedGroup.sheets.length === 0 || generating;
  const disabledReason = !selectedGroup || selectedGroup.sheets.length === 0
    ? "Select a town with at least one scanned sheet to generate its packet"
    : undefined;

  const handleGenerate = async () => {
    if (generateDisabled) return;
    setGenerating(true);
    try {
      await generateClerkPacketPdf({
        campaign,
        town: selectedGroup.town,
        sheets: selectedGroup.sheets,
        signatures,
      });
      onOpenChange(false);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display">Clerk Packet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 mt-1">
          <p className="text-sm text-muted-foreground">
            Choose a town to generate a hand-delivery packet: cover sheet, then each scanned
            petition sheet certified to that town with its signature table.
          </p>

          {townGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No scanned sheets with a town on file yet.
            </p>
          ) : (
            <RadioGroup value={selectedTown || ""} onValueChange={setSelectedTown} className="gap-1.5 max-h-64 overflow-y-auto pr-1">
              {townGroups.map((group) => (
                <label
                  key={group.town}
                  htmlFor={`town-${group.town}`}
                  className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-accent/50 has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent/10"
                >
                  <RadioGroupItem value={group.town} id={`town-${group.town}`} />
                  <span className="flex-1 font-medium">{group.town}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {group.sheets.length} sheet{group.sheets.length === 1 ? "" : "s"}
                  </Badge>
                </label>
              ))}
            </RadioGroup>
          )}

          {noTownCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {noTownCount} scanned sheet{noTownCount === 1 ? "" : "s"} with no town on file — not
              selectable until a town clerk is set on the sheet.
            </p>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <span title={disabledReason}>
              <Button
                onClick={handleGenerate}
                disabled={generateDisabled}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <FileDown className="w-4 h-4 mr-1.5" />
                {generating ? "Generating..." : "Generate"}
              </Button>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
