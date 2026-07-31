"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export type NamedDatum = { name: string; value: number; fill: string };
export type TrendDatum = {
  month: string;
  "В роботі": number;
  Зараховано: number;
  Відмови: number;
};

const axisStyle = { fontSize: 12, fill: "var(--ink-faint)" };
const tooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  fontSize: 13,
  color: "var(--ink)",
};

export function DistributionPie({ data }: { data: NamedDatum[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} stroke="var(--surface)" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data }: { data: TrendDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="month" tick={axisStyle} stroke="var(--border-strong)" />
        <YAxis allowDecimals={false} tick={axisStyle} stroke="var(--border-strong)" width={28} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)" }} />
        <Bar dataKey="В роботі" fill="#64748b" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Зараховано" fill="#22c55e" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Відмови" fill="#ef4444" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-ink-faint">
      Немає даних за цей період
    </div>
  );
}
