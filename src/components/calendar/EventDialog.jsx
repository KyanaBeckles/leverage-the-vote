import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

export default function EventDialog({ open, onOpenChange, event, campaignId }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", event_type: "other",
    start_date: "", end_date: "", location: "", is_public: false,
  });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title || "", description: event.description || "",
        event_type: event.event_type || "other",
        start_date: event.start_date ? event.start_date.slice(0, 16) : "",
        end_date: event.end_date ? event.end_date.slice(0, 16) : "",
        location: event.location || "", is_public: event.is_public || false,
      });
    } else {
      setForm({ title: "", description: "", event_type: "other", start_date: "", end_date: "", location: "", is_public: false });
    }
  }, [event, open]);

  const handleSave = async () => {
    setSaving(true);
    // Ensure datetime strings include seconds so parsing is consistent across browsers
    const normalizeDate = (d) => d ? (d.length === 16 ? d + ":00" : d) : d;
    const payload = {
      ...form,
      start_date: normalizeDate(form.start_date),
      end_date: normalizeDate(form.end_date),
    };
    if (event) {
      await base44.entities.CalendarEvent.update(event.id, payload);
    } else {
      await base44.entities.CalendarEvent.create({ ...payload, campaign_id: campaignId });
    }
    queryClient.invalidateQueries({ queryKey: ["events"] });
    setSaving(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (event) {
      await base44.entities.CalendarEvent.delete(event.id);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-display">{event ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Event name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={form.event_type} onValueChange={(v) => setForm({...form, event_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shift">Shift</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="canvass">Canvass</SelectItem>
                  <SelectItem value="fundraiser">Fundraiser</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="Address or virtual" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start</Label>
              <Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End</Label>
              <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_public} onCheckedChange={(v) => setForm({...form, is_public: v})} />
            <Label className="text-xs">Public event (visible to volunteers)</Label>
          </div>
          <div className="flex justify-between mt-2">
            {event && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {saving ? "Saving..." : event ? "Update" : "Create Event"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}