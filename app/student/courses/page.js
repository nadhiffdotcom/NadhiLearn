
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// ========================================
// HELPER: FORMAT TANGGAL
// ========================================
function formatDate(date) {
  if (!date) return "Lifetime";

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
function getPageUrl(page, search, categoryId) {
  const params = new URLSearchParams();

  if (search) params.set("q", search);
  if (categoryId) params.set("category", categoryId);

  params.set("page", String(page));

  return `/student/courses?${params.toString()}`;
}

// ========================================
// SERVER ACTION: ENROLL COURSE
// ========================================
async function enrollCourse(formData) {
  "use server";

  const courseId = Number(formData.get("course_id"));

  if (!Number.isSafeInteger(courseId) || courseId <= 0) {
    redirect("/student/courses");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_student_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const student = await verifyToken(token);

  if (!student || student.role !== "student" || !student.id) {
    redirect("/login");
  }

  const course = await pool.query(
    "SELECT id FROM courses WHERE id = $1 LIMIT 1",
    [courseId]
  );

  if (course.rows.length === 0) {
    redirect("/student/courses");
  }

  // Mencegah enrollment ganda.
  // Pastikan ada UNIQUE constraint pada student_id dan course_id.
  await pool.query(
    `INSERT INTO enrollments
      (student_id, course_id, enrolled_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (student_id, course_id) DO NOTHING`,
    [student.id, courseId]
  );

  revalidatePath("/student/courses");
  revalidatePath("/student/my-courses");

  redirect("/student/my-courses");
}

// ========================================
// MAIN PAGE
// ========================================
export default async function CoursesPage({ searchParams }) {
  const params = await searchParams;

  const search =
    typeof params?.q === "string" ? params.q.trim() : "";

  const categoryId =
    typeof params?.category === "string" &&
    /^\d+$/.test(params.category)
      ? params.category
      : "";

  const requestedPage = Math.max(
    1,
    Number.parseInt(params?.page || "1", 10) || 1
  );

  const limit = 10;

  // ========================================
  // CHECK STUDENT LOGIN
  // ========================================
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_student_token")?.value;

  let studentId = null;

  if (token) {
    const payload = await verifyToken(token);

    if (payload?.role === "student" && payload?.id) {
      studentId = payload.id;
    }
  }

  // ========================================
  // GET CATEGORIES
  // ========================================
  const categoryResult = await pool.query(
    `SELECT id, name
     FROM categories
     ORDER BY name ASC`
  );

  const categories = categoryResult.rows;

  // ========================================
  // BUILD FILTER
  // ========================================
  function buildFilter(startIndex = 1) {
    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      const index = startIndex + values.length - 1;

      conditions.push(`
        (
          c.title ILIKE $${index}
          OR c.description ILIKE $${index}
          OR cat.name ILIKE $${index}
          OR teacher.username ILIKE $${index}
        )
      `);
    }

    if (categoryId) {
      values.push(categoryId);
      const index = startIndex + values.length - 1;

      conditions.push(`c.category_id = $${index}`);
    }

    return {
      where: conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "",
      values,
    };
  }

  // ========================================
  // COUNT COURSES
  // ========================================
  const countFilter = buildFilter(1);

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM courses c
      LEFT JOIN categories cat
        ON cat.id = c.category_id
      LEFT JOIN users teacher
        ON teacher.id = c.teacher_id
      ${countFilter.where}
    `,
    countFilter.values
  );

  const totalCourses = countResult.rows[0].total;
  const totalPages = Math.ceil(totalCourses / limit);

  const currentPage = Math.min(
    requestedPage,
    Math.max(totalPages, 1)
  );

  const offset = (currentPage - 1) * limit;

  // ========================================
  // GET COURSES
  // ========================================
  const listFilter = buildFilter(2);

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
        teacher.username AS teacher_name,
        CASE
          WHEN e.id IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS is_enrolled

      FROM courses c

      LEFT JOIN categories cat
        ON cat.id = c.category_id

      LEFT JOIN users teacher
        ON teacher.id = c.teacher_id

      LEFT JOIN enrollments e
        ON e.course_id = c.id
        AND e.student_id = $1

      ${listFilter.where}

      ORDER BY c.created_at DESC

      LIMIT $${listFilter.values.length + 2}
      OFFSET $${listFilter.values.length + 3}
    `,
    [
      studentId,
      ...listFilter.values,
      limit,
      offset,
    ]
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
          Browse Courses
        </h1>

        <p className="mt-2 text-gray-500">
          Temukan kelas dan tingkatkan kemampuanmu bersama
          pengajar terbaik.
        </p>
      </div>

      {/* SEARCH AND FILTER */}
      <form
        method="GET"
        action="/student/courses"
        className="mb-8 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row"
      >
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Cari nama course atau teacher..."
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]"
        />

        <select
          name="category"
          defaultValue={categoryId}
          className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0B1F3A]"
        >
          <option value="">Semua Kategori</option>

          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-lg bg-[#0B1F3A] px-6 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-[#18395F]"
        >
          Cari Course
        </button>
      </form>

      {/* COURSE COUNT */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#0B1F3A]">
          Semua Course
        </h2>

        <p className="text-sm text-gray-500">
          {totalCourses} course ditemukan
        </p>
      </div>

      {/* COURSE LIST */}
      {courses.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center">
          <div className="mb-3 text-4xl">📚</div>

          <h3 className="text-lg font-bold text-[#0B1F3A]">
            Course tidak ditemukan
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Coba gunakan kata kunci atau kategori lainnya.
          </p>

          <Link
            href="/student/courses"
            className="mt-5 inline-block rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#18395F]"
          >
            Reset Pencarian
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
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
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {course.category_name || "Tanpa Kategori"}
                    </span>

                    {course.is_enrolled && (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Terdaftar
                      </span>
                    )}
                  </div>

                  <h3 className="mb-2 line-clamp-2 text-lg font-bold text-[#0B1F3A]">
                    {course.title}
                  </h3>

                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-500">
                    {course.description || "Belum ada deskripsi course."}
                  </p>

                  {/* TEACHER AND PERIOD */}
                  <div className="mb-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
                    <p className="text-gray-600">
                      <span className="font-semibold text-[#0B1F3A]">
                        Teacher:
                      </span>{" "}
                      {course.teacher_name || "Belum ditentukan"}
                    </p>

                    <p className="text-gray-600">
                      <span className="font-semibold text-[#0B1F3A]">
                        Periode:
                      </span>{" "}
                      {formatDate(course.start_date)} –{" "}
                      {formatDate(course.end_date)}
                    </p>
                  </div>

                  {/* ACTION */}
                  {course.is_enrolled ? (
                    <Link
                      href="/student/my-courses"
                      className="block rounded-lg border border-[#0B1F3A] px-4 py-3 text-center text-sm font-semibold text-[#0B1F3A] transition duration-200 hover:bg-[#0B1F3A] hover:text-white"
                    >
                      Lanjutkan Belajar
                    </Link>
                  ) : studentId ? (
                    <form action={enrollCourse}>
                      <input
                        type="hidden"
                        name="course_id"
                        value={course.id}
                      />

                      <button
                        type="submit"
                        className="w-full rounded-lg bg-[#0B1F3A] px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-[#18395F]"
                      >
                        Ikuti Course
                      </button>
                    </form>
                  ) : (
                    <Link
                      href="/login"
                      className="block rounded-lg bg-[#0B1F3A] px-4 py-3 text-center text-sm font-semibold text-white transition duration-200 hover:bg-[#18395F]"
                    >
                      Login untuk Mengikuti
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={getPageUrl(
                    currentPage - 1,
                    search,
                    categoryId
                  )}
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
                  href={getPageUrl(page, search, categoryId)}
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
                  href={getPageUrl(
                    currentPage + 1,
                    search,
                    categoryId
                  )}
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
