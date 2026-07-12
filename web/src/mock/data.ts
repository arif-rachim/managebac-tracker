import type { Store, AppNotification, Task } from '@/types';

// Mock data shaped exactly like data/store.json (scripts/track.mjs output).
// Due dates are generated relative to "now" so the demo always has overdue /
// today / upcoming items regardless of when it runs. Subjects & teachers are
// the real ones discovered via API recon.

const DAY = 864e5;
function at(offsetDays: number, hh = 8, mm = 0): string {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

interface Seed {
  id: string;
  title: string;
  offset: number;
  hh?: number;
  mm?: number;
  category: string;
  classId: string;
  teacher: string;
  className: string;
  labels: string[];
  status?: Task['status'];
  note?: string;
  attachments?: { name: string; size: string }[];
  description?: string;
}

const SEEDS: Seed[] = [
  { id: '47308532', title: 'Romeo and Juliet — Act 3 analysis', offset: -3, hh: 13, mm: 20, category: 'Work Sheet', classId: '12880214', teacher: 'Camille Catherall', className: 'IB MYP Y9 English A/2 (Year 9)', labels: ['Summative', 'Work Sheet'], status: 'submitted', description: 'Analyse the balcony scene and submit your worksheet.' },
  { id: '47312149', title: 'MEDIA 9B Criterion A,B,C,D — e-Safety Campaign', offset: -1, hh: 23, mm: 55, category: 'Project', classId: '12880248', teacher: 'Seon Lewis', className: 'IB MYP Y9 Media Arts/2 AB (Year 9)', labels: ['Summative', 'Project'], status: 'doing', note: 'nunggu upload dari kelompok', attachments: [{ name: 'eSafety_brief.pdf', size: '820 KB' }], description: 'Design an e-safety campaign poster and 30s clip.' },
  { id: '47310231', title: 'French — online lesson tasks', offset: 0, hh: 11, mm: 5, category: 'Homework', classId: '12880222', teacher: 'Catherine Poudin', className: 'IB MYP Y9 French/1 Phases 1,2,3,4 (Year 9)', labels: ['Formative', 'Homework'], attachments: [{ name: 'Online_lesson_mardi.pptx', size: '1.29 MB' }], description: 'Ouvre le PowerPoint et complète les tâches.' },
  { id: '47046023', title: 'DD_Unit 3 — Criterion B', offset: 0, hh: 15, mm: 0, category: 'Task', classId: '12880206', teacher: 'Anuradha Harikrishnan', className: 'IB MYP Y9 DD A (Year 9)', labels: ['Summative'], description: 'Complete the investigation section of Criterion B.' },
  { id: '47331249', title: 'Theatre 9AB1 — reflection', offset: 1, hh: 23, mm: 15, category: 'Report', classId: '12880286', teacher: 'Jill Martin', className: 'IB MYP Y9 Theatre/1 AB (Year 9)', labels: ['Formative', 'Report'], description: 'Write a reflection on the online learning session.' },
  { id: '47355475', title: 'Science — Criterion B Summative', offset: 2, hh: 9, mm: 40, category: 'Project', classId: '12880273', teacher: 'Kathryn Louise Keiller', className: 'IB MYP Y9 Science A (Year 9)', labels: ['Summative', 'Project'], attachments: [{ name: 'lab_rubric.pdf', size: '210 KB' }], description: 'Design and write up your investigation.' },
  { id: '47356230', title: 'Arabic — Unit 2 Criterion A2 & D2', offset: 3, hh: 20, mm: 0, category: 'Task', classId: '12880295', teacher: 'Rehab Ahmed Shosha', className: 'IB MYP Y9ABCD Arabic B/3 (Year 9)', labels: ['Formative'], description: 'Listening + writing task.' },
  { id: '47360111', title: 'Islamic — Unit 3 Criterion A2', offset: 5, hh: 12, mm: 0, category: 'Homework', classId: '12880235', teacher: 'Ahmed Othman', className: 'IB MYP Y9 Islamic (Year 9)', labels: ['Formative', 'Homework'] },
  { id: '47362777', title: 'Community Project — Criterion D', offset: 6, hh: 23, mm: 25, category: 'Project', classId: '12925270', teacher: 'Supervisor', className: 'IB MYP Y9 Community Project (Year 9)', labels: ['Summative', 'Project'], description: 'Reflect on your service action.' },
  { id: '47370090', title: 'PE — fitness log week 4', offset: 9, hh: 13, mm: 0, category: 'Task', classId: '12880264', teacher: 'Mihail Kouzev', className: 'IB MYP Y9 PE ABC-Boys/2 (Year 9)', labels: ['Formative'] },
  { id: '47380042', title: 'Visual Art — Stained Glass prototype', offset: 12, hh: 7, mm: 0, category: 'Project', classId: '12880236', teacher: 'Camille Catherall', className: 'IB MYP Y9 Visual Art (Year 9)', labels: ['Summative', 'Project'], description: 'Submit blueprint + physical prototype.' },
];

export function buildStore(): Store {
  const tasks: Store['tasks'] = {};
  const nowIso = new Date().toISOString();
  for (const s of SEEDS) {
    tasks[s.id] = {
      id: s.id,
      title: s.title,
      due: at(s.offset, s.hh, s.mm),
      allDay: false,
      type: 'CoreTask',
      category: s.category,
      classId: s.classId,
      url: `https://diadubai.managebac.com/student/classes/${s.classId}/core_tasks/${s.id}`,
      description: s.description || '',
      first_seen: nowIso,
      last_seen: nowIso,
      removed: false,
      status: s.status,
      note: s.note,
      detail: {
        teacher: s.teacher,
        unit: null,
        className: s.className,
        labels: s.labels,
        attachments: (s.attachments || []).map((a) => ({ ...a, href: '#' })),
      },
    };
  }
  return { tasks, syncedAt: at(0, new Date().getHours(), new Date().getMinutes()) };
}

export function buildNotifications(): AppNotification[] {
  const mk = (id: number, offsetH: number, event: string, title: string, sender: string | null, preview: string, className: string, read = false, starred = false): AppNotification => ({
    id,
    title,
    created_at: new Date(Date.now() - offsetH * 36e5).toISOString(),
    event_name: event,
    sender,
    starred,
    is_read: read,
    preview,
    origin: { name: className, type: 'IbClass' },
  });
  return [
    mk(1339990324, 2, 'new_task', 'New Task: Science — Criterion B Summative', 'Kathryn Louise Keiller', 'Kathryn has just added a new Task in IB MYP Y9 Science A.', 'IB MYP Y9 Science A'),
    mk(1339139509, 6, 'task_reminder', 'Task Reminder: MEDIA 9B e-Safety Campaign', 'Seon Lewis', 'Seon is reminding you about the Task due tomorrow.', 'IB MYP Y9 Media Arts', false, true),
    mk(1338351459, 20, 'new_task', 'New Task: Arabic — Unit 2 Criterion A2 & D2', 'Rehab Ahmed Shosha', 'Rehab has just added a new Task in Arabic B.', 'IB MYP Y9 Arabic B'),
    mk(1337384671, 30, 'student_class_digest', 'Class Digest — French', null, 'Upcoming Tasks and Deadlines this week for French.', 'IB MYP Y9 French', true),
    mk(1336352244, 52, 'new_file', 'New File Uploaded — French lesson', 'Catherine Poudin', 'Catherine uploaded Online_lesson_mardi.pptx.', 'IB MYP Y9 French', true),
  ];
}
