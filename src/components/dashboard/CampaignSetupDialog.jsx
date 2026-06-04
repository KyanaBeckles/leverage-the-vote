import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function CampaignSetupDialog({ open, onOpenChange, campaign }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", candidate_name: "", office: "", state: "", district: "",
    party: "Independent", election_date: "", filing_deadline: "", signature_threshold: "",
  });

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name || "",
        candidate_name: campaign.candidate_name || "",
        office: campaign.office || "",
        state: campaign.state || "",
        district: campaign.district || "",
        party: campaign.party || "Independent",
        election_date: campaign.election_date || "",
        filing_deadline: campaign.filing_deadline || "",
        signature_threshold: campaign.signature_threshold || "",
      });
    }
  }, [campaign]);

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, signature_threshold: Number(form.signature_threshold) || 0 };
    if (campaign) {
      await base44.entities.Campaign.update(campaign.id, data);
    } else {
      await base44.entities.Campaign.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    setSaving(false);
    onOpenChange(false);
  };

  const FieldHint = ({ text }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px] text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-display">{campaign ? "Campaign Settings" : "Create Campaign"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">Campaign Name</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Smith for Senate 2026" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">Candidate Name</Label>
              <Input value={form.candidate_name} onChange={(e) => setForm({...form, candidate_name: e.target.value})} placeholder="Full name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">Office <FieldHint text="The specific office the candidate is running for" /></Label>
              <Input value={form.office} onChange={(e) => setForm({...form, office: e.target.value})} placeholder="e.g. State Senate, District 5" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Party</Label>
              <Select value={form.party} onValueChange={(v) => setForm({...form, party: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Democratic", "Republican", "Independent", "Green", "Libertarian", "Other"].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">State</Label>
              <Input value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} placeholder="e.g. MA" maxLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">District / Jurisdiction</Label>
              <Input value={form.district} onChange={(e) => setForm({...form, district: e.target.value})} placeholder="e.g. 5th Middlesex" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">Filing Deadline <FieldHint text="State-mandated date to submit certified signatures" /></Label>
              <Input type="date" value={form.filing_deadline} onChange={(e) => setForm({...form, filing_deadline: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Election Date</Label>
              <Input type="date" value={form.election_date} onChange={(e) => setForm({...form, election_date: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">Sig. Threshold <FieldHint text="Total certified signatures required by your state to get on the ballot" /></Label>
              <Input type="number" value={form.signature_threshold} onChange={(e) => setForm({...form, signature_threshold: e.target.value})} placeholder="e.g. 2000" />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.candidate_name} className="mt-2 bg-accent hover:bg-accent/90 text-accent-foreground">
            {saving ? "Saving..." : campaign ? "Update Campaign" : "Launch Campaign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}