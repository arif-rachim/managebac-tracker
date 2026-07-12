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
| Guru les | **Guru Matematika, Guru Perancis** (nanti: Sains, INS/I&S, dst) | Visibilitas **hanya ke mapel yang diajar**: tugas & PR, unit yang sedang dipelajari, apa yang perlu difokuskan & diuji |

Prinsip: **satu sumber kebenaran bersama** — yang Ardy lihat = yang orang tua lihat, beda sudut pandang saja.
Untuk guru les berlaku prinsip tambahan: **akses per-mapel (subject-scoped)** — tiap guru les hanya melihat mata pelajaran yang dia ajar, bukan seluruh data Ardy.

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

### Epic G — Guru les (per mapel) (Fase 3–4)

Ardy punya guru les per mata pelajaran (mulai dari Matematika & Perancis; nanti bisa Sains, INS,
dst). Tiap guru les butuh visibilitas **hanya ke mapelnya**, agar les selaras dengan sekolah dan
bisa fokus ke yang perlu diuji.

**Akses & kontrol**
- **G1** 📅 Orang tua mengundang guru les dan menetapkan **mapel apa** yang boleh dia lihat (akses per-mapel).
- **G2** 📅 Guru les hanya melihat data mapel yang dia ajar — bukan seluruh tugas/notifikasi/nilai Ardy (privasi).
- **G3** 📅 Orang tua bisa mencabut akses guru les kapan saja.

**Visibilitas untuk guru les**
- **G4** 📅 Guru les melihat **tugas & PR sekolah** yang mendatang di mapelnya (agar les bisa disiapkan).
- **G5** 📅 Guru les melihat **unit/topik yang sedang dipelajari** di kelas sekolah Ardy (dari data `hint`: unit + deskripsi).
- **G6** 📅 Guru les melihat **status submit** Ardy di mapelnya (sudah/belum), untuk ditindaklanjuti saat les.
- **G7** 📅 Guru les bisa membuka **materi/lampiran** tugas sekolah sebagai bahan les.
- **G8** 📅 Guru les diberi tahu saat ada **tugas baru / reminder** di mapelnya.

**Fokus & pengujian**
- **G9** 📅 Guru les menandai **topik/skill yang perlu difokuskan** (area lemah Ardy) — jadi daftar fokus per mapel.
- **G10** 📅 Guru les membuat **latihan/kuis** untuk menguji Ardy pada topik fokus tersebut.
- **G11** 📅 Guru les melihat **hasil latihan/kuis** Ardy dari waktu ke waktu (pelacakan penguasaan / mastery).
- **G12** 📅 Ardy melihat, sebelum les, **apa yang guru les minta difokuskan / disiapkan**.

**Koordinasi dengan orang tua**
- **G13** 📅 Orang tua melihat **catatan fokus & hasil uji** dari guru les, untuk memastikan les efektif dan Ardy berkembang.
- **G14** 📅 Guru les & orang tua berbagi **satu tampilan mapel** (tugas sekolah + fokus les + hasil) tanpa saling membuka data lain.

## Roadmap bertahap

| Fase | Fokus | Status | Isi |
|------|-------|--------|-----|
| **0** | Fondasi API | ✓ selesai | Login aman + memetakan API (deadline, detail, notifikasi) |
| **1** | Tracker pribadi | 🔨 sedang | `track.mjs` + `submit.mjs` + `notifications.mjs`; store lokal bertahan lintas-sync |
| **2** | Otomatis + orang tua | 📅 berikutnya | Sinkron harian → digest ke HP Arif & Windy; status on-track; peringatan H-1 |
| **3** | Dashboard bersama + guru les | 📅 nanti | Web untuk keluarga; rincian per mapel; **akses per-mapel untuk guru les** (Epic G) |
| **4** | Pendamping belajar + pengujian | 📅 eksploratif | Pecah proyek; latihan dari materi; **kuis & pelacakan penguasaan dari guru les** |

Tiap fase menghasilkan sesuatu yang langsung berguna.

**Catatan arsitektur (baru, karena guru les):** mulai Fase 3 sistem perlu **kontrol akses berbasis peran
(role-based access)** — tiap pengguna (Ardy / orang tua / guru les) hanya melihat data sesuai perannya,
dan guru les dibatasi per mapel. Ini keputusan desain penting sebelum ada login untuk pihak selain keluarga.

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
6. **Akses guru les (Epic G)** — perlu login terpisah per guru les dengan batasan per-mapel. Bagaimana guru les diundang, dan seberapa detail data yang boleh dilihat (hanya tugas & unit, atau termasuk nilai)? Ini memicu kebutuhan role-based access di Fase 3.
