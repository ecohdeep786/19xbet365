export function vc(value: number | string | null | undefined, options: { compact?: boolean; sign?: boolean } = {}) {
  const amount = Number(value || 0);
  if (options.compact && Math.abs(amount) >= 1000) {
    return `${amount < 0 ? "-" : options.sign && amount > 0 ? "+" : ""}${(Math.abs(amount) / 1000).toFixed(Math.abs(amount) >= 10000 ? 0 : 1)}k VC`;
  }
  return `${amount < 0 ? "-" : options.sign && amount > 0 ? "+" : ""}${Math.abs(amount).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VC`;
}

export function number(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("en-GB");
}

export function odds(value: number | string | null | undefined) {
  if (value == null) return "—";
  return Number(value).toFixed(2);
}

export function pct(value: number) {
  return `${Math.round(value * 100) / 100}%`;
}

export function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

export function dateShort(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function timeOnly(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function relative(value: string | null | undefined) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const future = diff < 0;
  const seconds = Math.abs(diff) / 1000;
  const units: [number, string][] = [[60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.345, "week"], [12, "month"], [Infinity, "year"]];
  let amount = seconds;
  let unit = "second";
  for (const [size, name] of units) {
    if (amount < size) { unit = name; break; }
    amount /= size;
    unit = name;
  }
  const rounded = Math.max(1, Math.floor(amount));
  return future ? `in ${rounded} ${unit}${rounded === 1 ? "" : "s"}` : `${rounded} ${unit}${rounded === 1 ? "" : "s"} ago`;
}

export function kickoff(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return isToday ? `Today ${timeOnly(value)}` : `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${timeOnly(value)}`;
}

export function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function classNames(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(" ");
}

export function titleCase(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function gameCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    crash: "Crash", mines: "Mines", plinko: "Plinko", dice: "Dice", wheel: "Wheel",
    coinflip: "Coin flip", cards: "Cards", lucky: "Lucky", slots: "Slots", racing: "Racing",
    "slots-provider": "Slots", "live-casino": "Live casino", virtuals: "Virtuals"
  };
  return labels[category] || titleCase(category);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
