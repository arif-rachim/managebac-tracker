import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '@/types';

interface UiState {
  role: Role;
  theme: 'light' | 'dark';
  subjectFilter: string | null; // classId or null = all
  setRole: (r: Role) => void;
  toggleTheme: () => void;
  setSubjectFilter: (id: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      role: 'ardy',
      theme: 'light',
      subjectFilter: null,
      setRole: (role) => set({ role }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setSubjectFilter: (subjectFilter) => set({ subjectFilter }),
    }),
    { name: 'mbt.ui.v1' }
  )
);
