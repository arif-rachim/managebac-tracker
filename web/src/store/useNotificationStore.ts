import { create } from 'zustand';
import type { AppNotification } from '@/types';
import { getNotifications, markNotification } from '@/lib/api';

interface NotifState {
  items: AppNotification[];
  load: () => void;
  unreadCount: () => number;
  toggleStar: (id: number) => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotifState>((set, get) => ({
  items: [],
  load: () => set({ items: getNotifications() }),
  unreadCount: () => get().items.filter((n) => !n.is_read).length,
  toggleStar: (id) => {
    const next = !get().items.find((n) => n.id === id)?.starred;
    markNotification(id, { starred: next });
    set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, starred: next } : n)) }));
  },
  markRead: (id) => {
    markNotification(id, { is_read: true });
    set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, is_read: true } : n)) }));
  },
  markAllRead: () => {
    get().items.forEach((n) => markNotification(n.id, { is_read: true }));
    set((s) => ({ items: s.items.map((n) => ({ ...n, is_read: true })) }));
  },
}));
