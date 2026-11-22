
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export default async function StudentDashboard() {
  // PERIKSA SESI LOGIN
  const cookieStore = await cookies();
const token = cookieStore.get("nadhi_student_token")?.value;
  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);

  if (!payload) {
    redirect("/login");
  }

  // AMBIL DATA PENGGUNA
  const userResult = await pool.query(
  `SELECT
    id,
    username,
    display_name,
    email,
    role,
    teacher_status
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
      AND e.status = 'active'
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
    <main className="min-h-screen bg-white text-[#101b36]">

      {/* KONTEN DASHBOARD */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">

        {/* Top Bar */}
        <div className="mb-6 flex justify-end pr-20">
        <Link
          href="/"
          className="rounded-lg bg-[#0a1f4a] px-6 py-3 font-semibold text-white transition hover:bg-[#1b3a7a]"
        >
          Home
        </Link>
      </div>

        {/* WELCOME */}
        <section className="mb-10">
          <p className="mb-2 font-semibold">
            STUDENT DASHBOARD
          </p>

          <h1 className="mb-3 text-3xl font-bold md:text-4xl">
          Halo, {user.display_name || user.username}!          </h1>

          <p>
            Selamat datang di Dashboard Student NadhiLearn.
            Yuk, lanjutkan perjalanan belajarmu!
          </p>
        </section>

        {/* STATISTICS */}
        <section
        id="progress"
        className="mb-12 grid gap-5 md:grid-cols-3"
      >

          {/* KURSUS DIIKUTI */}
          <div className="rounded-2xl border border-[#dce3ef] bg-white p-6 text-[#101b36] shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="mb-3 font-semibold">
              Kursus Diikuti
            </p>

            <h2 className="text-4xl font-bold">
              {totalCourses}
            </h2>
          </div>

          {/* MATERI DISELESAIKAN */}
          <div className="rounded-2xl border border-[#dce3ef] bg-white p-6 text-[#101b36] shadow-sm transition-shadow duration-200 hover:shadow-md">
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

          {/* PROGRESS BELAJAR */}
          <div className="rounded-2xl border border-[#dce3ef] bg-white p-6 text-[#101b36] shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="mb-3 font-semibold">
              Progress Belajar
            </p>

            <h2 className="text-4xl font-bold">
              {progress}%
            </h2>

            <div className="mt-4 h-3 overflow-hidden rounded-full border border-[#c2cce0]">
              <div
                className="h-full bg-[#0a1f4a] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

        </section>

        {/* MY COURSES */}
        <section id="my-courses">

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
              className="rounded-lg border-2 border-[#c2cce0] px-5 py-3 font-bold transition-colors hover:bg-[#0a1f4a] hover:text-white"
            >
              Cari Kursus
            </a>
          </div>

          {courses.length === 0 ? (

            /* BELUM ADA KURSUS */
            <div className="rounded-2xl border border-[#dce3ef] bg-white p-10 text-center shadow-sm">
              <h3 className="mb-3 text-xl font-bold">
                Belum Ada Kursus
              </h3>

              <p className="mb-6">
                Kamu belum mengikuti kursus apa pun.
                Yuk, temukan kursus yang menarik!
              </p>

              <a
                href="/#courses"
                className="inline-block rounded-lg bg-[#0a1f4a] px-6 py-3 font-bold text-white transition-colors hover:bg-white hover:text-[#101b36] hover:outline hover:outline-1 hover:outline-[#0a1f4a]"
              >
                Jelajahi Kursus
              </a>
            </div>

          ) : (

            /* DAFTAR KURSUS */
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
                    className="rounded-2xl border border-[#dce3ef] bg-white p-6 text-[#101b36] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
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

                    <div className="mb-5 h-3 overflow-hidden rounded-full border border-[#c2cce0]">
                      <div
                        className="h-full bg-[#0a1f4a] transition-all duration-300"
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
                      className="block rounded-lg bg-[#0a1f4a] px-5 py-3 text-center font-bold text-white transition-colors hover:bg-white hover:text-[#101b36] hover:outline hover:outline-2 hover:outline-[#0a1f4a]"
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
      <footer className="mt-16 border-t border-[#dce3ef] bg-white px-6 py-6 text-center text-[#101b36]">
        <p className="font-semibold">
          © 2026 NadhiLearn. All Rights Reserved.
        </p>
      </footer>

    </main>
  );
}
