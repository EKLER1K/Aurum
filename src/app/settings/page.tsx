"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardPaste,
  Clock3,
  Database,
  Download,
  FileJson,
  HardDrive,
  Keyboard,
  Moon,
  Save,
  Shield,
  ShieldCheck,
  Smartphone,
  Target,
  Trash2,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { AvatarButton } from "@/components/avatar-button";
import { AvatarPanel } from "@/components/avatar-uploader";
import { RemindersCard } from "@/components/reminders-card";
import {
  formatMoney,
  monthLabel,
  monthOf,
  plural,
  todayISO,
} from "@/lib/format";
import { syncReminders } from "@/lib/reminder-scheduler";
import { isDayLogged } from "@/lib/reminders";
import { exportPayload, useAppStore } from "@/lib/store";
import { APP_VERSION_NUMBER, APP_VERSION } from "@/lib/version";
import { exportBackupFile, isNativeApp } from "@/lib/backup";
import { cn, round2 } from "@/lib/utils";

const CURRENCIES = ["₽", "$", "€", "₸", "₴", "£"];

interface ImportPreview {
  name: string;
  raw: string;
  entries: number;
  goals: number;
  achievements: number;
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  right,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/50 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line/70 bg-raised/60">
          <Icon className="size-4 text-muted" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-[14px] font-medium tracking-tight">{title}</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

function parseNum(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return round2(parsed);
}

export default function SettingsPage() {
  const data = useAppStore();
  const updateSettings = useAppStore((state) => state.updateSettings);
  const importData = useAppStore((state) => state.importData);
  const resetAll = useAppStore((state) => state.resetAll);

  const today = todayISO();
  const month = monthOf(today);
  const currency = data.settings.currency;

  const entriesCount = Object.keys(data.entries).length;
  const goalsCount = data.monthGoals.length;
  const badgesCount = Object.keys(data.achievements).length;
  const entriesWord = plural(entriesCount, "запись", "записи", "записей");
  const goalsWord = plural(goalsCount, "цель", "цели", "целей");
  const badgesWord = plural(badgesCount, "бейдж", "бейджа", "бейджей");

  const [name, setName] = useState(data.settings.name);
  const [currencyValue, setCurrencyValue] = useState(data.settings.currency);
  const [rate, setRate] = useState(String(data.settings.defaultHourlyRate));
  const [startDate, setStartDate] = useState(data.settings.trackingStartDate);

  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [native, setNative] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarAreaRef = useRef<HTMLDivElement>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  // Клик мимо шторки закрывает её. Пока открыт кроппер — не трогаем.
  useEffect(() => {
    if (!avatarOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (!avatarAreaRef.current?.contains(target)) setAvatarOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [avatarOpen]);

  const syncLocal = () => {
    const state = useAppStore.getState();
    setName(state.settings.name);
    setCurrencyValue(state.settings.currency);
    setRate(String(state.settings.defaultHourlyRate));
    setStartDate(state.settings.trackingStartDate);
  };

  const saveProfile = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      toast.error("Укажи корректную дату старта");
      return;
    }
    updateSettings({
      name: name.trim().slice(0, 40),
      currency: currencyValue,
      defaultHourlyRate: parseNum(rate),
      trackingStartDate: startDate,
    });
    toast.success("Профиль сохранён", {
      icon: <Check className="size-4 text-success" strokeWidth={2} />,
    });
  };

  const adminMode = Boolean(data.settings.adminMode);

  const toggleAdminMode = () => {
    const next = !adminMode;
    updateSettings({ adminMode: next });
    toast.success(
      next ? "Режим администратора включён" : "Режим администратора выключен",
      { icon: <ShieldCheck className="size-4 text-gold" strokeWidth={1.8} /> },
    );
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportBackupFile(`aurum-backup-${today}.json`, exportPayload(data));
      toast.success(result === "shared" ? "Резервная копия готова" : "Резервная копия скачана", {
        description:
          result === "shared"
            ? "Выбери «Файлы», Telegram или другое приложение, чтобы сохранить JSON."
            : "Файл JSON со всеми записями, целями и достижениями.",
        icon: <Download className="size-4 text-gold" strokeWidth={1.8} />,
      });
    } catch {
      toast.error("Не удалось сохранить копию", {
        description: "Попробуй ещё раз. Данные остались на месте.",
      });
    } finally {
      setExporting(false);
    }
  };

  const previewFromRaw = (raw: string, name: string) => {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const source =
        parsed.state && typeof parsed.state === "object"
          ? (parsed.state as Record<string, unknown>)
          : parsed;
      const entries = source.entries && typeof source.entries === "object" ? source.entries : {};
      const goals = Array.isArray(source.monthGoals)
        ? source.monthGoals
        : source.goals && typeof source.goals === "object"
          ? source.goals
          : {};
      const achievements =
        source.achievements && typeof source.achievements === "object" ? source.achievements : {};
      setImportPreview({
        name,
        raw,
        entries: Object.keys(entries).length,
        goals: Object.keys(goals).length,
        achievements: Object.keys(achievements).length,
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const raw = await file.text();
      if (!previewFromRaw(raw, file.name)) {
        toast.error("Не удалось прочитать файл", {
          description: "Нужен JSON-файл, созданный в Aurum.",
        });
      }
    } catch {
      toast.error("Не удалось прочитать файл", {
        description: "Нужен JSON-файл, созданный в Aurum.",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handlePaste = () => {
    const raw = pasteText.trim();
    if (!raw) {
      toast.error("Вставь JSON из резервной копии");
      return;
    }
    if (!previewFromRaw(raw, "Вставленный JSON")) {
      toast.error("Это не похоже на JSON Aurum", {
        description: "Скопируй файл целиком, начиная с { и заканчивая }.",
      });
      return;
    }
    setPasteOpen(false);
    setPasteText("");
  };

  /** Импорт и сброс меняют правила — сразу пересобираем расписание. */
  const resyncReminders = () => {
    const state = useAppStore.getState();
    void syncReminders(state.settings.reminders, state.settings.remindersEnabled, {
      skipToday: isDayLogged(state.entries[todayISO()]),
    });
  };

  const confirmImport = () => {
    if (!importPreview) return;
    setImporting(true);
    const result = importData(importPreview.raw);
    setImporting(false);
    if (!result.ok) {
      toast.error("Импорт не выполнен", { description: result.error });
      return;
    }
    setImportPreview(null);
    syncLocal();
    resyncReminders();
    toast.success("Данные восстановлены", {
      description: "Записи, цели и достижения загружены из резервной копии.",
      icon: <Check className="size-4 text-success" strokeWidth={2} />,
    });
  };

  const confirmReset = () => {
    resetAll();
    setResetOpen(false);
    syncLocal();
    resyncReminders();
    toast.success("Все данные очищены", {
      description: "Можно начать с чистого листа.",
      icon: <Trash2 className="size-4 text-danger" strokeWidth={1.8} />,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Настройки"
        title="Твой трекер, твои правила"
        description="Ставка, валюта, цели и резервные копии. Всё хранится только на этом устройстве."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-up overflow-hidden">
          <div ref={avatarAreaRef}>
            <div className="flex items-center gap-4 border-b border-line/50 px-5 py-4">
              <AvatarButton
                open={avatarOpen}
                onClick={() => setAvatarOpen((open) => !open)}
              />
              <div className="min-w-0">
                <h2 className="text-[14px] font-medium tracking-tight">Профиль</h2>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                  Имя, валюта и ставка для автоподсчёта дохода
                </p>
              </div>
            </div>

            <div
              id="avatar-panel"
              aria-hidden={!avatarOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-premium",
                avatarOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden" inert={!avatarOpen}>
                <AvatarPanel />
              </div>
            </div>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="settings-name">Как тебя зовут</Label>
              <Input
                id="settings-name"
                value={name}
                maxLength={40}
                onChange={(event) => setName(event.target.value)}
                placeholder="Имя"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-currency">Валюта</Label>
              <Select
                id="settings-currency"
                value={currencyValue}
                onChange={(event) => setCurrencyValue(event.target.value)}
                className="h-10 rounded-xl bg-raised text-sm"
              >
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-rate">Ставка, {currencyValue}/час</Label>
              <div className="relative">
                <Input
                  id="settings-rate"
                  inputMode="decimal"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  className="num pr-14"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted">
                  {currencyValue}/ч
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="settings-start">Дата старта трекинга</Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.5} />
                <Input
                  id="settings-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between rounded-xl border border-line/60 bg-raised/40 px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <Moon className="size-3.5 text-azure" strokeWidth={1.5} />
                  <div>
                    <div className="text-[12px] text-ink">Тёмная тема</div>
                    <div className="text-[10px] text-muted">Единственная и постоянная</div>
                  </div>
                </div>
                <Badge variant="azure">по умолчанию</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/15 bg-gold/[0.04] px-3.5 py-3 sm:col-span-2">
              <div className="flex items-center gap-2.5">
                <Clock3 className="size-3.5 text-gold" strokeWidth={1.5} />
                <span className="text-[10px] leading-relaxed text-muted">
                  Пример: 8 ч × {formatMoney(parseNum(rate), currencyValue)} ={" "}
                  <span className="num text-gold">
                    {formatMoney(parseNum(rate) * 8, currencyValue)}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-line/50 px-5 py-3.5">
            <span className="text-[10px] text-muted">Применяется к новым записям</span>
            <Button variant="secondary" size="sm" onClick={saveProfile}>
              <Save className="size-3.5" strokeWidth={1.6} />
              Сохранить
            </Button>
          </div>
        </Card>

        <Card className="animate-fade-up overflow-hidden" style={{ animationDelay: "40ms" }}>
          <SectionHeader
            icon={Target}
            title="Цели"
            description={`Цели месяца и цели на день · план на ${monthLabel(month)}`}
            right={<Badge variant="outline">отдельная вкладка</Badge>}
          />
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line/60 bg-raised/40 p-3.5">
                <div className="label-micro">Цели месяца</div>
                <div className="num mt-1.5 text-[22px] font-semibold leading-none text-ink">
                  {data.monthGoals.length}
                </div>
                <div className="mt-1 text-[10px] text-muted">с планом и порядком</div>
              </div>
              <div className="rounded-xl border border-line/60 bg-raised/40 p-3.5">
                <div className="label-micro">Цели на день</div>
                <div className="num mt-1.5 text-[22px] font-semibold leading-none text-ink">
                  {data.dayGoals.length}
                </div>
                <div className="mt-1 text-[10px] text-muted">только факт за день</div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-gold/15 bg-gold/[0.04] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-relaxed text-muted">
                Названия, типы, единицы, планы и порядок меняются на вкладке «Цели».
                Здесь ничего не дублируется, чтобы данные не расходились.
              </p>
              <Button asChild variant="secondary" size="sm" className="shrink-0">
                <Link href="/goals">
                  Открыть цели
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="animate-fade-up overflow-hidden lg:col-span-2" style={{ animationDelay: "60ms" }}>
          <SectionHeader
            icon={adminMode ? ShieldCheck : Shield}
            title="Режим администратора"
            description="Полный контроль над списком достижений"
            right={
              <Badge variant={adminMode ? "gold" : "outline"}>
                {adminMode ? "включён" : "выключен"}
              </Badge>
            }
          />
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-line/70 bg-raised/50">
                <ShieldCheck className="size-4 text-gold" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-ink">Режим администратора</div>
                <p className="mt-1 max-w-md text-[10px] leading-relaxed text-muted">
                  Позволяет редактировать и удалять любые достижения
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={adminMode}
              aria-label="Режим администратора"
              onClick={toggleAdminMode}
              className={cn(
                "relative flex h-7 w-12 shrink-0 items-center rounded-full border px-0.5 transition-colors duration-200",
                adminMode
                  ? "border-gold/40 bg-gold/25"
                  : "border-line bg-raised/60 hover:border-line",
              )}
            >
              <span
                className={cn(
                  "size-5 rounded-full transition-transform duration-200 ease-premium",
                  adminMode
                    ? "translate-x-[22px] bg-gold shadow-[0_0_12px_-2px_rgba(212,168,83,0.8)]"
                    : "translate-x-0 bg-muted/70",
                )}
              />
            </button>
          </div>
          {adminMode && (
            <div className="flex flex-col gap-2 border-t border-line/50 bg-gold/[0.03] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-relaxed text-muted">
                Правки встроенных достижений сохраняются как переопределения. Удалённые бейджи
                скрываются до сброса данных.
              </p>
              <Button asChild variant="secondary" size="sm" className="shrink-0">
                <Link href="/achievements">
                  Открыть достижения
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </Card>

        <RemindersCard />

        <Card className="animate-fade-up overflow-hidden" style={{ animationDelay: "80ms" }}>
          <SectionHeader
            icon={Database}
            title="Данные"
            description="Резервная копия — единственный способ не потерять историю"
          />

          <div className="flex flex-col divide-y divide-line/40">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg border border-line/70 bg-raised/50">
                  <Download className="size-4 text-gold" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[12px] font-medium text-ink">Экспорт JSON</div>
                  <div className="text-[10px] text-muted">
                    {entriesCount} {entriesWord} · {goalsCount} {goalsWord} · {badgesCount}{" "}
                    {badgesWord}
                  </div>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
                <Download className="size-3.5" strokeWidth={1.6} />
                {exporting ? "Готовим…" : native ? "Поделиться" : "Скачать"}
              </Button>
            </div>

            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg border border-line/70 bg-raised/50">
                  <Upload className="size-4 text-azure" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[12px] font-medium text-ink">Импорт JSON</div>
                  <div className="text-[10px] text-muted">Заменит текущие данные копией</div>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPasteOpen(true)}
                  className="flex-1 sm:flex-none"
                >
                  <ClipboardPaste className="size-3.5" strokeWidth={1.6} />
                  Вставить
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 sm:flex-none"
                >
                  <FileJson className="size-3.5" strokeWidth={1.6} />
                  Выбрать файл
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 border-t border-line/50 bg-raised/20 px-5 py-3">
            {native ? (
              <Smartphone className="mt-0.5 size-3.5 shrink-0 text-gold" strokeWidth={1.5} />
            ) : (
              <HardDrive className="mt-0.5 size-3.5 shrink-0 text-muted" strokeWidth={1.5} />
            )}
            <p className="text-[10px] leading-relaxed text-muted">
              {native ? (
                <>
                  Приложение работает офлайн. Копия откроется в меню «Поделиться»: сохрани её в
                  «Файлы», отправь в Telegram или на компьютер. Импорт доступен из файла или
                  вставкой JSON.
                </>
              ) : (
                <>
                  Всё лежит в localStorage браузера. Очистка кеша или смена устройства — и данных
                  нет. Делай экспорт раз в неделю.
                </>
              )}
            </p>
          </div>
        </Card>

        <Card className="animate-fade-up overflow-hidden lg:col-span-2" style={{ animationDelay: "100ms" }}>
          <SectionHeader
            icon={Shield}
            title="О приложении"
            description="Политика конфиденциальности и условия использования"
          />
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-line/70 bg-raised/50">
                <Shield className="size-4 text-gold" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-ink">Политика конфиденциальности</div>
                <p className="mt-1 max-w-md text-[10px] leading-relaxed text-muted">
                  Aurum не собирает и не передаёт персональные данные. Всё хранится локально на устройстве.
                </p>
              </div>
            </div>
            <Link
              href="https://EKLER1K.github.io/Aurum/docs/privacy-policy.html"
              passHref
              legacyBehavior
            >
              <Button variant="secondary" size="sm" className="shrink-0">
                Открыть политику
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="animate-fade-up overflow-hidden border-danger/20" style={{ animationDelay: "120ms" }}>
          <SectionHeader
            icon={Shield}
            title="Опасная зона"
            description="Действия без возможности отменить"
            right={<Badge variant="danger">осторожно</Badge>}
          />
          <div className="p-5">
            <div className="rounded-xl border border-danger/20 bg-danger/[0.045] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.6} />
                <div>
                  <div className="text-[12px] font-medium text-ink">Очистить все данные</div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">
                    Будут удалены все записи, цели, настройки и достижения. Резервная копия не
                    создаётся автоматически.
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                className="mt-3 w-full sm:w-auto"
                onClick={() => setResetOpen(true)}
              >
                <Trash2 className="size-3.5" strokeWidth={1.6} />
                Очистить всё
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-between text-[10px] text-muted">
              <span>Версия приложения</span>
              <span className="flex items-center gap-1.5">
                <Badge variant="gold" className="text-[9px] uppercase">
                  beta
                </Badge>
                <span className="num text-ink">{APP_VERSION}</span>
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
              <span>Сборка</span>
              <span className="num">{APP_VERSION_NUMBER}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
              <span>Версия данных</span>
              <span className="num">v{data.version}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
              <span>Хранилище</span>
              <span className="num">aurum-state-v1</span>
            </div>
          </div>
        </Card>

        <Card className="animate-fade-up overflow-hidden lg:col-span-2" style={{ animationDelay: "160ms" }}>
          <SectionHeader
            icon={Keyboard}
            title="Как всё устроено"
            description="Коротко о горячих клавишах и логике приложения"
          />
          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <div>
              <div className="label-micro mb-2">Быстрое заполнение</div>
              <div className="flex flex-col gap-1.5 text-[11px] text-muted">
                <div className="flex items-center justify-between gap-2">
                  <span>Открыть запись</span>
                  <kbd className="rounded border border-line bg-raised px-1.5 py-0.5 text-[10px] text-ink">N</kbd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Сохранить</span>
                  <kbd className="rounded border border-line bg-raised px-1.5 py-0.5 text-[10px] text-ink">Enter</kbd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Закрыть</span>
                  <kbd className="rounded border border-line bg-raised px-1.5 py-0.5 text-[10px] text-ink">Esc</kbd>
                </div>
              </div>
            </div>
            <div>
              <div className="label-micro mb-2">Стрик</div>
              <p className="text-[10px] leading-relaxed text-muted">
                Считается по последовательным дням с записями, заканчивая сегодня или вчера. Пропуск
                вчера при заполненном сегодня — стрик начинается с 1.
              </p>
            </div>
            <div>
              <div className="label-micro mb-2">Приватность</div>
              <p className="text-[10px] leading-relaxed text-muted">
                Никаких аккаунтов, серверов и аналитики. Данные не покидают браузер, если ты сам не
                выгрузишь JSON.
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-success">
                <Wallet className="size-3" strokeWidth={1.5} />
                Локально и бесплатно
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={Boolean(importPreview)} onOpenChange={(open) => !open && setImportPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Импортировать данные?</DialogTitle>
            <DialogDescription>
              Текущие записи, цели и достижения будут заменены содержимым копии. Действие нельзя
              отменить.
            </DialogDescription>
          </DialogHeader>
          {importPreview && (
            <div className="mx-6 mb-4 rounded-xl border border-line/70 bg-raised/40 p-4">
              <div className="flex items-center gap-2 text-[12px] text-ink">
                <FileJson className="size-3.5 text-azure" strokeWidth={1.5} />
                <span className="truncate">{importPreview.name}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="num text-[16px] text-ink">{importPreview.entries}</div>
                  <div className="text-[9px] uppercase tracking-wide text-muted">записей</div>
                </div>
                <div>
                  <div className="num text-[16px] text-ink">{importPreview.goals}</div>
                  <div className="text-[9px] uppercase tracking-wide text-muted">целей</div>
                </div>
                <div>
                  <div className="num text-[16px] text-ink">{importPreview.achievements}</div>
                  <div className="text-[9px] uppercase tracking-wide text-muted">бейджей</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportPreview(null)}>
              Отмена
            </Button>
            <Button variant="primary" onClick={confirmImport} disabled={importing}>
              <Upload className="size-4" />
              {importing ? "Импортируем…" : "Импортировать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pasteOpen}
        onOpenChange={(open) => {
          setPasteOpen(open);
          if (!open) setPasteText("");
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Вставить JSON</DialogTitle>
            <DialogDescription>
              Скопируй резервную копию целиком — например, из заметок или сообщения на телефоне.
              Перед импортом покажем, что внутри.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-4">
            <Textarea
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              rows={9}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="font-mono text-[11px] leading-relaxed"
              placeholder='{"app":"aurum","version":1,...}'
              aria-label="JSON резервной копии"
            />
            <p className="mt-2 text-[10px] text-muted">
              Ничего не изменится, пока ты не подтвердишь импорт.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPasteOpen(false)}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handlePaste} disabled={!pasteText.trim()}>
              <ClipboardPaste className="size-4" />
              Проверить JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Очистить все данные?</DialogTitle>
            <DialogDescription>
              Удалим {entriesCount} {entriesWord}, {goalsCount} {goalsWord} и {badgesCount}{" "}
              {plural(badgesCount, "достижение", "достижения", "достижений")}. Это навсегда.
            </DialogDescription>
          </DialogHeader>
          <div className="mx-6 mb-4 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/[0.05] p-3.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.6} />
            <p className="text-[11px] leading-relaxed text-muted">
              Сначала лучше сделать экспорт. После очистки приложение откроется как новое и
              предложит онбординг.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Оставить как есть
            </Button>
            <Button variant="danger" onClick={confirmReset}>
              <Trash2 className="size-4" />
              Да, очистить всё
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
