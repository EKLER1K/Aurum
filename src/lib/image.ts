import type { Area } from "react-easy-crop";

/** Сторона готового аватара: хватает и на ретину, и на вес файла. */
export const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_QUALITY = 0.88;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // data: URL не требует CORS, внешние ссылки — требуют.
    if (!src.startsWith("data:")) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    image.src = src;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Не удалось прочитать файл"));
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

/** Capacitor отдаёт base64 без префикса — собираем корректный data URL. */
export function base64ToDataUrl(base64: string, format = "jpeg"): string {
  const mime = format.toLowerCase() === "png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

/**
 * Вырезает область кропа и отдаёт квадратный data URL.
 * Результат сжимается до AVATAR_OUTPUT_SIZE, чтобы не раздувать localStorage.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  size = AVATAR_OUTPUT_SIZE,
): Promise<string> {
  const image = await loadImage(imageSrc);

  const width = Math.max(1, Math.round(pixelCrop.width));
  const height = Math.max(1, Math.round(pixelCrop.height));
  if (width < 2 || height < 2) throw new Error("Слишком маленькая область кропа");

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, width, height, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", AVATAR_QUALITY);
}
