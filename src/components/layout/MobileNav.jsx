import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, Users, FileCheck,
  Map, Calendar, Upload, Vote, Menu, X, LogOut, Camera, FolderOpen
} from "lucide-react";
import CameraCapture from "@/components/capture/CameraCapture";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/tasks", icon: ClipboardList, label: "Tasks" },
  { path: "/team", icon: Users, label: "Team" },
  { path: "/ballot-engine", icon: FileCheck, label: "Ballot" },
  { path: "/voters", icon: Map, label: "Voters" },
  { path: "/calendar", icon: Calendar, label: "Calendar" },
  { path: "/petition-validation", icon: Vote, label: "Validation" },
  { path: "/documents", icon: FolderOpen, label: "Documents" },
  { path: "/import", icon: Upload, label: "Import" },
];

// Bottom nav shows first 5 items; rest accessible via "More" drawer
const bottomItems = navItems.slice(0, 4);

export default function MobileNav() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list(),
  });
  const activeCampaign = campaigns[0];

  const handleLogout = () => base44.auth.logout("/login");

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border flex md:hidden">
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors ${
                isActive
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {/* Camera button — center highlight */}
        <button
          onClick={() => setShowCamera(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] text-accent font-semibold"
        >
          <div className="bg-accent rounded-full p-1.5 -mt-1">
            <Camera className="w-4 h-4 text-accent-foreground" />
          </div>
          <span>Scan</span>
        </button>
        {/* More button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <Menu className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>

      {/* Camera capture modal */}
      {showCamera && activeCampaign && (
        <CameraCapture
          campaignId={activeCampaign.id}
          onClose={() => setShowCamera(false)}
          onSuccess={() => setShowCamera(false)}
        />
      )}

      {/* Slide-up Drawer for extra nav items */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-sidebar rounded-t-2xl pb-8 pt-4 px-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-display font-bold text-sidebar-foreground">More</span>
              <button onClick={() => setDrawerOpen(false)} className="text-sidebar-foreground/60">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {navItems.slice(4).map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl text-[11px] transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}