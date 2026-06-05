import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Send, Paperclip, Link2, Upload, X, ExternalLink, FileText } from "lucide-react";
import { format } from "date-fns";

export default function TaskDetailDialog({ open, onOpenChange, task, campaignId }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [form, setForm] = useState({
    title: "", description: "", status: "todo", priority: "medium",
    category: "general", due_date: "", assigned_to_node: "",
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "", description: task.description || "",
        status: task.status || "todo", priority: task.priority || "medium",
        category: task.category || "general", due_date: task.due_date || "",
        assigned_to_node: task.assigned_to_node || "",
      });
    } else {
      setForm({ title: "", description: "", status: "todo", priority: "medium", category: "general", due_date: "", assigned_to_node: "" });
    }
    setCommentText("");
    setShowLinkForm(false);
  }, [task, open]);

  const handleSave = async () => {
    setSaving(true);
    if (task) {
      await base44.entities.Task.update(task.id, form);
    } else {
      await base44.entities.Task.create({ ...form, campaign_id: campaignId });
    }
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    setSaving(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (task) {
      await base44.entities.Task.delete(task.id);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !task) return;
    const comments = [...(task.comments || []), {
      id: crypto.randomUUID(),
      author_name: currentUser?.full_name || "Unknown",
      author_id: currentUser?.id || "",
      text: commentText.trim(),
      created_at: new Date().toISOString(),
    }];
    await base44.entities.Task.update(task.id, { comments });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    setCommentText("");
  };

  const handleDeleteComment = async (commentId) => {
    if (!task) return;
    const comments = (task.comments || []).filter(c => c.id !== commentId);
    await base44.entities.Task.update(task.id, { comments });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim() || !task) return;
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    const attachments = [...(task.attachments || []), {
      id: crypto.randomUUID(),
      type: "link",
      name: linkName.trim() || url,
      url,
      added_by_name: currentUser?.full_name || "Unknown",
      added_at: new Date().toISOString(),
    }];
    await base44.entities.Task.update(task.id, { attachments });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    setLinkName("");
    setLinkUrl("");
    setShowLinkForm(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    setUploadingFile(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const attachments = [...(task.attachments || []), {
      id: crypto.randomUUID(),
      type: "file",
      name: file.name,
      url: file_url,
      added_by_name: currentUser?.full_name || "Unknown",
      added_at: new Date().toISOString(),
    }];
    await base44.entities.Task.update(task.id, { attachments });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    setUploadingFile(false);
    e.target.value = "";
  };

  const handleRemoveAttachment = async (attachmentId) => {
    if (!task) return;
    const attachments = (task.attachments || []).filter(a => a.id !== attachmentId);
    await base44.entities.Task.update(task.id, { attachments });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const comments = task?.comments || [];
  const attachments = task?.attachments || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{task ? "Task Detail" : "New Task"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            {task && <TabsTrigger value="comments" className="flex-1">Comments {comments.length > 0 && `(${comments.length})`}</TabsTrigger>}
            {task && <TabsTrigger value="attachments" className="flex-1">Attachments {attachments.length > 0 && `(${attachments.length})`}</TabsTrigger>}
          </TabsList>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Task title" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Details..." rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="ballot_access">Ballot Access</SelectItem>
                    <SelectItem value="field">Field</SelectItem>
                    <SelectItem value="communications">Comms</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assigned Node</Label>
                <Input value={form.assigned_to_node} onChange={(e) => setForm({...form, assigned_to_node: e.target.value})} placeholder="e.g. Field Director" />
              </div>
            </div>
            <div className="flex justify-between mt-2">
              {task && (
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.title} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {saving ? "Saving..." : task ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* COMMENTS TAB */}
          {task && (
            <TabsContent value="comments" className="mt-4 space-y-4">
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first to add one.</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="bg-muted/40 rounded-lg p-3 group relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{c.author_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {c.created_at ? format(new Date(c.created_at), "MMM d, h:mm a") : ""}
                        </span>
                        <button onClick={() => handleDeleteComment(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-end border-t pt-3">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="flex-1 resize-none"
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment(); }}
                />
                <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground h-9">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
          )}

          {/* ATTACHMENTS TAB */}
          {task && (
            <TabsContent value="attachments" className="mt-4 space-y-4">
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {attachments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No attachments yet.</p>
                )}
                {attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 border rounded-lg group hover:bg-muted/30">
                    {a.type === "link" ? <Link2 className="w-4 h-4 text-blue-500 shrink-0" /> : <FileText className="w-4 h-4 text-slate-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-primary flex items-center gap-1 truncate">
                        {a.name} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <p className="text-[10px] text-muted-foreground">{a.added_by_name} · {a.added_at ? format(new Date(a.added_at), "MMM d") : ""}</p>
                    </div>
                    <button onClick={() => handleRemoveAttachment(a.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-3">
                {/* File upload */}
                <div>
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg hover:bg-muted/30 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {uploadingFile ? "Uploading..." : "Upload a file"}
                      </span>
                    </div>
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                  </label>
                </div>

                {/* Link form */}
                {!showLinkForm ? (
                  <Button variant="outline" size="sm" onClick={() => setShowLinkForm(true)} className="w-full">
                    <Link2 className="w-4 h-4 mr-2" /> Add a hyperlink
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Link name (optional)" />
                    <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddLink} disabled={!linkUrl.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground">Add Link</Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowLinkForm(false); setLinkName(""); setLinkUrl(""); }}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}