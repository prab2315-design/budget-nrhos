import { useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getThaiMonth, toBuddhistYear } from "@/lib/format";

interface DatePickerRangeProps {
  startMonth: number; // 1-12
  startYear: number; // CE year
  endMonth: number;
  endYear: number;
  onChange: (range: {
    startMonth: number;
    startYear: number;
    endMonth: number;
    endYear: number;
  }) => void;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: getThaiMonth(i + 1),
}));

export function DatePickerRange({
  startMonth,
  startYear,
  endMonth,
  endYear,
  onChange,
}: DatePickerRangeProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Generate year options (2020-2030 in CE)
  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i);

  function updateStart(
    field: "month" | "year",
    value: number
  ) {
    const updates: Record<string, number> = {};
    updates[`start${field === "month" ? "Month" : "Year"}`] = value;
    onChange({
      startMonth: field === "month" ? value : startMonth,
      startYear: field === "year" ? value : startYear,
      endMonth,
      endYear,
    });
  }

  function updateEnd(
    field: "month" | "year",
    value: number
  ) {
    onChange({
      startMonth,
      startYear,
      endMonth: field === "month" ? value : endMonth,
      endYear: field === "year" ? value : endYear,
    });
  }

  const displayText = `${getThaiMonth(startMonth)} ${toBuddhistYear(startYear)} - ${getThaiMonth(endMonth)} ${toBuddhistYear(endYear)}`;

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        ช่วงเวลา
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "glass-input flex min-h-[36px] w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-all",
          "hover:border-primary/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
          isOpen && "border-primary/40 ring-2 ring-primary/10"
        )}
      >
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm">{displayText}</span>
      </button>

      {isOpen && (
        <div className="glass-card absolute z-50 mt-1 w-[340px] p-4 shadow-lg">
          <div className="space-y-3">
            {/* Start date */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                จาก
              </p>
              <div className="flex gap-2">
                <select
                  value={startMonth}
                  onChange={(e) =>
                    updateStart("month", parseInt(e.target.value))
                  }
                  className="glass-input flex-1 px-2 py-1.5 text-sm outline-none"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={startYear}
                  onChange={(e) =>
                    updateStart("year", parseInt(e.target.value))
                  }
                  className="glass-input flex-1 px-2 py-1.5 text-sm outline-none"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      พ.ศ. {toBuddhistYear(y)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* End date */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                ถึง
              </p>
              <div className="flex gap-2">
                <select
                  value={endMonth}
                  onChange={(e) =>
                    updateEnd("month", parseInt(e.target.value))
                  }
                  className="glass-input flex-1 px-2 py-1.5 text-sm outline-none"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={endYear}
                  onChange={(e) =>
                    updateEnd("year", parseInt(e.target.value))
                  }
                  className="glass-input flex-1 px-2 py-1.5 text-sm outline-none"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      พ.ศ. {toBuddhistYear(y)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-lg bg-primary py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
