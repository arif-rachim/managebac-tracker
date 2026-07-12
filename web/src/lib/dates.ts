const DAY = 864e5;

export function daysLeft(dueIso: string, now: Date = new Date()): number {
  return Math.ceil((new Date(dueIso).getTime() - now.getTime()) / DAY);
}

export function isOverdue(dueIso: string, now: Date = new Date()): boolean {
  return daysLeft(dueIso, now) < 0;
}

// "3d", "today", "2d late"
export function dueLabel(dueIso: string, now: Date = new Date()): string {
  const d = daysLeft(dueIso, now);
  if (d < 0) return `${-d}h telat`;
  if (d === 0) return 'hari ini';
  if (d === 1) return 'besok';
  return `${d}h lagi`;
}

// grouping bucket for the deadline/to-submit lists
export function bucketOf(dueIso: string, now: Date = new Date()): 'late' | 'today' | 'week' | 'later' {
  const d = daysLeft(dueIso, now);
  if (d < 0) return 'late';
  if (d === 0) return 'today';
  if (d <= 7) return 'week';
  return 'later';
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function fmtRelative(iso: string, now: Date = new Date()): string {
  const h = (now.getTime() - new Date(iso).getTime()) / 36e5;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m lalu`;
  if (h < 48) return `${Math.round(h)}j lalu`;
  return `${Math.round(h / 24)}h lalu`;
}
