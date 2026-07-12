import { Badge } from '@/components/ui/badge';
import type { TaskStatus } from '@/types';
import { cn } from '@/lib/utils';
import { CircleDashed, Loader, CheckCircle2 } from 'lucide-react';

const MAP: Record<TaskStatus, { label: string; cls: string; Icon: typeof CircleDashed }> = {
  todo: { label: 'Belum', cls: 'border-transparent bg-secondary text-muted-foreground', Icon: CircleDashed },
  doing: { label: 'Dikerjakan', cls: 'border-transparent bg-doing/15 text-doing', Icon: Loader },
  submitted: { label: 'Disubmit', cls: 'border-transparent bg-submitted/15 text-submitted', Icon: CheckCircle2 },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, cls, Icon } = MAP[status];
  return (
    <Badge className={cn(cls)}>
      <Icon className="size-3" /> {label}
    </Badge>
  );
}
