-- =========================================================
-- NadhiLearn ONLINE COURSE PLATFORM
-- Jalankan seluruh file ini di pgAdmin Query Tool
-- setelah membuat database: NadhiLearn_db
--
-- PERHATIAN: file ini menghapus tabel lama lalu membuatnya ulang
-- beserta data contoh yang baru. Jangan dijalankan di database
-- yang berisi data yang ingin dipertahankan.
--
-- Akun contoh (password semua akun: NadhiLearn123!)
--   Admin   : admin@nadhilearn.id
--   Teacher : raikhan@nadhilearn.id, talista@nadhilearn.id,
--             aisyah@nadhilearn.id
--   Teacher (menunggu persetujuan): fajar@nadhilearn.id
--   Student : john@mail.nadhilearn.id, arthur@mail.nadhilearn.id,
--             hailey@mail.nadhilearn.id, taesan@mail.nadhilearn.id,
--             jackie@mail.nadhilearn.id, rizky@mail.nadhilearn.id
-- =========================================================

DROP TABLE IF EXISTS course_transfer_items CASCADE;
DROP TABLE IF EXISTS course_transfer_requests CASCADE;
DROP TABLE IF EXISTS testimonials CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS content_progress CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS contents CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =========================================================
-- SKEMA
-- =========================================================

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student'
        CHECK (role IN ('admin', 'teacher', 'student')),
    teacher_status VARCHAR(20)
        CHECK (teacher_status IN ('pending', 'approved', 'rejected')),
    teacher_background TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    thumbnail TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE contents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, order_index)
);

CREATE TABLE enrollments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

CREATE TABLE content_progress (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    enrollment_id BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    UNIQUE(enrollment_id, content_id)
);

CREATE TABLE certificates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    enrollment_id BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    certificate_code VARCHAR(100) NOT NULL UNIQUE,
    student_name VARCHAR(50) NOT NULL,
    course_title VARCHAR(200) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(enrollment_id)
);

CREATE TABLE comments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL CHECK (length(trim(comment)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE testimonials (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    course_title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE course_transfer_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    from_teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_teacher_username VARCHAR(50) NOT NULL,
    to_teacher_username VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ
);

CREATE TABLE course_transfer_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES course_transfer_requests(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    course_title VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_teacher_status ON users(teacher_status);
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_contents_course ON contents(course_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_progress_enrollment ON content_progress(enrollment_id);
CREATE INDEX idx_certificates_enrollment ON certificates(enrollment_id);
CREATE INDEX idx_certificates_code ON certificates(certificate_code);
CREATE INDEX idx_comments_content ON comments(content_id);
CREATE INDEX idx_testimonials_published ON testimonials(is_published);
CREATE INDEX idx_transfer_requests_from ON course_transfer_requests(from_teacher_id);
CREATE INDEX idx_transfer_requests_to ON course_transfer_requests(to_teacher_id);

-- =========================================================
-- DATA CONTOH
-- =========================================================

INSERT INTO categories (name, description) VALUES
('Development', 'Kursus pemrograman, web, dan pengembangan software'),
('Business', 'Kursus bisnis, kewirausahaan, dan strategi usaha'),
('Design', 'Kursus desain antarmuka, pengalaman pengguna, dan visual'),
('Marketing', 'Kursus pemasaran digital dan pertumbuhan audiens'),
('Data Science', 'Kursus analisis data, statistik, dan machine learning'),
('Personal Growth', 'Kursus pengembangan diri, komunikasi, dan produktivitas');

INSERT INTO users (username, display_name, email, password, role, teacher_status, teacher_background, approved_at, created_at) VALUES
('admin', 'Admin NadhiLearn', 'admin@nadhilearn.id', '$2b$12$3.OBZVkzvSSWc6Y8nw1vPuUzEWfK1FsDlGrz/47ymv0oBn4lFMFRC', 'admin', NULL, NULL, NULL, '2026-08-10 09:00:00+07'),
('raikhan.ramadhan', 'M. Raikhan Ramadhan, S.Kom., M.Eng.', 'raikhan@nadhilearn.id', '$2b$12$3.OBZVkzvSSWc6Y8nw1vPuUzEWfK1FsDlGrz/47ymv0oBn4lFMFRC', 'teacher', 'approved', 'Pengajar bidang teknologi informasi dan pengembangan web, bergelar S.Kom. dan M.Eng.', '2026-08-20 10:00:00+07', '2026-08-11 09:00:00+07'),
('talista.anindya', 'Ir. Talista Anindya', 'talista@nadhilearn.id', '$2b$12$3.OBZVkzvSSWc6Y8nw1vPuUzEWfK1FsDlGrz/47ymv0oBn4lFMFRC', 'teacher', 'approved', 'Insinyur (Ir.) dan pengajar bidang analisis data dan machine learning.', '2026-08-20 10:00:00+07', '2026-08-12 09:00:00+07'),
('aisyah.at', 'Aisyah AT, S.Ars.', 'aisyah@nadhilearn.id', '$2b$12$3.OBZVkzvSSWc6Y8nw1vPuUzEWfK1FsDlGrz/47ymv0oBn4lFMFRC', 'teacher', 'approved', 'Pengajar bidang desain dan pengembangan diri, bergelar S.Ars.', '2026-08-20 10:00:00+07', '2026-08-13 09:00:00+07'),
('fajar.nugroho', 'Fajar Nugroho', 'fajar@nadhilearn.id', '$2b$12$3.OBZVkzvSSWc6Y8nw1vPuUzEWfK1FsDlGrz/47ymv0oBn4lFMFRC', 'teacher', 'pending', 'Mentor komunitas pemrograman mobile, ingin membuka kelas Flutter untuk pemula.', NULL, '2026-08-16 09:00:00+07'),
('john.wick', 'John Wick', 'john@mail.nadhilearn.id', '$2b$12$3.OBZVkzvSSWc6Y8nw1vPuUzEWfK1FsDlGrz/47ymv0oBn4lFMFRC', 'student', NULL, NULL, NULL, '2026-08-17 09:00:00+07'),
('arthur.morgan', 'Arthur Morgan', 'arthur@mail.nadhilearn.id', '$2b$12$3.OBZVkzvSSWc6Y8nw1vPuUzEWfK1FsDlGrz/47ymv0oBn4lFMFRC', 'student', NULL, NULL, NULL, '2026-08-18 09:00:00+07'),
('hailey.bieber', 'Hailey Bieber', 'hailey@mail.nadhilearn.id', '$2b$12$3.OBZVkzvSSWc6Y8nw1vPuUzEWfK1FsDlGrz/47ymv0oBn4lFMFRC', 'student', NULL, NULL, NULL, '2026-08-19 09:00:00+07'),
('muhammad.taesan', 'Muhammad Taesan', 'taesan@mail.nadhilearn.id', '$2b$12$3.OBZVkzvSSWc6Y8nw1vPuUzEWfK1FsDlGrz/47ymv0oBn4lFMFRC', 'student', NULL, NULL, NULL, '2026-08-20 09:00:00+07'),
('jackie.chan', 'Jackie Chan', 'jackie@mail.nadhilearn.id', '$2b$12$3.OBZVkzvSSWc6Y8nw1vPuUzEWfK1FsDlGrz/47ymv0oBn4lFMFRC', 'student', NULL, NULL, NULL, '2026-08-21 09:00:00+07'),
('rizky.febian', 'Rizky Febian', 'rizky@mail.nadhilearn.id', '$2b$12$3.OBZVkzvSSWc6Y8nw1vPuUzEWfK1FsDlGrz/47ymv0oBn4lFMFRC', 'student', NULL, NULL, NULL, '2026-08-22 09:00:00+07');

INSERT INTO courses (title, description, category_id, teacher_id, thumbnail, start_date, end_date, created_at) VALUES
('Dasar Web Development: HTML, CSS & JavaScript', 'Bangun website pertamamu dari nol. Kamu belajar struktur halaman, tata letak responsif, dan interaksi dasar dengan JavaScript lewat proyek kecil yang bisa langsung dipublikasikan.', (SELECT id FROM categories WHERE name = 'Development'), (SELECT id FROM users WHERE email = 'raikhan@nadhilearn.id'), '/uploads/courses/seed-web.svg', DATE '2026-09-01', DATE '2027-03-31', '2026-08-15 10:00:00+07'),
('Python untuk Analisis Data', 'Mulai dari dasar Python sampai mengolah dan memvisualisasikan data nyata dengan Pandas. Cocok untuk pemula yang ingin masuk ke dunia data.', (SELECT id FROM categories WHERE name = 'Data Science'), (SELECT id FROM users WHERE email = 'talista@nadhilearn.id'), '/uploads/courses/seed-python.svg', DATE '2026-09-15', DATE '2027-03-31', '2026-08-17 10:00:00+07'),
('Desain UI/UX untuk Pemula', 'Pelajari alur kerja desainer produk: riset singkat, wireframe, prototipe, sampai uji coba dengan pengguna.', (SELECT id FROM categories WHERE name = 'Design'), (SELECT id FROM users WHERE email = 'aisyah@nadhilearn.id'), '/uploads/courses/seed-uiux.svg', DATE '2026-09-08', DATE '2027-02-28', '2026-08-19 10:00:00+07'),
('Digital Marketing dari Nol', 'Dari menentukan target audiens sampai mengukur hasil kampanye di media sosial dan mesin pencari.', (SELECT id FROM categories WHERE name = 'Marketing'), (SELECT id FROM users WHERE email = 'raikhan@nadhilearn.id'), '/uploads/courses/seed-digmar.svg', DATE '2026-10-01', DATE '2027-03-15', '2026-08-21 10:00:00+07'),
('Membangun Bisnis Online', 'Validasi ide, siapkan toko online, dan hitung untung rugi usaha kecilmu sebelum meluncurkannya.', (SELECT id FROM categories WHERE name = 'Business'), (SELECT id FROM users WHERE email = 'raikhan@nadhilearn.id'), '/uploads/courses/seed-bisnis.svg', DATE '2026-10-05', DATE '2027-03-31', '2026-08-23 10:00:00+07'),
('Machine Learning Dasar', 'Pahami cara kerja model prediksi sederhana dan latih modelmu sendiri dengan scikit-learn.', (SELECT id FROM categories WHERE name = 'Data Science'), (SELECT id FROM users WHERE email = 'talista@nadhilearn.id'), '/uploads/courses/seed-ml.svg', DATE '2026-10-12', DATE '2027-04-30', '2026-08-25 10:00:00+07'),
('Public Speaking Percaya Diri', 'Latihan terstruktur untuk berbicara di depan orang banyak, dari mengatasi gugup sampai menutup presentasi dengan kuat.', (SELECT id FROM categories WHERE name = 'Personal Growth'), (SELECT id FROM users WHERE email = 'aisyah@nadhilearn.id'), '/uploads/courses/seed-speaking.svg', DATE '2026-09-20', DATE '2027-02-28', '2026-08-27 10:00:00+07'),
('Manajemen Waktu dan Produktivitas', 'Susun prioritas, bangun rutinitas, dan jaga fokus tanpa harus bekerja lebih lama.', (SELECT id FROM categories WHERE name = 'Personal Growth'), (SELECT id FROM users WHERE email = 'aisyah@nadhilearn.id'), '/uploads/courses/seed-produktif.svg', DATE '2026-10-10', DATE '2027-03-31', '2026-08-29 10:00:00+07');

INSERT INTO contents (course_id, title, description, content, order_index) VALUES
((SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript'), 'Struktur halaman dengan HTML', 'Mengenal elemen, atribut, dan kerangka dokumen web.', 'HTML adalah kerangka setiap halaman web. Di materi ini kamu belajar heading, paragraf, tautan, gambar, daftar, dan tabel, lalu menyusunnya menjadi halaman profil sederhana. Latihan: buat satu halaman yang memuat fotomu, deskripsi singkat, dan tiga tautan favorit.', 1),
((SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript'), 'Tampilan dengan CSS', 'Warna, tipografi, dan tata letak flexbox serta grid.', 'CSS mengatur bagaimana halaman terlihat. Kamu akan memakai selector, box model, flexbox, dan grid untuk menata halaman profil dari materi sebelumnya agar rapi di layar ponsel maupun laptop. Latihan: ubah halaman profilmu menjadi dua kolom di layar lebar.', 2),
((SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript'), 'Interaksi dengan JavaScript', 'Variabel, fungsi, dan manipulasi DOM.', 'JavaScript membuat halaman bisa merespons pengguna. Materi ini membahas variabel, kondisi, fungsi, dan cara mengubah isi halaman lewat DOM. Latihan: tambahkan tombol mode gelap yang mengubah warna latar halaman.', 3),
((SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript'), 'Proyek akhir: halaman portofolio', 'Menggabungkan HTML, CSS, dan JavaScript dalam satu proyek.', 'Gabungkan semua yang sudah dipelajari menjadi halaman portofolio dengan bagian perkenalan, daftar proyek, dan formulir kontak. Periksa tampilannya di beberapa ukuran layar, lalu kirim tautan hasilnya di kolom diskusi.', 4),
((SELECT id FROM courses WHERE title = 'Python untuk Analisis Data'), 'Pengenalan Python', 'Sintaks dasar, tipe data, dan struktur kontrol.', 'Python dikenal mudah dibaca. Kamu mulai dari variabel, tipe data, perulangan, dan fungsi. Latihan: tulis program kecil yang menghitung rata-rata nilai dari sebuah daftar.', 1),
((SELECT id FROM courses WHERE title = 'Python untuk Analisis Data'), 'Mengolah data dengan Pandas', 'Membaca file CSV, memfilter, dan mengelompokkan data.', 'Pandas membantu mengolah data tabel dengan cepat. Materi ini membahas DataFrame, memilih kolom, memfilter baris, dan groupby. Latihan: hitung total penjualan per bulan dari file CSV contoh.', 2),
((SELECT id FROM courses WHERE title = 'Python untuk Analisis Data'), 'Visualisasi data', 'Membuat grafik batang, garis, dan sebaran dengan Matplotlib.', 'Grafik membantu orang memahami data dalam sekali lihat. Kamu belajar memilih jenis grafik yang tepat, memberi judul dan label sumbu, serta menyimpan hasilnya sebagai gambar.', 3),
((SELECT id FROM courses WHERE title = 'Python untuk Analisis Data'), 'Studi kasus: laporan penjualan', 'Menyusun analisis dari data mentah sampai kesimpulan.', 'Pada studi kasus ini kamu membersihkan data penjualan toko fiktif, menghitung metrik utama, dan menulis tiga temuan yang bisa ditindaklanjuti pemilik toko.', 4),
((SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula'), 'Memahami pengguna', 'Riset ringan dan persona sederhana.', 'Desain yang baik dimulai dari memahami siapa penggunanya. Kamu belajar wawancara singkat, merangkum temuan, dan membuat persona. Latihan: wawancarai tiga temanmu tentang cara mereka memesan makanan lewat aplikasi.', 1),
((SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula'), 'Wireframe dan alur layar', 'Menyusun kerangka layar sebelum masuk ke tampilan.', 'Wireframe membantu menguji alur tanpa terganggu warna dan gambar. Kamu menggambar alur dari layar beranda sampai pembayaran dan memeriksa apakah ada langkah yang membingungkan.', 2),
((SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula'), 'Warna, tipografi, dan komponen', 'Dasar visual yang konsisten.', 'Materi ini membahas palet warna, skala tipografi, jarak, dan komponen yang dipakai ulang. Latihan: buat satu set tombol, kolom isian, dan kartu dengan gaya yang seragam.', 3),
((SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula'), 'Prototipe dan uji coba', 'Menguji rancangan dengan pengguna sungguhan.', 'Ubah wireframe menjadi prototipe yang bisa diklik, lalu minta tiga orang menyelesaikan satu tugas. Catat di mana mereka ragu dan perbaiki rancanganmu berdasarkan temuan itu.', 4),
((SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol'), 'Target audiens dan pesan utama', 'Siapa yang ingin dijangkau dan apa yang ingin disampaikan.', 'Pemasaran yang efektif dimulai dari audiens yang jelas. Kamu menyusun profil pelanggan ideal dan merumuskan satu kalimat pesan utama untuk produkmu.', 1),
((SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol'), 'Konten media sosial', 'Merencanakan kalender konten yang realistis.', 'Konsisten lebih penting daripada sering-sering. Materi ini membantu menyusun kalender konten dua minggu dengan campuran konten edukasi, cerita, dan ajakan bertindak.', 2),
((SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol'), 'Dasar SEO dan iklan berbayar', 'Cara muncul di pencarian dan mengatur anggaran iklan.', 'Kamu belajar memilih kata kunci, menulis judul halaman, dan memahami perbedaan hasil organik dengan iklan berbayar. Latihan: tentukan lima kata kunci untuk usaha fiktifmu.', 3),
((SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol'), 'Mengukur dan memperbaiki', 'Membaca metrik yang penting.', 'Jangan terjebak angka yang terlihat bagus tetapi tidak berarti. Kamu belajar membaca jangkauan, klik, dan konversi, lalu menentukan satu perubahan untuk kampanye berikutnya.', 4),
((SELECT id FROM courses WHERE title = 'Membangun Bisnis Online'), 'Validasi ide usaha', 'Menguji apakah ada yang mau membeli.', 'Sebelum menghabiskan modal, uji idemu dengan penawaran sederhana. Kamu belajar membuat halaman pra-pesan dan mengukur minat dari lima calon pembeli pertama.', 1),
((SELECT id FROM courses WHERE title = 'Membangun Bisnis Online'), 'Menyiapkan toko online', 'Memilih platform, foto produk, dan deskripsi.', 'Materi ini membahas perbandingan marketplace dan toko sendiri, cara memotret produk dengan cahaya alami, dan menulis deskripsi yang menjawab pertanyaan pembeli.', 2),
((SELECT id FROM courses WHERE title = 'Membangun Bisnis Online'), 'Harga dan perhitungan laba', 'Menentukan harga yang masuk akal.', 'Kamu menghitung biaya produksi, ongkos kirim, dan biaya platform, lalu menentukan harga jual serta titik impas. Latihan: isi tabel perhitungan untuk satu produk.', 3),
((SELECT id FROM courses WHERE title = 'Membangun Bisnis Online'), 'Layanan pelanggan dan pengulangan pesanan', 'Membuat pembeli kembali lagi.', 'Pelanggan lama lebih murah dipertahankan daripada mencari pelanggan baru. Kamu menyusun templat balasan, kebijakan retur, dan pesan terima kasih setelah pembelian.', 4),
((SELECT id FROM courses WHERE title = 'Machine Learning Dasar'), 'Apa itu machine learning', 'Perbedaan aturan manual dan model yang belajar dari data.', 'Machine learning memungkinkan komputer menemukan pola dari contoh. Materi ini menjelaskan data latih, data uji, fitur, dan label dengan contoh prediksi harga rumah.', 1),
((SELECT id FROM courses WHERE title = 'Machine Learning Dasar'), 'Regresi linear', 'Memprediksi angka dari data.', 'Kamu melatih model regresi sederhana, membaca koefisiennya, dan mengevaluasi hasil dengan galat rata-rata. Latihan: prediksi harga rumah dari luas bangunan.', 2),
((SELECT id FROM courses WHERE title = 'Machine Learning Dasar'), 'Klasifikasi', 'Memprediksi kategori seperti lulus atau tidak lulus.', 'Materi ini memperkenalkan pohon keputusan dan metrik akurasi. Kamu juga belajar mengapa akurasi saja bisa menyesatkan pada data yang tidak seimbang.', 3),
((SELECT id FROM courses WHERE title = 'Machine Learning Dasar'), 'Mengevaluasi dan menghindari overfitting', 'Model yang bagus di data latih belum tentu bagus di dunia nyata.', 'Kamu belajar membagi data, memakai validasi silang, dan mengenali tanda-tanda overfitting sebelum model dipakai untuk keputusan nyata.', 4),
((SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri'), 'Mengelola rasa gugup', 'Teknik pernapasan dan persiapan.', 'Gugup itu wajar. Kamu belajar teknik pernapasan, memeriksa ruangan lebih awal, dan mengubah energi gugup menjadi semangat. Latihan: rekam dirimu berbicara selama satu menit.', 1),
((SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri'), 'Menyusun alur pembicaraan', 'Pembuka, isi, dan penutup.', 'Pendengar mengingat awal dan akhir. Materi ini membahas cara membuka dengan cerita singkat, membagi isi menjadi tiga poin, dan menutup dengan ajakan yang jelas.', 2),
((SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri'), 'Bahasa tubuh dan suara', 'Kontak mata, jeda, dan intonasi.', 'Kamu berlatih berdiri stabil, memakai jeda, dan mengatur tempo bicara. Latihan: tonton rekamanmu dan catat dua kebiasaan yang ingin dikurangi.', 3),
((SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri'), 'Sesi tanya jawab', 'Menjawab pertanyaan sulit dengan tenang.', 'Pertanyaan sulit bukan serangan. Kamu belajar mengulang pertanyaan, mengakui batas pengetahuan, dan mengarahkan jawaban kembali ke pesan utama.', 4),
((SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas'), 'Menentukan prioritas', 'Matriks penting dan mendesak.', 'Tidak semua tugas sama pentingnya. Kamu memetakan tugas mingguanmu ke dalam empat kuadran dan memilih tiga hal yang paling berdampak.', 1),
((SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas'), 'Merencanakan minggu', 'Blok waktu dan batas harian.', 'Materi ini membahas cara memblokir waktu untuk pekerjaan mendalam, menyisakan ruang kosong untuk hal tak terduga, dan menutup hari dengan evaluasi singkat.', 2),
((SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas'), 'Menjaga fokus', 'Mengurangi gangguan dari ponsel dan notifikasi.', 'Kamu mencoba teknik sesi fokus 25 menit, mengatur notifikasi, dan menyiapkan ruang kerja. Latihan: catat berapa kali kamu terganggu dalam satu sesi.', 3),
((SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas'), 'Membangun kebiasaan', 'Mulai kecil dan konsisten.', 'Kebiasaan bertahan kalau mudah dimulai. Kamu merancang satu kebiasaan kecil, menentukan pemicunya, dan melacaknya selama dua minggu.', 4);

INSERT INTO enrollments (student_id, course_id, status, enrolled_at) VALUES
((SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data'), 'active', '2026-10-01 08:00:00+07'),
((SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula'), 'active', '2026-10-03 08:00:00+07'),
((SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript'), 'active', '2026-10-05 08:00:00+07'),
((SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript'), 'active', '2026-10-07 08:00:00+07'),
((SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Machine Learning Dasar'), 'active', '2026-10-09 08:00:00+07'),
((SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data'), 'active', '2026-10-11 08:00:00+07'),
((SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula'), 'active', '2026-10-13 08:00:00+07'),
((SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol'), 'active', '2026-10-15 08:00:00+07'),
((SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri'), 'active', '2026-10-17 08:00:00+07'),
((SELECT id FROM users WHERE email = 'taesan@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript'), 'active', '2026-10-19 08:00:00+07'),
((SELECT id FROM users WHERE email = 'taesan@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online'), 'active', '2026-10-21 08:00:00+07'),
((SELECT id FROM users WHERE email = 'taesan@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol'), 'cancelled', '2026-10-23 08:00:00+07'),
((SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol'), 'active', '2026-10-25 08:00:00+07'),
((SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online'), 'active', '2026-10-01 08:00:00+07'),
((SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas'), 'active', '2026-10-03 08:00:00+07'),
((SELECT id FROM users WHERE email = 'rizky@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data'), 'active', '2026-10-05 08:00:00+07'),
((SELECT id FROM users WHERE email = 'rizky@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Machine Learning Dasar'), 'active', '2026-10-07 08:00:00+07'),
((SELECT id FROM users WHERE email = 'rizky@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript'), 'active', '2026-10-09 08:00:00+07'),
((SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri'), 'active', '2026-10-11 08:00:00+07'),
((SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas'), 'active', '2026-10-13 08:00:00+07'),
((SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula'), 'active', '2026-10-15 08:00:00+07'),
((SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online'), 'active', '2026-10-17 08:00:00+07'),
((SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript'), 'active', '2026-10-19 08:00:00+07'),
((SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id'), (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data'), 'active', '2026-10-21 08:00:00+07');

INSERT INTO content_progress (enrollment_id, content_id, is_completed, completed_at) VALUES
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 1), TRUE, '2026-11-05 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 2), TRUE, '2026-11-07 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 3), TRUE, '2026-11-09 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 4), TRUE, '2026-11-11 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula') AND ct.order_index = 1), TRUE, '2026-11-06 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula') AND ct.order_index = 2), TRUE, '2026-11-08 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula') AND ct.order_index = 3), TRUE, '2026-11-10 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula') AND ct.order_index = 4), TRUE, '2026-11-12 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 1), TRUE, '2026-11-07 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 2), TRUE, '2026-11-09 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 1), TRUE, '2026-11-08 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 2), TRUE, '2026-11-10 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 3), TRUE, '2026-11-12 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 4), TRUE, '2026-11-14 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Machine Learning Dasar')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Machine Learning Dasar') AND ct.order_index = 1), TRUE, '2026-11-09 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 1), TRUE, '2026-11-10 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 2), TRUE, '2026-11-12 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 3), TRUE, '2026-11-14 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula') AND ct.order_index = 1), TRUE, '2026-11-11 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula') AND ct.order_index = 2), TRUE, '2026-11-13 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula') AND ct.order_index = 3), TRUE, '2026-11-15 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula') AND ct.order_index = 4), TRUE, '2026-11-17 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol') AND ct.order_index = 1), TRUE, '2026-11-12 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol') AND ct.order_index = 2), TRUE, '2026-11-14 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri') AND ct.order_index = 1), TRUE, '2026-11-13 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri') AND ct.order_index = 2), TRUE, '2026-11-15 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri') AND ct.order_index = 3), TRUE, '2026-11-17 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri') AND ct.order_index = 4), TRUE, '2026-11-19 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'taesan@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 1), TRUE, '2026-11-14 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'taesan@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 2), TRUE, '2026-11-16 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'taesan@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 3), TRUE, '2026-11-18 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'taesan@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online') AND ct.order_index = 1), TRUE, '2026-11-05 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol') AND ct.order_index = 1), TRUE, '2026-11-07 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol') AND ct.order_index = 2), TRUE, '2026-11-09 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol') AND ct.order_index = 3), TRUE, '2026-11-11 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol') AND ct.order_index = 4), TRUE, '2026-11-13 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online') AND ct.order_index = 1), TRUE, '2026-11-08 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online') AND ct.order_index = 2), TRUE, '2026-11-10 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online') AND ct.order_index = 3), TRUE, '2026-11-12 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas') AND ct.order_index = 1), TRUE, '2026-11-09 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas') AND ct.order_index = 2), TRUE, '2026-11-11 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'rizky@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 1), TRUE, '2026-11-10 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'rizky@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 2), TRUE, '2026-11-12 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'rizky@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 1), TRUE, '2026-11-12 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri') AND ct.order_index = 1), TRUE, '2026-11-13 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri') AND ct.order_index = 2), TRUE, '2026-11-15 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri') AND ct.order_index = 3), TRUE, '2026-11-17 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas') AND ct.order_index = 1), TRUE, '2026-11-14 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas') AND ct.order_index = 2), TRUE, '2026-11-16 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas') AND ct.order_index = 3), TRUE, '2026-11-18 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas') AND ct.order_index = 4), TRUE, '2026-11-20 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula') AND ct.order_index = 1), TRUE, '2026-11-05 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online') AND ct.order_index = 1), TRUE, '2026-11-06 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online') AND ct.order_index = 2), TRUE, '2026-11-08 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online') AND ct.order_index = 3), TRUE, '2026-11-10 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online') AND ct.order_index = 4), TRUE, '2026-11-12 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 1), TRUE, '2026-11-07 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 2), TRUE, '2026-11-09 19:30:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data')), (SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 1), TRUE, '2026-11-08 19:30:00+07');

INSERT INTO certificates (enrollment_id, certificate_code, student_name, course_title, issued_at) VALUES
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data')), 'NDH-' || UPPER(gen_random_uuid()::text), 'John Wick', 'Python untuk Analisis Data', '2026-11-12 20:00:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula')), 'NDH-' || UPPER(gen_random_uuid()::text), 'John Wick', 'Desain UI/UX untuk Pemula', '2026-11-13 20:00:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript')), 'NDH-' || UPPER(gen_random_uuid()::text), 'Arthur Morgan', 'Dasar Web Development: HTML, CSS & JavaScript', '2026-11-15 20:00:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula')), 'NDH-' || UPPER(gen_random_uuid()::text), 'Hailey Bieber', 'Desain UI/UX untuk Pemula', '2026-11-18 20:00:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri')), 'NDH-' || UPPER(gen_random_uuid()::text), 'Hailey Bieber', 'Public Speaking Percaya Diri', '2026-11-20 20:00:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol')), 'NDH-' || UPPER(gen_random_uuid()::text), 'Jackie Chan', 'Digital Marketing dari Nol', '2026-11-24 20:00:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas')), 'NDH-' || UPPER(gen_random_uuid()::text), 'Arthur Morgan', 'Manajemen Waktu dan Produktivitas', '2026-11-28 20:00:00+07'),
((SELECT e.id FROM enrollments e WHERE e.student_id = (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id') AND e.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online')), 'NDH-' || UPPER(gen_random_uuid()::text), 'Hailey Bieber', 'Membangun Bisnis Online', '2026-11-28 20:00:00+07');

INSERT INTO comments (content_id, user_id, comment, created_at) VALUES
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 1), (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id'), 'Apakah boleh memakai editor selain VS Code untuk latihan ini?', '2026-11-05 09:15:00+07'),
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 1), (SELECT id FROM users WHERE email = 'raikhan@nadhilearn.id'), 'Boleh. Editor apa pun yang menyimpan file teks biasa sudah cukup.', '2026-11-06 10:15:00+07'),
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Dasar Web Development: HTML, CSS & JavaScript') AND ct.order_index = 3), (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id'), 'Tombol mode gelapnya sudah jalan. Terima kasih, penjelasan tentang DOM-nya mudah diikuti.', '2026-11-07 11:15:00+07'),
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 2), (SELECT id FROM users WHERE email = 'john@mail.nadhilearn.id'), 'Untuk file CSV yang besar, apakah Pandas masih nyaman dipakai di laptop biasa?', '2026-11-08 12:15:00+07'),
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Python untuk Analisis Data') AND ct.order_index = 2), (SELECT id FROM users WHERE email = 'talista@nadhilearn.id'), 'Masih nyaman sampai beberapa ratus ribu baris. Di atas itu, baca data per potongan dengan parameter chunksize.', '2026-11-09 13:15:00+07'),
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula') AND ct.order_index = 1), (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id'), 'Wawancara dengan tiga teman ternyata membuka masalah yang tidak terpikir sebelumnya.', '2026-11-10 14:15:00+07'),
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Desain UI/UX untuk Pemula') AND ct.order_index = 4), (SELECT id FROM users WHERE email = 'aisyah@nadhilearn.id'), 'Bagus. Jangan lupa tulis temuan ujinya di kolom ini supaya bisa dibahas bersama.', '2026-11-11 15:15:00+07'),
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol') AND ct.order_index = 2), (SELECT id FROM users WHERE email = 'jackie@mail.nadhilearn.id'), 'Berapa kali sebaiknya memposting dalam seminggu untuk usaha rumahan?', '2026-11-12 16:15:00+07'),
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Digital Marketing dari Nol') AND ct.order_index = 2), (SELECT id FROM users WHERE email = 'raikhan@nadhilearn.id'), 'Mulai dari tiga kali seminggu yang bisa kamu jaga selama sebulan, baru tambah kalau sudah stabil.', '2026-11-13 09:15:00+07'),
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Public Speaking Percaya Diri') AND ct.order_index = 1), (SELECT id FROM users WHERE email = 'arthur@mail.nadhilearn.id'), 'Teknik pernapasannya membantu sekali sebelum presentasi di kantor.', '2026-11-14 10:15:00+07'),
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online') AND ct.order_index = 3), (SELECT id FROM users WHERE email = 'hailey@mail.nadhilearn.id'), 'Apakah biaya kemasan masuk ke perhitungan harga pokok?', '2026-11-15 11:15:00+07'),
((SELECT ct.id FROM contents ct WHERE ct.course_id = (SELECT id FROM courses WHERE title = 'Membangun Bisnis Online') AND ct.order_index = 3), (SELECT id FROM users WHERE email = 'raikhan@nadhilearn.id'), 'Ya, kemasan termasuk biaya per unit. Masukkan juga biaya cetak label bila ada.', '2026-11-16 12:15:00+07');

INSERT INTO testimonials (student_name, course_title, content, rating, is_published, image_url, created_at) VALUES
('John Wick', 'Python untuk Analisis Data', 'Saya belum pernah menulis kode sebelumnya. Materinya bertahap dan setiap latihan langsung bisa dicoba, jadi saya tidak merasa tertinggal. Sekarang saya sudah bisa membuat laporan dari data sendiri.', 5, TRUE, '/uploads/testimonials/avatar-john-wick.svg', '2026-11-20 10:00:00+07'),
('Arthur Morgan', 'Dasar Web Development: HTML, CSS & JavaScript', 'Proyek portofolio di akhir kursus membuat saya punya sesuatu yang bisa ditunjukkan saat melamar kerja. Kolom diskusinya juga cepat dibalas oleh pengajar.', 5, TRUE, '/uploads/testimonials/avatar-arthur-morgan.svg', '2026-11-19 10:00:00+07'),
('Hailey Bieber', 'Desain UI/UX untuk Pemula', 'Bagian uji coba dengan pengguna mengubah cara saya merancang. Dulu saya hanya memikirkan tampilan, sekarang saya selalu bertanya apakah alurnya masuk akal.', 5, TRUE, '/uploads/testimonials/avatar-hailey-bieber.svg', '2026-11-18 10:00:00+07'),
('Jackie Chan', 'Digital Marketing dari Nol', 'Kalender konten yang diajarkan realistis untuk usaha rumahan seperti punya saya. Pesanan lewat media sosial naik pelan-pelan tapi stabil.', 4, TRUE, '/uploads/testimonials/avatar-jackie-chan.svg', '2026-11-17 10:00:00+07'),
('Hailey Bieber', 'Membangun Bisnis Online', 'Perhitungan harga dan titik impasnya membuka mata saya. Ternyata ada produk yang selama ini saya jual tanpa untung.', 5, TRUE, '/uploads/testimonials/avatar-hailey-bieber.svg', '2026-11-16 10:00:00+07'),
('Arthur Morgan', 'Manajemen Waktu dan Produktivitas', 'Saya mulai memakai blok waktu dan sesi fokus 25 menit. Pekerjaan selesai lebih cepat dan saya pulang tidak terlalu lelah.', 5, TRUE, '/uploads/testimonials/avatar-arthur-morgan.svg', '2026-11-15 10:00:00+07'),
('Muhammad Taesan', 'Dasar Web Development: HTML, CSS & JavaScript', 'Penjelasan CSS flexbox dan grid-nya paling membantu. Saya jadi berani menata ulang halaman toko kecil milik keluarga.', 4, TRUE, '/uploads/testimonials/avatar-muhammad-taesan.svg', '2026-11-14 10:00:00+07'),
('Rizky Febian', 'Python untuk Analisis Data', 'Cocok untuk pemula. Saya berharap ada lebih banyak latihan visualisasi, tapi studi kasus laporan penjualannya sudah cukup menantang.', 4, TRUE, '/uploads/testimonials/avatar-rizky-febian.svg', '2026-11-13 10:00:00+07'),
('Arthur Morgan', 'Public Speaking Percaya Diri', 'Latihan merekam diri sendiri terasa canggung di awal, tetapi hasilnya terlihat jelas setelah tiga minggu.', 5, FALSE, '/uploads/testimonials/avatar-arthur-morgan.svg', '2026-11-12 10:00:00+07'),
('Alvaro', 'Dasar Web Development: HTML, CSS & JavaScript', 'Awalnya saya hanya terbiasa mengetik di aplikasi dokumen. Setelah beberapa minggu, halaman profil saya sudah tampil rapi di ponsel maupun laptop.', 5, TRUE, '/uploads/testimonials/testimonial-alvaro.jpg', '2026-11-22 12:00:00+07'),
('Anne', 'Python untuk Analisis Data', 'Studi kasusnya terasa seperti pekerjaan sungguhan. Sekarang saya bisa merapikan data penjualan tanpa menyalin angka satu per satu.', 5, TRUE, '/uploads/testimonials/testimonial-anne.jpg', '2026-11-22 11:00:00+07'),
('Arda', 'Machine Learning Dasar', 'Konsep overfitting dijelaskan dengan contoh sederhana sehingga akhirnya masuk akal. Model pertama saya berhasil jalan di minggu ketiga.', 4, TRUE, '/uploads/testimonials/testimonial-arda.jpg', '2026-11-22 10:00:00+07'),
('Emma', 'Desain UI/UX untuk Pemula', 'Latihan wireframe dan uji coba ke pengguna membuat saya berhenti merancang berdasarkan selera sendiri. Alur desain saya jadi jauh lebih masuk akal.', 5, TRUE, '/uploads/testimonials/testimonial-emma.jpg', '2026-11-22 09:00:00+07'),
('Jacob', 'Digital Marketing dari Nol', 'Menentukan target audiens sebelum membuat konten adalah pelajaran terbesar bagi saya. Jangkauan akun saya naik pelan-pelan tanpa iklan berbayar.', 4, TRUE, '/uploads/testimonials/testimonial-jacob.jpg', '2026-11-21 12:00:00+07'),
('Jude', 'Membangun Bisnis Online', 'Saya baru sadar harga jual belum menutup biaya kemasan. Hitungan titik impas di kursus ini langsung saya terapkan ke produk saya.', 5, TRUE, '/uploads/testimonials/testimonial-jude.jpg', '2026-11-21 11:00:00+07'),
('Theo', 'Public Speaking Percaya Diri', 'Latihan jeda dan pernapasan mengurangi rasa gugup saya saat presentasi. Rekaman latihan membantu saya melihat kebiasaan yang tidak saya sadari.', 5, TRUE, '/uploads/testimonials/testimonial-theo.jpg', '2026-11-21 10:00:00+07'),
('Sadie', 'Manajemen Waktu dan Produktivitas', 'Saya mulai menyusun prioritas harian dan memakai sesi fokus. Tugas selesai lebih awal dan malam hari saya jadi lebih tenang.', 4, TRUE, '/uploads/testimonials/testimonial-sadie.jpg', '2026-11-21 09:00:00+07');

INSERT INTO course_transfer_requests (from_teacher_id, to_teacher_id, from_teacher_username, to_teacher_username, status, requested_at, responded_at)
VALUES ((SELECT id FROM users WHERE email = 'talista@nadhilearn.id'), (SELECT id FROM users WHERE email = 'raikhan@nadhilearn.id'), 'talista.anindya', 'raikhan.ramadhan', 'pending', '2026-11-18 09:30:00+07', NULL);

INSERT INTO course_transfer_items (request_id, course_id, course_title)
VALUES ((SELECT MAX(id) FROM course_transfer_requests), (SELECT id FROM courses WHERE title = 'Machine Learning Dasar'), 'Machine Learning Dasar');

INSERT INTO course_transfer_requests (from_teacher_id, to_teacher_id, from_teacher_username, to_teacher_username, status, requested_at, responded_at)
VALUES ((SELECT id FROM users WHERE email = 'aisyah@nadhilearn.id'), (SELECT id FROM users WHERE email = 'raikhan@nadhilearn.id'), 'aisyah.at', 'raikhan.ramadhan', 'rejected', '2026-10-27 14:10:00+07', '2026-10-28 08:45:00+07');

INSERT INTO course_transfer_items (request_id, course_id, course_title)
VALUES ((SELECT MAX(id) FROM course_transfer_requests), (SELECT id FROM courses WHERE title = 'Manajemen Waktu dan Produktivitas'), 'Manajemen Waktu dan Produktivitas');
