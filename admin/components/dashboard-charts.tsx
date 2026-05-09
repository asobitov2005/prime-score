"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminDashboardOverview } from "@/lib/types";

const CHART_COLORS = {
  primary: "#8b5cf6",
  blue: "#3b82f6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#ef4444",
};

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
  fontSize: 12,
};

export function RevenueTrendChart({ data }: { data: AdminDashboardOverview["revenueTrend"] }) {
  if (data.length === 0) return <EmptyChart message="No revenue data yet." />;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} interval={4} />
          <YAxis tickLine={false} axisLine={false} fontSize={10} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [Number(v).toLocaleString(), "Revenue"]} />
          <Area type="monotone" dataKey="value" stroke={CHART_COLORS.emerald} strokeWidth={2} fill="url(#revGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RegistrationTrendChart({ data }: { data: AdminDashboardOverview["registrationTrend"] }) {
  if (data.length === 0) return <EmptyChart message="No registration data yet." />;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} interval={4} />
          <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [String(v), "New Users"]} />
          <Line type="monotone" dataKey="value" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 2, fill: CHART_COLORS.blue }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AttemptsByDayChart({ data }: { data: AdminDashboardOverview["attemptsByDay"] }) {
  if (data.length === 0) return <EmptyChart message="No attempt data yet." />;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} interval={4} />
          <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [String(v), "Attempts"]} />
          <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TypeSplitChart({ data }: { data: AdminDashboardOverview["typeSplit"] }) {
  if (!data || (data.reading === 0 && data.listening === 0)) return <EmptyChart message="No type data yet." />;
  const pieData = [
    { name: "Reading", value: data.reading, color: CHART_COLORS.blue },
    { name: "Listening", value: data.listening, color: CHART_COLORS.emerald },
  ];
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-[170px] w-full max-w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" strokeWidth={0}>
              {pieData.map((e) => (
                <Cell key={e.name} fill={e.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown, n: unknown) => [`${v} attempts`, String(n)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4">
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-xs font-bold text-muted-foreground">{d.name}</span>
            <span className="text-xs font-black text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BandDistributionChart({ data }: { data: AdminDashboardOverview["bandDistribution"] }) {
  if (data.length === 0) return <EmptyChart message="No band distribution data yet." />;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="band" tickLine={false} axisLine={false} fontSize={10} />
          <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [String(v), "Tests"]} />
          <Bar dataKey="count" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentSplitChart({ data }: { data: AdminDashboardOverview["paymentMethodSplit"] }) {
  if (data.length === 0) return <EmptyChart message="No payment data yet." />;
  const colors = [CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.emerald, CHART_COLORS.amber, CHART_COLORS.rose];
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-[170px] w-full max-w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" strokeWidth={0}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown, n: unknown) => [`${v} payments`, String(n)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatusSplitChart({ data }: { data: AdminDashboardOverview["attemptStatusSplit"] }) {
  if (data.length === 0) return <EmptyChart message="No attempt data yet." />;
  const colors = [CHART_COLORS.emerald, CHART_COLORS.amber, CHART_COLORS.blue, CHART_COLORS.rose, CHART_COLORS.primary];
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-[170px] w-full max-w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" strokeWidth={0}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown, n: unknown) => [`${v} tests`, String(n)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{d.label}</span>
          </div>
        ))}
      </div>
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
