import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// ========================================
// HELPER: FORMAT TANGGAL
// ========================================
function formatDate(date) {
  if (!date) return "-";

  const dateString =
    date instanceof Date
      ? date.toISOString().slice(0, 10)
      : String(date).slice(0, 10);

  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ========================================
// HELPER: PAGE URL
// ========================================
function getPageUrl(page, search) {
  const params = new URLSearchParams();

  if (search) params.set("q", search);

  params.set("page", String(page));

  return `/student/my-courses?${params.toString()}`;
}

// ========================================
// MAIN PAGE
// ========================================
export default async function MyCoursesPage({ searchParams }) {
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

  if (!token) {
    redirect("/login");
  }

  const student = await verifyToken(token);

  if (!student || student.role !== "student" || !student.id) {
    redirect("/login");
  }

  // ========================================
  // COUNT ENROLLED COURSES
  // ========================================
  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM enrollments e
      INNER JOIN courses c
        ON c.id = e.course_id
      LEFT JOIN categories cat
        ON cat.id = c.category_id
      LEFT JOIN users teacher
        ON teacher.id = c.teacher_id
      WHERE e.student_id = $1
        AND (
          c.title ILIKE $2
          OR COALESCE(c.description, '') ILIKE $2
          OR COALESCE(cat.name, '') ILIKE $2
          OR COALESCE(teacher.username, '') ILIKE $2
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
  // GET MY COURSES + PROGRESS + CERTIFICATE
  // ========================================

  const courseResult = await pool.query(
    `
      SELECT
        c.id,
        c.title,
        c.description,
        c.thumbnail,
        c.start_date,
        c.end_date,
       cat.name AS category_name,
      teacher.display_name AS teacher_name,
      e.id AS enrollment_id,
      e.enrolled_at,

        -- TOTAL MATERI
        (
          SELECT COUNT(*)::int
          FROM contents ct
          WHERE ct.course_id = c.id
        ) AS total_contents,

        -- MATERI SELESAI
        (
          SELECT COUNT(*)::int
          FROM content_progress cp
          INNER JOIN contents ct
            ON ct.id = cp.content_id
          WHERE cp.enrollment_id = e.id
            AND cp.is_completed = TRUE
            AND ct.course_id = c.id
        ) AS completed_contents,

        -- DATA SERTIFIKAT
        cert.id AS certificate_id,
        cert.certificate_code,
        cert.issued_at

      FROM enrollments e

      INNER JOIN courses c
        ON c.id = e.course_id

      LEFT JOIN categories cat
        ON cat.id = c.category_id

      LEFT JOIN users teacher
        ON teacher.id = c.teacher_id

      LEFT JOIN certificates cert
        ON cert.enrollment_id = e.id

      WHERE e.student_id = $1
        AND (
          c.title ILIKE $2
          OR COALESCE(c.description, '') ILIKE $2
          OR COALESCE(cat.name, '') ILIKE $2
          OR COALESCE(teacher.display_name, '') ILIKE $2
          OR COALESCE(teacher.username, '') ILIKE $2
        )

      ORDER BY e.enrolled_at DESC

      LIMIT $3
      OFFSET $4
    `,
    [student.id, `%${search}%`, limit, offset]
  );

  const courses = courseResult.rows;

  // ========================================
  // RENDER PAGE
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50 px-5 py-8 md:px-8">

      {/* PAGE HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0B1F3A]">
          My Courses
        </h1>

        <p className="mt-2 text-gray-500">
          Semua course yang sudah kamu ikuti. Lanjutkan perjalanan
          belajarmu di sini.
        </p>
      </div>

      {/* SUMMARY */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Total Course Diikuti
        </p>

        <p className="mt-1 text-3xl font-bold text-[#0B1F3A]">
          {totalCourses}
        </p>
      </div>

      {/* SEARCH */}
      <form
        method="GET"
        action="/student/my-courses"
        className="mb-8 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row"
      >
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Cari course atau nama teacher..."
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]"
        />

        <button
          type="submit"
          className="rounded-lg bg-[#0B1F3A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#18395F]"
        >
          Cari Course
        </button>
      </form>

      {/* COURSE COUNT */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#0B1F3A]">
          Course Saya
        </h2>

        <p className="text-sm text-gray-500">
          {totalCourses} course
        </p>
      </div>

      {/* COURSE LIST */}
      {courses.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center">
          <div className="mb-3 text-5xl">📚</div>

          <h3 className="text-lg font-bold text-[#0B1F3A]">
            {search
              ? "Course tidak ditemukan"
              : "Kamu belum mengikuti course"}
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            {search
              ? "Coba gunakan kata kunci pencarian lainnya."
              : "Yuk, temukan course menarik dan mulai belajar sekarang!"}
          </p>

          <Link
            href="/student/courses"
            className="mt-5 inline-block rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18395F]"
          >
            Jelajahi Course
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => {
              // ========================================
              // CALCULATE PROGRESS
              // ========================================
              const totalContents = Number(course.total_contents);
              const completedContents = Number(course.completed_contents);

              const progress =
                totalContents > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (completedContents / totalContents) * 100
                      )
                    )
                  : 0;

              const isCompleted =
                totalContents > 0 && completedContents >= totalContents;

              return (
                <div
                  key={course.id}
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
                    <div className="mb-3">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {course.category_name || "Tanpa Kategori"}
                      </span>
                    </div>

                    <h3 className="mb-2 line-clamp-2 text-lg font-bold text-[#0B1F3A]">
                      {course.title}
                    </h3>

                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-500">
                      {course.description || "Belum ada deskripsi course."}
                    </p>

                    {/* TEACHER AND DATE */}
                    <div className="mb-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
                      <p className="text-gray-600">
                        <span className="font-semibold text-[#0B1F3A]">
                          Teacher:
                        </span>{" "}
                        {course.teacher_name || "Belum ditentukan"}
                      </p>

                      <p className="text-gray-600">
                        <span className="font-semibold text-[#0B1F3A]">
                          Bergabung:
                        </span>{" "}
                        {formatDate(course.enrolled_at)}
                      </p>

                      <p className="text-gray-600">
                        <span className="font-semibold text-[#0B1F3A]">
                          Periode:
                        </span>{" "}
                        {formatDate(course.start_date)} –{" "}
                        {formatDate(course.end_date)}
                      </p>
                    </div>

                    {/* PROGRESS BELAJAR */}
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#0B1F3A]">
                          Progress Belajar
                        </span>

                        <span className="text-sm font-bold text-[#0B1F3A]">
                          {progress}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isCompleted ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        {completedContents} dari {totalContents} materi selesai
                      </p>
                    </div>

                    {/* COURSE ACTION BUTTONS */}
                    {isCompleted ? (
                      <>
                        {/* COMPLETED STATUS */}
                        <div className="mb-3 rounded-lg bg-green-50 px-4 py-3 text-center">
                          <p className="text-sm font-bold text-green-700">
                            ✓ Course Selesai!
                          </p>

                          <p className="mt-1 text-xs text-green-600">
                            Kamu telah menyelesaikan seluruh materi.
                          </p>
                        </div>

                        {/* CERTIFICATE BUTTON */}
                        {course.certificate_id && (
                          <Link
                            href={`/student/certificates/${course.certificate_id}`}
                            className="mb-3 block rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-700"
                          >
                            🏆 Lihat Sertifikat
                          </Link>
                        )}

                        {/* VIEW MATERIAL BUTTON */}
                        <Link
                          href={`/student/courses/${course.id}`}
                          className="block rounded-lg border border-[#0B1F3A] px-4 py-3 text-center text-sm font-semibold text-[#0B1F3A] transition hover:bg-gray-100"
                        >
                          Lihat Materi
                        </Link>
                      </>
                    ) : (
                      /* CONTINUE LEARNING */
                      <Link
                        href={`/student/courses/${course.id}`}
                        className="block rounded-lg bg-[#0B1F3A] px-4 py-3 text-center text-sm font-semibold text-white transition duration-200 hover:bg-[#18395F]"
                      >
                        Lanjutkan Belajar
                      </Link>
                    )}
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
