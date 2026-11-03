"use client";

import { useEffect } from "react";
import { todayISO } from "@/lib/format";
import { isReminderPlatform, syncReminders } from "@/lib/reminder-scheduler";
import { isDayLogged } from "@/lib/reminders";
import { useAppStore } from "@/lib/store";

/**
 * Пересобирает расписание при старте приложения, при возврате из фона
 * и после сохранения/удаления сегодняшнего дня.
 * На вебе и в Windows компонент ничего не делает.
 */
export function ReminderSync() {
  useEffect(() => {
    if (!isReminderPlatform()) return;

    let lastSkipToday: boolean | null = null;

    const sync = () => {
      const state = useAppStore.getState();
      const skipToday = isDayLogged(state.entries[todayISO()]);
      lastSkipToday = skipToday;
      void syncReminders(state.settings.reminders, state.settings.remindersEnabled, {
        skipToday,
      });
    };

    sync();

    const unsubscribe = useAppStore.subscribe((state) => {
      const skipToday = isDayLogged(state.entries[todayISO()]);
      if (skipToday !== lastSkipToday) sync();
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
