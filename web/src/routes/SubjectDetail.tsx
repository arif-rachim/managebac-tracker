import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Task } from '@/types';
import { AppShell } from '@/components/AppShell';
import { TaskRow } from '@/components/TaskRow';
import { TaskDetailSheet } from '@/components/TaskDetailSheet';
import { EmptyState } from '@/components/EmptyState';
import { useTaskStore, activeTasks } from '@/store/useTaskStore';
import { subjectFor } from '@/lib/subjects';
import { ChevronLeft, BookOpen } from 'lucide-react';

export function SubjectDetail() {
  const { classId } = useParams();
  const tasks = useTaskStore((s) => s.tasks);
  const [open, setOpen] = useState<Task | null>(null);

  const list = useMemo(
    () => activeTasks(tasks).filter((t) => t.classId === classId).sort((a, b) => a.due.localeCompare(b.due)),
    [tasks, classId]
  );
  const subj = subjectFor(classId || null, list[0]?.detail?.className);
  const teacher = list.find((t) => t.detail?.teacher)?.detail?.teacher;

  return (
    <AppShell title={subj.label}>
      <Link to="/subjects" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Semua mapel
      </Link>
      {teacher && <p className="mb-4 text-sm text-muted-foreground">Guru: {teacher}</p>}

      {list.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-8" />} title="Belum ada tugas untuk mapel ini" />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((t) => (
            <TaskRow key={t.id} task={t} onOpen={setOpen} />
          ))}
        </div>
      )}

      <TaskDetailSheet task={open} onClose={() => setOpen(null)} />
    </AppShell>
  );
}
