
# NadhiLearn — Online Course Platform

NadhiLearn adalah platform pembelajaran online yang menyediakan ruang bagi pengguna untuk memperoleh pengetahuan baru, mengembangkan keterampilan, dan meningkatkan potensi diri melalui berbagai kursus yang mudah diakses.

## Teknologi yang Digunakan

- Next.js
- React
- Tailwind CSS
- PostgreSQL
- Node.js

## Requirements

- Node.js LTS
- PostgreSQL + pgAdmin 4
- Visual Studio Code

## Instalasi

### 1. Install Dependencies

Jalankan perintah berikut di terminal:

```bash
npm install
```

### 2. Membuat Database

1. Buka pgAdmin.
2. Buat database bernama `NadhiLearn_db`.
3. Buka Query Tool pada database tersebut.
4. Jalankan seluruh isi file `database.sql`.

### 3. Konfigurasi Environment

Salin `.env.example` menjadi `.env.local`.

Isi password PostgreSQL dan buat JWT secret menggunakan perintah:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Masukkan hasilnya ke variabel `JWT_SECRET` di `.env.local`.

### 4. Menjalankan Aplikasi

```bash
npm run dev
```

Buka aplikasi melalui:

http://localhost:3000

Untuk menguji koneksi database:

http://localhost:3000/api/health

## Fitur Platform

Fitur platform akan dikembangkan secara bertahap, meliputi:

- Registrasi dan login pengguna
- Manajemen pengguna
- Manajemen kursus
- Katalog dan pencarian kursus
- Pendaftaran kursus
- Materi dan progres pembelajaran
- Forum diskusi

## Catatan

- File `.env.local` berisi informasi rahasia dan tidak boleh diunggah ke GitHub.
- File `database.sql` berada di luar folder `/app`.
- Akses database menggunakan PostgreSQL Raw SQL melalui library `pg`, bukan ORM.

## Developer

NadhiLearn — Individual Project 4
