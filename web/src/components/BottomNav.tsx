import { NavLink } from 'react-router-dom';
import { CalendarCheck, CalendarDays, Bell, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/store/useNotificationStore';

const ITEMS = [
  { to: '/', label: 'Hari ini', Icon: CalendarCheck, end: true },
  { to: '/deadlines', label: 'Deadline', Icon: CalendarDays },
  { to: '/notifications', label: 'Notif', Icon: Bell },
  { to: '/subjects', label: 'Mapel', Icon: BookOpen },
];

export function BottomNav() {
  const unread = useNotificationStore((s) => s.items.filter((n) => !n.is_read).length);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {ITEMS.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <span className="relative">
                <it.Icon className="size-5" />
                {it.to === '/notifications' && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-overdue px-1 text-[9px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </span>
              {it.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// desktop sidebar variant
export function SideNav() {
  const unread = useNotificationStore((s) => s.items.filter((n) => !n.is_read).length);
  return (
    <nav className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 border-r bg-card p-3 md:flex">
      <div className="px-2 py-3">
        <p className="text-sm font-semibold">Tracker Ardy</p>
        <p className="text-xs text-muted-foreground">ManageBac · Year 9</p>
      </div>
      {ITEMS.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'
            )
          }
        >
          <it.Icon className="size-4.5" />
          <span className="flex-1">{it.label}</span>
          {it.to === '/notifications' && unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-overdue px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
