import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/store/useNotificationStore';
import { fmtRelative } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Star, FilePlus2, BellRing, Newspaper, Upload, BellOff, CheckCheck } from 'lucide-react';

const ICON: Record<string, typeof BellRing> = {
  new_task: FilePlus2,
  task_reminder: BellRing,
  student_class_digest: Newspaper,
  new_file: Upload,
};

export function Notifications() {
  const items = useNotificationStore((s) => s.items);
  const toggleStar = useNotificationStore((s) => s.toggleStar);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <AppShell title="Notifikasi">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unread > 0 ? <span className="font-medium text-foreground">{unread} belum dibaca</span> : 'Semua sudah dibaca'}
        </p>
        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="size-4" /> Tandai semua
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<BellOff className="size-8" />} title="Belum ada notifikasi" />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => {
            const Icon = ICON[n.event_name] || BellRing;
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border bg-card p-3',
                  !n.is_read && 'border-primary/30 bg-primary/[0.03]'
                )}
              >
                <div className={cn('mt-0.5 rounded-full p-2', n.is_read ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary')}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.is_read && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    <p className={cn('truncate text-sm', !n.is_read && 'font-semibold')}>{n.title}</p>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.preview}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {n.sender ? `${n.sender} · ` : ''}
                    {n.origin.name} · {fmtRelative(n.created_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(n.id);
                  }}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary"
                  aria-label="Bintang"
                >
                  <Star className={cn('size-4', n.starred && 'fill-warn text-warn')} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
