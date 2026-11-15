
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function StudentDashboard() {
  // PERIKSA SESI LOGIN
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);

  if (!payload) {
    redirect("/login");
  }

  // AMBIL DATA PENGGUNA
  const userResult = await pool.query(
    `SELECT id, username, email, role, teacher_status
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [payload.id]
  );

  if (userResult.rows.length === 0) {
    redirect("/login");
  }

  const user = userResult.rows[0];

  // PERIKSA ROLE
  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (
    user.role === "teacher" &&
    user.teacher_status === "approved"
  ) {
    redirect("/teacher/dashboard");
  }

  if (user.role !== "student") {
    redirect("/login");
  }

  // AMBIL KURSUS YANG DIIKUTI
  const coursesResult = await pool.query(
    `SELECT
      c.id,
      c.title,
      c.description,
      e.enrolled_at,
      COUNT(DISTINCT ct.id)::int AS total_materials,
      COUNT(
        DISTINCT CASE
          WHEN cp.is_completed = TRUE THEN ct.id
        END
      )::int AS completed_materials
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN contents ct ON ct.course_id = c.id
    LEFT JOIN content_progress cp
      ON cp.content_id = ct.id
      AND cp.enrollment_id = e.id
    WHERE e.student_id = $1
    GROUP BY c.id, e.id
    ORDER BY e.enrolled_at DESC`,
    [user.id]
  );

  const courses = coursesResult.rows;

  // HITUNG STATISTIK
  const totalCourses = courses.length;

  const totalMaterials = courses.reduce(
    (total, course) => total + course.total_materials,
    0
  );

  const completedMaterials = courses.reduce(
    (total, course) => total + course.completed_materials,
    0
  );

  const progress =
    totalMaterials > 0
      ? Math.round(
          (completedMaterials / totalMaterials) * 100
        )
      : 0;

  return (
    <main className="min-h-screen bg-[#0B1F3A] text-white">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 w-full border-b border-[#0B1F3A] bg-white">
        <div className="relative mx-auto flex min-h-[80px] max-w-7xl items-center justify-between px-6">

          {/* LOGO KIRI */}
          <div className="flex shrink-0 items-center">
            <Link href="/" className="flex items-center gap-2.5">
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
              className="font-normal transition-all duration-200 hover:font-bold hover:underline hover:underline-offset-8"
            >
              Home
            </Link>

            <Link
              href="/#courses"
              className="font-normal transition-all duration-200 hover:font-bold hover:underline hover:underline-offset-8"
            >
              Courses
            </Link>

            <Link
              href="/#about"
              className="font-normal transition-all duration-200 hover:font-bold hover:underline hover:underline-offset-8"
            >
              About
            </Link>

            <Link
              href="/student/dashboard"
              className="font-bold underline underline-offset-8"
            >
              Student Dashboard
            </Link>

          </div>

          {/* AKUN DAN LOGOUT KANAN */}
          <div className="ml-auto flex shrink-0 items-center justify-end gap-5">

            <Link
              href="/account/profile"
              className="font-semibold text-[#0B1F3A] transition hover:underline hover:underline-offset-4"
            >
              Pengaturan Akun
            </Link>

            <LogoutButton />

          </div>

        </div>
      </nav>

      {/* KONTEN DASHBOARD */}
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* WELCOME */}
        <section className="mb-10">
          <p className="mb-2 font-semibold">
            STUDENT DASHBOARD
          </p>

          <h1 className="mb-3 text-3xl font-bold md:text-4xl">
            Halo, {user.username}!
          </h1>

          <p>
            Selamat datang di Dashboard Student NadhiLearn.
            Yuk, lanjutkan perjalanan belajarmu!
          </p>
        </section>

        {/* STATISTICS */}
        <section className="mb-12 grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 text-[#0B1F3A]">
            <p className="mb-3 font-semibold">
              Kursus Diikuti
            </p>

            <h2 className="text-4xl font-bold">
              {totalCourses}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 text-[#0B1F3A]">
            <p className="mb-3 font-semibold">
              Materi Diselesaikan
            </p>

            <h2 className="text-4xl font-bold">
              {completedMaterials}
            </h2>

            <p className="mt-2 text-sm">
              Dari {totalMaterials} total materi
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 text-[#0B1F3A]">
            <p className="mb-3 font-semibold">
              Progress Belajar
            </p>

            <h2 className="text-4xl font-bold">
              {progress}%
            </h2>

            <div className="mt-4 h-3 overflow-hidden rounded-full border border-[#0B1F3A]">
              <div
                className="h-full bg-[#0B1F3A]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

        </section>

        {/* MY COURSES */}
        <section>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                Kursus Saya
              </h2>

              <p className="mt-2">
                Daftar kursus yang sedang kamu ikuti.
              </p>
            </div>

            <a
              href="/#courses"
              className="rounded-lg border-2 border-white px-5 py-3 font-bold transition hover:bg-white hover:text-[#0B1F3A]"
            >
              Cari Kursus
            </a>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-2xl border-2 border-white p-10 text-center">
              <h3 className="mb-3 text-xl font-bold">
                Belum Ada Kursus
              </h3>

              <p className="mb-6">
                Kamu belum mengikuti kursus apa pun.
                Yuk, temukan kursus yang menarik!
              </p>

              <a
                href="/#courses"
                className="inline-block rounded-lg bg-white px-6 py-3 font-bold text-[#0B1F3A]"
              >
                Jelajahi Kursus
              </a>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const courseProgress =
                  course.total_materials > 0
                    ? Math.round(
                        (course.completed_materials /
                          course.total_materials) * 100
                      )
                    : 0;

                return (
                  <article
                    key={course.id}
                    className="rounded-2xl bg-white p-6 text-[#0B1F3A]"
                  >
                    <h3 className="mb-3 text-xl font-bold">
                      {course.title}
                    </h3>

                    <p className="mb-5 line-clamp-3">
                      {course.description}
                    </p>

                    <div className="mb-3 flex justify-between text-sm font-semibold">
                      <span>Progress</span>
                      <span>{courseProgress}%</span>
                    </div>

                    <div className="mb-5 h-3 overflow-hidden rounded-full border border-[#0B1F3A]">
                      <div
                        className="h-full bg-[#0B1F3A]"
                        style={{
                          width: `${courseProgress}%`,
                        }}
                      />
                    </div>

                    <p className="mb-5 text-sm">
                      {course.completed_materials} dari{" "}
                      {course.total_materials} materi selesai
                    </p>

                    <p className="mb-5 text-sm">
                      Status:{" "}
                      <strong>
                        {courseProgress === 100
                          ? "Selesai"
                          : "Sedang Belajar"}
                      </strong>
                    </p>

                    <a
                      href="/#courses"
                      className="block rounded-lg bg-[#0B1F3A] px-5 py-3 text-center font-bold text-white transition hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-2 hover:outline-[#0B1F3A]"
                    >
                      Lihat Kursus
                    </a>
                  </article>
                );
              })}
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
