import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const priorityStyles = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

export default function RecentTasks({ tasks }) {
  const recentTasks = (tasks || [])
    .filter(t => t.status !== "done")
    .slice(0, 5);

  if (recentTasks.length === 0) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-6 text-center">
          <ClipboardList className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No active tasks yet</p>
          <Link to="/tasks" className="text-sm font-medium text-accent hover:underline">
            Create your first task →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Active Tasks
          </CardTitle>
          <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {recentTasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              task.priority === "urgent" ? "bg-red-500" : 
              task.priority === "high" ? "bg-amber-500" : 
              task.priority === "medium" ? "bg-blue-500" : "bg-secondary"
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{task.title}</p>
              {task.due_date && (
                <p className="text-xs text-muted-foreground">{format(new Date(task.due_date), "MMM d")}</p>
              )}
            </div>
            <Badge variant="secondary" className={`text-[10px] px-1.5 ${priorityStyles[task.priority] || ""}`}>
              {task.priority}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}