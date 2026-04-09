import { AlertTriangle, BarChart3, LayoutDashboard, LogOut, Users } from "lucide-react";

export default function TeacherSidebar({ active, onSelect, onLogout }) {
  const items = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "students", label: "Students", icon: Users },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "alerts", label: "Alerts", icon: AlertTriangle }
  ];

  return (
    <aside className="card h-fit p-4 lg:sticky lg:top-6">
      <div className="mb-4 rounded-xl bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-500 p-3 text-white">
        <p className="text-xs uppercase tracking-[0.18em] text-blue-100">EduSense</p>
        <p className="text-sm font-semibold">Teacher Panel</p>
      </div>
      <div className="space-y-2">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
              active === key
                ? "bg-gradient-to-r from-brand-600 to-cyan-500 text-white shadow-md"
                : "bg-slate-100/80 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      <button
        onClick={onLogout}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  );
}