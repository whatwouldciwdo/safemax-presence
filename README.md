# 🛡️ SAFEMAX PRESENCE - Web Attendance System (Neumorphism UI)

Sistem absensi kehadiran karyawan berbasis web modern dengan desain antarmuka **Neumorphism (Soft UI)**, validasi foto selfie langsung dari webcam browser, dashboard admin interaktif untuk pemantauan dan penarikan data (Export CSV/Excel), serta integrasi database **Supabase**.

---

## 🚀 Fitur Utama

### 1. 📷 Presensi Selfie (Clock In & Clock Out)
- **Kamera Selfie Langsung**: Terintegrasi langsung dengan browser melalui Web MediaDevices API (mendukung kamera depan/belakang serta switch camera di mobile).
- **Panduan Posisi Wajah**: Terdapat indikator oval panduan agar foto wajah terambil dengan jelas.
- **Clock In & Clock Out**: Tombol neumorphic dengan feedback status real-time.
- **Foto Preview & Modal**: Foto tersimpan dan dapat ditinjau kapan saja.

### 2. ⏰ Aturan Jam Kerja & Kuota Minimal 24 Hari / Bulan
- **Jam Masuk**: `07:00 WIB`
  - Toleransi Keterlambatan: `15 Menit` (hingga `07:15 WIB`)
  - Jam masuk $\le$ 07:15 WIB $\rightarrow$ Status **Tepat Waktu** (`on_time`)
  - Jam masuk $>$ 07:15 WIB $\rightarrow$ Status **Terlambat** (`late`)
- **Jam Pulang**: `16:00 WIB` (Jam 4 sore)
- **Kuota Wajib 24 Hari / Bulan**:
  - Pegawai wajib hadir minimal **24 hari** dalam 1 bulan kalender.
  - Hari Sabtu & Minggu **BUKAN** lembur, melainkan dihitung sebagai kehadiran kerja reguler untuk memenuhi kuota 24 hari.

### 3. 📊 Dashboard Admin & Penarikan Data (Rekap Kuota 24 Hari & Log Harian)
- **Tab Rekap Kuota Bulanan (Target 24 Hari)**:
  - Indikator Visual Capaian: `Target Tercapai (≥ 24 Hari)` vs `Kurang X Hari (< 24 Hari)` vs `Surplus (+X Hari Ekstra)`.
  - Neumorphic Progress Bar kuota kehadiran per karyawan.
  - Filter Periode Bulan (`YYYY-MM`), Filter Status Capaian Kuota, dan Filter Departemen.
  - **Export Rekap Kuota Bulanan (CSV)**: Siap pakai untuk laporan payroll / HR.
- **Tab Log Harian & Verifikasi Selfie**:
  - Tinjauan absensi per hari dengan thumbnail selfie masuk dan pulang.
  - Export data log harian ke format CSV.
- **Manajemen Karyawan**: Tambah karyawan baru, atur NIK, departemen, dan role (Admin HR / Staff).

### 4. 🎨 UI Neumorphism (Soft UI)
- Komponen card, button, input, dan badge dengan perpaduan bayangan lembut (*soft shadows*) `raised` dan `inset/pressed`.
- Warna latar belakang tenang `#e2e8f0` yang nyaman di mata.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS v4 + Custom Neumorphic Design System
- **Database & Storage**: Supabase (PostgreSQL + Supabase Storage Bucket `attendance-selfies`)
- **Icon**: Lucide React

---

## 🧭 Mode Demo dan Production

Mode aplikasi dipilih secara eksplisit saat proses dijalankan atau dibangun. Aplikasi tidak melakukan fallback diam-diam dari production ke data demo.

### Mode Demo

- Selalu memakai mock data dan `localStorage` browser.
- Tidak mengakses Supabase walaupun `.env.local` berisi URL dan anon key.
- Cocok untuk presentasi dan pengujian UI pada satu browser.
- Data dapat hilang ketika data browser dibersihkan dan tidak dibagikan antarperangkat.

```bash
npm run dev:demo
npm run build:demo
npm run start:demo
```

`npm run dev` merupakan alias untuk `dev:demo` agar pengembangan lokal aman secara default.

### Mode Production

- Selalu memakai Supabase untuk profil, presensi, dan foto selfie.
- Tidak menggunakan mock data/localStorage sebagai fallback data.
- Kegagalan koneksi atau konfigurasi akan ditampilkan sebagai error, sehingga tidak disalahartikan sebagai data kosong.

1. Buka dashboard proyek Anda di [Supabase](https://supabase.com).
2. Jalankan `supabase/schema.sql` melalui SQL Editor untuk membuat tabel, policy, bucket `attendance-selfies`, dan profil awal.
3. Salin `.env.production.example` menjadi `.env.local`, lalu isi URL dan anon key:

   ```env
   NEXT_PUBLIC_APP_MODE=production
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

4. Build dan jalankan aplikasi:

   ```bash
   npm run build:production
   npm run start:production
   ```

`npm run build` dan `npm run start` merupakan alias mode production. Variabel `NEXT_PUBLIC_*` ditanam ke bundle saat build, jadi lakukan build ulang setelah nilainya berubah.

### Pemeriksaan sebelum deploy

```bash
npm run lint
npm run build:production
```

Pastikan tabel `employees`, `attendances`, `work_settings`, dan bucket `attendance-selfies` tersedia sebelum aplikasi digunakan.

> **Batasan keamanan:** mode production saat ini tetap menggunakan kredensial login lokal di bundle browser dan policy Supabase yang permisif. Ini sesuai kebutuhan login lokal sederhana dan penggunaan internal, tetapi bukan autentikasi kuat untuk aplikasi publik. Untuk akses internet publik, migrasikan autentikasi/otorisasi ke server atau Supabase Auth dan perketat RLS.

---

## 🔑 Akun Login Default

Halaman utama aplikasi adalah **Halaman Login** (`/`). Login menggunakan akun lokal tanpa Supabase Auth:

| Nama | Jabatan | Username / NIP | Password | Akses |
|---|---|---|---|---|
| Administrator | Administrator Sistem | `admin` / `ADM-001` | `admin123` | Admin |
| Alpin Alpiansyah | Supervisor | `alpin` / `021` | `021` | Karyawan |
| Ricky Hendra Firmansyah | Teknisi | `ricky` / `022` | `022` | Karyawan |
| Johari | Teknisi | `johari` / `023` | `023` | Karyawan |
| Agam Fuady | Helper | `agam` / `024` | `024` | Karyawan |
| Nofiatul Jannah | Staf Administrasi | `nofiatul` / `025` | `025` | Karyawan |

---

## 📱 Mobile-First & Responsive UX

Sistem didesain khusus agar nyaman digunakan langsung melalui **Smartphone / HP Karyawan & Admin**:
1. **Mobile Bottom Navigation Bar**: Menu navigasi ala aplikasi mobile native di bagian bawah layar memudahkan navigasi dengan satu jempol.
2. **Mobile Card List View**: Di perangkat seluler, tabel presensi admin otomatis berubah menjadi susunan kartu compact yang bersih tanpa perlu scroll horizontal yang melelahkan.
3. **Kamera Selfie Responsif**: Viewport kamera otomatis menyesuaikan tinggi dan lebar layar HP dengan tombol ambil foto besar dan touch-friendly di bawah.
4. **Sentuhan Neumorphic**: Area tombol berukuran minimal 48px memenuhi standar aksesibilitas touch screen.

---

## 🏃 Menjalankan Aplikasi

Aplikasi saat ini telah aktif di server lokal Anda:

```bash
# Jalankan development server
npm run dev
```

Buka peramban Anda di:
- **Halaman Login Utama**: [http://localhost:3010/](http://localhost:3010/)
- **Halaman Presensi Karyawan**: [http://localhost:3010/absensi](http://localhost:3010/absensi)
- **Riwayat Presensi Karyawan**: [http://localhost:3010/riwayat](http://localhost:3010/riwayat)
- **Dashboard Admin**: [http://localhost:3010/admin](http://localhost:3010/admin)
- **Tarik & Rekap Data Absensi**: [http://localhost:3010/admin/rekap](http://localhost:3010/admin/rekap)
- **Manajemen Karyawan**: [http://localhost:3010/admin/karyawan](http://localhost:3010/admin/karyawan)

