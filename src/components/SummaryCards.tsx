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
      value: planIncome,
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50/80",
      borderColor: "border-blue-200/60",
    },
    {
      title: "แผนรายจ่าย",
      value: planExpense,
      icon: Wallet,
      color: "text-amber-600",
      bgColor: "bg-amber-50/80",
      borderColor: "border-amber-200/60",
    },
    {
      title: "รวมรายรับ",
      value: actualIncome,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50/80",
      borderColor: "border-emerald-200/60",
    },
    {
      title: "รวมรายจ่าย",
      value: actualExpense,
      icon: TrendingDown,
      color: "text-rose-600",
      bgColor: "bg-rose-50/80",
      borderColor: "border-rose-200/60",
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
              "glass-card relative overflow-hidden p-5 transition-all duration-200",
              "hover:shadow-lg hover:scale-[1.01]"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrencyFull(card.value)}
                </p>
              </div>
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  card.bgColor,
                  card.borderColor,
                  "border"
                )}
              >
                <Icon className={cn("size-5", card.color)} />
              </div>
            </div>
            {/* Subtle gradient accent */}
            <div
              className={cn(
                "absolute bottom-0 left-0 h-1 w-full",
                card.color.replace("text-", "bg-"),
                "opacity-40"
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
