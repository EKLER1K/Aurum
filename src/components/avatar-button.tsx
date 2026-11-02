"use client";

import { Camera, User } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface AvatarButtonProps {
  /** Открыта ли шторка «Фото профиля». */
  open: boolean;
  onClick: () => void;
}

/**
 * Крупный аватар в заголовке карточки «Профиль».
 * Сам ничего не загружает: только показывает фото и переключает шторку.
 */
export function AvatarButton({ open, onClick }: AvatarButtonProps) {
  const avatar = useAppStore((state) => state.settings.avatar ?? null);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={avatar ? "Изменить фото профиля" : "Добавить фото профиля"}
      aria-expanded={open}
      aria-controls="avatar-panel"
      className={cn(
        "group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-raised/50",
        "transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:size-20",
        avatar
          ? "border-gold/40 shadow-[0_0_0_4px_rgba(212,168,83,0.08)]"
          : "border-dashed border-gold/30",
        open ? "border-gold/70 shadow-gold" : "hover:border-gold/60 hover:bg-raised",
      )}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="Фото профиля" className="size-full object-cover" />
      ) : (
        <User
          className="size-7 text-muted transition-colors group-hover:text-ink sm:size-9"
          strokeWidth={1.3}
        />
      )}

      <span
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-ink transition-opacity duration-150",
          open ? "opacity-0" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <Camera className="size-5" strokeWidth={1.6} />
      </span>

      <span
        className={cn(
          "pointer-events-none absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full bg-gold text-[#151006] ring-2 ring-card transition-transform duration-200 ease-premium sm:size-7",
          open ? "scale-90" : "group-hover:scale-105",
        )}
      >
        <Camera className="size-3 sm:size-3.5" strokeWidth={2} />
      </span>
    </button>
  );
}
