"use client";

import { useState } from "react";
import { DateRange, RangeKeyDict } from "react-date-range";
import { format, startOfWeek, endOfWeek } from "date-fns";
import "react-date-range/dist/styles.css"; 
import "react-date-range/dist/theme/default.css"; 

interface WeekSelectorProps {
  onConfirm: (weekData: string) => void;
}

export default function WeekSelector({ onConfirm }: WeekSelectorProps) {
  const [range, setRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  const handleConfirm = () => {
    const { startDate, endDate } = range[0];
    if (!startDate || !endDate) return;
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");
    onConfirm(`start=${start}&end=${end}`);
  };

  return (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
    <div className="w-full max-w-lg bg-white p-6 rounded shadow">
      <h1 className="text-xl font-semibold mb-4">Select a Week</h1>
      
      {/* 1. Wrap the DateRange in a flex container */}
      <div className="flex justify-center w-full overflow-hidden">
        <DateRange
          onChange={(item: RangeKeyDict) => {
            const selection = item.selection;
            if (selection.startDate) {
              const start = startOfWeek(selection.startDate, { weekStartsOn: 1 }); 
              const end = endOfWeek(selection.startDate, { weekStartsOn: 1 });

              setRange([{
                startDate: start,
                endDate: end,
                key: "selection",
              }]);
            }
          }}
          moveRangeOnFirstSelection={true}
          ranges={range}
          rangeColors={["#3b82f6"]}
          months={1}
          direction="horizontal"
          // 2. Add this className to ensure the internal wrapper doesn't have forced margins
          className="border-none" 
        />
      </div>

      <button
        disabled={!range[0].startDate || !range[0].endDate}
        onClick={handleConfirm}
        className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-bold"
      >
        Confirm Week: {format(range[0].startDate, "MMM d")} – {format(range[0].endDate, "MMM d, yyyy")}
      </button>
    </div>
  </div>
);
}