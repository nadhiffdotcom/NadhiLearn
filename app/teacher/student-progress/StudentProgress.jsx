
"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";

export default function StudentProgress() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // LOAD STUDENT PROGRESS
  // ========================================
  useEffect(() => {
    let active = true;

    async function loadStudentProgress() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          page: String(page),
          search,
          course_id: courseId,
        });

        const response = await authFetch(
          `/api/teacher/student-progress?${params.toString()}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Gagal mengambil data progress siswa."
          );
        }

        if (!active) return;

        setStudents(data.students || []);
        setCourses(data.courses || []);

        setPagination(
          data.pagination || {
            page: 1,
            totalPages: 1,
            total: 0,
          }
        );
      } catch (err) {
        if (active) {
          setError(
            err.message || "Terjadi kesalahan saat mengambil data."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStudentProgress();

    return () => {
      active = false;
    };
  }, [page, search, courseId]);

  // ========================================
  // HANDLE SEARCH
  // ========================================
  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  // ========================================
  // HANDLE COURSE FILTER
  // ========================================
  function handleCourseChange(value) {
    setCourseId(value);
    setPage(1);
  }

  // ========================================
  // CALCULATE PROGRESS
  // ========================================
  function getProgress(student) {
    const total = Number(student.total_contents) || 0;
    const completed = Number(student.completed_contents) || 0;

    if (total === 0) return 0;

    return Math.min(
      100,
      Math.round((completed / total) * 100)
    );
  }

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="min-h-screen bg-[#f4f7fc] px-8 py-10 md:px-10 md:py-10">
      <div className="mx-auto w-full max-w-[1400px]">

        {/* HEADER */}
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#101b36]">
              Student Progress
            </h1>

            <p className="mt-2 text-base text-gray-500">
              Pantau perkembangan belajar siswa pada course milikmu.
            </p>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-base text-red-700">
            {error}
          </div>
        )}

        {/* SEARCH DAN FILTER */}
        <div className="mb-7 rounded-xl border border-[#dce3ef] bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama siswa, email, atau course..."
              className="w-full rounded-lg border border-gray-300 px-5 py-4 text-base text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#c2cce0] md:flex-1"
            />

            <select
              value={courseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-base text-gray-700 outline-none transition focus:border-[#c2cce0] md:w-72"
            >
              <option value="">Semua Course</option>

              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* STUDENT PROGRESS TABLE */}
        <div className="overflow-hidden rounded-xl border border-[#dce3ef] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-base">

              {/* TABLE HEADER */}
              <thead className="bg-gray-100 text-sm uppercase text-gray-600">
                <tr>
                  <th className="whitespace-nowrap px-6 py-5">
                    No.
                  </th>

                  <th className="whitespace-nowrap px-6 py-5">
                    Student
                  </th>

                  <th className="whitespace-nowrap px-6 py-5">
                    Course
                  </th>

                  <th className="whitespace-nowrap px-6 py-5">
                    Materi Selesai
                  </th>

                  <th className="whitespace-nowrap px-6 py-5">
                    Progress
                  </th>

                  <th className="whitespace-nowrap px-6 py-5 text-center">
                    Status
                  </th>
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-base text-gray-500"
                    >
                      Memuat data progress siswa...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-base text-red-600"
                    >
                      Gagal memuat data progress siswa.
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-base text-gray-500"
                    >
                      Belum ada siswa yang mengikuti course.
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => {
                    const progress = getProgress(student);

                    const total =
                      Number(student.total_contents) || 0;

                    const completed =
                      Number(student.completed_contents) || 0;

                    const isCompleted =
                      total > 0 && progress === 100;

                    return (
                      <tr
                        key={student.enrollment_id}
                        className="transition-colors hover:bg-[#f4f7fc]"
                      >
                        {/* NUMBER */}
                        <td className="whitespace-nowrap px-6 py-5 text-gray-600">
                          {(page - 1) * 10 + index + 1}
                        </td>

                        {/* STUDENT */}
                        <td className="px-6 py-5">
                          <p className="font-semibold text-[#101b36]">
                            {student.student_name}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            {student.student_email}
                          </p>
                        </td>

                        {/* COURSE */}
                        <td className="px-6 py-5 font-medium text-gray-700">
                          {student.course_title}
                        </td>

                        {/* COMPLETED MATERIAL */}
                        <td className="whitespace-nowrap px-6 py-5 text-gray-600">
                          {completed} / {total} materi
                        </td>

                        {/* PROGRESS */}
                        <td className="px-6 py-5">
                          <div className="flex min-w-[170px] items-center gap-3">
                            <div className="h-3 w-28 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-[#0a1f4a] transition-all duration-300"
                                style={{
                                  width: `${progress}%`,
                                }}
                              />
                            </div>

                            <span className="whitespace-nowrap font-semibold text-[#101b36]">
                              {progress}%
                            </span>
                          </div>
                        </td>

                        {/* STATUS */}
                        <td className="whitespace-nowrap px-6 py-5 text-center">
                          {isCompleted ? (
                            <span className="inline-flex rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                              Selesai
                            </span>
                          ) : (
                            <span className="inline-flex rounded-lg bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-700">
                              Belum Selesai
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

              {/* PAGINATION */}
            <div className="flex flex-col gap-4 border-t border-[#dce3ef] px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

              <p className="text-center text-sm text-gray-500 sm:text-left sm:text-base">
                Total{" "}
                <span className="font-semibold text-gray-700">
                  {pagination.total || 0}
                </span>{" "}
                data siswa
              </p>

              <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:w-auto sm:gap-2">

                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                  className="min-w-0 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-1 py-2 text-[11px] font-medium text-gray-700 transition hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-4 sm:py-3 sm:text-sm"
                >
                  Sebelumnya
                </button>

                <span className="whitespace-nowrap px-0.5 text-center text-xs text-gray-600 sm:px-2 sm:text-sm">
                  {page} / {pagination.totalPages || 1}
                </span>

                <button
                  type="button"
                  disabled={
                    page >= (pagination.totalPages || 1) || loading
                  }
                  onClick={() => setPage((p) => p + 1)}
                  className="min-w-0 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-1 py-2 text-[11px] font-medium text-gray-700 transition hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-4 sm:py-3 sm:text-sm"
                >
                  Berikutnya
                </button>
                
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
