import { useTaskStore } from '@/store/useTaskStore';
import { fmtRelative } from '@/lib/dates';
import { RefreshCw, AlertTriangle } from 'lucide-react';

// Epic H8 — every view shows "data as of <last sync>", with a staleness warning.
export function SyncBanner() {
  const syncedAt = useTaskStore((s) => s.syncedAt);
  if (!syncedAt) return null;
  const hours = (Date.now() - new Date(syncedAt).getTime()) / 36e5;
  const stale = hours > 24;
  return (
    <div className="flex items-center justify-center gap-1.5 px-4 py-1 text-[11px] text-muted-foreground">
      {stale ? <AlertTriangle className="size-3 text-warn" /> : <RefreshCw className="size-3" />}
      <span>
        data per {fmtRelative(syncedAt)}
        {stale && <span className="ml-1 font-medium text-warn">· mungkin sudah basi</span>}
      </span>
    </div>
  );
}
