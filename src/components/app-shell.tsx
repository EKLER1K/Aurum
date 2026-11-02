"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Flame,
  LayoutDashboard,
  Plus,
  Settings,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { calcMaxStreak, calcStreak } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { daysWord, formatMoney, monthOf, todayISO } from "@/lib/format";
import { APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Обзор", icon: LayoutDashboard },
  { href: "/log", label: "Журнал", icon: BookOpen },
  { href: "/stats", label: "Аналитика", icon: TrendingUp },
  { href: "/goals", label: "Цели", icon: Target },
  { href: "/achievements", label: "Достижения", icon: Trophy },
];

function AurumMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path
        d="M16 2.75 29.25 16 16 29.25 2.75 16 16 2.75Z"
        stroke="url(#aurum-stroke)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M16 9.4 22.6 16 16 22.6 9.4 16 16 9.4Z"
        fill="url(#aurum-fill)"
        fillOpacity="0.9"
      />
      <defs>
        <linearGradient id="aurum-stroke" x1="4" y1="4" x2="29" y2="29">
          <stop stopColor="#EBD08F" />
          <stop offset="1" stopColor="#8F6E2E" />
        </linearGradient>
        <linearGradient id="aurum-fill" x1="10" y1="10" x2="23" y2="23">
          <stop stopColor="#EBD08F" />
          <stop offset="1" stopColor="#C09A4D" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition-colors duration-150",
              mobile
                ? "flex-col gap-1.5 px-2 py-2 text-[10px]"
                : "px-3 py-2.5",
              active
                ? "bg-hover text-ink"
                : "text-muted hover:bg-hover/60 hover:text-ink",
            )}
          >
            {active && !mobile && (
              <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-gold" />
            )}
            <Icon
              className={cn(
                "size-[18px] transition-colors",
                active ? "text-gold" : "text-muted group-hover:text-ink",
              )}
              strokeWidth={1.5}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const entries = useAppStore((state) => state.entries);
  const settings = useAppStore((state) => state.settings);
  const goals = useAppStore((state) => state.goals);
  const openEditor = useUiStore((state) => state.openEditor);

  const streak = calcStreak(entries);
  const record = calcMaxStreak(entries);
  const month = monthOf(todayISO());
  const monthGoal = goals[month]?.incomeGoal ?? 0;

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line/70 bg-[#0C0C0D]/90 px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-3 px-2">
          <AurumMark className="size-8" />
          <span className="text-[15px] font-semibold tracking-[0.28em] text-ink">AURUM</span>
          <span className="ml-auto rounded-md border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-gold">
            {APP_VERSION}
          </span>
        </Link>

        <nav className="flex flex-col gap-1">
          <NavLinks />
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <div className="gold-edge relative overflow-hidden rounded-2xl border border-line/70 bg-raised/60 p-4">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-gold" strokeWidth={1.5} />
              <span className="label-micro">Текущий стрик</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="num text-3xl font-semibold text-ink">{streak}</span>
              <span className="text-xs text-muted">{daysWord(streak)}</span>
            </div>
            <div className="mt-1 text-[11px] text-muted">
              Рекорд: <span className="num text-gold">{record}</span>
            </div>
            {monthGoal > 0 && (
              <div className="mt-3 border-t border-line/60 pt-2 text-[11px] text-muted">
                Цель месяца · <span className="num text-ink">{formatMoney(monthGoal, settings.currency)}</span>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            onClick={() => openEditor()}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Plus className="size-4" strokeWidth={2} />
              Заполнить день
            </span>
            <kbd className="rounded border border-black/20 bg-black/10 px-1.5 py-0.5 text-[10px] font-medium text-[#151006]/70">
              N
            </kbd>
          </Button>

          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-hover/60 hover:text-ink",
            )}
          >
            <Settings className="size-[18px]" strokeWidth={1.5} />
            Настройки
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="safe-top sticky top-0 z-30 flex h-safe-header items-center justify-between border-b border-line/70 bg-bg/85 px-4 backdrop-blur-md lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <AurumMark className="size-6" />
          <span className="text-[13px] font-semibold tracking-[0.24em]">AURUM</span>
          <span className="rounded border border-gold/25 bg-gold/10 px-1 py-0.5 text-[8px] font-medium tracking-wide text-gold">
            {APP_VERSION}
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1 rounded-lg border border-line bg-raised px-2 py-1 text-[11px]">
            <Flame className="size-3.5 text-gold" strokeWidth={1.5} />
            <span className="num text-ink">{streak}</span>
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => openEditor()} aria-label="Заполнить день">
            <Plus className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" asChild aria-label="Настройки">
            <Link href="/settings">
              <Settings className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="w-full px-4 pb-28 pt-6 sm:px-6 lg:ml-[248px] lg:w-[calc(100%-248px)] lg:pb-14 lg:pr-8 lg:pt-9">
        <div className="mx-auto w-full max-w-[1040px]">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="pb-safe-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line/70 bg-[#0C0C0D]/95 px-2 pt-1.5 backdrop-blur-md lg:hidden">
        <NavLinks mobile />
      </nav>
    </div>
  );
}
