// Mirrors the exact shapes produced by the sync scripts (scripts/lib/managebac.mjs,
// scripts/track.mjs). The mock adapter and the future HTTP adapter both return these.

export type TaskStatus = 'todo' | 'doing' | 'submitted';

export interface Attachment {
  name: string;
  size: string;
  href: string;
}

export interface TaskDetail {
  teacher: string | null;
  unit: string | null;
  className: string | null;
  labels: string[];
  attachments: Attachment[];
}

export interface Task {
  // feed fields (from events.json → fetchDeadlines)
  id: string;
  title: string;
  due: string; // ISO
  allDay: boolean;
  type: string; // e.g. "CoreTask"
  category: string; // Homework | Project | Report | Task | Work Sheet
  classId: string | null;
  url: string | null;
  description: string;
  // sync bookkeeping
  first_seen?: string;
  last_seen?: string;
  removed?: boolean;
  removed_at?: string;
  // local overlay (preserved across sync)
  status?: TaskStatus;
  submittedAt?: string;
  note?: string;
  detail?: TaskDetail;
}

export interface NotificationOrigin {
  name: string | null;
  type: string | null;
}

export interface AppNotification {
  id: number;
  title: string;
  created_at: string;
  event_name: string; // new_task | task_reminder | student_class_digest | ...
  sender: string | null;
  starred: boolean;
  is_read: boolean;
  preview: string;
  origin: NotificationOrigin;
}

export interface Store {
  tasks: Record<string, Task>;
  syncedAt: string | null;
}

export type Role = 'ardy' | 'parent' | 'tutor' | 'admin';
