import React from "react";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, ArrowRight, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const priorityConfig = {
  low: { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  high: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  urgent: { dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200" },
};

const statusColors = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
};

export default function RecentTasks({ tasks }) {
  const recentTasks = (tasks || [])
    .filter((t) => t.status !== "done")
    .slice(0, 6);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-lg p-1.5">
            <ClipboardList className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold">Active Tasks</h3>
          {recentTasks.length > 0 && (
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">
              {recentTasks.length}
            </span>
          )}
        </div>
        <Link
          to="/tasks"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {recentTasks.length === 0 ? (
        <div className="p-8 text-center">
          <Circle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">No active tasks yet</p>
          <Link to="/tasks" className="text-xs font-medium text-accent hover:underline">
            Create your first task →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {recentTasks.map((task) => {
            const pc = priorityConfig[task.priority] || priorityConfig.medium;
            const sc = statusColors[task.status];
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors group"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pc.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(task.due_date), "MMM d")}
                      </p>
                    )}
                    {task.category && (
                      <span className="text-xs text-muted-foreground/60 capitalize">{task.category.replace("_", " ")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {task.status !== "todo" && sc && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${sc}`}>
                      {task.status.replace("_", " ")}
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border capitalize ${pc.badge}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}