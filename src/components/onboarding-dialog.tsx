"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { capitalize, formatMoney, todayISO } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function AurumMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path
        d="M16 2.75 29.25 16 16 29.25 2.75 16 16 2.75Z"
        stroke="#D4A853"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M16 9.4 22.6 16 16 22.6 9.4 16 16 9.4Z" fill="#D4A853" fillOpacity="0.9" />
    </svg>
  );
}

export function OnboardingDialog() {
  const onboarded = useAppStore((state) => state.onboarded);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [income, setIncome] = useState("50000");
  const [rate, setRate] = useState("300");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!onboarded) setOpen(true);
  }, [onboarded]);

  const finish = () => {
    const goal = Number(income.replace(",", "."));
    const hourly = Number(rate.replace(",", "."));
    if (!Number.isFinite(goal) || goal < 0 || !Number.isFinite(hourly) || hourly < 0) {
      setError("Введи корректные числа");
      return;
    }
    completeOnboarding({
      name,
      startDate,
      incomeGoal: goal,
      hourlyRate: hourly,
    });
    setOpen(false);
    toast.success(
      name.trim() ? `Добро пожаловать, ${capitalize(name.trim())}` : "Трекер настроен",
      {
        description: "Заполни первый день и запусти свой стрик.",
        icon: <Sparkles className="size-4 text-gold" strokeWidth={1.8} />,
        duration: 5000,
      },
    );
  };

  const next = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setError("Укажи дату старта");
      return;
    }
    setError(null);
    setStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        hideClose
        className="max-w-[460px] overflow-hidden p-0"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
        <div className="relative px-6 pb-6 pt-7">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AurumMark className="size-7" />
              <span className="text-[12px] font-semibold tracking-[0.28em] text-ink">AURUM</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1].map((index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    step === index ? "w-6 bg-gold" : "w-2 bg-line",
                  )}
                />
              ))}
            </div>
          </div>

          <DialogTitle className="sr-only">Настройка Aurum</DialogTitle>
          <DialogDescription className="sr-only">
            Ответь на три вопроса, чтобы начать вести трекер.
          </DialogDescription>

          <AnimatePresence mode="wait" initial={false}>
            {step === 0 ? (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-5"
              >
                <div>
                  <h2 className="text-[26px] font-semibold leading-tight tracking-tight">
                    Начнём с тебя
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    Aurum — твой личный трекер дохода, часов и дисциплины. Всё хранится только на
                    этом устройстве.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-name">Как тебя зовут?</Label>
                  <Input
                    id="onboarding-name"
                    autoFocus
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Например, Александр"
                    maxLength={40}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-date">Когда начинаем трекать?</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.5} />
                    <Input
                      id="onboarding-date"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-danger">{error}</p>}

                <Button variant="primary" size="lg" className="mt-1 w-full" onClick={next}>
                  Дальше
                  <ArrowRight className="size-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-5"
              >
                <div>
                  <h2 className="text-[26px] font-semibold leading-tight tracking-tight">
                    Твоя планка
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    Цель по доходу на этот месяц и ставка для автоподстановки. Всё можно изменить
                    позже.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-income">Цель дохода в месяц</Label>
                  <div className="relative">
                    <Input
                      id="onboarding-income"
                      inputMode="numeric"
                      value={income}
                      onChange={(event) => setIncome(event.target.value.replace(/[^\d.,]/g, ""))}
                      className="num pr-9 text-base"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gold">
                      ₽
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Ориентир: {formatMoney(Number(income.replace(",", ".")) || 0)}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="onboarding-rate">Ставка, ₽/час</Label>
                  <div className="relative">
                    <Input
                      id="onboarding-rate"
                      inputMode="numeric"
                      value={rate}
                      onChange={(event) => setRate(event.target.value.replace(/[^\d.,]/g, ""))}
                      className="num pr-14"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                      ₽/час
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Доход будет считаться как часы × ставка. Можно поправить вручную.
                  </p>
                </div>

                {error && <p className="text-xs text-danger">{error}</p>}

                <div className="mt-1 flex gap-2">
                  <Button variant="ghost" size="lg" onClick={() => setStep(0)}>
                    <ArrowLeft className="size-4" />
                    Назад
                  </Button>
                  <Button variant="primary" size="lg" className="flex-1" onClick={finish}>
                    Начать трек
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
