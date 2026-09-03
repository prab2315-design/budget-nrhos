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
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(val) => formatCurrency(val)}
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
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
              stroke="#60a5fa"
              strokeWidth={2}
              dot={{ r: 3, fill: "#60a5fa" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="แผนรายจ่าย"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={{ r: 3, fill: "#fbbf24" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="รายรับจริง"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ r: 3, fill: "#34d399" }}
              activeDot={{ r: 5 }}
              strokeDasharray="6 3"
            />
            <Line
              type="monotone"
              dataKey="รายจ่ายจริง"
              stroke="#fb7185"
              strokeWidth={2}
              dot={{ r: 3, fill: "#fb7185" }}
              activeDot={{ r: 5 }}
              strokeDasharray="6 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
