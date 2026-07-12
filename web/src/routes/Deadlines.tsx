import { useMemo, useState } from 'react';
import type { Task } from '@/types';
import { AppShell } from '@/components/AppShell';
import { TaskRow } from '@/components/TaskRow';
import { TaskDetailSheet } from '@/components/TaskDetailSheet';
import { EmptyState } from '@/components/EmptyState';
import { useTaskStore, upcoming } from '@/store/useTaskStore';
import { useUiStore } from '@/store/useUiStore';
import { subjectFor, subjectStyle } from '@/lib/subjects';
import { fmtDate } from '@/lib/dates';
import { CalendarX } from 'lucide-react';

export function Deadlines() {
  const tasks = useTaskStore((s) => s.tasks);
  const { subjectFilter, setSubjectFilter, theme } = useUiStore();
  const [open, setOpen] = useState<Task | null>(null);

  const all = useMemo(() => upcoming(tasks), [tasks]);

  const subjects = useMemo(() => {
    const map = new Map<string, ReturnType<typeof subjectFor>>();
    for (const t of all) {
      const s = subjectFor(t.classId, t.detail?.className);
      map.set(s.classId, s);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [all]);

  const filtered = subjectFilter ? all.filter((t) => t.classId === subjectFilter) : all;

  // group by calendar day
  const byDay = useMemo(() => {
    const g = new Map<string, Task[]>();
    for (const t of filtered) {
      const key = t.due.slice(0, 10);
      (g.get(key) || g.set(key, []).get(key)!).push(t);
    }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <AppShell title="Deadline">
      {/* subject filter — horizontal scroll on mobile */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setSubjectFilter(null)}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${!subjectFilter ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground'}`}
        >
          Semua
        </button>
        {subjects.map((s) => {
          const st = subjectStyle(s.hue, theme === 'dark');
          const active = subjectFilter === s.classId;
          return (
            <button
              key={s.classId}
              onClick={() => setSubjectFilter(s.classId)}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
              style={active ? { background: st.dot, color: '#fff' } : { background: st.bg, color: st.fg }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {byDay.length === 0 ? (
        <EmptyState icon={<CalendarX className="size-8" />} title="Tidak ada deadline" hint="Coba ganti filter mapel." />
      ) : (
        <div className="flex flex-col gap-5">
          {byDay.map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-semibold capitalize">{fmtDate(day + 'T00:00:00')}</h2>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <TaskRow key={t.id} task={t} onOpen={setOpen} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <TaskDetailSheet task={open} onClose={() => setOpen(null)} />
    </AppShell>
  );
}
