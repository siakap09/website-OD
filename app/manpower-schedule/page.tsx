"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, parseISO, addDays } from "date-fns";
import WeekSelector from "@/app/components/WeekSelector";
import Sidebar from "@/app/components/Sidebar";
import UserHeader from "@/app/components/UserHeader";

const SHARED_EMPLOYEES = ["Iqbal", "Ying Chen", "Adam", "Faiq", "Salman"];

const COLUMNS = [
  { id: "coach1", label: "Coach 1", type: "coach" as const, employees: SHARED_EMPLOYEES },
  { id: "coach2", label: "Coach 2", type: "coach" as const, employees: SHARED_EMPLOYEES },
  { id: "coach3", label: "Coach 3", type: "coach" as const, employees: SHARED_EMPLOYEES },
  { id: "coach4", label: "Coach 4", type: "coach" as const, employees: SHARED_EMPLOYEES },
  { id: "coach5", label: "Coach 5", type: "coach" as const, employees: SHARED_EMPLOYEES },
  { id: "exec1", label: "Executive 1", type: "executive" as const, employees: SHARED_EMPLOYEES },
  { id: "exec2", label: "Executive 2", type: "executive" as const, employees: SHARED_EMPLOYEES },
  { id: "exec3", label: "Executive 3", type: "executive" as const, employees: SHARED_EMPLOYEES },
  { id: "exec4", label: "Executive 4", type: "executive" as const, employees: SHARED_EMPLOYEES },
  { id: "exec5", label: "Executive 5", type: "executive" as const, employees: SHARED_EMPLOYEES },
] as const;

const EMPLOYEE_COLORS: Record<string, string> = {
  "Iqbal": "bg-blue-400 text-white border-blue-500",
  "Ying Chen": "bg-pink-300 text-white border-pink-400",
  "Adam": "bg-purple-400 text-white border-purple-500",
  "Faiq": "bg-indigo-400 text-white border-indigo-500",
  "Salman": "bg-teal-400 text-white border-teal-500",
};

type ColumnId = (typeof COLUMNS)[number]["id"];

const DAYS = ["Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const WEEKDAY_TIME_SLOTS = ["06:00 PM – 07:15 PM", "07:15 PM – 08:30 PM"] as const;
const WEEKEND_TIME_SLOTS = [
  "08:45 AM – 09:15 AM", "09:15 AM – 10:30 AM", "10:30 AM – 11:45 AM",
  "11:45 AM – 12:00 PM", "12:00 PM – 1:15 PM", "1:15 PM – 2:30 PM",
  "2:30 PM – 2:45 PM", "2:45 PM – 4:00 PM", "4:00 PM – 5:15 PM",
  "5:15 PM – 5:30 PM", "5:30 PM – 6:45 PM", "6:45 PM – 7:15 PM",
] as const;

const WEEKDAY_DAYS = ["Wednesday", "Thursday", "Friday"] as const;

function getTimeSlotsForDay(day: string): readonly string[] {
  return WEEKDAY_DAYS.includes(day as (typeof WEEKDAY_DAYS)[number])
    ? WEEKDAY_TIME_SLOTS
    : WEEKEND_TIME_SLOTS;
}

const SELECT_ARROW_WHITE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 8L1 3h10z'/%3E%3C/svg%3E";
const SELECT_ARROW_DARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235f6368' d='M6 8L1 3h10z'/%3E%3C/svg%3E";

function isAdminSlot(slot: string) {
  return ["08:45 AM – 09:15 AM", "11:45 AM – 12:00 PM", "2:30 PM – 2:45 PM", "5:15 PM – 5:30 PM", "6:45 PM – 7:15 PM"].includes(slot);
}

function getSlotWeight(day: string, slot: string): number {
  if (WEEKDAY_DAYS.includes(day as (typeof WEEKDAY_DAYS)[number])) return 1.25;
  if (["08:45 AM – 09:15 AM", "6:45 PM – 7:15 PM"].includes(slot)) return 0.5;
  if (["11:45 AM – 12:00 PM", "2:30 PM – 2:45 PM", "5:15 PM – 5:30 PM"].includes(slot)) return 0.25;
  return 1.25;
}

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startDateStr = searchParams.get("start");
  const endDateStr = searchParams.get("end");

  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [hasConfirmedBranch, setHasConfirmedBranch] = useState(false);
  const [hasConfirmedWeek, setHasConfirmedWeek] = useState(!!startDateStr);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingDays, setEditingDays] = useState<Record<string, boolean>>(
    DAYS.reduce((acc, day) => ({ ...acc, [day]: true }), {})
  );
  const [showRestRows, setShowRestRows] = useState(false);

  useEffect(() => {
    setHasConfirmedWeek(!!startDateStr);
  }, [startDateStr]);

  useEffect(() => {
    if (hasConfirmedBranch && selectedBranch) {
      const savedSelections = localStorage.getItem(`manpower_selections_${selectedBranch}`);
      const savedNotes = localStorage.getItem(`manpower_notes_${selectedBranch}`);
      setSelections(savedSelections ? JSON.parse(savedSelections) : {});
      setNotes(savedNotes ? JSON.parse(savedNotes) : {});
    }
  }, [hasConfirmedBranch, selectedBranch]);

  useEffect(() => {
    if (hasConfirmedBranch && selectedBranch) {
      localStorage.setItem(`manpower_selections_${selectedBranch}`, JSON.stringify(selections));
      localStorage.setItem(`manpower_notes_${selectedBranch}`, JSON.stringify(notes));
    }
  }, [selections, notes, selectedBranch, hasConfirmedBranch]);

  const weekLabel = useMemo(() => {
    if (!startDateStr || !endDateStr) return "";
    return `${format(parseISO(startDateStr), "MMM d")} – ${format(parseISO(endDateStr), "MMM d, yyyy")}`;
  }, [startDateStr, endDateStr]);

  const handleNameSelect = (day: string, time: string, columnId: ColumnId, name: string) => {
    setSelections((prev) => ({ ...prev, [`${day}-${time}-${columnId}`]: name }));
  };

  const handleNoteChange = (day: string, time: string, value: string) => {
    setNotes((prev) => ({ ...prev, [`${day}-${time}-notes`]: value }));
  };

  const clearAllForDay = (day: string) => {
    if (window.confirm(`Are you sure you want to clear all selections for ${day}?`)) {
      setSelections((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => { if (key.startsWith(`${day}-`)) delete next[key]; });
        return next;
      });
      setNotes((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => { if (key.startsWith(`${day}-`)) delete next[key]; });
        return next;
      });
    }
  };

  const clearColumnForDay = (day: string, columnId: string) => {
    setSelections((prev) => {
      const next = { ...prev };
      getTimeSlotsForDay(day).forEach(slot => { delete next[`${day}-${slot}-${columnId}`]; });
      return next;
    });
  };

  const handleSaveDay = async (day: string) => {
    window.alert(`Successfully saved ${day} schedule!`);
    setEditingDays((prev) => ({ ...prev, [day]: false }));
  };

  const calculateStaffHours = (daysFilter: readonly string[] = DAYS) => {
    const staffStats: Record<string, { coachHrs: number; execHrs: number; total: number; assignedSlots: number }> = {};
    SHARED_EMPLOYEES.forEach(emp => { staffStats[emp] = { coachHrs: 0, execHrs: 0, total: 0, assignedSlots: 0 }; });
    daysFilter.forEach((day) => {
      getTimeSlotsForDay(day).forEach((slot) => {
        const weight = getSlotWeight(day, slot);
        COLUMNS.forEach((col) => {
          const selectedName = selections[`${day}-${slot}-${col.id}`];
          if (selectedName && staffStats[selectedName]) {
            staffStats[selectedName].assignedSlots += 1;
            staffStats[selectedName].total += weight;
            if (col.type === "coach") staffStats[selectedName].coachHrs += weight;
            else if (col.type === "executive") staffStats[selectedName].execHrs += weight;
          }
        });
      });
    });
    return Object.entries(staffStats).map(([name, stats]) => ({ name, ...stats }));
  };

  const SummaryTable = ({ title, data }: { title: string, data: any[] }) => {
    const formatTime = (d: number) => {
      const h = Math.floor(d);
      const m = Math.round((d - h) * 60);
      return { h: h.toString(), m: m.toString().padStart(2, '0') };
    };
    return (
      <div className="mx-auto mt-12 w-full max-w-[95%] overflow-hidden rounded-[15px] border border-[#e0e2e6]/70 bg-white shadow-lg">
        <header className="border-b border-[#e8eaed] bg-white px-8 py-6 text-center">
          <h2 className="m-0 text-[1.4rem] font-semibold text-[#1a1d23]">{title}</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-0 text-[0.9rem]">
            <thead>
              <tr>
                <th className="w-[60px] border border-[#e0e2e6] bg-[#2c3e50] p-4 text-white font-semibold text-center">No.</th>
                <th className="w-[250px] border border-[#e0e2e6] bg-[#2c3e50] p-4 text-white font-semibold text-left">Name</th>
                <th className="w-[240px] border border-[#e0e2e6] bg-[#2c3e50] p-4 text-white font-semibold text-center">Class (Coach)</th>
                <th className="w-[240px] border border-[#e0e2e6] bg-[#2c3e50] p-4 text-white font-semibold text-center">Executive</th>
                <th className="w-[240px] border border-[#e0e2e6] bg-[#2c3e50] p-4 text-white font-semibold text-center">Total (hrs:min)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => {
                const c = formatTime(row.coachHrs);
                const e = formatTime(row.execHrs);
                const t = formatTime(row.total);
                return (
                  <tr key={row.name} className="even:bg-[#fafbfc] hover:bg-[#f0f4f8]">
                    <td className="border border-[#e0e2e6] px-4 py-4 text-center text-slate-900">{index + 1}</td>
                    <td className="border border-[#e0e2e6] px-4 py-4 font-semibold text-slate-900 truncate">{row.name}</td>
                    {[c, e, t].map((time, i) => (
                      <td key={i} className={`border border-[#e0e2e6] px-2 py-4 ${i === 2 ? 'bg-slate-50/50' : ''}`}>
                        <div className="flex flex-row gap-4 items-center justify-center">
                          <div className="flex items-center gap-1">
                            <div className={`w-10 h-8 flex items-center justify-center border rounded bg-white text-sm shadow-sm ${i === 2 ? 'font-bold border-slate-400' : 'font-medium border-slate-300'}`}>{time.h}</div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">hrs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-10 h-8 flex items-center justify-center border rounded bg-white text-sm shadow-sm ${i === 2 ? 'font-bold border-slate-400' : 'font-medium border-slate-300'}`}>{time.m}</div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">min</span>
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (!hasConfirmedBranch) {
    const branches = ["Subang Taipan", "Setia Alam", "Putrajaya", "Ampang", "Cyberjaya", "Klang", "Bandar Baru Bangi", "Shah Alam", "Bandar Rimbayu", "Kajang TTDI Groove", "Online", "Sri Petaling", "Kota Damansara", "Denai Alam", "Danau Kota", "Bandar Tun Hussein Onn", "Eco Grandeur", "Bandar Seri Putra", "Taman Sri Gombak", "Kota Warisan"];
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">Branch Selector</h1>
            <p className="text-gray-500 mt-2">Choose your location to start planning</p>
          </div>
          <div className="space-y-6">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium transition-all"
            >
              <option value="">-- Select a Branch --</option>
              {branches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
            </select>
            <button
              disabled={!selectedBranch}
              onClick={() => setHasConfirmedBranch(true)}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5"
            >
              Continue to Date Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasConfirmedWeek) {
    return (
      <div className="min-h-screen bg-gray-50 relative pt-20">
        <button 
          onClick={() => setHasConfirmedBranch(false)}
          className="absolute top-8 left-8 flex items-center gap-2 text-blue-600 font-bold hover:underline"
        >
          ← Change Branch ({selectedBranch})
        </button>
        <WeekSelector onConfirm={(wd) => {
          router.push(`/manpower-schedule?${wd}`);
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="flex justify-between items-center px-4 py-6">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Manpower Planning</h1>
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-white/30">
                  {selectedBranch}
                </span>
              </div>
              <p className="text-blue-100 mt-1">{weekLabel ? `Schedule for ${weekLabel}` : "Manage assignments"}</p>
            </div>
          </div>
          <UserHeader userName="Admin User" userRole="SUPER_ADMIN" userEmail="admin@ebright.com" />
        </div>
      </header>

      <div className="flex h-[calc(100vh-100px)]">
        <Sidebar sidebarOpen={sidebarOpen} onCollapse={() => setSidebarOpen(false)} />
        
        <div className="flex-1 overflow-y-auto px-8 py-8 bg-gradient-to-br from-[#f0f4f8] to-[#d2dce9]">
          {DAYS.map((day) => {
            const isEditing = !!editingDays[day];
            let currentDayDate = "";
            if (startDateStr) {
              const dayMap: Record<string, number> = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };
              const date = addDays(parseISO(startDateStr), dayMap[day]);
              currentDayDate = format(date, "EEEE, MMMM do");
            }

            return (
              <div key={day} className="mx-auto mb-8 w-full max-w-[95%] overflow-hidden rounded-[15px] border border-gray-200 bg-white shadow-xl">
          <header className="border-b border-gray-100 bg-white px-8 py-6 flex justify-between items-center">
            <div>
              <h1 className="text-[1.5rem] font-semibold text-[#1a1d23]">{day}</h1>
              <p className="text-[0.9rem] text-[#5f6368]">{currentDayDate}</p>
            </div>
            <div className="flex items-center gap-6 text-blue-600 text-xs font-bold uppercase tracking-widest">
              <button onClick={() => clearAllForDay(day)} disabled={!isEditing} className="text-red-500 hover:text-red-700 disabled:opacity-30">Clear All</button>
              <button onClick={() => setShowRestRows(!showRestRows)}>{showRestRows ? 'Hide Rest Times' : 'Show Rest Times'}</button>
            </div>
          </header>

          <div className="w-full overflow-x-auto overflow-y-auto max-h-[70vh]">
            <table className="border-separate border-spacing-0 table-fixed" style={{ width: '2350px' }}>
              <thead className="sticky top-0 z-40 bg-white shadow-sm">
                <tr>
            <th className="sticky left-0 top-0 z-50 w-[250px] bg-[#2c3e50] text-white p-4 text-left border border-slate-600">Time Slot</th>
            {COLUMNS.map((col) => (
              <th key={col.id} className="w-[180px] bg-[#34495e] text-white p-3 border border-slate-600 text-center">
                <div className="flex flex-col items-center justify-between h-full min-h-[50px]">
                  <span className="text-sm font-bold uppercase block">{col.label}</span>
                  <button onClick={() => clearColumnForDay(day, col.id)} disabled={!isEditing} className="mt-1 text-[9px] text-red-300 font-bold uppercase tracking-tighter hover:text-red-500 disabled:opacity-0">[ Clear Column ]</button>
                </div>
              </th>
            ))}
            <th className="w-[300px] bg-[#34495e] text-white p-4 border border-slate-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {getTimeSlotsForDay(day).filter(slot => !isAdminSlot(slot) || showRestRows).map((slot) => {
            const selectedInRow = COLUMNS.map(col => selections[`${day}-${slot}-${col.id}`]).filter(Boolean);
            return (
              <tr key={slot} className={`hover:bg-blue-50/50 ${isAdminSlot(slot) ? 'bg-gray-100' : ''}`}>
                <td className="sticky left-0 z-20 w-[250px] bg-white border border-gray-200 p-4 font-semibold text-slate-700 shadow-[1px_0_0_0_#e2e8f0]">{slot}</td>
                {COLUMNS.map((col) => {
                  const selectedName = selections[`${day}-${slot}-${col.id}`] || "";
                  const selectStyles = selectedName ? (EMPLOYEE_COLORS[selectedName] || "bg-blue-400 text-white shadow-sm font-semibold") : "bg-gray-50 text-gray-400 border-gray-200";
                  const arrow = selectedName ? SELECT_ARROW_WHITE : SELECT_ARROW_DARK;
                  return (
              <td key={col.id} className="p-3 border border-gray-200 w-[180px]">
                <select
                  disabled={!isEditing}
                  value={selectedName}
                  onChange={(e) => handleNameSelect(day, slot, col.id, e.target.value)}
                  className={`w-full appearance-none rounded-md border py-2.5 text-sm text-center outline-none ${selectStyles}`}
                  style={{ backgroundImage: `url("${arrow}")`, backgroundPosition: "right 0.6rem center", backgroundRepeat: "no-repeat", textAlignLast: "center" }}
                >
                  <option value="" className="bg-white text-gray-500 italic">None</option>
                  {SHARED_EMPLOYEES.map(name => {
                    const disabled = selectedInRow.includes(name) && selectedName !== name;
                    return <option key={name} value={name} disabled={disabled} className={disabled ? "text-gray-400 bg-gray-100" : "text-slate-800 bg-white"}>{name}</option>;
                  })}
                </select>
              </td>
                  );
                })}
                <td className="p-3 border border-gray-200 w-[300px]">
                  <textarea disabled={!isEditing} className={`w-full text-sm text-center outline-none bg-transparent placeholder-slate-300 resize-none overflow-y-auto ${!isEditing ? "opacity-50 cursor-not-allowed" : ""}`} rows={2} placeholder="Add notes..." value={notes[`${day}-${slot}-notes`] || ""} onChange={(e) => handleNoteChange(day, slot, e.target.value)} style={{ minHeight: '40px' }} />
                </td>
              </tr>
            );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-6 flex justify-end bg-gray-50 border-t border-gray-100">
            {isEditing ? <button onClick={() => handleSaveDay(day)} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all">Update & Save</button> : <button onClick={() => setEditingDays(p => ({...p, [day]: true}))} className="text-blue-600 font-bold border-2 border-blue-600 px-8 py-2.5 rounded-lg hover:bg-blue-50 transition-all">Edit Schedule</button>}
          </div>
              </div>
            );
          })}
          <SummaryTable title={`Overall Weekly Summary (${weekLabel})`} data={calculateStaffHours()} />
          <SummaryTable title="Weekday Summary (Wed–Fri)" data={calculateStaffHours(WEEKDAY_DAYS)} />
          <SummaryTable title="Weekend Summary (Sat–Sun)" data={calculateStaffHours(["Saturday", "Sunday"])} />
        </div>
      </div>
    </div>
  );
}