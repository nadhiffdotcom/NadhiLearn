
"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import TeacherApplicationActions from "./TeacherApplicationActions";

const ITEMS_PER_PAGE = 10;

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalApplicants: 0,
    startItem: 0,
    endItem: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(page = 1) {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch(
        `/api/admin/dashboard?page=${page}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 401 || response.status === 403) {
          sessionStorage.removeItem("nadhi_token");
          window.location.href = "/login";
          return;
        }

        setError(data.message || "Gagal mengambil data Dashboard.");
        return;
      }

      setAdmin(data.admin);
      setStats(data.stats);
      setApplicants(data.applicants);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Admin dashboard error:", err);
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pageFromUrl = Number(params.get("page")) || 1;

    loadDashboard(pageFromUrl);
  }, []);

  function changePage(nextPage) {
    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages ||
      nextPage === pagination.currentPage
    ) {
      return;
    }

    const url =
      nextPage === 1
        ? "/admin/dashboard"
        : `/admin/dashboard?page=${nextPage}`;

    window.history.pushState({}, "", url);
    loadDashboard(nextPage);
  }

  return (
    <div className="min-h-screen bg-white text-[#0B1F3A]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* TOP BAR */}
        <div className="mb-6 flex justify-end pr-20">
          <a
            href="/"
            className="rounded-lg bg-[#0B1F3A] px-6 py-3 font-semibold text-white transition hover:bg-[#17385F]"
          >
            Home
          </a>
        </div>

        {loading && !admin ? (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold">
              Memuat Dashboard Admin...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-700">
            <p className="font-semibold">{error}</p>
            <button
              onClick={() => loadDashboard(pagination.currentPage)}
              className="mt-4 rounded-lg bg-[#0B1F3A] px-5 py-2 font-semibold text-white"
            >
              Coba Lagi
            </button>
          </div>
        ) : admin && stats ? (
          <>
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
                <p className="mb-3 font-semibold">Total Pengguna</p>
                <h2 className="text-4xl font-bold">
                  {stats.total_users}
                </h2>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
                <p className="mb-3 font-semibold">Total Student</p>
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
                        {pagination.startItem}-{pagination.endItem}
                      </span>{" "}
                      dari{" "}
                      <span className="font-semibold text-[#0B1F3A]">
                        {pagination.totalApplicants}
                      </span>{" "}
                      pengajuan
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          changePage(pagination.currentPage - 1)
                        }
                        disabled={pagination.currentPage <= 1 || loading}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                          pagination.currentPage <= 1 || loading
                            ? "border-gray-200 text-gray-400"
                            : "border-[#0B1F3A] text-[#0B1F3A] hover:bg-gray-100"
                        }`}
                      >
                        Sebelumnya
                      </button>

                      <span className="px-3 text-sm font-semibold">
                        {pagination.currentPage} / {pagination.totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          changePage(pagination.currentPage + 1)
                        }
                        disabled={
                          pagination.currentPage >= pagination.totalPages ||
                          loading
                        }
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                          pagination.currentPage >= pagination.totalPages ||
                          loading
                            ? "border-gray-200 text-gray-400"
                            : "border-[#0B1F3A] text-[#0B1F3A] hover:bg-gray-100"
                        }`}
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </>
        ) : null}
      </div>

      <footer className="mt-10 border-t border-gray-200 bg-white px-6 py-6 text-center text-[#0B1F3A]">
        <p className="font-semibold">
          © 2026 NadhiLearn. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
