"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { resolveBadgeMap } from "@/lib/achievements";
import { BadgeMedal } from "@/components/badge-medal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { dayLabel } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";

const CONFETTI = [
  { left: "18%", top: "26%", size: 4, delay: 0 },
  { left: "28%", top: "16%", size: 3, delay: 0.08 },
  { left: "42%", top: "12%", size: 5, delay: 0.16 },
  { left: "58%", top: "14%", size: 3, delay: 0.04 },
  { left: "74%", top: "22%", size: 4, delay: 0.12 },
  { left: "82%", top: "38%", size: 3, delay: 0.2 },
  { left: "16%", top: "46%", size: 3, delay: 0.18 },
  { left: "70%", top: "52%", size: 2, delay: 0.26 },
];

export function AchievementCelebration() {
  const queue = useUiStore((state) => state.unlockedQueue);
  const editorOpen = useUiStore((state) => state.editorOpen);
  const shiftUnlock = useUiStore((state) => state.shiftUnlock);
  const onboarded = useAppStore((state) => state.onboarded);
  const achievements = useAppStore((state) => state.achievements);
  const achievementOverrides = useAppStore((state) => state.achievementOverrides);
  const customAchievements = useAppStore((state) => state.customAchievements);
  const deletedAchievements = useAppStore((state) => state.deletedAchievements);

  const id = queue[0];
  const badge = id
    ? resolveBadgeMap({
        overrides: achievementOverrides,
        custom: customAchievements,
        deleted: deletedAchievements,
      }).get(id)
    : undefined;
  const open = Boolean(badge && !editorOpen && onboarded);
  const unlockedAt = id ? achievements[id]?.unlockedAt : undefined;

  if (!badge) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) shiftUnlock();
      }}
    >
      <DialogContent
        hideClose
        className="max-w-[400px] overflow-hidden border-gold/20 p-0"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div key={badge.id} className="relative overflow-hidden px-6 pb-6 pt-8 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(ellipse_at_top,rgba(212,168,83,0.16),transparent_65%)]" />

          {CONFETTI.map((dot, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 0], y: -22, scale: 1 }}
              transition={{ duration: 1.5, delay: dot.delay, ease: "easeOut" }}
              className="pointer-events-none absolute rounded-full bg-gold"
              style={{ left: dot.left, top: dot.top, width: dot.size, height: dot.size }}
            />
          ))}

          <div className="relative flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-gold">
              <Sparkles className="size-3" strokeWidth={1.8} />
              Достижение открыто
            </div>

            <motion.div
              initial={{ scale: 0.55, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 18, delay: 0.05 }}
              className="relative mt-5"
            >
              <span className="absolute inset-0 -z-10 rounded-full bg-gold/20 blur-2xl" />
              <span className="absolute -inset-2 rounded-full border border-gold/20" />
              <BadgeMedal badge={badge} unlocked size="lg" className="size-24 rounded-full" />
            </motion.div>

            <DialogTitle className="mt-5 text-[24px] font-semibold leading-tight tracking-tight">
              {badge.title}
            </DialogTitle>
            <DialogDescription className="mt-1.5 max-w-[260px] text-[12px] leading-relaxed">
              {badge.description}
            </DialogDescription>

            {unlockedAt && (
              <div className="mt-3 text-[10px] uppercase tracking-wide text-muted/70">
                {dayLabel(unlockedAt.slice(0, 10), "d MMMM")}
              </div>
            )}

            <Button variant="primary" className="mt-5 w-full" onClick={shiftUnlock}>
              Продолжить
            </Button>

            {queue.length > 1 && (
              <div className="mt-2.5 text-[10px] text-muted">
                Ещё {queue.length - 1} открыт{queue.length - 1 === 1 ? "" : "о"}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
