export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? "-" : minutes > 0 ? "+" : "";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatMinutesUnsigned(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function getBalanceColor(minutes: number): string {
  if (minutes > 0) return "text-primary";
  if (minutes < 0) return "text-destructive";
  return "text-muted-foreground";
}

export function getBalanceBg(minutes: number): string {
  if (minutes > 0) return "bg-primary/10 border-primary/30";
  if (minutes < 0) return "bg-destructive/10 border-destructive/30";
  return "bg-muted border-muted-foreground/20";
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export const TYPE_LABELS: Record<string, string> = {
  WORK_DAY: "Dia Comum",
  COMPENSATED_LEAVE: "Folga Compensada",
  HOLIDAY: "Feriado / Folga",
};
