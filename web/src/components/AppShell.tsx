import type { ReactNode } from 'react';
import { BottomNav, SideNav } from './BottomNav';
import { SyncBanner } from './SyncBanner';
import { RoleSwitch } from './RoleSwitch';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/useUiStore';
import { Moon, Sun } from 'lucide-react';

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
            <h1 className="text-lg font-semibold">{title}</h1>
            <div className="flex items-center gap-2">
              <RoleSwitch />
              <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Ganti tema">
                {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </div>
          </div>
          <SyncBanner />
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-4 md:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
