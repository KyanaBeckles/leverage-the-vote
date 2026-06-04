import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, ArrowRight } from "lucide-react";
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

export default function TaskCard({ task, onEdit, onStatusChange }) {
  return (
    <Card className="group hover:shadow-md transition-all cursor-pointer border-l-2" style={{ borderLeftColor: task.priority === "urgent" ? "#ef4444" : task.priority === "high" ? "#f59e0b" : "transparent" }}>
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug flex-1" onClick={onEdit}>{task.title}</p>
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              {task.status !== "todo" && <DropdownMenuItem onClick={() => onStatusChange("todo")}>Move to To Do</DropdownMenuItem>}
              {task.status !== "in_progress" && <DropdownMenuItem onClick={() => onStatusChange("in_progress")}>Move to In Progress</DropdownMenuItem>}
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
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
              <Calendar className="w-3 h-3" />
              {format(new Date(task.due_date), "MMM d")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}