import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

export default function PetitionSheetDialog({ open, onOpenChange, sheet, campaignId }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sheet_number: "", pipeline_status: "blank_issued", assigned_to_name: "",
    issued_date: "", returned_date: "", town_clerk: "", notes: "",
    raw_signature_count: 0, certified_count: 0, rejected_count: 0,
    scan_url_front: "", scan_url_back: "",
  });

  useEffect(() => {
    if (sheet) {
      setForm({
        sheet_number: sheet.sheet_number || "",
        pipeline_status: sheet.pipeline_status || "blank_issued",
        assigned_to_name: sheet.assigned_to_name || "",
        issued_date: sheet.issued_date || "",
        returned_date: sheet.returned_date || "",
        town_clerk: sheet.town_clerk || "",
        notes: sheet.notes || "",
        raw_signature_count: sheet.raw_signature_count || 0,
        certified_count: sheet.certified_count || 0,
        rejected_count: sheet.rejected_count || 0,
        scan_url_front: sheet.scan_url_front || "",
        scan_url_back: sheet.scan_url_back || "",
      });
    } else {
      setForm({
        sheet_number: "", pipeline_status: "blank_issued", assigned_to_name: "",
        issued_date: new Date().toISOString().split("T")[0], returned_date: "",
        town_clerk: "", notes: "", raw_signature_count: 0, certified_count: 0, rejected_count: 0,
      });
    }
  }, [sheet, open]);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      raw_signature_count: Number(form.raw_signature_count),
      certified_count: Number(form.certified_count),
      rejected_count: Number(form.rejected_count),
    };
    if (sheet) {
      await base44.entities.PetitionSheet.update(sheet.id, data);
    } else {
      await base44.entities.PetitionSheet.create({ ...data, campaign_id: campaignId });
    }
    queryClient.invalidateQueries({ queryKey: ["sheets"] });
    setSaving(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (sheet) {
      await base44.entities.PetitionSheet.delete(sheet.id);
      queryClient.invalidateQueries({ queryKey: ["sheets"] });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display">{sheet ? "Edit Petition Sheet" : "Issue New Sheet"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Sheet Number</Label>
              <Input value={form.sheet_number} onChange={(e) => setForm({...form, sheet_number: e.target.value})} placeholder="e.g. 001" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.pipeline_status} onValueChange={(v) => setForm({...form, pipeline_status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank_issued">Blank Issued</SelectItem>
                  <SelectItem value="in_field">In Field</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="scanned">Scanned</SelectItem>
                  <SelectItem value="at_clerk">At Town Clerk</SelectItem>
                  <SelectItem value="certified">Certified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Assigned To</Label>
              <Input value={form.assigned_to_name} onChange={(e) => setForm({...form, assigned_to_name: e.target.value})} placeholder="Volunteer name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Town Clerk</Label>
              <Input value={form.town_clerk} onChange={(e) => setForm({...form, town_clerk: e.target.value})} placeholder="Clerk office" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Issued Date</Label>
              <Input type="date" value={form.issued_date} onChange={(e) => setForm({...form, issued_date: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Returned Date</Label>
              <Input type="date" value={form.returned_date} onChange={(e) => setForm({...form, returned_date: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Raw Sigs</Label>
              <Input type="number" value={form.raw_signature_count} onChange={(e) => setForm({...form, raw_signature_count: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Certified</Label>
              <Input type="number" value={form.certified_count} onChange={(e) => setForm({...form, certified_count: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rejected</Label>
              <Input type="number" value={form.rejected_count} onChange={(e) => setForm({...form, rejected_count: e.target.value})} />
            </div>
          </div>
          {/* Front/Back scan thumbnails */}
          {(form.scan_url_front || form.scan_url_back) && (
            <div className="grid grid-cols-2 gap-3">
              {form.scan_url_front && (
                <div className="space-y-1">
                  <Label className="text-xs">Front (7 lines)</Label>
                  <a href={form.scan_url_front} target="_blank" rel="noreferrer">
                    <img src={form.scan_url_front} alt="Front scan" className="w-full h-24 object-cover rounded-md border" />
                  </a>
                </div>
              )}
              {form.scan_url_back && (
                <div className="space-y-1">
                  <Label className="text-xs">Back (17 lines)</Label>
                  <a href={form.scan_url_back} target="_blank" rel="noreferrer">
                    <img src={form.scan_url_back} alt="Back scan" className="w-full h-24 object-cover rounded-md border" />
                  </a>
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} />
          </div>
          <div className="flex justify-between mt-2">
            {sheet && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.sheet_number} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {saving ? "Saving..." : sheet ? "Update" : "Issue Sheet"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}