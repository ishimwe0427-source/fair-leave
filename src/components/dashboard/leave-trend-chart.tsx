"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function LeaveTrendChart({
  data,
}: {
  data: Array<{ month: string; approved: number; denied: number; pending: number }>;
}) {
  if (!data.length) {
    return (
      <div className="app-panel p-6 text-sm text-muted-foreground">
        Not enough leave history yet for trend charts.
      </div>
    );
  }

  return (
    <div className="app-panel p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold">Leave request trends</h2>
        <p className="text-sm text-muted-foreground">
          Approved vs denied/cancelled vs still pending by month
        </p>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="approved" fill="#047857" radius={[6, 6, 0, 0]} />
            <Bar dataKey="denied" fill="#b91c1c" radius={[6, 6, 0, 0]} />
            <Bar dataKey="pending" fill="#d97706" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
