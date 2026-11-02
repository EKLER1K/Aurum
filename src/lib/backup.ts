import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { downloadFile } from "./utils";

/** True inside the Android/iOS Capacitor shell, false in a regular browser. */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/**
 * On the web the backend is downloaded as a file.
 * In the Android app it is written to the app cache and opened in the system
 * share sheet, so it can be saved to Files, sent to another phone or to a PC.
 */
export async function exportBackupFile(filename: string, contents: string) {
  if (!isNativeApp()) {
    downloadFile(filename, contents);
    return "downloaded" as const;
  }

  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  await Share.share({
    title: "Aurum — резервная копия",
    text: "Все данные Aurum в формате JSON",
    files: [uri],
    dialogTitle: "Сохранить или отправить резервную копию",
  });

  return "shared" as const;
}
