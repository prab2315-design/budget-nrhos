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
      color: "text-emerald-700",
      bgColor: "bg-emerald-500/15",
      accentColor: "bg-emerald-600",
      num: "1ก",
      numClass: "section-num--green",
    },
    {
      title: "แผนรายจ่าย",
      subtitle: "งบประมาณ",
      value: planExpense,
      icon: Wallet,
      color: "text-orange-600",
      bgColor: "bg-orange-500/15",
      accentColor: "bg-orange-500",
      num: "1ข",
      numClass: "section-num--orange",
    },
    {
      title: "รายรับสะสม",
      subtitle: "จริง",
      value: actualIncome,
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      accentColor: "bg-emerald-400",
      num: "1ค",
      numClass: "section-num--green",
    },
    {
      title: "รายจ่ายสะสม",
      subtitle: "จริง",
      value: actualExpense,
      icon: TrendingDown,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      accentColor: "bg-orange-400",
      num: "1ง",
      numClass: "section-num--orange",
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
                <div className="flex items-center gap-2">
                  <span className={cn("section-num", card.numClass)}>
                    {card.num}
                  </span>
                  <p className="text-sm font-bold tracking-tight text-foreground">
                    {card.title}
                  </p>
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {card.subtitle}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
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
