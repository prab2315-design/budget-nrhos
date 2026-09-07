import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TriangleAlert } from "lucide-react";
import { formatCurrency, formatCurrencyFull } from "@/lib/format";

interface BarChartDataPoint {
  name: string;
  แผนรายรับ: number;
  ผลรายรับจริง: number;
  แผนรายจ่าย: number;
  ผลรายจ่ายจริง: number;
}

interface BarChartVerticalProps {
  data: BarChartDataPoint[];
  title: string;
  barCategoryGap?: string | number;
}

/* ─── helpers ─────────────────────────────────────────────── */

function hasAlert(d: BarChartDataPoint): boolean {
  return d.ผลรายจ่ายจริง > d.ผลรายรับจริง;
}

function ratioOf(d: BarChartDataPoint): number | null {
  if (d.ผลรายรับจริง <= 0) return null;
  return (d.ผลรายจ่ายจริง / d.ผลรายรับจริง) * 100;
}

/* ─── tooltip ─────────────────────────────────────────────── */

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
  const findVal = (key: string) =>
    payload.find((p) => p.name === key)?.value ?? 0;
  const inc = findVal("ผลรายรับจริง");
  const exp = findVal("ผลรายจ่ายจริง");
  const ratio = inc > 0 ? (exp / inc) * 100 : null;
  const over = exp > inc;

  return (
    <div className="glass-card min-w-[230px] p-3 text-sm shadow-lg">
      <p className="mb-2 font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <div
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="ml-auto pl-4 font-medium text-foreground">
            {formatCurrencyFull(entry.value)}
          </span>
        </div>
      ))}
      <div className="mt-2 border-t border-black/10 pt-1.5">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">สัดส่วน รายจ่าย/รายรับ:</span>
          <span
            className={`ml-auto font-semibold ${
              over ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {ratio === null ? "—" : `${ratio.toFixed(2)}%`}
          </span>
        </div>
        {over && (
          <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-1 font-semibold text-red-600">
            <TriangleAlert className="size-3.5 shrink-0" />
            รายจ่ายสูงกว่ารายรับ
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── x-axis tick (red for months where expenses exceed income) ─── */

function AlertAxisTick({
  x,
  y,
  payload,
  alertMonths,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  alertMonths: Set<string>;
}) {
  if (!payload) return null;
  const isAlert = alertMonths.has(payload.value);
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fontSize={12}
        fontWeight={isAlert ? 700 : 400}
        fill={isAlert ? "#dc2626" : "rgba(15,23,42,0.55)"}
      >
        {payload.value}
      </text>
      {isAlert && (
        <text x={0} y={-4} textAnchor="middle" fontSize={10} fill="#dc2626">
          ▲
        </text>
      )}
    </g>
  );
}

/* ─── component ───────────────────────────────────────────── */

export function BarChartVertical({
  data,
  title,
  barCategoryGap = "30%",
}: BarChartVerticalProps) {
  const alertMonths = new Set(data.filter(hasAlert).map((d) => d.name));

  const totalInc = data.reduce((s, d) => s + d.ผลรายรับจริง, 0);
  const totalExp = data.reduce((s, d) => s + d.ผลรายจ่ายจริง, 0);
  const totalRatio = totalInc > 0 ? (totalExp / totalInc) * 100 : null;
  const totalOver = totalExp > totalInc;

  return (
    <div className="glass-card p-5">
      <div className="mb-2 flex items-start gap-2">
        <h3 className="text-base font-bold leading-snug tracking-tight text-foreground">
          {title}
        </h3>
        <span
          className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            totalOver
              ? "border-red-500/30 bg-red-500/10 text-red-700"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
          }`}
        >
          รายจ่าย/รายรับ {totalRatio === null ? "—" : `${totalRatio.toFixed(1)}%`}
        </span>
      </div>

      {alertMonths.size > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-red-600" />
          <p className="text-xs leading-snug text-red-700">
            <span className="font-bold">เดือนที่มีรายจ่ายสูงกว่ารายรับ:</span>{" "}
            {data.filter(hasAlert).map((d) => d.name).join(", ")}
          </p>
        </div>
      )}

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            barCategoryGap={barCategoryGap}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(15,23,42,0.08)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={(props) => (
                <AlertAxisTick {...props} alertMonths={alertMonths} />
              )}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(val) => formatCurrency(val)}
              tick={{ fontSize: 12, fill: "rgba(15,23,42,0.55)" }}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
            />
            <Bar
              dataKey="แผนรายรับ"
              fill="#15803d"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
            <Bar
              dataKey="ผลรายรับจริง"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
            <Bar
              dataKey="แผนรายจ่าย"
              fill="#c2410c"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
            <Bar
              dataKey="ผลรายจ่ายจริง"
              fill="#fb923c"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}