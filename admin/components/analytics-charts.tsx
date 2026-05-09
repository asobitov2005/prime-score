"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
  fontSize: 12,
};

export function DauTrendChart({ data }: { data: { date: string; value: number }[] }) {
  if (data.length === 0) return <EmptyChart message="No DAU trend data yet." />;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} interval={4} />
          <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [String(v), "Active Users"]} />
          <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill="url(#dauGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HourlyDistributionChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return <EmptyChart message="No hourly data yet." />;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={9} interval={2} />
          <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [String(v), "Attempts"]} />
          <Bar dataKey="value" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeekdayActivityChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return <EmptyChart message="No weekday data yet." />;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
          <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [String(v), "Attempts"]} />
          <Bar dataKey="value" fill="#10b981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[140px] items-center justify-center rounded-xl border border-dashed border-border">
      <p className="text-xs font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
