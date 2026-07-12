import { useEffect, useState } from 'react';
import type { Task, TaskStatus } from '@/types';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SubjectChip } from './SubjectChip';
import { DueBadge } from './DueBadge';
import { statusOf, useTaskStore } from '@/store/useTaskStore';
import { fmtDate, fmtTime } from '@/lib/dates';
import { Paperclip, CircleDashed, Loader, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const OPTIONS: { value: TaskStatus; label: string; Icon: typeof CircleDashed }[] = [
  { value: 'todo', label: 'Belum', Icon: CircleDashed },
  { value: 'doing', label: 'Dikerjakan', Icon: Loader },
  { value: 'submitted', label: 'Disubmit', Icon: CheckCircle2 },
];

export function TaskDetailSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const markStatus = useTaskStore((s) => s.markStatus);
  const markNote = useTaskStore((s) => s.markNote);
  const [note, setNote] = useState('');

  useEffect(() => {
    setNote(task?.note || '');
  }, [task?.id, task?.note]);

  if (!task) return null;
  const status = statusOf(task);

  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <div className="overflow-y-auto px-5 pb-6 pt-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SubjectChip classId={task.classId} className={task.detail?.className} />
            <DueBadge due={task.due} />
          </div>
          <SheetTitle className="pr-8">{task.title}</SheetTitle>
          <p className="mt-1 text-sm text-muted-foreground tnum">
            {fmtDate(task.due)} · {fmtTime(task.due)}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {task.detail?.labels?.map((l) => (
              <span key={l} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {l}
              </span>
            ))}
          </div>

          {/* status control */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map((o) => {
                const active = status === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => {
                      markStatus(task.id, o.value);
                      if (o.value === 'submitted') toast.success('Ditandai sudah disubmit', { description: task.title });
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                      active
                        ? o.value === 'submitted'
                          ? 'border-submitted bg-submitted/10 text-submitted'
                          : o.value === 'doing'
                            ? 'border-doing bg-doing/10 text-doing'
                            : 'border-primary bg-primary/10 text-primary'
                        : 'border-input text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    <o.Icon className="size-4" />
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {task.detail?.teacher && (
            <>
              <Separator className="my-5" />
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Guru</dt>
                <dd>{task.detail.teacher}</dd>
                {task.detail.className && (
                  <>
                    <dt className="text-muted-foreground">Kelas</dt>
                    <dd>{task.detail.className}</dd>
                  </>
                )}
                {task.detail.unit && (
                  <>
                    <dt className="text-muted-foreground">Unit</dt>
                    <dd>{task.detail.unit}</dd>
                  </>
                )}
              </dl>
            </>
          )}

          {task.description && (
            <>
              <Separator className="my-5" />
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detail</p>
              <p className="text-sm leading-relaxed">{task.description}</p>
            </>
          )}

          {!!task.detail?.attachments?.length && (
            <div className="mt-4 flex flex-col gap-2">
              {task.detail.attachments.map((a) => (
                <a
                  key={a.name}
                  href={a.href}
                  className="flex items-center gap-2 rounded-lg border bg-secondary/40 px-3 py-2 text-sm hover:bg-secondary"
                >
                  <Paperclip className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                  <span className="text-xs text-muted-foreground">{a.size}</span>
                </a>
              ))}
            </div>
          )}

          {/* note */}
          <Separator className="my-5" />
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Catatan</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (task.note || '') && markNote(task.id, note)}
            placeholder="mis. nunggu kelompok, sudah 50%…"
            rows={2}
            className="w-full resize-none rounded-lg border border-input bg-card p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          <Button className="mt-5 w-full" onClick={onClose}>
            Selesai
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
