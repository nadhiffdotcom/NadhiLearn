
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// ========================================
// HELPER: FORMAT TANGGAL
// ========================================
function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ========================================
// HELPER: VALIDASI STUDENT
// ========================================
async function getStudent() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_student_token")?.value;

  if (!token) redirect("/login");

  const student = await verifyToken(token);

  if (!student || student.role !== "student" || !student.id) {
    redirect("/login");
  }

  return student;
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

  const student = await getStudent();

  // CHECK ENROLLMENT
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

  // CHECK CONTENT
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

  // SAVE COMPLETED PROGRESS
  await pool.query(
    `INSERT INTO content_progress (
       enrollment_id,
       content_id,
       is_completed,
       completed_at
     )
     VALUES ($1, $2, TRUE, NOW())
     ON CONFLICT (enrollment_id, content_id)
     DO UPDATE SET
       is_completed = TRUE,
       completed_at = NOW()`,
    [enrollmentId, contentId]
  );

  // CHECK TOTAL PROGRESS
  const progressResult = await pool.query(
    `SELECT
       COUNT(ct.id)::int AS total_contents,
       COUNT(cp.id) FILTER (
         WHERE cp.is_completed = TRUE
       )::int AS completed_contents
     FROM contents ct
     LEFT JOIN content_progress cp
       ON cp.content_id = ct.id
       AND cp.enrollment_id = $1
     WHERE ct.course_id = $2`,
    [enrollmentId, courseId]
  );

  const totalContents = progressResult.rows[0].total_contents;
  const completedContents = progressResult.rows[0].completed_contents;

  // AUTOMATICALLY ISSUE CERTIFICATE AT 100%
  if (
    totalContents > 0 &&
    completedContents === totalContents
  ) {
    const certificateCode = `NDH-${randomUUID().toUpperCase()}`;

    await pool.query(
      `INSERT INTO certificates (
         enrollment_id,
         certificate_code,
         student_name,
         course_title
       )
       SELECT
         e.id,
         $2,
         COALESCE(
           NULLIF(BTRIM(u.display_name), ''),
           'Nama belum diatur'
         ),
         c.title
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       JOIN courses c ON c.id = e.course_id
       WHERE e.id = $1
       ON CONFLICT (enrollment_id) DO NOTHING`,
      [enrollmentId, certificateCode]
    );
  }

  revalidatePath(`/student/courses/${courseId}`);
  revalidatePath("/student/my-courses");

  redirect(`/student/courses/${courseId}`);
}

// ========================================
// SERVER ACTION: ADD COMMENT
// ========================================
async function addComment(formData) {
  "use server";

  const courseId = Number(formData.get("course_id"));
  const contentId = Number(formData.get("content_id"));
  const comment = String(formData.get("comment") || "").trim();

  if (
    !Number.isSafeInteger(courseId) ||
    courseId <= 0 ||
    !Number.isSafeInteger(contentId) ||
    contentId <= 0 ||
    !comment ||
    comment.length > 2000
  ) {
    redirect("/student/my-courses");
  }

  const student = await getStudent();

  // PASTIKAN STUDENT SUDAH TERDAFTAR PADA COURSE
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

  // PASTIKAN MATERI MILIK COURSE TERSEBUT
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

  // SIMPAN KOMENTAR
  await pool.query(
    `INSERT INTO comments (content_id, user_id, comment)
     VALUES ($1, $2, $3)`,
    [contentId, student.id, comment]
  );

  revalidatePath(`/student/courses/${courseId}`);

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
  const student = await getStudent();

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
       COALESCE(
         NULLIF(BTRIM(teacher.display_name), ''),
         'Nama belum diatur'
       ) AS teacher_name,
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

  // ========================================
  // GET COMMENTS FOR EACH CONTENT
  // ========================================
  let comments = [];

  if (contents.length > 0) {
    const contentIds = contents.map((content) => content.id);

    const commentsResult = await pool.query(
      `SELECT
         cm.id,
         cm.content_id,
         cm.comment,
         cm.created_at,
         cm.updated_at,
         u.id AS user_id,
         COALESCE(
           NULLIF(BTRIM(u.display_name), ''),
           'Nama belum diatur'
         ) AS display_name,
         u.role
       FROM comments cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.content_id = ANY($1::bigint[])
       ORDER BY cm.created_at ASC, cm.id ASC`,
      [contentIds]
    );

    comments = commentsResult.rows;
  }

  // KELOMPOKKAN KOMENTAR BERDASARKAN MATERI
  const commentsByContent = {};

  for (const comment of comments) {
    const key = String(comment.content_id);

    if (!commentsByContent[key]) {
      commentsByContent[key] = [];
    }

    commentsByContent[key].push(comment);
  }

  // ========================================
  // CALCULATE PROGRESS
  // ========================================
  const completedCount = contents.filter(
    (content) => content.is_completed
  ).length;

  const totalContents = contents.length;

  const progress =
    totalContents > 0
      ? Math.round((completedCount / totalContents) * 100)
      : 0;

  // ========================================
  // AUTO ISSUE CERTIFICATE IF PROGRESS 100%
  // ========================================
  if (
    totalContents > 0 &&
    completedCount === totalContents
  ) {
    const certificateResult = await pool.query(
      `SELECT id
       FROM certificates
       WHERE enrollment_id = $1
       LIMIT 1`,
      [enrollmentId]
    );

    if (certificateResult.rows.length === 0) {
      const certificateCode = `NDH-${randomUUID().toUpperCase()}`;

      await pool.query(
        `INSERT INTO certificates (
           enrollment_id,
           certificate_code,
           student_name,
           course_title
         )
         SELECT
           e.id,
           $2,
           COALESCE(
             NULLIF(BTRIM(u.display_name), ''),
             'Nama belum diatur'
           ),
           c.title
         FROM enrollments e
         JOIN users u ON u.id = e.student_id
         JOIN courses c ON c.id = e.course_id
         WHERE e.id = $1
         ON CONFLICT (enrollment_id) DO NOTHING`,
        [enrollmentId, certificateCode]
      );
    }
  }

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
            Teacher:{" "}
            <span className="font-semibold text-[#0B1F3A]">
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
          {contents.map((content, index) => {
            const contentComments =
              commentsByContent[String(content.id)] || [];

            return (
              <div
                key={content.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                {/* CONTENT HEADER */}
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

                {/* CONTENT BODY */}
                {content.content && (
                  <div className="mt-5 whitespace-pre-wrap border-t border-gray-100 pt-4 text-sm leading-7 text-gray-700">
                    {content.content}
                  </div>
                )}

                {/* DISCUSSION */}
                <div className="mt-6 border-t border-gray-200 pt-5">

                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-bold text-[#0B1F3A]">
                      Discussion
                    </h4>

                    <span className="text-xs text-gray-500">
                      {contentComments.length} komentar
                    </span>
                  </div>

                  {/* COMMENT LIST */}
                  {contentComments.length === 0 ? (
                    <p className="mb-4 rounded-lg bg-gray-50 px-4 py-4 text-sm text-gray-500">
                      Belum ada komentar. Jadilah yang pertama berdiskusi!
                    </p>
                  ) : (
                    <div className="mb-5 space-y-3">
                      {contentComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-lg bg-gray-50 p-4"
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#0B1F3A]">
                                {comment.display_name}
                              </span>

                              {comment.role === "teacher" && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                  Teacher
                                </span>
                              )}

                              {comment.role === "admin" && (
                                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                                  Admin
                                </span>
                              )}
                            </div>

                            <span className="text-xs text-gray-400">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>

                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                            {comment.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ADD COMMENT */}
                  <form action={addComment} className="space-y-3">
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

                    <label
                      htmlFor={`comment-${content.id}`}
                      className="block text-sm font-semibold text-[#0B1F3A]"
                    >
                      Tulis Komentar
                    </label>

                    <textarea
                      id={`comment-${content.id}`}
                      name="comment"
                      rows={3}
                      maxLength={2000}
                      required
                      placeholder="Tulis pertanyaan atau komentar tentang materi ini..."
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#0B1F3A]"
                    />

                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <p className="text-xs text-gray-400">
                        Maksimal 2.000 karakter.
                      </p>

                      <button
                        type="submit"
                        className="rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#18395F]"
                      >
                        Kirim Komentar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            );
          })}
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
