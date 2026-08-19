import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sipnow_sb_col") === "1",
  );

  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem("sipnow_sb_col", v ? "0" : "1");
      return !v;
    });
  }

  return (
    <div className="flex h-screen bg-gray-50/60 overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
