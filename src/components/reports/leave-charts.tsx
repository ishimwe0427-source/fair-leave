"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  BarChart,
} from "recharts";

const COLORS = ["#d32f2f", "#0369a1", "#0f766e", "#b45309", "#7c3aed", "#52525b", "#047857", "#be123c"];

export function LeaveCharts({
  byType,
  byMonth,
  byDept = [],
  growth = [],
}: {
  byType: { name: string; value: number }[];
  byMonth: { name: string; days: number }[];
  byDept?: { name: string; days: number }[];
  growth?: { name: string; days: number; cumulative: number }[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="animate-rise rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h3 className="font-display text-lg font-semibold">Leave days by type</h3>
        <p className="text-sm text-muted-foreground">Share of approved leave volume</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byType}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={100}
                paddingAngle={2}
                label
              >
                {byType.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="animate-rise rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h3 className="font-display text-lg font-semibold">Monthly leave volume</h3>
        <p className="text-sm text-muted-foreground">Days taken each month</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="days" fill="var(--primary, #d32f2f)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="animate-rise rounded-2xl border border-border bg-white p-5 shadow-sm xl:col-span-2">
        <h3 className="font-display text-lg font-semibold">Leave growth (cumulative days)</h3>
        <p className="text-sm text-muted-foreground">
          Running total of leave days through the year — useful for capacity planning
        </p>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={growth}>
              <defs>
                <linearGradient id="leaveGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary, #d32f2f)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary, #d32f2f)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="days" name="Month days" fill="#0369a1" opacity={0.45} radius={[4, 4, 0, 0]} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Cumulative days"
                stroke="var(--primary, #d32f2f)"
                fill="url(#leaveGrowth)"
                strokeWidth={2.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {byDept.length ? (
        <div className="animate-rise rounded-2xl border border-border bg-white p-5 shadow-sm xl:col-span-2">
          <h3 className="font-display text-lg font-semibold">Leave by department</h3>
          <p className="text-sm text-muted-foreground">Where leave load concentrates</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDept} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="days" fill="#0f766e" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
