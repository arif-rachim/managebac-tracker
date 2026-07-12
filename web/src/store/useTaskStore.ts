import { create } from 'zustand';
import type { Task, TaskStatus } from '@/types';
import { getStore, setStatus as apiSetStatus, setNote as apiSetNote } from '@/lib/api';
import { daysLeft } from '@/lib/dates';

interface TaskState {
  tasks: Record<string, Task>;
  syncedAt: string | null;
  load: () => void;
  markStatus: (id: string, status: TaskStatus) => void;
  markNote: (id: string, note: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: {},
  syncedAt: null,
  load: () => {
    const s = getStore();
    set({ tasks: s.tasks, syncedAt: s.syncedAt });
  },
  markStatus: (id, status) => {
    apiSetStatus(id, status);
    set((st) => {
      const t = st.tasks[id];
      if (!t) return st;
      const submittedAt = status === 'submitted' ? new Date().toISOString() : undefined;
      return { tasks: { ...st.tasks, [id]: { ...t, status, submittedAt } } };
    });
  },
  markNote: (id, note) => {
    apiSetNote(id, note);
    set((st) => {
      const t = st.tasks[id];
      if (!t) return st;
      return { tasks: { ...st.tasks, [id]: { ...t, note } } };
    });
  },
}));

// ---- selectors (plain helpers over the tasks map) ----
export const statusOf = (t: Task): TaskStatus => t.status || 'todo';

export function activeTasks(tasks: Record<string, Task>): Task[] {
  return Object.values(tasks).filter((t) => !t.removed);
}

export function pendingTasks(tasks: Record<string, Task>): Task[] {
  return activeTasks(tasks).filter((t) => statusOf(t) !== 'submitted');
}

// overdue + next 7 days, not submitted — the "To Submit" list (mirrors submit.mjs)
export function toSubmit(tasks: Record<string, Task>, now = new Date()): Task[] {
  return pendingTasks(tasks)
    .filter((t) => daysLeft(t.due, now) <= 7)
    .sort((a, b) => a.due.localeCompare(b.due));
}

export function upcoming(tasks: Record<string, Task>, now = new Date()): Task[] {
  return activeTasks(tasks)
    .filter((t) => daysLeft(t.due, now) >= -1)
    .sort((a, b) => a.due.localeCompare(b.due));
}

export function counts(tasks: Record<string, Task>, now = new Date()) {
  const pending = pendingTasks(tasks);
  return {
    pending: pending.length,
    overdue: pending.filter((t) => daysLeft(t.due, now) < 0).length,
    submitted: activeTasks(tasks).filter((t) => statusOf(t) === 'submitted').length,
    dueThisWeek: pending.filter((t) => daysLeft(t.due, now) >= 0 && daysLeft(t.due, now) <= 7).length,
  };
}
