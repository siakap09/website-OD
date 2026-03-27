"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, addDays, startOfWeek, endOfWeek } from "date-fns"; 
import { DateRange, RangeKeyDict } from "react-date-range"; 
import { useSession } from "next-auth/react"; // <-- 1. IMPORT SESSION
import "react-date-range/dist/styles.css"; 
import "react-date-range/dist/theme/default.css"; 
import Sidebar from "@/app/components/Sidebar";

// --- IMPORT SHARED CONSTANTS ---
import { 
  SHARED_EMPLOYEES, ALL_BRANCHES, DAYS, WEEKDAY_DAYS, 
  EMPLOYEE_COLORS, COLUMNS, BRANCH_SLOTS_CONFIG, 
  getTimeSlotsForDay, isAdminSlot, 
  SELECT_ARROW_WHITE, SELECT_ARROW_DARK 
} from "@/lib/manpowerUtils";

// --- DATE FORMATTING HELPERS ---
const formatDateString = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch (e) {
    return dateStr;
  }
};

const getDateForDay = (dayName: string, startDateStr: string) => {
  if (!startDateStr) return "";
  try {
    const start = parseISO(startDateStr);
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(start, i);
      if (format(currentDate, "EEEE").toLowerCase() === dayName.toLowerCase()) {
        return format(currentDate, "dd MMM yyyy");
      }
    }
  } catch (error) {
    return "";
  }
  return "";
};
// -----------------------------------

// --- HELPER COMPONENT: DETAILED SUMMARY TABLE ---
const SummaryTable = ({ title, data, theme = "blue" }: { title: string, data: any[], theme?: "blue" | "orange" }) => {
  const formatTime = (d: number) => {
    const h = Math.floor(d);
    const m = Math.round((d - h) * 60);
    return { h: h, m: m.toString().padStart(2, '0') };
  };

  return (
    <div className={`overflow-hidden rounded-xl border ${theme === "orange" ? "border-orange-200" : "border-slate-200"} bg-white shadow-md w-full flex-1`}>
      <header className={`border-b px-2 py-1.5 text-center ${theme === "orange" ? "bg-orange-600 text-white" : "bg-[#2D3F50] text-white"}`}>
        <h3 className="text-[10px] font-black uppercase tracking-widest">{title}</h3>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] border-collapse">
          <thead className="bg-slate-100 text-slate-600 border-b">
            <tr>
              <th className="p-1.5 border-r text-left w-6">No.</th>
              <th className="p-1.5 border-r text-left">Name</th>
              <th className="p-2 border-r text-center">Coach</th>
              <th className="p-2 border-r text-center">Exec</th>
              <th className="p-2 text-center">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, index) => {
              const c = formatTime(row.coachHrs);
              const e = formatTime(row.execHrs);
              const t = formatTime(row.total);
              return (
                <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                  <td className="p-1.5 border-r text-center text-slate-400 font-bold">{index + 1}</td>
                  <td className="p-1.5 border-r font-black text-slate-700 truncate">{row.name}</td>
                  <td className="p-1.5 border-r text-center">
                    <span className="bg-slate-50 border rounded px-1 py-0.5 text-slate-600 font-bold">{c.h}h {c.m}m</span>
                  </td>
                  <td className="p-1.5 border-r text-center">
                    <span className="bg-slate-50 border rounded px-1 py-0.5 text-slate-600 font-bold">{e.h}h {e.m}m</span>
                  </td>
                  <td className="p-1.5 text-center">
                    <span className={`rounded-lg px-2 py-0.5 font-black border ${theme === "orange" ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-blue-50 border-blue-200 text-blue-600"}`}>
                      {t.h}:{t.m}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function UpdateSchedulePage() {
  const router = useRouter();
  const { data: session } = useSession(); // <-- 2. GRAB SESSION
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [updatedSelections, setUpdatedSelections] = useState<Record<string, string>>({});
  const [updatedNotes, setUpdatedNotes] = useState<Record<string, string>>({});
  const [dayBranches, setDayBranches] = useState<Record<string, string>>({});
  const [branchStaffData, setBranchStaffData] = useState<Record<string, string[]>>({});
  const [newStaffInput, setNewStaffInput] = useState("");
  const [activeAddingBranch, setActiveAddingBranch] = useState<string>("");
  
  // --- LIVE DB STATE ---
  const [history, setHistory] = useState<any[]>([]); // Replaced localStorage
  const [isLoading, setIsLoading] = useState(true);
  
  // --- FILTER STATES ---
  const [filterBranch, setFilterBranch] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>(""); 
  
  // --- CALENDAR POPOVER STATES ---
  const [showCalendar, setShowCalendar] = useState(false);
  const [shownDate, setShownDate] = useState(new Date());
  const [isDateFiltered, setIsDateFiltered] = useState(false);
  const [range, setRange] = useState([{
    startDate: new Date(),
    endDate: new Date(),
    key: "selection",
  }]);

  // --- FETCH DATA FROM POSTGRESQL ---
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await fetch('/api/get-schedules');
        const data = await res.json();
        if (data.success) {
          setHistory(data.schedules);
        }
      } catch (err) {
        console.error("Failed to load schedules", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedules();

    // Still using localStorage for custom branch staff inputs for now
    const saved = localStorage.getItem("branch_custom_staff");
    if (saved) setBranchStaffData(JSON.parse(saved));
  }, []);

  // Safely extract user info
  const userRole = (session?.user as any)?.role || "USER";
  const userBranch = (session?.user as any)?.branchName;

  // --- APPLY FILTERS & ROLE SECURITY TO THE LIST ---
  const filteredHistory = useMemo(() => {
    return history.filter((record: any) => {
      // SECURITY: BM only sees their branch
      if (userRole === "BRANCH_MANAGER" && record.branch !== userBranch) {
        return false;
      }
      
      const matchBranch = filterBranch ? record.branch === filterBranch : true;
      const matchWeek = filterDate ? record.startDate === filterDate : true;
      return matchBranch && matchWeek;
    });
  }, [history, filterBranch, filterDate, userRole, userBranch]);


  const handleAddStaff = async () => {
  if (!activeAddingBranch || !newStaffInput.trim()) return;
  
  const name = newStaffInput.trim();

  try {
    // 1. Send to the Database API
    const res = await fetch('/api/branch-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, branch: activeAddingBranch })
    });

    if (res.ok) {
      // 2. Update the screen immediately if the database save worked
      setBranchStaffData(prev => ({
        ...prev,
        [activeAddingBranch]: [...(prev[activeAddingBranch] || []), name]
      }));
      setNewStaffInput("");
    } else {
      const errorData = await res.json();
      alert(errorData.error || "Failed to add staff");
    }
  } catch (err) {
    console.error("Error adding staff:", err);
  }
};

  const handleRemoveStaff = async (branch: string, name: string) => {
  if (!window.confirm(`Remove ${name} from ${branch}?`)) return;

  try {
    const res = await fetch('/api/branch-staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, branch })
    });

    if (res.ok) {
      setBranchStaffData(prev => ({
        ...prev,
        [branch]: prev[branch].filter(s => s !== name)
      }));
    }
  } catch (err) {
    console.error("Error removing staff:", err);
  }
};

  const handleSelectRecord = (record: any) => {
    setSelectedRecord(record);
    setUpdatedSelections({ ...record.selections });
    setUpdatedNotes({ ...record.notes });
  };

  const handleActualNameSelect = (day: string, targetTime: string, colId: string, name: string) => {
    setUpdatedSelections((prev) => {
      const next = { ...prev };
      const branchForThisDay = dayBranches[day] || selectedRecord.branch;
      if (!name || name === "None") {
        delete next[`${day}-${targetTime}-${colId}`];
        return next;
      }
      getTimeSlotsForDay(day, branchForThisDay).forEach((slot) => {
        next[`${day}-${slot}-${colId}`] = name;
      });
      return next;
    });
  };

  const handleClearDay = (day: string) => {
    if (!window.confirm(`Clear assignments for ${day}?`)) return;
    setUpdatedSelections(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => { if (key.startsWith(`${day}-`)) delete next[key]; });
      return next;
    });
  };

  const handleClearColumn = (day: string, colId: string) => {
    setUpdatedSelections(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => { if (key.startsWith(`${day}-`) && key.endsWith(`-${colId}`)) delete next[key]; });
      return next;
    });
  };

  const calculateHoursForData = (selections: Record<string, string>, isOriginalData = false) => {
    if (!selectedRecord) return [];
    const dataToCalculate = isOriginalData ? (selectedRecord.originalSelections || selectedRecord.selections) : selections;
    if (!dataToCalculate) return [];

    const uniqueEmployeesToTrack: string[] = Array.from(new Set([
      ...SHARED_EMPLOYEES, 
      ...(Object.values(dataToCalculate) as string[])
    ])).filter(e => e && e !== "None");

    const staffStats: Record<string, { coachHrs: number; execHrs: number; total: number }> = {};
    uniqueEmployeesToTrack.forEach(emp => { staffStats[emp] = { coachHrs: 0, execHrs: 0, total: 0 }; });

    DAYS.forEach((day) => {
      const isWeekend = day === "Saturday" || day === "Sunday";
      const dailyTarget = isWeekend ? 10.5 : 5.0;
      const branchForDay = selectedRecord.branch;

      uniqueEmployeesToTrack.forEach((emp) => {
        let coachingHoursForDay = 0;
        let workedThatDay = false;
        getTimeSlotsForDay(day, branchForDay).forEach((slot: string) => {
          COLUMNS.forEach((col) => {
            if (dataToCalculate[`${day}-${slot}-${col.id}`] === emp) {
              workedThatDay = true;
              if (col.type === "coach") coachingHoursForDay += isAdminSlot(slot, branchForDay) ? 0.25 : 1.25;
            }
          });
        });
        if (workedThatDay) {
          staffStats[emp].coachHrs += coachingHoursForDay;
          staffStats[emp].execHrs += Math.max(0, dailyTarget - coachingHoursForDay);
          staffStats[emp].total = staffStats[emp].coachHrs + staffStats[emp].execHrs;
        }
      });
    });
    return Object.entries(staffStats).map(([name, stats]) => ({ name, ...stats }));
  };

  // --- SAVE UPDATES TO DATABASE ---
  const handleUpdateSave = async () => {
    if (!window.confirm("Save adjustments to the database?")) return;
    
    // Create the updated record payload
    const updatedRecord = {
      ...selectedRecord,
      selections: updatedSelections,
      notes: updatedNotes,
      status: "Updated",
    };

    try {
      const response = await fetch('/api/save-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord)
      });

      if (!response.ok) throw new Error("Failed to save");

      alert("Adjustments Saved Successfully! 💾");
      
      // Update local state so UI refreshes without needing a full page reload
      setHistory(prev => prev.map(h => h.id === updatedRecord.id ? updatedRecord : h));
      setSelectedRecord(null);
      
    } catch (error) {
      console.error(error);
      alert("Error saving adjustments to database.");
    }
  };


  if (selectedRecord) {
    
    const namesUsedInOriginal = Object.values(selectedRecord.originalSelections || {}).filter(Boolean) as string[];
    const namesUsedInUpdates = Object.values(updatedSelections || {}).filter(Boolean) as string[];
    const globalUsedNames = Array.from(new Set([...namesUsedInOriginal, ...namesUsedInUpdates]));

    return (
      <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} onCollapse={() => setSidebarOpen(false)} />
        
        <main className="flex-1 h-screen flex flex-col overflow-hidden relative" style={{ zoom: 0.9 }}>
          
          {/* DETAIL TOP BAR */}
          <div className="shrink-0 w-full mx-auto px-4 md:px-6 pt-4 md:pt-6 z-50 bg-slate-50">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center gap-6 mb-6">
              <div className="flex items-center gap-6">
                
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
                  onClick={() => setSelectedRecord(null)}
                  className="bg-slate-200 text-slate-700 hover:bg-slate-300 px-6 py-3 rounded-xl font-bold uppercase transition-colors flex items-center gap-2 shadow-sm"
                >
                  ← Back to List
                </button>
                <div className="h-8 w-px bg-slate-300"></div>
                <h1 className="text-2xl font-black uppercase tracking-wide text-slate-800 leading-none m-0 flex items-center gap-4">
                  <span>Updating: {selectedRecord.branch}</span>
                  {selectedRecord.startDate && selectedRecord.endDate && (
                    <span className="text-sm bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg font-bold tracking-widest uppercase">
                      {formatDateString(selectedRecord.startDate)} - {formatDateString(selectedRecord.endDate)}
                    </span>
                  )}
                </h1>
              </div>
              <button onClick={handleUpdateSave} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl text-sm font-black uppercase shadow-md transition-colors flex items-center gap-2">
                <span>💾</span> Save Adjustments
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto w-full mx-auto px-4 md:px-6 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
              <div className="lg:col-span-5 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">STEP 1: SELECT BRANCHES</label>
                <div className="grid grid-cols-1 gap-1">
                  {DAYS.map(day => (
                    <div key={day} className={`flex items-center justify-between p-1.5 rounded-lg border transition-all ${activeAddingBranch === dayBranches[day] && dayBranches[day] ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] font-black uppercase w-20">{day}</span>
                      <select value={dayBranches[day] || ""} onChange={(e) => {setDayBranches(p=>({...p, [day]: e.target.value})); setActiveAddingBranch(e.target.value);}} className="text-[9px] bg-transparent font-bold text-blue-600 outline-none">
                        <option value="">Select Branch...</option>
                        {ALL_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-7 bg-white p-4 rounded-xl shadow-sm border border-orange-200">
                <label className="text-[10px] font-black uppercase text-orange-600 block mb-2 font-bold">STEP 2: ADD STAFF FOR {activeAddingBranch || '...'}</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" disabled={!activeAddingBranch} value={newStaffInput} onChange={(e) => setNewStaffInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddStaff()} placeholder="Enter name..." className="flex-1 border rounded-lg px-3 py-1.5 text-xs outline-none" />
                  <button onClick={handleAddStaff} className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase">Add Staff</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeAddingBranch && branchStaffData[activeAddingBranch]?.map(s => (
                    <span key={s} className="bg-white text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border shadow-sm flex items-center gap-1.5">{s} <button onClick={() => handleRemoveStaff(activeAddingBranch, s)} className="text-red-400">×</button></span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6 mb-10">
              {DAYS.map((day) => {
                const branchForThisDay = dayBranches[day] || selectedRecord.branch;
                const slots = getTimeSlotsForDay(day, branchForThisDay);
                
                const activeStaffList = Array.from(new Set([
                    ...SHARED_EMPLOYEES, 
                    ...(branchStaffData[branchForThisDay] || []),
                    ...globalUsedNames
                ]));

                return (
                  <div key={day} className="bg-white rounded-xl shadow-lg p-3 border-t-2 border-orange-500">
                    <div className="relative flex flex-col justify-center items-center mb-3 border-b pb-2 min-h-[30px]">
                      <h2 className="text-lg font-black uppercase text-slate-700 m-0 leading-none">{day}</h2>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {getDateForDay(day, selectedRecord.startDate)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col xl:flex-row gap-3 relative">
                      {/* PLANNING SIDE */}
                      <div className="flex-1 opacity-60 flex flex-col min-w-0">
                        <div className="bg-slate-500 p-1.5 text-center font-bold text-[9px] uppercase mb-1 rounded text-white tracking-widest h-8 sticky left-0 right-0 z-30">
                            Planning
                        </div>
                        <div className="overflow-x-auto border rounded relative">
                          <table className="w-full border-collapse text-[9px]" style={{ minWidth: '1500px' }}>
                            <thead>
                              <tr className="bg-slate-700 text-white text-center h-[40px]">
                                <th className="p-1 border border-slate-600 w-32 sticky left-0 z-20 bg-slate-700">
                                  <div className="flex flex-col items-center">
                                      <span>Slot</span>
                                      <span className="text-[6px] invisible py-0.5">CLEAR</span>
                                  </div>
                                </th>
                                {COLUMNS.map(c => (
                                  <th key={c.id} className={`p-1 border border-slate-600 w-24 ${c.type==='exec'?'bg-slate-800':''}`}>
                                    <div className="flex flex-col items-center">
                                        <span>{c.label}</span>
                                        <span className="text-[6px] invisible py-0.5">CLEAR</span>
                                    </div>
                                  </th>
                                ))}
                                <th className="p-1 border border-slate-600 w-40">
                                  <div className="flex flex-col items-center">
                                      <span>Notes</span>
                                      <span className="text-[6px] invisible py-0.5">CLEAR</span>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {slots.map(slot => (
                                <tr key={slot} className="h-[32px]">
                                  <td className="p-1 border bg-slate-50 font-bold sticky left-0 z-10 h-[32px]">{slot}</td>
                                  {COLUMNS.map(col => {
                                    const name = (selectedRecord.originalSelections || selectedRecord.selections)[`${day}-${slot}-${col.id}`];
                                    return <td key={col.id} className={`p-1 border text-center font-bold h-[32px] ${name ? (EMPLOYEE_COLORS[name] || 'bg-slate-500 text-white') : 'bg-white'}`}>{name || "-"}</td>;
                                  })}
                                  <td className="p-1 border bg-white italic text-slate-400 h-[32px]">...</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ACTUAL SIDE */}
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="bg-orange-600 p-1.5 flex justify-between items-center mb-1 rounded text-white tracking-widest h-8 sticky left-0 right-0 z-30">
                            <div className="w-fit min-w-[100px] text-[8px] font-black bg-black/10 px-2 py-1 rounded">
                                {branchForThisDay}
                            </div>
                            <span className="font-bold text-[9px] uppercase">Actual</span>
                            <div className="w-24 flex justify-end">
                              <button onClick={() => handleClearDay(day)} className="text-[7px] font-bold bg-orange-800 px-1.5 py-0.5 rounded">CLEAR DAY</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto border rounded relative">
                          <table className="w-full border-collapse text-[9px]" style={{ minWidth: '1500px' }}>
                            <thead>
                              <tr className="bg-[#2D3F50] text-white h-[40px]">
                                <th className="p-1 border border-slate-900 w-32 sticky left-0 z-20 bg-[#2D3F50]">
                                  <div className="flex flex-col items-center">
                                      <span>Slot</span>
                                      <span className="text-[6px] invisible py-0.5">CLEAR</span>
                                  </div>
                                </th>
                                {COLUMNS.map(c => (
                                  <th key={c.id} className={`p-1 border border-slate-900 w-24 ${c.type==='exec'?'bg-slate-700 border-b-2 border-b-blue-400':''}`}>
                                    <div className="flex flex-col items-center">
                                      <span>{c.label}</span>
                                      <button onClick={() => handleClearColumn(day, c.id)} className="text-[6px] text-orange-300 font-bold hover:text-white py-0.5">CLEAR</button>
                                    </div>
                                  </th>
                                ))}
                                <th className="p-1 border border-slate-900 w-40">
                                  <div className="flex flex-col items-center">
                                      <span>Notes</span>
                                      <span className="text-[6px] invisible py-0.5">CLEAR</span>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {slots.map(slot => (
                                <tr key={slot} className="group h-[32px]">
                                  <td className="p-1 border bg-orange-50 font-bold sticky left-0 z-10 group-hover:bg-orange-100 h-[32px]">{slot}</td>
                                  {COLUMNS.map(col => {
                                    const val = updatedSelections[`${day}-${slot}-${col.id}`] || "";
                                    const others = COLUMNS.filter(c => c.id !== col.id).map(c => updatedSelections[`${day}-${slot}-${c.id}`]).filter(Boolean);
                                    return (
                                      <td key={col.id} className={`p-0 border h-[32px] ${col.type==='exec' ? 'bg-slate-50' : 'bg-white'}`}>
                                        <select value={val} onChange={(e) => handleActualNameSelect(day, slot, col.id, e.target.value)} 
                                          className={`w-full h-full p-1 outline-none font-bold text-center appearance-none block ${val ? (EMPLOYEE_COLORS[val] || 'bg-orange-500 text-white') : 'bg-transparent text-slate-300'}`}>
                                          <option value="">-</option>
                                          {activeStaffList.map(e => <option key={e} value={e} disabled={others.includes(e)} className="text-black">{e}</option>)}
                                        </select>
                                      </td>
                                    );
                                  })}
                                  <td className="p-0 border bg-white h-[32px]">
                                    <textarea value={updatedNotes[`${day}-${slot}-notes`] || ""} onChange={(e) => setUpdatedNotes(p => ({...p, [`${day}-${slot}-notes`]: e.target.value}))} className="w-full h-full p-1 text-[8px] resize-none outline-none italic text-slate-600 block" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-md">
                <h2 className="text-sm font-black text-center uppercase tracking-widest text-slate-800 mb-4">📊 Staff Hours Comparison</h2>
                <div className="flex flex-col md:flex-row gap-4">
                    <SummaryTable title="ORIGINAL" data={calculateHoursForData({}, true)} theme="blue" />
                    <SummaryTable title="ADJUSTED" data={calculateHoursForData(updatedSelections, false)} theme="orange" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} onCollapse={() => setSidebarOpen(false)} />
        
        <main className="flex-1 h-screen flex flex-col overflow-hidden relative" style={{ zoom: 0.9 }}>
            
            <div className="shrink-0 w-full max-w-6xl mx-auto px-4 md:px-6 pt-4 md:pt-6 z-50 bg-slate-50">
              
              {/* LIST TOP BAR */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-6 mb-6">
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
                  onClick={() => router.push('/manpower-schedule')}
                  className="bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center gap-3 shadow-md hover:bg-blue-600 transition-colors"
                >
                  <span className="text-2xl">👥</span>
                  <span className="text-lg font-black uppercase tracking-wide leading-none">HRMS</span>
                </button>
                <div className="h-8 w-px bg-slate-300"></div>
                <h1 className="text-2xl font-black uppercase tracking-wide text-slate-800 leading-none m-0">
                  Update Manpower Schedule
                </h1>
              </div>

              {/* FILTER CONTROLS */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 mb-6 relative">
                
                {/* ONLY SHOW BRANCH FILTER IF NOT A BRANCH MANAGER */}
                {userRole !== "BRANCH_MANAGER" && (
                  <div className="flex-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Filter by Branch</label>
                    <select 
                      value={filterBranch} 
                      onChange={(e) => setFilterBranch(e.target.value)} 
                      className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">All Branches</option>
                      {ALL_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}
                
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Filter by Week</label>
                  <div 
                    onClick={() => setShowCalendar(true)}
                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700 cursor-pointer flex justify-between items-center transition-colors hover:border-blue-500"
                  >
                    <span>
                      {isDateFiltered 
                        ? `${format(range[0].startDate, "dd MMM yyyy")} - ${format(range[0].endDate, "dd MMM yyyy")}` 
                        : "All Weeks"}
                    </span>
                    <span>📅</span>
                  </div>
                </div>
                
                {(filterBranch || isDateFiltered) && (
                  <div className="flex items-end">
                    <button 
                      onClick={() => { 
                        setFilterBranch(""); 
                        setFilterDate(""); 
                        setIsDateFiltered(false);
                      }}
                      className="h-[50px] px-6 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-black uppercase tracking-widest text-xs transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* SCROLLING GRID AREA */}
            <div className="flex-1 overflow-y-auto w-full max-w-6xl mx-auto px-4 md:px-6 pb-12">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-300 text-center shadow-sm">
                    <p className="text-slate-500 font-bold text-lg uppercase tracking-widest">No schedules available matching filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredHistory.map((record: any) => (
                    <div key={record.id} onClick={() => handleSelectRecord(record)} className="bg-white p-8 rounded-3xl shadow-md border-4 border-transparent hover:border-orange-500 cursor-pointer transition-all flex flex-col justify-center">
                        <h3 className="font-black text-2xl uppercase text-slate-800 mb-2">{record.branch}</h3>
                        <div className="inline-flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-md text-xs font-bold tracking-widest uppercase shadow-sm">
                            Week Of: {formatDateString(record.startDate)}
                          </span>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </main>
      </div>

      {/* --- CENTERED MODAL FOR CALENDAR --- */}
      {showCalendar && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col max-w-md w-full relative">
            <h2 className="text-xl font-black text-slate-800 mb-4 uppercase tracking-tight text-center">Select a Week</h2>
            
            <div className="flex justify-center w-full overflow-hidden mb-4">
              <DateRange
                onChange={(item: RangeKeyDict) => {
                  const selection = item.selection;
                  if (selection.startDate) {
                    const start = startOfWeek(selection.startDate, { weekStartsOn: 1 });
                    const end = endOfWeek(selection.startDate, { weekStartsOn: 1 });
                    
                    setRange([{ startDate: start, endDate: end, key: "selection" }]);
                    setIsDateFiltered(true);
                    
                    setFilterDate(format(start, "yyyy-MM-dd")); 
                    
                    setTimeout(() => setShowCalendar(false), 250);
                  }
                }}
                shownDate={shownDate}
                onShownDateChange={(date) => setShownDate(date)}
                moveRangeOnFirstSelection={true}
                ranges={range}
                rangeColors={["#3b82f6"]}
                months={1}
                direction="horizontal"
                dateDisplayFormat="dd MMM yyyy"
                className="border-none"
              />
            </div>

            <button 
              onClick={() => setShowCalendar(false)} 
              className="w-full py-4 bg-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-300 uppercase tracking-widest text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}