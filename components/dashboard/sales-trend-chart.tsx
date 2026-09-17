"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatMoney } from "@/lib/money";

export function SalesTrendChart({ data }: { data: { date: string; amountMinor: number }[] }) {
  const chartData = data.map((d) => ({
    label: new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" }),
    amount: d.amountMinor / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C98A2C" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#C98A2C" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7DFD0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          formatter={(value) => formatMoney(Math.round(Number(value ?? 0) * 100))}
          contentStyle={{ borderRadius: 8, border: "1px solid #E7DFD0", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="amount" stroke="#C98A2C" strokeWidth={2} fill="url(#salesFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
