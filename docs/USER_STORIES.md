# Rencana: Sistem Pemantau Tugas Ardy

Dokumen eksplorasi v1 · DIA Dubai · ManageBac · Year 9 MYP

Tujuan: satu sistem yang membantu **Ardy** melihat & mengelola tugas dan submission-nya,
dan membantu **Arif** & **Windy** memantau agar Ardy on-track — tanpa harus login ManageBac
tiap hari.

## Untuk siapa

| Peran | Siapa | Kebutuhan inti |
|-------|-------|----------------|
| Siswa | **Ardy** (Year 9, 14 mapel) | Tahu apa yang jatuh tempo, apa yang harus disubmit, tandai yang selesai — tanpa kewalahan |
| Orang tua | **Arif** | Ringkasan harian tanpa buka ManageBac; tanda bahaya dini |
| Orang tua | **Windy** | Visibilitas penuh; bisa bantu Ardy tepat waktu |

Prinsip: **satu sumber kebenaran bersama** — yang Ardy lihat = yang orang tua lihat, beda sudut pandang saja.

## Fondasi teknis (sudah diverifikasi dari akun Ardy)

Semua ini sudah dibuktikan lewat login + 3 rekaman HAR:

- **Daftar tugas & deadline** — `GET /student/events.json` (judul, jatuh tempo, mapel, kategori)
- **Detail tiap tugas** — `GET /student/classes/{id}/events/{id}/hint` (Formative/Summative, guru, unit, deskripsi, lampiran)
- **Notifikasi & pesan** — Faria hub `mnn-hub…/api/frontend/v2/notifications` (tugas baru, reminder, digest)
- **Lampiran/materi** — `GET /attachments/{blob}` (bahan belajar)

Belum langsung tersedia: **nilai/rapor** (butuh API admin ManageBac + token sekolah), dan
**status "sudah submit"** (tidak ada di feed → kita kelola sendiri sebagai lapisan lokal, Epic B).

## User stories

Status: ✓ = selesai · 🔨 = sedang dibangun · 📅 = rencana

### Epic A — Lihat apa yang jatuh tempo (fondasi)
- **A1** ✓ Ardy melihat semua tugas mendatang urut tanggal (mapel, tipe, sisa hari).
- **A2** ✓ Tiap tugas bisa diperkaya: Formative/Summative, guru, jumlah lampiran (`track --enrich`).
- **A3** ✓ Orang tua melihat beban tugas seminggu sekilas.
- **A4** ✓ Tugas lewat tenggat ditandai jelas (⚠️/merah).

### Epic B — Kelola submission (inti permintaan)
- **B1** ✓ Ardy menandai tugas **sudah disubmit** (`submit done <id>`).
- **B2** ✓ Ardy melihat daftar **"Harus Disubmit"** (jatuh tempo & belum selesai).
- **B3** ✓ Ardy menandai "sedang dikerjakan" + catatan (mis. "nunggu kelompok").
- **B4** 🔨 Orang tua melihat daftar **risiko**: telat & belum ditandai submit.
- **B5** 📅 Sistem mencocokkan "ditandai submit" dengan status asli di ManageBac.

### Epic C — Kelola notifikasi
- **C1** ✓ Ardy melihat semua notifikasi dalam satu daftar dengan pengirim (`notifications`).
- **C2** 🔨 Ardy membintangi & menandai sudah dibaca.
- **C3** 📅 Notifikasi "tugas baru" otomatis jadi item Harus Disubmit.
- **C4** 📅 Orang tua diberi tahu saat guru menambah/memperbarui tugas.

### Epic D — Pengawasan orang tua & akuntabilitas (Fase 2)
- **D1** 📅 Arif & Windy menerima **ringkasan harian** (push/email): jatuh tempo minggu ini, telat-belum-submit, tugas baru.
- **D2** 📅 Status **on-track** hijau/kuning/merah sekilas.
- **D3** 📅 Peringatan malam sebelum **summative** jatuh tempo jika belum selesai.
- **D5** 📅 Orang tua melihat catatan Ardy ("stuck di X") untuk tahu kapan membantu.

### Epic E — Pantau per mata pelajaran (Fase 3)
- **E1** 📅 Per mapel: tugas mendatang, tugas terbaru, unit berjalan.
- **E2** 📅 Ardy melihat unit/topik tiap kelas saat ini.
- **E3** 📅 Tingkat ketepatan submit & tren keterlambatan per mapel.
- **E4** 📅 Tren nilai & feedback per mapel *(butuh token admin sekolah)*.

### Epic F — Bantu Ardy belajar (Fase 4, eksploratif)
- **F1** 📅 Proyek besar dipecah jadi langkah + mini-deadline.
- **F2** 📅 Bantuan belajar dari materi tugas (lampiran+deskripsi): ringkasan, flashcard, latihan.
- **F3** 📅 Rencana belajar + cek pemahaman per unit.
- **F4** 📅 Orang tua melihat "sisa waktu vs kapan mulai" untuk rencana sesi belajar.

## Roadmap bertahap

| Fase | Fokus | Status | Isi |
|------|-------|--------|-----|
| **0** | Fondasi API | ✓ selesai | Login aman + memetakan API (deadline, detail, notifikasi) |
| **1** | Tracker pribadi | 🔨 sedang | `track.mjs` + `submit.mjs` + `notifications.mjs`; store lokal bertahan lintas-sync |
| **2** | Otomatis + orang tua | 📅 berikutnya | Sinkron harian → digest ke HP Arif & Windy; status on-track; peringatan H-1 |
| **3** | Dashboard bersama | 📅 nanti | Web sederhana untuk keluarga; rincian per mapel |
| **4** | Pendamping belajar | 📅 eksploratif | Pecah proyek; ringkasan & latihan dari materi guru per unit |

Tiap fase menghasilkan sesuatu yang langsung berguna.

## Sudah jalan hari ini (Fase 0 & 1)

```
$ node scripts/submit.mjs
📋 To submit (overdue + next 7 days)
  🟠 2026-03-03 11:05    2d   Homework   French-Y9- online lesson  · Catherine Poudin
        id 47310231
  🛠 2026-03-02 23:55  doing  Project    MEDIA 9B Criterion A,B,C,D · Seon Lewis
        id 47312149   📝 nunggu upload dari kelompok
  pending: 9   overdue-unsubmitted: 3   submitted: 2

$ node scripts/submit.mjs done 47310231
  ✅ submitted French-Y9- online lesson
```

Alat: `track.mjs` (deadline+pengaya) · `submit.mjs` (status submit) · `notifications.mjs` (notifikasi).

## Perlu diputuskan bersama

1. **Di mana data bersama "tinggal"?** Environment ini sementara. Digest harian & dashboard butuh tempat yang selalu hidup (server kecil / layanan terjadwal). Keputusan pertama sebelum Fase 2.
2. **Lewat mana orang tua menerima ringkasan?** Push / email / WhatsApp / Telegram.
3. **Seberapa jujur "sudah submit"?** Percaya Ardy vs cocokkan otomatis ke ManageBac (B5).
4. **Nilai/rapor: minta token sekolah?** E4 butuh API admin ManageBac (`auth-token` dari admin).
5. **Keamanan kredensial Ardy** — siapa menyimpan & bagaimana diamankan (idealnya di layanan, bukan perangkat).
