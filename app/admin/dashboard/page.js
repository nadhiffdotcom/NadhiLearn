
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import LogoutButton from "../../student/dashboard/LogoutButton";
import TeacherApplicationActions from "./TeacherApplicationActions";

export default async function AdminDashboard() {
  // 1. Periksa sesi login
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);

  if (!payload) {
    redirect("/login");
  }

  // 2. Ambil data Admin terbaru dari database
  const userResult = await pool.query(
    `SELECT id, username, email, role
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [payload.id]
  );

  if (userResult.rows.length === 0) {
    redirect("/login");
  }

  const admin = userResult.rows[0];

  // 3. Periksa hak akses
  if (admin.role !== "admin") {
    if (admin.role === "teacher") {
      redirect("/teacher/dashboard");
    }

    redirect("/student/dashboard");
  }

  // 4. Ambil statistik pengguna
  const statsResult = await pool.query(
    `SELECT
      COUNT(*)::int AS total_users,
      COUNT(*) FILTER (
        WHERE role = 'student'
      )::int AS total_students,
      COUNT(*) FILTER (
        WHERE role = 'teacher'
      )::int AS total_teachers,
      COUNT(*) FILTER (
        WHERE teacher_status = 'pending'
      )::int AS pending_teachers
    FROM users`
  );

  const stats = statsResult.rows[0];

  // 5. Ambil daftar pengajuan Teacher
  const applicantsResult = await pool.query(
    `SELECT
      id,
      username,
      email,
      teacher_background,
      created_at
    FROM users
    WHERE teacher_status = 'pending'
    ORDER BY created_at ASC`
  );

  const applicants = applicantsResult.rows;

  return (
    <main className="min-h-screen bg-[#0B1F3A] text-white">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 w-full border-b border-[#0B1F3A] bg-white">
        <div className="relative mx-auto flex min-h-[80px] max-w-7xl items-center justify-between px-6">

          {/* LOGO KIRI */}
          <div className="flex shrink-0 items-center">
            <Link
              href="/"
              className="flex items-center gap-2.5"
            >
              <img
                src="/logo-n-navy.png"
                alt="NadhiLearn Logo"
                className="h-11 w-11 object-contain"
              />

              <span className="text-3xl font-bold tracking-tight text-[#0B1F3A]">
                NadhiLearn.
              </span>
            </Link>
          </div>

          {/* MENU TENGAH */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center justify-center gap-7 whitespace-nowrap text-base text-[#0B1F3A] md:flex">

            <Link
              href="/#home"
              className="font-normal transition-all duration-200 hover:font-bold"
            >
              Home
            </Link>

            <Link
              href="/#courses"
              className="font-normal transition-all duration-200 hover:font-bold"
            >
              Courses
            </Link>

            <Link
              href="/#about"
              className="font-normal transition-all duration-200 hover:font-bold"
            >
              About
            </Link>

            <Link
              href="/admin/dashboard"
              className="font-bold underline underline-offset-8"
            >
              Admin Dashboard
            </Link>

          </div>

          {/* AKUN DAN LOGOUT KANAN */}
          <div className="ml-auto flex shrink-0 items-center justify-end gap-5 text-base font-semibold">

            <span className="hidden text-[#0B1F3A] sm:inline">
              Hi, {admin.username}
            </span>

            <Link
              href="/account/profile"
              className="text-[#0B1F3A] transition hover:underline hover:underline-offset-4"
            >
              Pengaturan Akun
            </Link>

            <LogoutButton />

          </div>

        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* WELCOME */}
        <section className="mb-10">
          <p className="mb-2 font-semibold">
            ADMIN DASHBOARD
          </p>

          <h1 className="mb-3 text-3xl font-bold md:text-4xl">
            Halo, {admin.username}!
          </h1>

          <p>
            Selamat datang di halaman administrasi NadhiLearn.
            Kelola pengguna dan pantau pengajuan Teacher di sini.
          </p>
        </section>

        {/* STATISTICS */}
        <section className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 text-[#0B1F3A]">
            <p className="mb-3 font-semibold">
              Total Pengguna
            </p>
            <h2 className="text-4xl font-bold">
              {stats.total_users}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 text-[#0B1F3A]">
            <p className="mb-3 font-semibold">
              Total Student
            </p>
            <h2 className="text-4xl font-bold">
              {stats.total_students}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 text-[#0B1F3A]">
            <p className="mb-3 font-semibold">
              Total Teacher
            </p>
            <h2 className="text-4xl font-bold">
              {stats.total_teachers}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 text-[#0B1F3A]">
            <p className="mb-3 font-semibold">
              Pengajuan Pending
            </p>
            <h2 className="text-4xl font-bold">
              {stats.pending_teachers}
            </h2>
          </div>

        </section>

        {/* TEACHER APPLICATIONS */}
        <section>

          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              Pengajuan Teacher
            </h2>

            <p className="mt-2">
              Periksa calon Teacher yang meminta bergabung
              dengan NadhiLearn.
            </p>
          </div>

          {applicants.length === 0 ? (

            <div className="rounded-2xl border-2 border-white p-10 text-center">
              <h3 className="mb-3 text-xl font-bold">
                Tidak Ada Pengajuan
              </h3>

              <p>
                Saat ini belum ada calon Teacher yang
                menunggu persetujuan.
              </p>
            </div>

          ) : (

            <div className="grid gap-6 md:grid-cols-2">

              {applicants.map((applicant) => (

                <article
                  key={applicant.id}
                  className="rounded-2xl bg-white p-6 text-[#0B1F3A]"
                >

                  <div className="mb-5 flex items-start justify-between gap-3">

                    <div>
                      <h3 className="text-xl font-bold">
                        {applicant.username}
                      </h3>

                      <p className="mt-1 break-all text-sm">
                        {applicant.email}
                      </p>
                    </div>

                    <span className="rounded-full border border-[#0B1F3A] px-3 py-1 text-xs font-bold">
                      PENDING
                    </span>

                  </div>

                  <div className="mb-5">
                    <h4 className="mb-2 font-bold">
                      Latar Belakang
                    </h4>

                    <p className="whitespace-pre-wrap">
                      {applicant.teacher_background ||
                        "Belum mengisi latar belakang."}
                    </p>
                  </div>

                  <div className="border-t border-[#0B1F3A] pt-4 text-sm">
                    <p>
                      Tanggal Pendaftaran:
                    </p>

                    <p className="mt-1 font-semibold">
                      {new Date(
                        applicant.created_at
                      ).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* TOMBOL SETUJUI DAN TOLAK */}
                  <TeacherApplicationActions userId={applicant.id} />

                </article>

              ))}

            </div>

          )}

        </section>

      </div>

      {/* FOOTER */}
      <footer className="mt-16 bg-white px-6 py-6 text-center text-[#0B1F3A]">
        <p className="font-semibold">
          © 2026 NadhiLearn. All Rights Reserved.
        </p>
      </footer>

    </main>
  );
}
