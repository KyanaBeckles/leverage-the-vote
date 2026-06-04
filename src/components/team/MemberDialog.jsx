import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function MemberDialog({ open, onOpenChange, member, campaignId }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", status_tag: "volunteer",
    access_level: "contributor", org_node: "",
  });

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name || "", email: member.email || "", phone: member.phone || "",
        status_tag: member.status_tag || "volunteer", access_level: member.access_level || "contributor",
        org_node: member.org_node || "",
      });
    } else {
      setForm({ name: "", email: "", phone: "", status_tag: "volunteer", access_level: "contributor", org_node: "" });
    }
  }, [member, open]);

  const handleSave = async () => {
    setSaving(true);
    if (member) {
      await base44.entities.CampaignMember.update(member.id, form);
    } else {
      await base44.entities.CampaignMember.create({ ...form, campaign_id: campaignId });
    }
    queryClient.invalidateQueries({ queryKey: ["members"] });
    setSaving(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (member) {
      await base44.entities.CampaignMember.delete(member.id);
      queryClient.invalidateQueries({ queryKey: ["members"] });
      onOpenChange(false);
    }
  };

  const FieldHint = ({ text }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger><HelpCircle className="w-3 h-3 text-muted-foreground/50" /></TooltipTrigger>
        <TooltipContent className="text-xs max-w-[220px]">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-display">{member ? "Edit Member" : "Add Team Member"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Full Name</Label>
            <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="Email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="Phone" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">Status Tag <FieldHint text="HR label for filtering/reporting. Does NOT affect permissions." /></Label>
              <Select value={form.status_tag} onValueChange={(v) => setForm({...form, status_tag: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer">#volunteer</SelectItem>
                  <SelectItem value="staff">#staff</SelectItem>
                  <SelectItem value="consultant">#consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">Access Level <FieldHint text="Controls what this person can see and do in the system." /></Label>
              <Select value={form.access_level} onValueChange={(v) => setForm({...form, access_level: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="contributor">Contributor</SelectItem>
                  <SelectItem value="field_only">Field Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">Org Chart Node <FieldHint text="Their role on the org chart. Tasks/shifts are assigned to the node, not the person." /></Label>
            <Input value={form.org_node} onChange={(e) => setForm({...form, org_node: e.target.value})} placeholder="e.g. Field Director, Boston Organizer" />
          </div>
          <div className="flex justify-between mt-2">
            {member && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-1" /> Remove
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {saving ? "Saving..." : member ? "Update" : "Add Member"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}