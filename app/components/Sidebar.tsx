"use client";

import Link from "next/link";

interface SidebarProps {
  sidebarOpen: boolean;
  onCollapse?: () => void;
}

export default function Sidebar({ sidebarOpen, onCollapse }: SidebarProps) {
  return (
    <aside
      className={`bg-white shadow-lg overflow-hidden transition-all duration-300 flex flex-col ${
        sidebarOpen ? "w-64" : "w-0"
      }`}
    >
      <nav className="p-6 space-y-2 flex-1">
        <Link
          href="/home"
          className="w-full text-left flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors text-gray-700 hover:bg-gray-100 whitespace-nowrap"
        >
          <span>🏠</span>
          <span>Home</span>
        </Link>
      </nav>

      <div className="p-6 border-t border-gray-200">
        <button
          onClick={onCollapse}
          className="w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          ✕ Hide Sidebar
        </button>
      </div>
    </aside>
  );
}
