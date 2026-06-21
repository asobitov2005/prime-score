"use client";

import type { MouseEvent } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatTrendBandValue,
  trendPointToChartValue,
  type DashboardTrendPoint,
} from "@/lib/dashboard-trend";

const TOOLTIP_STYLE = {
  border: "1px solid #E5E7EB",
  borderRadius: 14,
  boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
};

interface DashboardTrendLineChartProps {
  points: DashboardTrendPoint[];
  seriesLabel: string;
  strokeColor?: string;
  variant?: "full" | "compact";
  height?: number;
  stopCardClick?: boolean;
}

function buildChartData(points: DashboardTrendPoint[], variant: "full" | "compact") {
  return points.map((point) => ({
    date: variant === "compact" ? point.shortLabel : point.label,
    dateLabel: point.dateLabel,
    band: trendPointToChartValue(point.value),
  }));
}

function formatTooltipLabel(label: string, points: DashboardTrendPoint[], variant: "full" | "compact") {
  const matched = points.find((point) => (variant === "compact" ? point.shortLabel : point.label) === label);
  return matched?.dateLabel ?? label;
}

function CompactAxisTick({
  x = 0,
  y = 0,
  payload,
  index = 0,
  total,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  index?: number;
  total: number;
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const textAnchor = isFirst ? "start" : isLast ? "end" : "middle";

  return (
    <text
      x={x}
      y={y + 12}
      fill="#64748B"
      fontSize={9}
      fontWeight={700}
      textAnchor={textAnchor}
    >
      {payload?.value}
    </text>
  );
}

export function DashboardTrendLineChart({
  points,
  seriesLabel,
  strokeColor = "#F97316",
  variant = "full",
  height,
  stopCardClick = false,
}: DashboardTrendLineChartProps) {
  const data = buildChartData(points, variant);
  const chartHeight = height ?? (variant === "full" ? 132 : 50);

  const stopInteraction = stopCardClick
    ? (event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
      }
    : undefined;

  if (variant === "compact") {
    return (
      <div
        className="h-full w-full overflow-visible"
        onClick={stopInteraction}
        onMouseDown={stopInteraction}
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EEF2F7" strokeOpacity={0.75} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              interval={0}
              minTickGap={0}
              padding={{ left: 0, right: 0 }}
              tick={(props) => <CompactAxisTick {...props} total={data.length} />}
            />
            <YAxis hide domain={[0, 9]} width={0} />
            <Tooltip
              formatter={(value, name) => [formatTrendBandValue(Number(value)), String(name)]}
              labelFormatter={(label) => formatTooltipLabel(String(label), points, variant)}
              contentStyle={TOOLTIP_STYLE}
            />
            <Line
              type="monotone"
              dataKey="band"
              name={seriesLabel}
              stroke={strokeColor}
              strokeWidth={2.2}
              dot={{ r: 2.2, fill: "#FFFFFF", stroke: strokeColor, strokeWidth: 1.2 }}
              activeDot={{ r: 4, fill: strokeColor, stroke: "#FFFFFF", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 2 }}>
          <CartesianGrid vertical={false} stroke="#EEF2F7" />
          <XAxis
            dataKey="date"
            padding={{ left: 20, right: 16 }}
            tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            minTickGap={0}
          />
          <YAxis
            domain={[0, 9]}
            ticks={[0, 3, 6, 9]}
            width={34}
            tickFormatter={(value) => Number(value).toFixed(1)}
            tick={{ fill: "#64748B", fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [formatTrendBandValue(Number(value)), String(name)]}
            labelFormatter={(label) => formatTooltipLabel(String(label), points, variant)}
            contentStyle={TOOLTIP_STYLE}
          />
          <Line
            type="monotone"
            dataKey="band"
            name={seriesLabel}
            stroke={strokeColor}
            strokeWidth={3}
            dot={{ r: 3.8, fill: strokeColor, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: strokeColor, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
