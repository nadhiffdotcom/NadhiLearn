
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export default async function TeacherDashboard() {
  // 1. PERIKSA SESI LOGIN
  const cookieStore = await cookies();
const token = cookieStore.get("nadhi_teacher_token")?.value;
  if (!token) {
    redirect("/login"); 
  }

  const payload = await verifyToken(token);

  if (!payload) {
    redirect("/login");
  }

  // 2. AMBIL DATA PENGGUNA
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

  // 3. PERIKSA HAK AKSES TEACHER
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

  // 4. AMBIL KURSUS YANG DIAJAR TEACHER
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

  // 5. HITUNG STATISTIK DASHBOARD
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
    <main className="min-h-screen bg-white text-[#0B1F3A]">

      {/* KONTEN DASHBOARD */}
      <div className="mx-auto max-w-7xl px-6 py-10">

            {/* Top Bar */}
    <div className="mb-6 flex justify-end pr-20">
      <Link
        href="/"
        className="rounded-lg bg-[#0B1F3A] px-6 py-3 font-semibold text-white transition hover:bg-[#17385F]"
      >
        Home
      </Link>
    </div>


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

          {/* TOTAL COURSES */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-[#0B1F3A] shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="mb-3 font-semibold text-gray-600">
              Kursus yang Diajar
            </p>

            <h2 className="text-4xl font-bold">
              {totalCourses}
            </h2>
          </div>

          {/* TOTAL STUDENTS */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-[#0B1F3A] shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="mb-3 font-semibold text-gray-600">
              Total Student
            </p>

            <h2 className="text-4xl font-bold">
              {totalStudents}
            </h2>
          </div>

          {/* TOTAL MATERIALS */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-[#0B1F3A] shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="mb-3 font-semibold text-gray-600">
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

            <p className="mt-2 text-gray-600">
              Pantau kursus dan perkembangan Student di setiap kelas.
            </p>
          </div>

          {courses.length === 0 ? (

            /* EMPTY STATE */
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <h3 className="mb-3 text-xl font-bold">
                Belum Ada Kursus
              </h3>

              <p className="text-gray-600">
                Kamu belum memiliki kursus yang diajar.
                Kursus yang ditugaskan kepadamu akan muncul di sini.
              </p>
            </div>

          ) : (
            <>

              {/* AVERAGE STUDENT PROGRESS */}
              <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 text-[#0B1F3A] shadow-sm transition-shadow duration-200 hover:shadow-md">
                <p className="mb-2 font-semibold text-gray-600">
                  Rata-rata Progress Student
                </p>

                <h3 className="text-4xl font-bold">
                  {averageProgress}%
                </h3>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#0B1F3A] transition-all duration-300"
                    style={{
                      width: `${averageProgress}%`,
                    }}
                  />
                </div>
              </div>

              {/* COURSE CARDS */}
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
                      className="rounded-2xl border border-gray-200 bg-white p-6 text-[#0B1F3A] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                    >

                      <h3 className="mb-3 text-xl font-bold">
                        {course.title}
                      </h3>

                      <p className="mb-5 line-clamp-3 text-gray-600">
                        {course.description}
                      </p>

                      {/* COURSE INFORMATION */}
                      <div className="mb-4 space-y-2 text-sm text-gray-700">

                        <p>
                          Jumlah Student:{" "}
                          <strong className="text-[#0B1F3A]">
                            {studentCount}
                          </strong>
                        </p>

                        <p>
                          Jumlah Materi:{" "}
                          <strong className="text-[#0B1F3A]">
                            {materialCount}
                          </strong>
                        </p>

                        <p>
                          Materi Diselesaikan:{" "}
                          <strong className="text-[#0B1F3A]">
                            {completedPairs}
                          </strong>
                        </p>

                      </div>

                      {/* COURSE PROGRESS */}
                      <div className="mb-3 flex justify-between text-sm font-semibold">
                        <span>Progress Student</span>
                        <span>{courseProgress}%</span>
                      </div>

                      <div className="mb-5 h-3 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-[#0B1F3A] transition-all duration-300"
                          style={{
                            width: `${courseProgress}%`,
                          }}
                        />
                      </div>

                      {/* COURSE DATES */}
                      <div className="border-t border-gray-200 pt-4 text-sm text-gray-600">

                        <p>
                          Mulai:{" "}
                          <span className="font-semibold text-[#0B1F3A]">
                            {course.start_date
                              ? new Date(
                                  course.start_date
                                ).toLocaleDateString("id-ID")
                              : "Belum ditentukan"}
                          </span>
                        </p>

                        <p className="mt-2">
                          Selesai:{" "}
                          <span className="font-semibold text-[#0B1F3A]">
                            {course.end_date
                              ? new Date(
                                  course.end_date
                                ).toLocaleDateString("id-ID")
                              : "Belum ditentukan"}
                          </span>
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
      <footer className="mt-16 border-t border-gray-200 bg-white px-6 py-6 text-center text-[#0B1F3A]">
        <p className="font-semibold">
          © 2026 NadhiLearn. All Rights Reserved.
        </p>
      </footer>

    </main>
  );
}
