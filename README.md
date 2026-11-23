# NadhiLearn — Online Course Platform

NadhiLearn adalah platform pembelajaran online yang menyediakan ruang bagi pengguna untuk memperoleh pengetahuan baru, mengembangkan keterampilan, dan meningkatkan potensi diri melalui berbagai kursus yang mudah diakses.

## Teknologi yang Digunakan

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- PostgreSQL (Raw SQL dengan library `pg`, tanpa ORM)
- Autentikasi JWT (`jose`) dan hashing password (`bcryptjs`)
- Node.js

## Requirements

- Node.js LTS
- PostgreSQL + pgAdmin 4
- Visual Studio Code

## Instalasi

### 1. Install Dependencies

```bash
npm install
```

### 2. Membuat Database

1. Buka pgAdmin.
2. Buat database bernama `NadhiLearn_db`.
3. Buka Query Tool pada database tersebut.
4. Jalankan seluruh isi file `database.sql`.

File `database.sql` menghapus tabel lama (`DROP TABLE ... CASCADE`), membuat ulang seluruh skema, lalu mengisi data contoh. Jangan dijalankan pada database yang berisi data yang ingin dipertahankan.

### 3. Konfigurasi Environment

Salin `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Di Windows PowerShell:

```powershell
copy .env.example .env.local
```

Isi variabel berikut di `.env.local`:

| Variabel | Keterangan |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL, format `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`. Ganti `GANTI_PASSWORD_POSTGRES` dengan password PostgreSQL kamu. |
| `JWT_SECRET` | Secret untuk menandatangani token login. Buat dengan perintah di bawah. |

Generate `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Menjalankan Aplikasi

```bash
npm run dev
```

Buka aplikasi di http://localhost:3000

Untuk menguji koneksi database: http://localhost:3000/api/health

## Struktur Database

Skema terdiri dari 11 tabel:

| Tabel | Fungsi |
| --- | --- |
| `users` | Akun pengguna (role `admin`, `teacher`, `student`) dan status persetujuan teacher |
| `categories` | Kategori kursus |
| `courses` | Data kursus, thumbnail, dan periode kursus |
| `contents` | Materi dalam kursus, berurutan per kursus |
| `enrollments` | Pendaftaran student ke kursus |
| `content_progress` | Progres penyelesaian materi per pendaftaran |
| `certificates` | Sertifikat kelulusan dengan kode verifikasi unik |
| `comments` | Diskusi pada setiap materi |
| `testimonials` | Testimoni yang tampil di halaman utama |
| `course_transfer_requests` | Permintaan transfer kepemilikan kursus antar teacher |
| `course_transfer_items` | Daftar kursus yang termasuk dalam satu permintaan transfer |

Data contoh: 6 kategori, 8 kursus, 32 materi, 24 pendaftaran, 8 sertifikat, 12 komentar, dan 17 testimoni.

Kategori contoh: Development, Business, Design, Marketing, Data Science, dan Personal Growth.

## Akun Contoh

Password semua akun: `NadhiLearn123!`

| Role | Nama | Email |
| --- | --- | --- |
| Admin | Admin NadhiLearn | admin@nadhilearn.id |
| Teacher | M. Raikhan Ramadhan, S.Kom., M.Eng. | raikhan@nadhilearn.id |
| Teacher | Ir. Talista Anindya | talista@nadhilearn.id |
| Teacher | Aisyah AT, S.Ars. | aisyah@nadhilearn.id |
| Teacher (menunggu persetujuan) | Fajar Nugroho | fajar@nadhilearn.id |
| Student | John Wick | john@mail.nadhilearn.id |
| Student | Arthur Morgan | arthur@mail.nadhilearn.id |
| Student | Hailey Bieber | hailey@mail.nadhilearn.id |
| Student | Muhammad Taesan | taesan@mail.nadhilearn.id |
| Student | Jackie Chan | jackie@mail.nadhilearn.id |
| Student | Rizky Febian | rizky@mail.nadhilearn.id |

## Fitur Platform

**Umum**
- Registrasi, login, dan logout
- Homepage dengan katalog kursus dan testimoni
- Detail kursus
- Pengaturan profil akun
- Verifikasi keaslian sertifikat melalui kode sertifikat (`/verify-certificates`)

**Admin**
- Dashboard dan persetujuan pengajuan teacher
- Manajemen pengguna
- Manajemen kategori
- Manajemen kursus (termasuk upload thumbnail)
- Manajemen testimoni

**Teacher**
- Dashboard teacher
- Manajemen kursus dan materi
- Pemantauan progres student
- Forum diskusi pada setiap materi
- Transfer kepemilikan kursus ke teacher lain

**Student**
- Dashboard student
- Katalog kursus dan pendaftaran kursus
- Kursus saya dan halaman belajar
- Pelacakan progres belajar
- Sertifikat kelulusan

## Catatan

- File `.env.local` berisi informasi rahasia dan tidak boleh diunggah ke GitHub. File tersebut sudah masuk `.gitignore`.
- File `database.sql` berada di luar folder `/app`.
- Akses database menggunakan PostgreSQL Raw SQL melalui library `pg`, bukan ORM.
- Thumbnail kursus yang diunggah tersimpan di `public/uploads/courses`.

## Developer

NadhiLearn — Individual Project 4
