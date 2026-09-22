"use client";

import type { MouseEvent } from "react";
import { formatTrendBandValue, type DashboardTrendPoint } from "@/lib/dashboard-trend";

interface DashboardTrendLineChartProps {
  points: DashboardTrendPoint[];
  seriesLabel: string;
  strokeColor?: string;
  variant?: "full" | "compact";
  height?: number;
  stopCardClick?: boolean;
}

interface ChartCoordinate {
  x: number;
  y: number;
  point: DashboardTrendPoint;
}

function getCoordinates(points: DashboardTrendPoint[], compact: boolean, chartHeight: number): ChartCoordinate[] {
  const top = compact ? 4 : 10;
  const bottom = compact ? 16 : 23;
  const left = compact ? 5 : 34;
  const right = compact ? 5 : 10;
  const plotWidth = 360 - left - right;
  const plotHeight = chartHeight - top - bottom;

  return points.flatMap((point, index) => {
    if (point.value === null) return [];
    return [{
      x: left + (points.length > 1 ? (index / (points.length - 1)) * plotWidth : plotWidth / 2),
      y: top + ((9 - point.value) / 9) * plotHeight,
      point,
    }];
  });
}

function getLineSegments(points: DashboardTrendPoint[], compact: boolean, chartHeight: number): string[] {
  const coords = getCoordinates(points, compact, chartHeight);
  const segments: string[] = [];
  let current: ChartCoordinate[] = [];
  let coordinateIndex = 0;

  points.forEach((point) => {
    const coordinate = point.value === null ? null : coords[coordinateIndex++];
    if (!coordinate) {
      if (current.length > 1) segments.push(current.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" "));
      current = [];
      return;
    }
    current.push(coordinate);
  });

  if (current.length > 1) segments.push(current.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" "));
  return segments;
}

export function DashboardTrendLineChart({
  points,
  seriesLabel,
  strokeColor = "#F97316",
  variant = "full",
  height,
  stopCardClick = false,
}: DashboardTrendLineChartProps) {
  const compact = variant === "compact";
  const chartHeight = height ?? (compact ? 50 : 132);
  const coordinates = getCoordinates(points, compact, chartHeight);
  const segments = getLineSegments(points, compact, chartHeight);
  const top = compact ? 4 : 10;
  const bottom = compact ? 16 : 23;
  const plotHeight = chartHeight - top - bottom;
  const left = compact ? 5 : 34;
  const right = compact ? 5 : 10;
  const plotWidth = 360 - left - right;
  const stopInteraction = stopCardClick
    ? (event: MouseEvent<HTMLDivElement>) => event.stopPropagation()
    : undefined;

  return (
    <div className="h-full w-full" onClick={stopInteraction} onMouseDown={stopInteraction}>
      <svg
        className="h-full w-full overflow-visible"
        viewBox={`0 0 360 ${chartHeight}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${seriesLabel} band trend`}
      >
        <title>{`${seriesLabel} band trend`}</title>
        {(compact ? [3, 6] : [0, 3, 6, 9]).map((band) => {
          const y = top + ((9 - band) / 9) * plotHeight;
          return (
            <g key={band}>
              <line x1={left} x2={left + plotWidth} y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-800" strokeOpacity={compact ? 0.7 : 1} />
              {!compact && (
                <text x={left - 5} y={y + 3} textAnchor="end" className="fill-slate-500 dark:fill-slate-400" fontSize="10">
                  {band.toFixed(1)}
                </text>
              )}
            </g>
          );
        })}
        {segments.map((segment, index) => (
          <path key={index} d={segment} fill="none" stroke={strokeColor} strokeWidth={compact ? 2.2 : 3} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {coordinates.map(({ x, y, point }, index) => (
          <circle key={`${point.label}-${index}`} cx={x} cy={y} r={compact ? 2.5 : 3.6} fill={strokeColor}>
            <title>{`${point.dateLabel}: ${formatTrendBandValue(point.value)}`}</title>
          </circle>
        ))}
        {points.map((point, index) => {
          const x = left + (points.length > 1 ? (index / (points.length - 1)) * plotWidth : plotWidth / 2);
          const label = compact ? point.shortLabel : point.label;
          return (
            <text
              key={`${label}-${index}`}
              x={x}
              y={chartHeight - 2}
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              className="fill-slate-500 dark:fill-slate-400"
              fontSize={compact ? 8 : 10}
              fontWeight="700"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
