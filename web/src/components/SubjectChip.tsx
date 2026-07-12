import { subjectFor, subjectStyle } from '@/lib/subjects';
import { useUiStore } from '@/store/useUiStore';

export function SubjectChip({ classId, className, small }: { classId: string | null; className?: string | null; small?: boolean }) {
  const theme = useUiStore((s) => s.theme);
  const subj = subjectFor(classId, className);
  const st = subjectStyle(subj.hue, theme === 'dark');
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium"
      style={{ background: st.bg, color: st.fg, padding: small ? '1px 8px' : '2px 10px', fontSize: small ? 11 : 12 }}
    >
      <span className="size-1.5 rounded-full" style={{ background: st.dot }} />
      {subj.label}
    </span>
  );
}
