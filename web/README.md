# Tracker Ardy — Web UI

Mobile-first frontend untuk memvisualkan data ManageBac (deadline, submission,
notifikasi) untuk Ardy & orang tua. Ini implementasi awal dari Fase 3 di
[`../docs/USER_STORIES.md`](../docs/USER_STORIES.md).

## Stack
React 18 + Vite + TypeScript · Zustand · Tailwind CSS · komponen bergaya
shadcn/ui (Radix) · React Router · lucide-react · sonner.

## Jalankan
```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + build produksi ke dist/
```

## Sumber data (v1 = mock)
UI membaca **data contoh** berbentuk `store.json` (hasil `scripts/track.mjs`)
lewat `src/lib/api.ts`. Mutasi (status submit, catatan, baca/bintang notifikasi)
disimpan di `localStorage`. Antarmuka `api.ts` sengaja dibuat agar mudah diganti
ke adapter HTTP asli nanti tanpa mengubah komponen:
`GET /api/store · GET /api/notifications · POST /api/tasks/:id/status ...`

## Yang ada di v1
- **Hari ini** — daftar "harus disubmit" (telat + 7 hari), ringkasan, tandai selesai cepat. Ganti peran ke **Orang tua** untuk tampilan ringkasan/risiko.
- **Deadline** — semua tugas mendatang, dikelompokkan per tanggal, filter per mapel.
- **Notifikasi** — daftar dengan hitung belum-dibaca, bintang & tandai dibaca.
- **Mapel** — daftar mata pelajaran → detail tugas per mapel.
- Task detail sheet (status todo/doing/submitted, catatan, lampiran), light/dark,
  bottom-nav di mobile ↔ sidebar di desktop, penanda "data per <sync terakhir>".

## Belum termasuk (kerangka saja)
Guru les (Epic G) & admin sync-health penuh (Epic H) — role enum & `SyncBanner`
sudah disiapkan. Backend/auth asli, push notification, nilai — fase berikutnya.

## Struktur
```
src/
  types.ts                 shape data (mirror script output)
  lib/    api.ts mock.ts subjects.ts dates.ts utils.ts
  store/  useTaskStore useNotificationStore useUiStore
  components/  ui/* + TaskRow, TaskDetailSheet, BottomNav, AppShell, …
  routes/ Today, Deadlines, Notifications, Subjects, SubjectDetail
  mock/   data.ts
```
