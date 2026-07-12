import type { Task } from '@/types';
import { statusOf } from '@/store/useTaskStore';
import { DueBadge } from './DueBadge';
import { SubjectChip } from './SubjectChip';
import { StatusBadge } from './StatusBadge';
import { fmtDate, fmtTime } from '@/lib/dates';
import { Paperclip, StickyNote, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TaskRow({ task, onOpen, onQuickDone }: { task: Task; onOpen: (t: Task) => void; onQuickDone?: (t: Task) => void }) {
  const status = statusOf(task);
  const done = status === 'submitted';
  const atts = task.detail?.attachments?.length || 0;
  return (
    <button
      onClick={() => onOpen(task)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        done && 'opacity-60'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <SubjectChip classId={task.classId} className={task.detail?.className} small />
          {task.detail?.labels?.map((l) => (
            <span key={l} className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {l}
            </span>
          ))}
        </div>
        <p className={cn('truncate text-sm font-medium', done && 'line-through')}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="tnum">{fmtDate(task.due)} · {fmtTime(task.due)}</span>
          {task.detail?.teacher && <span className="truncate">{task.detail.teacher}</span>}
          {atts > 0 && (
            <span className="inline-flex items-center gap-1"><Paperclip className="size-3" />{atts}</span>
          )}
          {task.note && (
            <span className="inline-flex items-center gap-1 text-doing"><StickyNote className="size-3" />catatan</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <DueBadge due={task.due} />
        {done ? (
          <StatusBadge status="submitted" />
        ) : onQuickDone ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onQuickDone(task);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                onQuickDone(task);
              }
            }}
            className="inline-flex items-center gap-1 rounded-full border border-submitted/40 px-2 py-0.5 text-xs font-medium text-submitted hover:bg-submitted/10"
          >
            <CheckCircle2 className="size-3" /> selesai
          </span>
        ) : (
          <StatusBadge status={status} />
        )}
      </div>
    </button>
  );
}
