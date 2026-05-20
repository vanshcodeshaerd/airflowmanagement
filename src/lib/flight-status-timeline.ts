// Pure client-side helpers — no DB access. Computes the live status
// from the flight's scheduled departure and the current time, plus any
// delay. Mirrors the timeline described in the prompt:
//   T-60: Check-in opened
//   T-45: Security
//   T-30: Boarding soon
//   T-0:  Departed
export type LiveStatus =
  | "Scheduled"
  | "Check-in"
  | "Security"
  | "Boarding"
  | "Departed"
  | "Delayed"
  | "Cancelled";

export type StatusPalette = {
  label: string;
  badgeClass: string;
  dotClass: string;
};

export function computeLiveStatus(args: {
  departureISO: string;
  storedStatus: string;
  delayMinutes?: number;
  now?: Date;
}): LiveStatus {
  const now = (args.now ?? new Date()).getTime();
  if (args.storedStatus === "Cancelled") return "Cancelled";

  const dep = new Date(args.departureISO).getTime() + (args.delayMinutes ?? 0) * 60_000;
  const minsToDep = (dep - now) / 60_000;

  if (minsToDep <= 0) return "Departed";
  if (minsToDep <= 30) return "Boarding";
  if (minsToDep <= 45) return "Security";
  if (minsToDep <= 60) return "Check-in";
  if ((args.delayMinutes ?? 0) > 0) return "Delayed";
  return "Scheduled";
}

export function statusPalette(s: LiveStatus): StatusPalette {
  switch (s) {
    case "Scheduled":
      return { label: "Scheduled", badgeClass: "bg-muted text-muted-foreground", dotClass: "bg-muted-foreground" };
    case "Check-in":
      return { label: "Check-in Open", badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400", dotClass: "bg-blue-500" };
    case "Security":
      return { label: "Security Check", badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400", dotClass: "bg-orange-500" };
    case "Boarding":
      return { label: "Boarding Soon", badgeClass: "bg-red-500/15 text-red-600 dark:text-red-400 animate-pulse", dotClass: "bg-red-500" };
    case "Departed":
      return { label: "Departed", badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", dotClass: "bg-emerald-500" };
    case "Delayed":
      return { label: "Delayed", badgeClass: "bg-destructive/15 text-destructive", dotClass: "bg-destructive" };
    case "Cancelled":
      return { label: "Cancelled", badgeClass: "bg-destructive/30 text-destructive", dotClass: "bg-destructive" };
  }
}

export function formatCountdown(targetISO: string, now: Date = new Date()) {
  const diffMs = new Date(targetISO).getTime() - now.getTime();
  if (diffMs <= 0) return "now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export type TimelineStep = {
  key: "checkin" | "security" | "boarding" | "departed";
  label: string;
  minutesBefore: number;
  reached: boolean;
  current: boolean;
};

export function timelineSteps(args: {
  departureISO: string;
  delayMinutes?: number;
  now?: Date;
}): TimelineStep[] {
  const now = (args.now ?? new Date()).getTime();
  const dep = new Date(args.departureISO).getTime() + (args.delayMinutes ?? 0) * 60_000;
  const minsToDep = (dep - now) / 60_000;

  const defs: Array<Omit<TimelineStep, "reached" | "current">> = [
    { key: "checkin", label: "Check-in Open", minutesBefore: 60 },
    { key: "security", label: "Security Check", minutesBefore: 45 },
    { key: "boarding", label: "Boarding", minutesBefore: 30 },
    { key: "departed", label: "Departed", minutesBefore: 0 },
  ];

  return defs.map((d, i) => {
    const reached = minsToDep <= d.minutesBefore;
    const next = defs[i + 1];
    const current = reached && (!next || minsToDep > next.minutesBefore);
    return { ...d, reached, current };
  });
}
