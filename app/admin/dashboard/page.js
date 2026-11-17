
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import TeacherApplicationActions from "./TeacherApplicationActions";

const ITEMS_PER_PAGE = 10;

export default async function AdminDashboard({ searchParams }) {
  // 1. Periksa sesi login
  const cookieStore = await cookies();
const token = cookieStore.get("nadhi_admin_token")?.value;
  if (!token) {
    redirect("/login");
  }

  let payload;

  try {
    payload = await verifyToken(token);
  } catch {
    redirect("/login");
  }

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

  // 5. Ambil nomor halaman
  const params = await searchParams;
  const requestedPage = Number(params?.page) || 1;

  // 6. Hitung total pengajuan Teacher
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM users
     WHERE teacher_status = 'pending'`
  );

  const totalApplicants = countResult.rows[0].total;

  const totalPages = Math.max(
    1,
    Math.ceil(totalApplicants / ITEMS_PER_PAGE)
  );

  const currentPage = Math.min(
    Math.max(1, Math.floor(requestedPage)),
    totalPages
  );

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // 7. Ambil pengajuan sesuai halaman
  const applicantsResult = await pool.query(
    `SELECT
      id,
      username,
      email,
      teacher_background,
      created_at
    FROM users
    WHERE teacher_status = 'pending'
    ORDER BY created_at ASC
    LIMIT $1 OFFSET $2`,
    [ITEMS_PER_PAGE, offset]
  );

  const applicants = applicantsResult.rows;

  const startItem =
    totalApplicants === 0 ? 0 : offset + 1;

  const endItem = Math.min(
    offset + ITEMS_PER_PAGE,
    totalApplicants
  );

  return (
    <div className="min-h-screen bg-white text-[#0B1F3A]">

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

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="mb-3 font-semibold">
              Total Pengguna
            </p>
            <h2 className="text-4xl font-bold">
              {stats.total_users}
            </h2>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="mb-3 font-semibold">
              Total Student
            </p>
            <h2 className="text-4xl font-bold">
              {stats.total_students}
            </h2>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="mb-3 font-semibold text-gray-600">
              Total Teacher
            </p>
            <h2 className="text-4xl font-bold">
              {stats.total_teachers}
            </h2>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="mb-3 font-semibold text-gray-600">
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

            <p className="mt-2 text-gray-600">
              Periksa calon Teacher yang meminta bergabung
              dengan NadhiLearn.
            </p>
          </div>

          {applicants.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <h3 className="mb-3 text-xl font-bold">
                Tidak Ada Pengajuan
              </h3>

              <p className="text-gray-600">
                Saat ini belum ada calon Teacher yang
                menunggu persetujuan.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {applicants.map((applicant) => (
                  <article
                    key={applicant.id}
                    className="rounded-2xl border border-gray-200 bg-white p-6"
                  >
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">
                          {applicant.username}
                        </h3>

                        <p className="mt-1 break-all text-sm text-gray-600">
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

                      <p className="whitespace-pre-wrap text-gray-700">
                        {applicant.teacher_background ||
                          "Belum mengisi latar belakang."}
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-4 text-sm">
                      <p className="text-gray-600">
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

                    <TeacherApplicationActions
                      userId={applicant.id}
                    />
                  </article>
                ))}
              </div>

              {/* PAGINATION */}
              <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row">
                <p className="text-sm text-gray-600">
                  Menampilkan{" "}
                  <span className="font-semibold text-[#0B1F3A]">
                    {startItem}-{endItem}
                  </span>{" "}
                  dari{" "}
                  <span className="font-semibold text-[#0B1F3A]">
                    {totalApplicants}
                  </span>{" "}
                  pengajuan
                </p>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/dashboard?page=${currentPage - 1}`}
                    aria-disabled={currentPage <= 1}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                      currentPage <= 1
                        ? "pointer-events-none border-gray-200 text-gray-400"
                        : "border-[#0B1F3A] text-[#0B1F3A] hover:bg-gray-100"
                    }`}
                  >
                    Sebelumnya
                  </Link>

                  <span className="px-3 text-sm font-semibold">
                    {currentPage} / {totalPages}
                  </span>

                  <Link
                    href={`/admin/dashboard?page=${currentPage + 1}`}
                    aria-disabled={currentPage >= totalPages}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                      currentPage >= totalPages
                        ? "pointer-events-none border-gray-200 text-gray-400"
                        : "border-[#0B1F3A] text-[#0B1F3A] hover:bg-gray-100"
                    }`}
                  >
                    Berikutnya
                  </Link>
                </div>
              </div>
            </>
          )}
        </section>

      </div>

      <footer className="mt-10 border-t border-gray-200 bg-white px-6 py-6 text-center text-[#0B1F3A]">
        <p className="font-semibold">
          © 2026 NadhiLearn. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
