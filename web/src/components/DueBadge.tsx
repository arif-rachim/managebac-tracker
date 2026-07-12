import { Badge } from '@/components/ui/badge';
import { daysLeft, dueLabel } from '@/lib/dates';
import { cn } from '@/lib/utils';

// colour by urgency: overdue red, ≤1 red, ≤3 amber, ≤7 primary, later muted
export function DueBadge({ due, now }: { due: string; now?: Date }) {
  const d = daysLeft(due, now);
  const cls =
    d < 0
      ? 'border-transparent bg-overdue/15 text-overdue'
      : d <= 1
        ? 'border-transparent bg-overdue/15 text-overdue'
        : d <= 3
          ? 'border-transparent bg-warn/15 text-warn'
          : d <= 7
            ? 'border-transparent bg-primary/12 text-primary'
            : 'border-transparent bg-secondary text-muted-foreground';
  return <Badge className={cn('tnum', cls)}>{dueLabel(due, now)}</Badge>;
}
