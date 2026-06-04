import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      {/* Mobile bottom nav */}
      <MobileNav />
      <main className="md:ml-[240px] pb-20 md:pb-0 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}