"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Loader2, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCroppedImg } from "@/lib/image";

interface AvatarCropperProps {
  /** data:image/... или обычный URL. */
  imageSrc: string;
  /** Готовый квадратный кроп в base64 (data URL). */
  onCropComplete: (croppedDataUrl: string, zoom: number) => void;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function AvatarCropper({ imageSrc, onCropComplete, onClose }: AvatarCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCropComplete = useCallback((_area: Area, pixels: Area) => {
    setArea(pixels);
  }, []);

  const handleSave = async () => {
    if (!area || saving) return;
    setSaving(true);
    setError(null);
    try {
      const cropped = await getCroppedImg(imageSrc, area);
      onCropComplete(cropped, zoom);
    } catch {
      setError("Не удалось обработать фото. Попробуй выбрать другое.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="max-w-md" hideClose>
        <DialogHeader>
          <DialogTitle>Фото профиля</DialogTitle>
          <DialogDescription>
            Перетащи фото, чтобы выбрать центр, и настрой масштаб. В профиль попадёт только
            круглая область.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          <div className="relative h-[248px] w-full overflow-hidden rounded-2xl border border-line/70 bg-[#0A0A0B] sm:h-[288px]">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={0}
              aspect={1}
              cropShape="round"
              showGrid={false}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              zoomSpeed={0.8}
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
              style={{
                containerStyle: { background: "#0A0A0B" },
                cropAreaStyle: {
                  border: "1px solid rgba(212, 168, 83, 0.65)",
                  boxShadow: "0 0 0 9999px rgba(10, 10, 11, 0.72)",
                },
              }}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <ZoomIn className="size-4 shrink-0 text-muted" strokeWidth={1.5} />
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="range-gold w-full"
              aria-label="Масштаб фото"
            />
            <span className="num w-10 shrink-0 text-right text-[10px] text-muted">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {error && <p className="mt-3 text-[11px] text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!area || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Готовим…" : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
