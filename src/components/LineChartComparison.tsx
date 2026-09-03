import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, truncateText } from "@/lib/format";

interface ChartDataPoint {
  month: string;
  แผนรายรับ: number;
  แผนรายจ่าย: number;
  รายรับจริง: number;
  รายจ่ายจริง: number;
}

interface LineChartComparisonProps {
  data: ChartDataPoint[];
  title: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs shadow-lg">
      <p className="mb-2 font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <div
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function LineChartComparison({
  data,
  title,
}: LineChartComparisonProps) {
  return (
    <div className="glass-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.9 0.01 240)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "oklch(0.48 0.02 260)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(val) => formatCurrency(val)}
              tick={{ fontSize: 11, fill: "oklch(0.48 0.02 260)" }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Line
              type="monotone"
              dataKey="แผนรายรับ"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: "#3b82f6" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="แผนรายจ่าย"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: "#f59e0b" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="รายรับจริง"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: "#10b981" }}
              activeDot={{ r: 5 }}
              strokeDasharray="6 3"
            />
            <Line
              type="monotone"
              dataKey="รายจ่ายจริง"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={{ r: 3, fill: "#f43f5e" }}
              activeDot={{ r: 5 }}
              strokeDasharray="6 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
