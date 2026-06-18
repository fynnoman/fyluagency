"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatMoney } from "@/lib/format";

export default function RevenueChart({
  data,
}: {
  data: { label: string; total: number; net: number }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F172A" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#0F172A" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E5E5E0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#9CA3AF"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#9CA3AF"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: "#9CA3AF", strokeDasharray: "3 3" }}
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #E5E5E0",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={((value: unknown, name: unknown) => [
              formatMoney(Number(value)),
              String(name) === "total" ? "Brutto" : "Netto",
            ]) as never}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#0F172A"
            strokeWidth={2}
            fill="url(#rev)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
