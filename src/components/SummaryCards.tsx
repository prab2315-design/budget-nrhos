import { TrendingUp, TrendingDown, Target, Wallet } from "lucide-react";
import { formatCurrencyFull } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  planIncome: number;
  planExpense: number;
  actualIncome: number;
  actualExpense: number;
}

export function SummaryCards({
  planIncome,
  planExpense,
  actualIncome,
  actualExpense,
}: SummaryCardsProps) {
  const cards = [
    {
      title: "แผนรายรับ",
      subtitle: "งบประมาณ",
      value: planIncome,
      icon: Target,
      color: "text-sky-400",
      bgColor: "bg-sky-500/15",
      accentColor: "bg-sky-400",
    },
    {
      title: "แผนรายจ่าย",
      subtitle: "งบประมาณ",
      value: planExpense,
      icon: Wallet,
      color: "text-amber-400",
      bgColor: "bg-amber-500/15",
      accentColor: "bg-amber-400",
    },
    {
      title: "รายรับสะสม",
      subtitle: "จริง",
      value: actualIncome,
      icon: TrendingUp,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/15",
      accentColor: "bg-emerald-400",
    },
    {
      title: "รายจ่ายสะสม",
      subtitle: "จริง",
      value: actualExpense,
      icon: TrendingDown,
      color: "text-rose-400",
      bgColor: "bg-rose-500/15",
      accentColor: "bg-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={cn(
              "glass-card group relative overflow-hidden p-5 transition-all duration-200",
              "hover:shadow-lg hover:shadow-black/10 hover:scale-[1.01]"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {card.title}
                </p>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground/60">
                  {card.subtitle}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrencyFull(card.value)}
                </p>
              </div>
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  card.bgColor
                )}
              >
                <Icon className={cn("size-5", card.color)} />
              </div>
            </div>
            {/* Accent bar */}
            <div
              className={cn(
                "absolute bottom-0 left-0 h-[2px] w-full opacity-50 transition-opacity group-hover:opacity-100",
                card.accentColor
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
