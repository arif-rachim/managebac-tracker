import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Today } from '@/routes/Today';
import { Deadlines } from '@/routes/Deadlines';
import { Notifications } from '@/routes/Notifications';
import { Subjects } from '@/routes/Subjects';
import { SubjectDetail } from '@/routes/SubjectDetail';
import { useTaskStore } from '@/store/useTaskStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useUiStore } from '@/store/useUiStore';

export default function App() {
  const loadTasks = useTaskStore((s) => s.load);
  const loadNotifs = useNotificationStore((s) => s.load);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    loadTasks();
    loadNotifs();
  }, [loadTasks, loadNotifs]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/deadlines" element={<Deadlines />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/:classId" element={<SubjectDetail />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  );
}
