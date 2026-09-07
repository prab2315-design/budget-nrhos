import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  placeholder = "เลือกรายการ...",
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  function selectAll() {
    onChange([...options]);
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={cn(
          "glass-input flex min-h-[36px] w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm transition-all",
          "hover:border-primary/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
          isOpen && "border-primary/40 ring-2 ring-primary/10",
          selected.length > 0 && "border-primary/30"
        )}
      >
        <div className="flex flex-1 flex-wrap gap-1 overflow-hidden">
          {selected.length === 0 && (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {selected.length > 0 && selected.length <= 2 && (
            <div className="flex flex-wrap gap-1">
              {selected.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  <span className="max-w-[120px] truncate">{s}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(s);
                    }}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-primary/25"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {selected.length > 2 && (
            <span className="text-xs font-medium text-primary">
              เลือกแล้ว {selected.length} รายการ
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="glass-card absolute z-50 mt-1 max-h-64 w-full overflow-hidden shadow-lg">
          <div className="border-b border-black/10 p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="พิมพ์เพื่อค้นหา..."
              className="glass-input w-full px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <div className="flex items-center justify-between border-b border-black/10 px-2 py-1">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              เลือกทั้งหมด
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-muted-foreground hover:underline"
            >
              ล้าง
            </button>
          </div>
          <div className="overflow-y-auto max-h-48 p-1">
            {filteredOptions.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                ไม่พบข้อมูลที่ตรงกัน
              </p>
            )}
            {filteredOptions.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleOption(option)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    "hover:bg-black/5",
                    isSelected && "bg-primary/10"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-black/20"
                    )}
                  >
                    {isSelected && <Check className="size-3" />}
                  </div>
                  <span className="truncate">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
