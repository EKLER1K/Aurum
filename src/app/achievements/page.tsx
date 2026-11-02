"use client";

import { useState } from "react";
import { Check, Flame, Pencil, Plus, Sparkles, Trash2, Trophy } from "lucide-react";
import {
  ACHIEVEMENT_GROUPS,
  type AchievementGroup,
  type ResolvedBadge,
  badgeProgress,
  resolveBadges,
} from "@/lib/achievements";
import { AchievementEditorDialog } from "@/components/achievement-editor-dialog";
import { BadgeMedal } from "@/components/badge-medal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { dayLabel, todayISO } from "@/lib/format";
import { buildSnapshot } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type GroupFilter = "all" | AchievementGroup;

const GROUPS: GroupFilter[] = ["all", ...ACHIEVEMENT_GROUPS];

export default function AchievementsPage() {
  const data = useAppStore();
  const [group, setGroup] = useState<GroupFilter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ResolvedBadge | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const deleteAchievement = data.deleteAchievement;
  const adminMode = Boolean(data.settings.adminMode);

  const today = todayISO();
  const snapshot = buildSnapshot(data, today);
  const badges = resolveBadges({
    overrides: data.achievementOverrides,
    custom: data.customAchievements,
    deleted: data.deletedAchievements,
  });
  const unlockedCount = Object.keys(data.achievements).length;
  const total = badges.length;
  const percent = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  const withProgress = badges.map((badge) => {
    const progress = badgeProgress(badge, snapshot);
    const unlocked = Boolean(data.achievements[badge.id]);
    return { badge, progress, unlocked };
  });

  const filtered =
    group === "all" ? withProgress : withProgress.filter((item) => item.badge.group === group);

  const next = withProgress
    .filter((item) => !item.unlocked && item.progress.percent > 0)
    .sort((a, b) => b.progress.percent - a.progress.percent)[0];

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (badge: ResolvedBadge) => {
    setEditing(badge);
    setEditorOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setConfirmDelete(null);
    deleteAchievement(id);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Достижения"
        title="Следы дисциплины"
        description="Каждый бейдж — подтверждение, что ты не слился. Открываются автоматически."
        actions={
          <div className="flex items-center gap-2">
            {adminMode && (
              <Button variant="secondary" size="sm" onClick={openCreate}>
                <Plus className="size-3.5" />
                Добавить достижение
              </Button>
            )}
            <Badge variant="gold" className="px-2.5 py-1 text-[11px]">
              <Trophy className="size-3.5" strokeWidth={1.8} />
              {unlockedCount} / {total}
            </Badge>
          </div>
        }
      />

      <Card className="gold-edge animate-fade-up overflow-hidden p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/20 to-transparent">
            <Trophy className="size-6 text-gold" strokeWidth={1.4} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-semibold tracking-tight">
                {total > 0 && unlockedCount === total
                  ? "Коллекция собрана полностью"
                  : `Открыто ${unlockedCount} из ${total}`}
              </h2>
              <span className="num text-[13px] text-gold">{percent}%</span>
            </div>
            <Progress value={percent} className="mt-2.5" />
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
              {next ? (
                <>
                  Ближе всего: <span className="text-ink">{next.badge.title}</span> ·{" "}
                  <span className="num">
                    {next.badge.format(next.progress.current)} / {next.badge.format(next.badge.target)}
                  </span>
                </>
              ) : total > 0 && unlockedCount === total ? (
                "Все достижения открыты. Это уровень."
              ) : (
                "Заполни первый день — и коллекция начнёт собираться."
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:gap-1 sm:border-l sm:border-line/60 sm:pl-6">
            <div className="text-right">
              <div className="num text-[22px] font-semibold text-gold">{snapshot.currentStreak}</div>
              <div className="text-[9px] uppercase tracking-wide text-muted">стрик</div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted sm:hidden">
              <Flame className="size-3 text-gold" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </Card>

      <div className="hide-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
        {GROUPS.map((item) => {
          const count =
            item === "all"
              ? withProgress.length
              : withProgress.filter((entry) => entry.badge.group === item).length;
          const active = group === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setGroup(item)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors duration-150",
                active
                  ? "border-gold/30 bg-gold/10 text-gold"
                  : "border-line/70 bg-raised/40 text-muted hover:text-ink",
              )}
            >
              {item === "all" ? "Все" : item}
              <span className="num ml-1.5 text-[9px] opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-line/70 bg-card/60 px-5 py-10 text-center">
          <Trophy className="mx-auto size-6 text-muted/60" strokeWidth={1.5} />
          <p className="mt-3 text-[13px] font-medium text-ink">Здесь пока пусто</p>
          <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-muted">
            {adminMode
              ? "Создай своё достижение — оно появится в группе «Особые»."
              : "Все достижения этой группы скрыты. Включи режим администратора в настройках, чтобы вернуть их."}
          </p>
          {adminMode && (
            <Button variant="secondary" size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="size-3.5" />
              Добавить достижение
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ badge, progress, unlocked }, index) => (
            <Card
              key={badge.id}
              className={cn(
                "animate-fade-up relative overflow-hidden p-4 transition-colors duration-200",
                unlocked
                  ? "border-gold/20 bg-gradient-to-br from-gold/[0.06] via-card to-card"
                  : "border-line/70 bg-card/90",
              )}
              style={{ animationDelay: `${Math.min(index * 22, 220)}ms` }}
            >
              {unlocked && (
                <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-gold/10 blur-2xl" />
              )}
              <div className="flex items-start gap-3">
                <BadgeMedal badge={badge} unlocked={unlocked} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={cn(
                        "text-[12px] font-medium leading-snug",
                        unlocked ? "text-ink" : "text-muted",
                      )}
                    >
                      {badge.title}
                    </h3>
                    <div className="flex shrink-0 items-center gap-1">
                      {unlocked && !adminMode && (
                        <span className="num text-[9px] text-gold/80">
                          {dayLabel(
                            (data.achievements[badge.id]?.unlockedAt ?? today).slice(0, 10),
                            "d MMM",
                          )}
                        </span>
                      )}
                      {adminMode && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(badge)}
                            aria-label={`Редактировать «${badge.title}»`}
                            title="Редактировать"
                            className="flex size-6 items-center justify-center rounded-md border border-line/60 bg-raised/40 text-muted transition-colors hover:border-gold/30 hover:text-gold"
                          >
                            <Pencil className="size-3" strokeWidth={1.8} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(badge.id)}
                            onBlur={() => setConfirmDelete(null)}
                            aria-label={
                              confirmDelete === badge.id
                                ? `Подтвердить удаление «${badge.title}»`
                                : `Удалить «${badge.title}»`
                            }
                            title={confirmDelete === badge.id ? "Нажми ещё раз" : "Удалить"}
                            className={cn(
                              "flex h-6 items-center justify-center gap-1 rounded-md border px-1.5 text-[9px] font-medium transition-colors",
                              confirmDelete === badge.id
                                ? "border-danger/40 bg-danger/10 text-danger"
                                : "border-line/60 bg-raised/40 text-muted hover:border-danger/30 hover:text-danger",
                            )}
                          >
                            <Trash2 className="size-3" strokeWidth={1.8} />
                            {confirmDelete === badge.id && "точно?"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] leading-relaxed",
                      unlocked ? "text-muted" : "text-muted/75",
                    )}
                  >
                    {badge.description}
                  </p>
                </div>
              </div>

              {unlocked ? (
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gold/80">
                  <Check className="size-3" strokeWidth={2.2} />
                  получено
                  {adminMode && (
                    <span className="num ml-auto text-[9px] text-gold/60">
                      {dayLabel(
                        (data.achievements[badge.id]?.unlockedAt ?? today).slice(0, 10),
                        "d MMM",
                      )}
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className={cn("num", progress.percent > 0 ? "text-ink" : "text-muted")}>
                      {badge.format(progress.current)}
                    </span>
                    <span className="num text-muted/70">{badge.format(badge.target)}</span>
                  </div>
                  <Progress
                    value={progress.percent}
                    size="sm"
                    tone={badge.group === "Деньги" || badge.group === "Путь" ? "gold" : "azure"}
                    className="mt-1.5"
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 pb-2 text-[10px] text-muted/60">
        <Sparkles className="size-3" strokeWidth={1.5} />
        {adminMode
          ? "Режим администратора включён — правки сохраняются на этом устройстве"
          : "Прогресс считается по всем записям автоматически"}
      </div>

      <AchievementEditorDialog
        open={editorOpen}
        onOpenChange={(value) => {
          setEditorOpen(value);
          if (!value) setEditing(null);
        }}
        badge={editing}
      />
    </div>
  );
}
