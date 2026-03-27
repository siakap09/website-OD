"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";

export default function ManpowerHub() {
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Check if any schedules have been submitted yet
    const history = JSON.parse(localStorage.getItem("manpower_history") || "[]");
    if (history.length > 0) {
      setHasHistory(true);
    }
  }, []);

  return (
    // 1. FIX: Locked to screen height to prevent sidebar from scrolling away
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* 1. Sidebar Included Here */}
      <Sidebar sidebarOpen={sidebarOpen} onCollapse={() => setSidebarOpen(false)} />

      {/* 2. Main Content Wrapper - Set to flex column to allow internal scrolling */}
      <main className="flex-1 h-screen flex flex-col overflow-hidden relative">
        
        {/* STICKY TOP AREA */}
        <div className="shrink-0 w-full mx-auto px-6 pt-6 z-50 bg-slate-50">
          
          {/* 3. The New Top Bar (HRMS Button + Current Page Name) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-6 mb-12">
            
            {/* HAMBURGER BUTTON TO OPEN SIDEBAR */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-3 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl transition-colors shadow-sm flex items-center justify-center"
                title="Open Sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            <button
              onClick={() => router.push('/dashboards/hrms')}
              className="bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center gap-3 shadow-md hover:bg-blue-600 transition-colors"
            >
              <span className="text-2xl">👥</span>
              <span className="text-lg font-black uppercase tracking-wide leading-none">HRMS</span>
            </button>
            
            <div className="h-8 w-px bg-slate-300"></div> {/* Vertical Divider Line */}
            
            <h1 className="text-2xl font-black uppercase tracking-wide text-slate-800 leading-none m-0">
              Manpower Planning
            </h1>
          </div>
        </div>

        {/* SCROLLING CONTENT AREA */}
        <div className="flex-1 overflow-y-auto w-full mx-auto px-6 pb-12">
          {/* 4. The Original Cards Grid */}
          <div className={`w-full grid grid-cols-1 ${hasHistory ? 'md:grid-cols-3' : 'md:grid-cols-1 max-w-md'} gap-8 text-slate-800`}>
            
            {/* Button 1: Plan New Week */}
            <div onClick={() => router.push("/manpower-schedule/plan-new-week")} className="bg-white p-10 rounded-3xl shadow-xl border-4 border-transparent hover:border-green-500 cursor-pointer transition-all flex flex-col items-center text-center group">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 text-3xl group-hover:bg-green-600 group-hover:text-white transition-all">✍️</div>
              <h2 className="text-2xl font-bold tracking-tight uppercase">Plan New Week</h2>
            </div>

            {hasHistory && (
              <>
                {/* Button 2: Update Manpower Schedule */}
                <div onClick={() => router.push("/manpower-schedule/update")} className="bg-white p-10 rounded-3xl shadow-xl border-4 border-transparent hover:border-orange-500 cursor-pointer transition-all flex flex-col items-center text-center group">
                  <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 text-3xl group-hover:bg-orange-600 group-hover:text-white transition-all">🔄</div>
                  <h2 className="text-2xl font-bold tracking-tight uppercase">Update Manpower Schedule</h2>
                </div>

                {/* Button 3: Archive Overview */}
                <div onClick={() => router.push("/manpower-schedule/archive")} className="bg-white p-10 rounded-3xl shadow-xl border-4 border-transparent hover:border-blue-500 cursor-pointer transition-all flex flex-col items-center text-center group">
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 text-3xl group-hover:bg-blue-600 group-hover:text-white transition-all">📊</div>
                  <h2 className="text-2xl font-bold tracking-tight uppercase">Archive Overview</h2>
                </div>
              </>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}