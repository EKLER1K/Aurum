"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Splash } from "@/components/splash";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { QuickLogDialog } from "@/components/quick-log-dialog";
import { AchievementCelebration } from "@/components/achievement-celebration";
import { ReminderSync } from "@/components/reminder-sync";
import { useAppStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const onboarded = useAppStore((state) => state.onboarded);

  useEffect(() => {
    const markReady = () => setHydrated(true);
    if (useAppStore.persist.hasHydrated()) markReady();
    return useAppStore.persist.onFinishHydration(markReady);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    useAppStore.getState().reconcileAchievements();
  }, [hydrated]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "n") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      if (!onboarded) return;
      event.preventDefault();
      useUiStore.getState().openEditor();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onboarded]);

  if (!hydrated) return <Splash />;

  return (
    <>
      <AppShell>{children}</AppShell>
      <QuickLogDialog />
      <AchievementCelebration />
      <ReminderSync />
      <OnboardingDialog />
      <Toaster
        theme="dark"
        position="top-center"
        offset={16}
        gap={8}
        toastOptions={{
          classNames: {
            toast:
              "!bg-[#17171A] !border !border-[#2A2A2E] !text-[#F5F5F4] !rounded-xl !shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] !px-4 !py-3",
            title: "!text-[13px] !font-medium !text-[#F5F5F4]",
            description: "!text-[12px] !text-[#8A8A8E]",
            icon: "!mr-1",
            closeButton: "!bg-[#1C1C1F] !border-[#2A2A2E] !text-[#8A8A8E]",
          },
          duration: 3800,
        }}
      />
    </>
  );
}
