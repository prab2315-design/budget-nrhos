import { useState, useRef, useEffect } from "react";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuarterRange {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
}

export const QUARTER_RANGES: Record<string, QuarterRange> = {
  Q1: { startMonth: 10, startYear: 2025, endMonth: 12, endYear: 2025 },
  Q2: { startMonth: 1, startYear: 2026, endMonth: 3, endYear: 2026 },
  Q3: { startMonth: 4, startYear: 2026, endMonth: 6, endYear: 2026 },
  Q4: { startMonth: 7, startYear: 2026, endMonth: 9, endYear: 2026 },
};

const QUARTER_OPTIONS = [
  { id: "Q1", label: "ไตรมาสที่ 1 (ต.ค. 68 - ธ.ค. 68)" },
  { id: "Q2", label: "ไตรมาสที่ 2 (ม.ค. 69 - มี.ค. 69)" },
  { id: "Q3", label: "ไตรมาสที่ 3 (เม.ย. 69 - มิ.ย. 69)" },
  { id: "Q4", label: "ไตรมาสที่ 4 (ก.ค. 69 - ก.ย. 69)" },
];

interface QuarterFilterProps {
  selected: string | null;
  onChange: (quarter: string | null) => void;
}

export function QuarterFilter({ selected, onChange }: QuarterFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedLabel =
    QUARTER_OPTIONS.find((q) => q.id === selected)?.label ?? null;

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        รายไตรมาส
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "glass-input flex min-h-[36px] w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-all",
          "hover:border-primary/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
          isOpen && "border-primary/40 ring-2 ring-primary/10",
          selected && "border-primary/30"
        )}
      >
        <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "truncate text-sm",
            selected ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {selectedLabel ?? "ทั้งหมด (ทุกไตรมาส)"}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto size-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="glass-card absolute z-50 mt-1 w-full overflow-hidden shadow-lg">
          <div className="overflow-y-auto max-h-64 p-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                "hover:bg-black/5",
                !selected && "bg-primary/10"
              )}
            >
              <div
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  !selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-black/20"
                )}
              >
                {!selected && <Check className="size-3" />}
              </div>
              <span>ทั้งหมด (ทุกไตรมาส)</span>
            </button>

            {QUARTER_OPTIONS.map((q) => {
              const isSelected = selected === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    onChange(q.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    "hover:bg-black/5",
                    isSelected && "bg-primary/10"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-black/20"
                    )}
                  >
                    {isSelected && <Check className="size-3" />}
                  </div>
                  <span className="truncate">{q.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}