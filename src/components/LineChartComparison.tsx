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
import { formatCurrency } from "@/lib/format";

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
          <span className="font-medium text-foreground">
            {formatCurrency(entry.value)}
          </span>
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
              stroke="rgba(15,23,42,0.08)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "rgba(15,23,42,0.55)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(val) => formatCurrency(val)}
              tick={{ fontSize: 11, fill: "rgba(15,23,42,0.55)" }}
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
              stroke="#15803d"
              strokeWidth={2}
              dot={{ r: 3, fill: "#15803d" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="แผนรายจ่าย"
              stroke="#c2410c"
              strokeWidth={2}
              dot={{ r: 3, fill: "#c2410c" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="รายรับจริง"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3, fill: "#22c55e" }}
              activeDot={{ r: 5 }}
              strokeDasharray="6 3"
            />
            <Line
              type="monotone"
              dataKey="รายจ่ายจริง"
              stroke="#fb923c"
              strokeWidth={2}
              dot={{ r: 3, fill: "#fb923c" }}
              activeDot={{ r: 5 }}
              strokeDasharray="6 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
