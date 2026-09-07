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
    <div className="glass-card p-3 text-sm shadow-lg">
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
          <p className="text-xs font-medium text-muted-foreground">
            ส่วนต่าง{isIncome ? "รายรับ" : "รายจ่าย"}
          </p>
          <p className="mt-0.5 text-base font-semibold text-foreground">—</p>
        </div>
        <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-muted-foreground">
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
            "mt-0.5 text-base font-semibold",
            good ? "text-emerald-600" : "text-orange-600",
          )}
        >
          {diff >= 0 ? "+" : "−"}
          {Math.abs(diff).toFixed(2)}%
        </p>
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium",
          good
            ? "bg-emerald-500/15 text-emerald-700"
            : "bg-orange-500/15 text-orange-700",
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
    { name: "แผนรายรับ", value: planIncome, fill: "#15803d" },
    { name: "รายรับสะสม", value: actualIncome, fill: "#22c55e" },
    { name: "แผนรายจ่าย", value: planExpense, fill: "#ea580c" },
    { name: "รายจ่ายสะสม", value: actualExpense, fill: "#fb923c" },
  ];

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="section-num section-num--blue">2ก</span>
        <h3 className="text-base font-bold tracking-tight text-foreground">
          เปรียบเทียบแผนกับยอดจริงสะสม
        </h3>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 24, right: 20, left: 10, bottom: 5 }}
            barCategoryGap="30%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(15,23,42,0.08)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "rgba(15,23,42,0.55)" }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              tickFormatter={(val) => formatCurrency(val)}
              tick={{ fontSize: 12, fill: "rgba(15,23,42,0.55)" }}
              tickLine={false}
              axisLine={false}
              width={90}
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
                style={{ fontSize: 12, fill: "rgba(15,23,42,0.8)" }}
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