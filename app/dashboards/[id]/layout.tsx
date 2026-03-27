"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import UserHeader from "@/app/components/UserHeader"; // Add this if you want the blue top bar back!

export default function DashboardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    // 1. FIX: Changed to h-screen and overflow-hidden to lock the page frame!
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      {/* OPTIONAL: Uncomment this if you want the blue header on all dashboard pages! */}
      {/* <UserHeader userName="Admin User" userRole="SUPER_ADMIN" userEmail="admin@ebright.com" /> */}
      
      <div className="flex flex-1 overflow-hidden">
        {/* The Sidebar */}
        <Sidebar sidebarOpen={sidebarOpen} onCollapse={() => setSidebarOpen(false)} />
        
        {/* The Actual Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative flex flex-col">
          
          {/* 2. FIX: Hamburger button appears when the sidebar is hidden */}
          {!sidebarOpen && (
            <div className="mb-6 shrink-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl shadow-sm transition-all flex items-center justify-center gap-3 font-bold text-sm uppercase tracking-widest w-fit"
                title="Open Sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Show Sidebar
              </button>
            </div>
          )}

          {/* This renders your HRMS, Library, etc. */}
          {children}
        </main>
      </div>
    </div>
  );
}