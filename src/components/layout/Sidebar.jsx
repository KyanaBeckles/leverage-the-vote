import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, ClipboardList, Users, FileCheck, Map, Calendar, 
  Upload, Settings, ChevronLeft, ChevronRight, Vote, BarChart3,
  LogOut, HelpCircle, FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { base44 } from "@/api/base44Client";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Command Center" },
  { path: "/tasks", icon: ClipboardList, label: "Tasks" },
  { path: "/team", icon: Users, label: "Team & Org Chart" },
  { path: "/ballot-engine", icon: FileCheck, label: "Ballot Engine" },
  { path: "/petition-validation", icon: Vote, label: "Validation" },
  { path: "/voters", icon: Map, label: "Voter File" },
  { path: "/calendar", icon: Calendar, label: "Calendar" },
  { path: "/documents", icon: FolderOpen, label: "Documents" },
  { path: "/import", icon: Upload, label: "Data Import" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-300 z-50 ${collapsed ? "w-[68px]" : "w-[240px]"}`}>
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-sidebar-border ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Vote className="w-4 h-4 text-accent-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-display font-bold text-sm leading-tight text-sidebar-foreground">Leverage</h1>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">the Vote</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const linkContent = (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-body">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return linkContent;
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
          <button onClick={handleLogout} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-all ${collapsed ? "justify-center px-2" : ""}`}>
            <LogOut className="w-[18px] h-[18px]" />
            {!collapsed && <span>Sign Out</span>}
          </button>
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="w-full h-8 text-sidebar-foreground/50 hover:text-sidebar-foreground">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}