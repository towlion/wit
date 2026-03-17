"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AdminDashboard } from "@/lib/types";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);

  useEffect(() => {
    api.get<AdminDashboard>("/admin/dashboard").then(setData);
  }, []);

  if (!data) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 skeleton mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: data.total_users, color: "from-indigo-500 to-violet-500" },
    { label: "Active Users", value: data.active_users, color: "from-emerald-500 to-teal-500" },
    { label: "Workspaces", value: data.total_workspaces, color: "from-amber-500 to-orange-500" },
    { label: "Work Items", value: data.total_items, color: "from-sky-500 to-blue-500" },
    { label: "Signups (7d)", value: data.signups_last_7d, color: "from-pink-500 to-rose-500" },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-surface p-4 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${stat.color}`} />
            <div className="text-2xl font-bold tracking-tight mt-1">{stat.value.toLocaleString()}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
