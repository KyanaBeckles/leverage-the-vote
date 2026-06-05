import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, GripVertical, MessageSquare, Paperclip } from "lucide-react";
import { format } from "date-fns";

const priorityStyles = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

const categoryLabels = {
  ballot_access: "Ballot",
  field: "Field",
  communications: "Comms",
  finance: "Finance",
  operations: "Ops",
  compliance: "Compliance",
  general: "General",
};

export default function TaskCard({ task, onEdit, onStatusChange, dragHandleProps, isDragging }) {
  const commentCount = task.comments?.length || 0;
  const attachmentCount = task.attachments?.length || 0;

  return (
    <Card className={`group hover:shadow-md transition-all border-l-2 ${isDragging ? "shadow-lg rotate-1 opacity-90" : ""}`}
      style={{ borderLeftColor: task.priority === "urgent" ? "#ef4444" : task.priority === "high" ? "#f59e0b" : "transparent" }}>
      <CardContent className="p-3.5">
        <div className="flex items-start gap-1">
          {/* Drag handle */}
          <div {...dragHandleProps} className="mt-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 transition-opacity shrink-0">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium leading-snug flex-1 cursor-pointer" onClick={onEdit}>{task.title}</p>
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Open</DropdownMenuItem>
              {task.status !== "todo" && <DropdownMenuItem onClick={() => onStatusChange("todo")}>Move to To Do</DropdownMenuItem>}
              {task.status !== "in_progress" && <DropdownMenuItem onClick={() => onStatusChange("in_progress")}>Move to In Progress</DropdownMenuItem>}
              {task.status !== "blocked" && <DropdownMenuItem onClick={() => onStatusChange("blocked")}>Move to Blocked</DropdownMenuItem>}
              {task.status !== "done" && <DropdownMenuItem onClick={() => onStatusChange("done")}>Move to Done</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${priorityStyles[task.priority] || ""}`}>
            {task.priority}
          </Badge>
          {task.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {categoryLabels[task.category] || task.category}
            </Badge>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {commentCount > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />{commentCount}
              </span>
            )}
            {attachmentCount > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Paperclip className="w-3 h-3" />{attachmentCount}
              </span>
            )}
            {task.due_date && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}