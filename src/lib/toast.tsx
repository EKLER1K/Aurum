"use client";

import { Flame, Target, Check } from "lucide-react";
import { toast } from "sonner";
import { daysWord } from "@/lib/format";

export function notifySaved(options: {
  streak: number;
  isNewRecord: boolean;
  goalClosed: boolean;
}) {
  if (options.goalClosed) {
    toast.success("Цель месяца закрыта", {
      description: "Ты дошёл до цели по доходу. Заслуженно.",
      icon: <Target className="size-4 text-gold" strokeWidth={1.8} />,
      duration: 5000,
    });
    return;
  }

  if (options.isNewRecord) {
    toast.success(`Новый рекорд: ${options.streak} ${daysWord(options.streak)}`, {
      description: "Личный рекорд стрика обновлён.",
      icon: <Flame className="size-4 text-gold" strokeWidth={1.8} />,
      duration: 5000,
    });
    return;
  }

  toast.success("День сохранён", {
    description:
      options.streak > 0
        ? `Стрик: ${options.streak} ${daysWord(options.streak)} подряд.`
        : "Запись добавлена в журнал.",
    icon: <Check className="size-4 text-success" strokeWidth={2} />,
  });
}

export function notifyError(message: string) {
  toast.error(message);
}
