
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// ========================================
// HELPER: FORMAT TANGGAL
// ========================================
function formatDate(date) {
  if (!date) return "-";

  const value =
    date instanceof Date
      ? date.toISOString().slice(0, 10)
      : String(date).slice(0, 10);

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ========================================
// SERVER ACTION: MARK CONTENT COMPLETED
// ========================================
async function markContentCompleted(formData) {
  "use server";

  const courseId = Number(formData.get("course_id"));
  const contentId = Number(formData.get("content_id"));

  if (
    !Number.isSafeInteger(courseId) ||
    courseId <= 0 ||
    !Number.isSafeInteger(contentId) ||
    contentId <= 0
  ) {
    redirect("/student/my-courses");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_student_token")?.value;

  if (!token) redirect("/login");

  const student = await verifyToken(token);

  if (!student || student.role !== "student" || !student.id) {
    redirect("/login");
  }

  // Pastikan Student terdaftar di course
  const enrollmentResult = await pool.query(
    `SELECT e.id
     FROM enrollments e
     WHERE e.student_id = $1
       AND e.course_id = $2
     LIMIT 1`,
    [student.id, courseId]
  );

  if (enrollmentResult.rows.length === 0) {
    redirect("/student/courses");
  }

  const enrollmentId = enrollmentResult.rows[0].id;

  // Pastikan materi merupakan bagian dari course tersebut
  const contentResult = await pool.query(
    `SELECT id
     FROM contents
     WHERE id = $1
       AND course_id = $2
     LIMIT 1`,
    [contentId, courseId]
  );

  if (contentResult.rows.length === 0) {
    redirect(`/student/courses/${courseId}`);
  }

  // Simpan progress atau perbarui jika sudah ada
  await pool.query(
    `INSERT INTO content_progress
       (enrollment_id, content_id, is_completed, completed_at)
     VALUES ($1, $2, TRUE, NOW())
     ON CONFLICT (enrollment_id, content_id)
     DO UPDATE SET
       is_completed = TRUE,
       completed_at = NOW()`,
    [enrollmentId, contentId]
  );

  revalidatePath(`/student/courses/${courseId}`);
  revalidatePath("/student/my-courses");

  redirect(`/student/courses/${courseId}`);
}

// ========================================
// MAIN PAGE
// ========================================
export default async function CourseDetailPage({ params }) {
  const { id } = await params;
  const courseId = Number(id);

  if (!Number.isSafeInteger(courseId) || courseId <= 0) {
    notFound();
  }

  // ========================================
  // CHECK LOGIN
  // ========================================
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_student_token")?.value;

  if (!token) redirect("/login");

  const student = await verifyToken(token);

  if (!student || student.role !== "student" || !student.id) {
    redirect("/login");
  }

  // ========================================
  // CHECK ENROLLMENT
  // ========================================
  const enrollmentResult = await pool.query(
    `SELECT id
     FROM enrollments
     WHERE student_id = $1
       AND course_id = $2
     LIMIT 1`,
    [student.id, courseId]
  );

  if (enrollmentResult.rows.length === 0) {
    redirect("/student/courses");
  }

  const enrollmentId = enrollmentResult.rows[0].id;

  // ========================================
  // GET COURSE
  // ========================================
  const courseResult = await pool.query(
    `SELECT
       c.id,
       c.title,
       c.description,
       c.thumbnail,
       teacher.username AS teacher_name,
       cat.name AS category_name
     FROM courses c
     LEFT JOIN users teacher ON teacher.id = c.teacher_id
     LEFT JOIN categories cat ON cat.id = c.category_id
     WHERE c.id = $1
     LIMIT 1`,
    [courseId]
  );

  if (courseResult.rows.length === 0) {
    notFound();
  }

  const course = courseResult.rows[0];

  // ========================================
  // GET CONTENTS AND PROGRESS
  // ========================================
  const contentResult = await pool.query(
    `SELECT
       ct.id,
       ct.title,
       ct.description,
       ct.content,
       ct.order_index,
       COALESCE(cp.is_completed, FALSE) AS is_completed,
       cp.completed_at

     FROM contents ct

     LEFT JOIN content_progress cp
       ON cp.content_id = ct.id
       AND cp.enrollment_id = $1

     WHERE ct.course_id = $2

     ORDER BY ct.order_index ASC, ct.id ASC`,
    [enrollmentId, courseId]
  );

  const contents = contentResult.rows;

  const completedCount = contents.filter(
    (content) => content.is_completed
  ).length;

  const totalContents = contents.length;

  const progress = totalContents > 0
    ? Math.round((completedCount / totalContents) * 100)
    : 0;

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50 px-5 py-8 md:px-8">

      {/* BACK BUTTON */}
      <Link
        href="/student/my-courses"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1F3A] hover:underline"
      >
        ← Kembali ke My Courses
      </Link>

      {/* COURSE HEADER */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        {course.thumbnail && (
          <div className="h-52 overflow-hidden bg-gray-100 md:h-64">
            <img
              src={course.thumbnail}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-6 md:p-8">

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {course.category_name || "Tanpa Kategori"}
          </span>

          <h1 className="mt-4 text-2xl font-bold text-[#0B1F3A] md:text-3xl">
            {course.title}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {course.description || "Belum ada deskripsi course."}
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Teacher: <span className="font-semibold text-[#0B1F3A]">
              {course.teacher_name || "Belum ditentukan"}
            </span>
          </p>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-[#0B1F3A]">
            Progress Belajar
          </h2>

          <span className="text-sm font-bold text-[#0B1F3A]">
            {progress}%
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-sm text-gray-500">
          {completedCount} dari {totalContents} materi telah diselesaikan.
        </p>
      </div>

      {/* CONTENT LIST */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#0B1F3A]">
          Materi Pembelajaran
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Pelajari materi secara berurutan dan tandai setelah selesai.
        </p>
      </div>

      {contents.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center">
          <div className="mb-3 text-4xl">📖</div>

          <h3 className="font-bold text-[#0B1F3A]">
            Belum ada materi
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Teacher belum menambahkan materi untuk course ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {contents.map((content, index) => (
            <div
              key={content.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B1F3A] text-sm font-bold text-white">
                    {index + 1}
                  </div>

                  <div>
                    <h3 className="font-bold text-[#0B1F3A]">
                      {content.title}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {content.description || "Materi pembelajaran"}
                    </p>

                    {content.is_completed && (
                      <span className="mt-2 inline-block text-xs font-semibold text-green-600">
                        ✓ Selesai
                      </span>
                    )}
                  </div>
                </div>

                {content.is_completed ? (
                  <span className="rounded-lg bg-green-50 px-4 py-2 text-center text-sm font-semibold text-green-700">
                    Materi Selesai
                  </span>
                ) : (
                  <form action={markContentCompleted}>
                    <input
                      type="hidden"
                      name="course_id"
                      value={courseId}
                    />

                    <input
                      type="hidden"
                      name="content_id"
                      value={content.id}
                    />

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#18395F] sm:w-auto"
                    >
                      Tandai Selesai
                    </button>
                  </form>
                )}
              </div>

              {content.content && (
                <div className="mt-5 whitespace-pre-wrap border-t border-gray-100 pt-4 text-sm leading-7 text-gray-700">
                  {content.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* BACK TO MY COURSES */}
      <div className="mt-8">
        <Link
          href="/student/my-courses"
          className="inline-block rounded-lg border border-[#0B1F3A] px-5 py-3 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-white"
        >
          Kembali ke My Courses
        </Link>
      </div>

    </div>
  );
}
