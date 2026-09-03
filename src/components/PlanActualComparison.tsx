import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyFull } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PlanActualComparisonProps {
  planIncome: number;
  planExpense: number;
  actualIncome: number;
  actualExpense: number;
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
            {formatCurrencyFull(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

function DiffChip({
  title,
  diff,
}: {
  title: string;
  diff: number | null;
}) {
  const isIncome = title === "รายรับ";
  if (diff === null) {
    return (
      <div className="glass-card-subtle flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">
            ส่วนต่าง{isIncome ? "รายรับ" : "รายจ่าย"}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">—</p>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          ไม่มีข้อมูลแผน
        </span>
      </div>
    );
  }

  const over = diff >= 0;
  // Income over plan is good; expense over plan is bad
  const good = isIncome ? over : !over;
  const label = over ? "เกินแผน" : "ต่ำกว่าแผน";

  return (
    <div className="glass-card-subtle flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-[11px] font-medium text-muted-foreground">
          ส่วนต่าง{isIncome ? "รายรับ" : "รายจ่าย"}
        </p>
        <p
          className={cn(
            "mt-0.5 text-sm font-semibold",
            good ? "text-emerald-400" : "text-rose-400",
          )}
        >
          {diff >= 0 ? "+" : "−"}
          {Math.abs(diff).toFixed(2)}%
        </p>
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[10px] font-medium",
          good
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-rose-500/15 text-rose-400",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function PlanActualComparison({
  planIncome,
  planExpense,
  actualIncome,
  actualExpense,
}: PlanActualComparisonProps) {
  const incomeDiff =
    planIncome !== 0 ? ((actualIncome - planIncome) / planIncome) * 100 : null;
  const expenseDiff =
    planExpense !== 0
      ? ((actualExpense - planExpense) / planExpense) * 100
      : null;

  const data = [
    { name: "แผนรายรับ", value: planIncome, fill: "#60a5fa" },
    { name: "รายรับสะสม", value: actualIncome, fill: "#34d399" },
    { name: "แผนรายจ่าย", value: planExpense, fill: "#fbbf24" },
    { name: "รายจ่ายสะสม", value: actualExpense, fill: "#fb7185" },
  ];

  return (
    <div className="glass-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        เปรียบเทียบแผนกับยอดจริงสะสม
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 24, right: 20, left: 10, bottom: 5 }}
            barCategoryGap="30%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              tickFormatter={(val) => formatCurrency(val)}
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={72}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(value: number | string) =>
                  formatCurrency(Number(value))
                }
                style={{ fontSize: 11, fill: "rgba(255,255,255,0.85)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DiffChip title="รายรับ" diff={incomeDiff} />
        <DiffChip title="รายจ่าย" diff={expenseDiff} />
      </div>
    </div>
  );
}