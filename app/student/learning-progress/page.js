
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// ========================================
// HELPER: PAGE URL
// ========================================
function getPageUrl(page, search) {
  const params = new URLSearchParams();

  if (search) params.set("q", search);

  params.set("page", String(page));

  return `/student/learning-progress?${params.toString()}`;
}

// ========================================
// MAIN PAGE
// ========================================
export default async function LearningProgressPage({ searchParams }) {
  const params = await searchParams;

  const search =
    typeof params?.q === "string" ? params.q.trim() : "";

  const requestedPage = Math.max(
    1,
    Number.parseInt(params?.page || "1", 10) || 1
  );

  const limit = 9;

  // ========================================
  // CHECK STUDENT LOGIN
  // ========================================
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_student_token")?.value;

  if (!token) redirect("/login");

  const student = await verifyToken(token);

  if (!student || student.role !== "student" || !student.id) {
    redirect("/login");
  }

  // ========================================
  // COUNT COURSES
  // ========================================
  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM enrollments e
      INNER JOIN courses c
        ON c.id = e.course_id
      WHERE e.student_id = $1
        AND (
          c.title ILIKE $2
          OR COALESCE(c.description, '') ILIKE $2
        )
    `,
    [student.id, `%${search}%`]
  );

  const totalCourses = countResult.rows[0].total;
  const totalPages = Math.ceil(totalCourses / limit);

  const currentPage = Math.min(
    requestedPage,
    Math.max(totalPages, 1)
  );

  const offset = (currentPage - 1) * limit;

  // ========================================
  // GET LEARNING PROGRESS
  // ========================================
  const progressResult = await pool.query(
    `
      SELECT
        c.id AS course_id,
        c.title,
        c.description,
        c.thumbnail,

        e.id AS enrollment_id,

        COUNT(ct.id)::int AS total_contents,

        COUNT(cp.id) FILTER (
          WHERE cp.is_completed = TRUE
        )::int AS completed_contents

      FROM enrollments e

      INNER JOIN courses c
        ON c.id = e.course_id

      LEFT JOIN contents ct
        ON ct.course_id = c.id

      LEFT JOIN content_progress cp
        ON cp.content_id = ct.id
        AND cp.enrollment_id = e.id

      WHERE e.student_id = $1
        AND (
          c.title ILIKE $2
          OR COALESCE(c.description, '') ILIKE $2
        )

      GROUP BY
        c.id,
        c.title,
        c.description,
        c.thumbnail,
        e.id,
        e.enrolled_at

      ORDER BY e.enrolled_at DESC

      LIMIT $3
      OFFSET $4
    `,
    [student.id, `%${search}%`, limit, offset]
  );

  const courses = progressResult.rows;

  // ========================================
  // SUMMARY
  // ========================================
  const summaryResult = await pool.query(
    `
      SELECT
        COUNT(DISTINCT e.id)::int AS total_courses,

        COUNT(DISTINCT e.id) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM contents ct
            WHERE ct.course_id = c.id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM contents ct
            WHERE ct.course_id = c.id
              AND NOT EXISTS (
                SELECT 1
                FROM content_progress cp
                WHERE cp.enrollment_id = e.id
                  AND cp.content_id = ct.id
                  AND cp.is_completed = TRUE
              )
          )
        )::int AS completed_courses

      FROM enrollments e

      INNER JOIN courses c
        ON c.id = e.course_id

      WHERE e.student_id = $1
    `,
    [student.id]
  );

  const summary = summaryResult.rows[0];

  // ========================================
  // RENDER PAGE
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50 px-5 py-8 md:px-8">

      {/* PAGE HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0B1F3A]">
          Learning Progress
        </h1>

        <p className="mt-2 text-gray-500">
          Pantau perkembangan belajar dan pencapaianmu di setiap course.
        </p>
      </div>

      {/* SUMMARY */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Course Diikuti
          </p>

          <p className="mt-2 text-3xl font-bold text-[#0B1F3A]">
            {summary.total_courses}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Course Selesai
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {summary.completed_courses}
          </p>
        </div>

      </div>

      {/* SEARCH */}
      <form
        method="GET"
        action="/student/learning-progress"
        className="mb-8 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row"
      >
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Cari course..."
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]"
        />

        <button
          type="submit"
          className="rounded-lg bg-[#0B1F3A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#18395F]"
        >
          Cari Course
        </button>
      </form>

      {/* COURSE LIST HEADER */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#0B1F3A]">
          Progress Course Saya
        </h2>

        <p className="text-sm text-gray-500">
          {totalCourses} course
        </p>
      </div>

      {/* COURSE LIST */}
      {courses.length === 0 ? (

        <div className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center">

          <div className="mb-3 text-5xl">📊</div>

          <h3 className="text-lg font-bold text-[#0B1F3A]">
            {search
              ? "Course tidak ditemukan"
              : "Belum ada progress belajar"}
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            {search
              ? "Coba gunakan kata kunci lainnya."
              : "Ikuti course terlebih dahulu untuk mulai melihat progress belajarmu."}
          </p>

          <Link
            href="/student/my-courses"
            className="mt-5 inline-block rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18395F]"
          >
            Lihat My Courses
          </Link>

        </div>

      ) : (

        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">

            {courses.map((course) => {
              const total = Number(course.total_contents);
              const completed = Number(course.completed_contents);

              const progress = total > 0
                ? Math.round((completed / total) * 100)
                : 0;

              return (
                <div
                  key={course.course_id}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >

                  {/* THUMBNAIL */}
                  <div className="h-44 overflow-hidden bg-gray-100">

                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl">
                        📚
                      </div>
                    )}

                  </div>

                  {/* COURSE INFO */}
                  <div className="p-5">

                    <h3 className="mb-3 line-clamp-2 text-lg font-bold text-[#0B1F3A]">
                      {course.title}
                    </h3>

                    <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-gray-500">
                      {course.description || "Belum ada deskripsi course."}
                    </p>

                    {/* PROGRESS */}
                    <div className="mb-5 border-t border-gray-100 pt-4">

                      <div className="mb-3 flex items-center justify-between">

                        <span className="text-sm font-semibold text-[#0B1F3A]">
                          Progress Belajar
                        </span>

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

                      <p className="mt-3 text-xs text-gray-500">
                        {completed} dari {total} materi telah diselesaikan.
                      </p>

                    </div>

                    {/* STATUS */}
                    <div className="mb-4">

                      {total === 0 ? (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                          Belum ada materi
                        </span>
                      ) : progress === 100 ? (
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          ✓ Course Selesai
                        </span>
                      ) : progress > 0 ? (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          Sedang Dipelajari
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                          Belum Dimulai
                        </span>
                      )}

                    </div>

                    {/* CONTINUE BUTTON */}
                    <Link
                      href={`/student/courses/${course.course_id}`}
                      className="block rounded-lg bg-[#0B1F3A] px-4 py-3 text-center text-sm font-semibold text-white transition duration-200 hover:bg-[#18395F]"
                    >
                      Lihat Progress
                    </Link>

                  </div>

                </div>
              );
            })}

          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">

              {currentPage > 1 && (
                <Link
                  href={getPageUrl(currentPage - 1, search)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0B1F3A] transition hover:bg-gray-100"
                >
                  Sebelumnya
                </Link>
              )}

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map((page) => (

                <Link
                  key={page}
                  href={getPageUrl(page, search)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    currentPage === page
                      ? "bg-[#0B1F3A] text-white"
                      : "border border-gray-200 bg-white text-[#0B1F3A] hover:bg-gray-100"
                  }`}
                >
                  {page}
                </Link>

              ))}

              {currentPage < totalPages && (
                <Link
                  href={getPageUrl(currentPage + 1, search)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0B1F3A] transition hover:bg-gray-100"
                >
                  Selanjutnya
                </Link>
              )}

            </div>

          )}

          <p className="mt-4 text-center text-xs text-gray-400">
            Halaman {currentPage} dari {Math.max(totalPages, 1)}
          </p>

        </>

      )}

    </div>
  );
}
