
import Link from "next/link";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import LogoutButton from "../../student/dashboard/LogoutButton";

export default async function TeacherDashboard() {
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

  // 2. Ambil data terbaru pengguna dari database
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

  // 3. Periksa hak akses Teacher
  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (user.role === "student") {
    redirect("/student/dashboard");
  }

  if (
    user.role !== "teacher" ||
    user.teacher_status !== "approved"
  ) {
    redirect("/student/dashboard");
  }

  // 4. Ambil kursus yang diajar Teacher
  const coursesResult = await pool.query(
    `SELECT
      c.id,
      c.title,
      c.description,
      c.start_date,
      c.end_date,
      COUNT(DISTINCT e.student_id)::int AS total_students,
      COUNT(DISTINCT ct.id)::int AS total_materials,
      COUNT(DISTINCT (e.id, ct.id))
        FILTER (WHERE cp.is_completed = TRUE)
        AS completed_pairs
    FROM courses c
    LEFT JOIN enrollments e
      ON e.course_id = c.id
    LEFT JOIN contents ct
      ON ct.course_id = c.id
    LEFT JOIN content_progress cp
      ON cp.enrollment_id = e.id
      AND cp.content_id = ct.id
    WHERE c.teacher_id = $1
    GROUP BY c.id
    ORDER BY c.created_at DESC`,
    [user.id]
  );

  const courses = coursesResult.rows;

  // 5. Hitung statistik dashboard
  const totalCourses = courses.length;

  const totalStudentsResult = await pool.query(
    `SELECT COUNT(DISTINCT e.student_id)::int AS total_students
     FROM courses c
     LEFT JOIN enrollments e
       ON e.course_id = c.id
     WHERE c.teacher_id = $1`,
    [user.id]
  );

  const totalStudents =
    totalStudentsResult.rows[0].total_students;

  const totalMaterials = courses.reduce(
    (total, course) =>
      total + Number(course.total_materials),
    0
  );

  const totalCompletedPairs = courses.reduce(
    (total, course) =>
      total + Number(course.completed_pairs),
    0
  );

  const totalPossiblePairs = courses.reduce(
    (total, course) =>
      total +
      Number(course.total_students) *
        Number(course.total_materials),
    0
  );

  const averageProgress =
    totalPossiblePairs > 0
      ? Math.round(
          (totalCompletedPairs / totalPossiblePairs) * 100
        )
      : 0;

  return (
    <main className="min-h-screen bg-[#0B1F3A] text-white">

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* WELCOME */}
        <section className="mb-10">
          <p className="mb-2 font-semibold">
            TEACHER DASHBOARD
          </p>

          <h1 className="mb-3 text-3xl font-bold md:text-4xl">
            Halo, {user.username}!
          </h1>

          <p>
            Selamat datang di Dashboard Teacher NadhiLearn.
            Mari kelola kursus dan pantau perkembangan Student.
          </p>
        </section>

        {/* STATISTICS */}
        <section className="mb-12 grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 text-[#0B1F3A]">
            <p className="mb-3 font-semibold">
              Kursus yang Diajar
            </p>

            <h2 className="text-4xl font-bold">
              {totalCourses}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 text-[#0B1F3A]">
            <p className="mb-3 font-semibold">
              Total Student
            </p>

            <h2 className="text-4xl font-bold">
              {totalStudents}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 text-[#0B1F3A]">
            <p className="mb-3 font-semibold">
              Total Materi
            </p>

            <h2 className="text-4xl font-bold">
              {totalMaterials}
            </h2>
          </div>

        </section>

        {/* COURSE LIST */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              Kursus yang Saya Ajar
            </h2>

            <p className="mt-2">
              Pantau kursus dan perkembangan Student di setiap kelas.
            </p>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-2xl border-2 border-white p-10 text-center">
              <h3 className="mb-3 text-xl font-bold">
                Belum Ada Kursus
              </h3>

              <p>
                Kamu belum memiliki kursus yang diajar.
                Kursus yang ditugaskan kepadamu akan muncul di sini.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 rounded-2xl bg-white p-6 text-[#0B1F3A]">
                <p className="mb-2 font-semibold">
                  Rata-rata Progress Student
                </p>

                <h3 className="text-4xl font-bold">
                  {averageProgress}%
                </h3>

                <div className="mt-4 h-3 overflow-hidden rounded-full border border-[#0B1F3A]">
                  <div
                    className="h-full bg-[#0B1F3A]"
                    style={{
                      width: `${averageProgress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => {
                  const studentCount =
                    Number(course.total_students);

                  const materialCount =
                    Number(course.total_materials);

                  const completedPairs =
                    Number(course.completed_pairs);

                  const possiblePairs =
                    studentCount * materialCount;

                  const courseProgress =
                    possiblePairs > 0
                      ? Math.round(
                          (completedPairs / possiblePairs) * 100
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

                      <div className="mb-4 space-y-2 text-sm">
                        <p>
                          Jumlah Student:{" "}
                          <strong>{studentCount}</strong>
                        </p>

                        <p>
                          Jumlah Materi:{" "}
                          <strong>{materialCount}</strong>
                        </p>

                        <p>
                          Materi Diselesaikan:{" "}
                          <strong>{completedPairs}</strong>
                        </p>
                      </div>

                      <div className="mb-3 flex justify-between text-sm font-semibold">
                        <span>Progress Student</span>
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

                      <div className="border-t border-[#0B1F3A] pt-4 text-sm">
                        <p>
                          Mulai:{" "}
                          {course.start_date
                            ? new Date(
                                course.start_date
                              ).toLocaleDateString("id-ID")
                            : "Belum ditentukan"}
                        </p>

                        <p className="mt-2">
                          Selesai:{" "}
                          {course.end_date
                            ? new Date(
                                course.end_date
                              ).toLocaleDateString("id-ID")
                            : "Belum ditentukan"}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
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
