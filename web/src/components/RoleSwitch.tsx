import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';
import { GraduationCap, Users } from 'lucide-react';

// v1 supports two viewpoints over the same data: Ardy and Parent.
export function RoleSwitch() {
  const role = useUiStore((s) => s.role);
  const setRole = useUiStore((s) => s.setRole);
  const opts = [
    { value: 'ardy' as const, label: 'Ardy', Icon: GraduationCap },
    { value: 'parent' as const, label: 'Orang tua', Icon: Users },
  ];
  return (
    <div className="inline-flex rounded-full border bg-card p-0.5">
      {opts.map((o) => {
        const active = role === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setRole(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            )}
          >
            <o.Icon className="size-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
