// The data seam. v1 = mock adapter (in-memory + localStorage for the overlay).
// A future HTTP adapter implements this same interface against the sync backend:
//   GET /api/store · GET /api/notifications · POST /api/tasks/:id/status ...
import type { Store, AppNotification, TaskStatus } from '@/types';
import { buildStore, buildNotifications } from '@/mock/data';

const OVERLAY_KEY = 'mbt.overlay.v1';
const NOTIF_KEY = 'mbt.notif.v1';

type Overlay = Record<string, { status?: TaskStatus; note?: string; submittedAt?: string }>;

function loadOverlay(): Overlay {
  try {
    return JSON.parse(localStorage.getItem(OVERLAY_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveOverlay(o: Overlay) {
  localStorage.setItem(OVERLAY_KEY, JSON.stringify(o));
}

export function getStore(): Store {
  const store = buildStore();
  const overlay = loadOverlay();
  for (const [id, patch] of Object.entries(overlay)) {
    const t = store.tasks[id];
    if (!t) continue;
    if (patch.status !== undefined) t.status = patch.status;
    if (patch.note !== undefined) t.note = patch.note;
    if (patch.submittedAt !== undefined) t.submittedAt = patch.submittedAt;
    else if (patch.status && patch.status !== 'submitted') delete t.submittedAt;
  }
  return store;
}

export function setStatus(id: string, status: TaskStatus) {
  const o = loadOverlay();
  o[id] = { ...o[id], status };
  if (status === 'submitted') o[id].submittedAt = new Date().toISOString();
  else delete o[id].submittedAt;
  saveOverlay(o);
}

export function setNote(id: string, note: string) {
  const o = loadOverlay();
  o[id] = { ...o[id], note };
  saveOverlay(o);
}

// notifications — persisted read/star flags in localStorage
type NotifFlags = Record<number, { is_read?: boolean; starred?: boolean }>;
function loadNotifFlags(): NotifFlags {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveNotifFlags(f: NotifFlags) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(f));
}

export function getNotifications(): AppNotification[] {
  const flags = loadNotifFlags();
  return buildNotifications().map((n) => ({ ...n, ...flags[n.id] }));
}

export function markNotification(id: number, patch: { is_read?: boolean; starred?: boolean }) {
  const f = loadNotifFlags();
  f[id] = { ...f[id], ...patch };
  saveNotifFlags(f);
}
