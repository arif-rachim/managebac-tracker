import { useMemo, useState } from 'react';
import type { Task } from '@/types';
import { AppShell } from '@/components/AppShell';
import { TaskRow } from '@/components/TaskRow';
import { TaskDetailSheet } from '@/components/TaskDetailSheet';
import { EmptyState } from '@/components/EmptyState';
import { useTaskStore, toSubmit, counts } from '@/store/useTaskStore';
import { useUiStore } from '@/store/useUiStore';
import { bucketOf } from '@/lib/dates';
import { toast } from 'sonner';
import { PartyPopper, TriangleAlert, CheckCircle2, ClipboardList } from 'lucide-react';

const BUCKET_LABEL: Record<string, string> = { late: 'Terlambat', today: 'Hari ini', week: 'Minggu ini', later: 'Nanti' };

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex-1 rounded-xl border bg-card p-3 text-center">
      <p className={`text-2xl font-semibold tnum ${tone || ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function Today() {
  const tasks = useTaskStore((s) => s.tasks);
  const markStatus = useTaskStore((s) => s.markStatus);
  const role = useUiStore((s) => s.role);
  const [open, setOpen] = useState<Task | null>(null);

  const list = useMemo(() => toSubmit(tasks), [tasks]);
  const c = useMemo(() => counts(tasks), [tasks]);

  const groups = useMemo(() => {
    const g: Record<string, Task[]> = { late: [], today: [], week: [] };
    for (const t of list) {
      const b = bucketOf(t.due);
      (g[b] ||= []).push(t);
    }
    return g;
  }, [list]);

  const quickDone = (t: Task) => {
    markStatus(t.id, 'submitted');
    toast.success('Mantap! Ditandai disubmit', { description: t.title });
  };

  const title = role === 'parent' ? 'Ringkasan Ardy' : 'Hari ini';

  return (
    <AppShell title={title}>
      {/* summary */}
      <div className="mb-4 flex gap-2">
        <Stat label="perlu dikerjakan" value={c.pending} />
        <Stat label="telat & belum" value={c.overdue} tone={c.overdue ? 'text-overdue' : ''} />
        <Stat label="sudah disubmit" value={c.submitted} tone="text-submitted" />
      </div>

      {role === 'parent' && (
        <div className="mb-4 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            {c.overdue > 0 ? (
              <>
                <TriangleAlert className="size-5 text-overdue" />
                <p className="text-sm font-medium">
                  {c.overdue} tugas telat & belum disubmit — perlu ditindaklanjuti.
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-5 text-submitted" />
                <p className="text-sm font-medium">Ardy on-track — tidak ada yang telat. 🎉</p>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {c.dueThisWeek} tugas jatuh tempo minggu ini.
          </p>
        </div>
      )}

      {/* to-submit grouped */}
      {list.length === 0 ? (
        <EmptyState
          icon={<PartyPopper className="size-8" />}
          title="Tidak ada yang harus disubmit"
          hint="Semua tugas dalam 7 hari ke depan sudah beres."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {(['late', 'today', 'week'] as const).map((b) =>
            groups[b]?.length ? (
              <section key={b}>
                <div className="mb-2 flex items-center gap-2">
                  {b === 'late' && <TriangleAlert className="size-4 text-overdue" />}
                  {b === 'today' && <ClipboardList className="size-4 text-primary" />}
                  <h2 className="text-sm font-semibold">{BUCKET_LABEL[b]}</h2>
                  <span className="text-xs text-muted-foreground">({groups[b].length})</span>
                </div>
                <div className="flex flex-col gap-2">
                  {groups[b].map((t) => (
                    <TaskRow key={t.id} task={t} onOpen={setOpen} onQuickDone={role === 'ardy' ? quickDone : undefined} />
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      )}

      <TaskDetailSheet task={open} onClose={() => setOpen(null)} />
    </AppShell>
  );
}
