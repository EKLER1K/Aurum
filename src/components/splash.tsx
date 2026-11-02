export function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-bg">
      <div className="relative">
        <div className="absolute inset-0 -z-10 blur-2xl">
          <div className="size-20 rounded-full bg-gold/20" />
        </div>
        <svg viewBox="0 0 32 32" fill="none" className="size-16 animate-pulse-gold" aria-hidden>
          <path
            d="M16 2.75 29.25 16 16 29.25 2.75 16 16 2.75Z"
            stroke="#D4A853"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path d="M16 9.4 22.6 16 16 22.6 9.4 16 16 9.4Z" fill="#D4A853" fillOpacity="0.85" />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[13px] font-semibold tracking-[0.34em] text-ink">AURUM</span>
        <span className="text-[11px] text-muted">Готовим твой трекер</span>
      </div>
    </div>
  );
}
