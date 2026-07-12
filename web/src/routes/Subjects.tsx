import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { useTaskStore, activeTasks, statusOf } from '@/store/useTaskStore';
import { useUiStore } from '@/store/useUiStore';
import { subjectFor, subjectStyle } from '@/lib/subjects';
import { daysLeft } from '@/lib/dates';
import { ChevronRight } from 'lucide-react';

export function Subjects() {
  const tasks = useTaskStore((s) => s.tasks);
  const theme = useUiStore((s) => s.theme);

  const rows = useMemo(() => {
    const map = new Map<string, { subj: ReturnType<typeof subjectFor>; total: number; pending: number; overdue: number; teacher?: string | null }>();
    for (const t of activeTasks(tasks)) {
      const subj = subjectFor(t.classId, t.detail?.className);
      const r = map.get(subj.classId) || { subj, total: 0, pending: 0, overdue: 0, teacher: t.detail?.teacher };
      r.total++;
      if (statusOf(t) !== 'submitted') {
        r.pending++;
        if (daysLeft(t.due) < 0) r.overdue++;
      }
      r.teacher ||= t.detail?.teacher;
      map.set(subj.classId, r);
    }
    return [...map.values()].sort((a, b) => b.overdue - a.overdue || b.pending - a.pending);
  }, [tasks]);

  return (
    <AppShell title="Mata pelajaran">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((r) => {
          const st = subjectStyle(r.subj.hue, theme === 'dark');
          return (
            <Link
              key={r.subj.classId}
              to={`/subjects/${r.subj.classId}`}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-secondary/50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg text-sm font-semibold" style={{ background: st.bg, color: st.fg }}>
                {r.subj.label.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.subj.label}</p>
                <p className="text-xs text-muted-foreground">
                  {r.pending} aktif{r.overdue > 0 && <span className="text-overdue"> · {r.overdue} telat</span>}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
