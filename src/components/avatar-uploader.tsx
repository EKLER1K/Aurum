"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AvatarCropper } from "@/components/avatar-cropper";
import { Button } from "@/components/ui/button";
import { isNativeApp } from "@/lib/backup";
import { base64ToDataUrl, fileToDataUrl } from "@/lib/image";
import { useAppStore } from "@/lib/store";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

function isCancelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel/i.test(message);
}

/**
 * Содержимое шторки «Фото профиля»: описание и кнопки выбора/удаления.
 * В приложении галерея открывается через Capacitor, в браузере — обычный
 * выбор файла. Дальше фото уходит в круглый кроппер.
 */
export function AvatarPanel() {
  const avatar = useAppStore((state) => state.settings.avatar ?? null);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickFromGallery = async () => {
    if (loading) return;

    // Веб-версия и десктоп: обычный input надёжнее, чем PWA-элементы камеры.
    if (!isNativeApp()) {
      inputRef.current?.click();
      return;
    }

    setLoading(true);
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        source: CameraSource.Photos,
        resultType: CameraResultType.Base64,
        quality: 85,
        width: 1280,
        correctOrientation: true,
        allowEditing: false,
      });

      if (!photo.base64String) throw new Error("Пустое фото");
      setPendingSrc(base64ToDataUrl(photo.base64String, photo.format));
    } catch (error) {
      if (!isCancelError(error)) {
        toast.error("Не удалось открыть галерею", {
          description: "Разреши доступ к фото или выбери файл ещё раз.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Это не изображение", { description: "Выбери файл PNG, JPEG или WebP." });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Фото слишком большое", { description: "Максимум 15 МБ." });
      return;
    }

    try {
      setPendingSrc(await fileToDataUrl(file));
    } catch {
      toast.error("Не удалось прочитать файл");
    }
  };

  const handleCropped = (cropped: string, zoom: number) => {
    updateSettings({ avatar: cropped, avatarZoom: zoom });
    setPendingSrc(null);
    toast.success("Фото профиля обновлено");
  };

  const handleRemove = () => {
    updateSettings({ avatar: null });
    toast.success("Фото профиля удалено");
  };

  return (
    <div className="border-b border-line/50 bg-raised/20 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-gold/[0.06]">
          <Camera className="size-4 text-gold" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-ink">Фото профиля</div>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
            {avatar
              ? "Фото уже стоит. Можно выбрать новое — попадёт только круглая область — или удалить текущее."
              : "Выбери фото из галереи и настрой круглый кроп: в профиль попадёт только то, что внутри круга."}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="h-9 px-3 text-[12px]"
          onClick={pickFromGallery}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin text-gold" />
          ) : (
            <ImagePlus className="size-4" strokeWidth={1.6} />
          )}
          {avatar ? "Заменить фото" : "Выбрать фото"}
        </Button>

        {avatar && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={handleRemove}
          >
            <Trash2 className="size-4" strokeWidth={1.6} />
            Удалить
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        aria-label="Выбрать фото профиля"
      />

      {pendingSrc && (
        <AvatarCropper
          imageSrc={pendingSrc}
          onCropComplete={handleCropped}
          onClose={() => setPendingSrc(null)}
        />
      )}
    </div>
  );
}
