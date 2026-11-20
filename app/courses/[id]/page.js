
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PublicCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [course, setCourse] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");

  // ========================================
  // GET COURSE DETAIL
  // ========================================
  useEffect(() => {
    let active = true;

    async function loadCourse() {
      try {
        const response = await fetch(
          `/api/home/courses?id=${encodeURIComponent(id)}`,
          { credentials: "same-origin" }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Gagal mengambil data course."
          );
        }

        if (active) {
          setCourse(data.course);
          setUserRole(data.userRole);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Terjadi kesalahan.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (id) {
      loadCourse();
    }

    return () => {
      active = false;
    };
  }, [id]);

  // ========================================
  // ENROLL COURSE
  // ========================================
  async function handleEnroll() {
    try {
      setEnrolling(true);
      setError("");

      const response = await fetch("/api/home/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          course_id: Number(id),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Gagal mengikuti course."
        );
      }

      router.push(`/student/courses/${id}`);
      router.refresh();
    } catch (err) {
      setError(err.message || "Gagal mengikuti course.");
      setEnrolling(false);
    }
  }

  // ========================================
  // LOADING
  // ========================================
  if (loading) {
    return (
      <main className="min-h-screen bg-[#101b36] p-10 text-white">
        <p className="text-center">Memuat detail course...</p>
      </main>
    );
  }

  // ========================================
  // ERROR
  // ========================================
  if (error && !course) {
    return (
      <main className="min-h-screen bg-[#101b36] p-10 text-white">
        <p className="text-center text-red-400">{error}</p>

        <div className="mt-6 text-center">
          <a href="/#courses" className="underline">
            Kembali ke Courses
          </a>
        </div>
      </main>
    );
  }

  if (!course) return null;

  const totalContents = Number(course.total_contents) || 0;
  const completedContents =
    Number(course.completed_contents) || 0;

  const progress =
    totalContents > 0
      ? Math.round(
          (completedContents / totalContents) * 100
        )
      : 0;

  const isEnrolled = course.is_enrolled === true;

  // ========================================
  // RENDER
  // ========================================
  return (
    <main className="min-h-screen bg-[#101b36] px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <a
          href="/#courses"
          className="inline-block text-sm transition hover:underline"
        >
          ← Kembali ke Courses
        </a>

        <div className="mt-10 rounded-2xl border border-white/20 bg-white p-8 text-[#101b36] md:p-12">
          <p className="text-sm font-bold uppercase tracking-widest">
            {course.category_name || "Uncategorized"}
          </p>

          <h1 className="mt-5 text-4xl font-bold md:text-5xl">
            {course.title}
          </h1>

          <p className="mt-6 text-lg leading-8">
            {course.description || "Belum ada deskripsi course."}
          </p>

          <div className="mt-10 space-y-4 border-t border-[#0a1f4a]/20 pt-8">
            <div>
              <p className="text-sm font-semibold text-gray-500">
                Teacher
              </p>
              <p className="mt-1 text-lg font-medium">
                {course.teacher_name || "Belum ditentukan"}
              </p>
            </div>

            {course.teacher_email && (
              <div>
                <p className="text-sm font-semibold text-gray-500">
                  Email Teacher
                </p>
                <a
                  href={`mailto:${course.teacher_email}`}
                  className="mt-1 inline-block underline"
                >
                  {course.teacher_email}
                </a>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-gray-500">
                Jumlah Student
              </p>
              <p className="mt-1">
                {course.enrollment_count || 0} Students Enrolled
              </p>
            </div>
          </div>

          {/* ========================================
              GUEST: LOGIN / SIGN UP
          ======================================== */}
          {!userRole && (
            <div className="mt-10 rounded-xl bg-[#0a1f4a] p-6 text-white">
              <h2 className="text-xl font-bold">
                Tertarik mengikuti course ini?
              </h2>

              <p className="mt-3 leading-7 text-white/80">
                Login atau daftar sebagai Student untuk bergabung
                dengan course dan mulai belajar.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/login"
                  className="rounded-lg bg-white px-6 py-3 font-semibold text-[#101b36] transition hover:bg-gray-200"
                >
                  Login to Enroll
                </a>

                <a
                  href="/register"
                  className="rounded-lg border border-white px-6 py-3 font-semibold transition hover:bg-white hover:text-[#101b36]"
                >
                  Sign Up
                </a>
              </div>
            </div>
          )}

          {/* ========================================
              STUDENT: ALREADY ENROLLED
          ======================================== */}
          {userRole === "student" && isEnrolled && (
            <div className="mt-10 rounded-xl bg-[#0a1f4a] p-6 text-white">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">
                  Progress Belajar
                </h2>

                <span className="text-lg font-bold">
                  {progress}%
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-green-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="mt-3 text-sm text-white/80">
                {completedContents} dari {totalContents} materi telah
                diselesaikan.
              </p>

              <a
                href={`/student/courses/${id}`}
                className="mt-6 block rounded-lg bg-white px-6 py-3 text-center font-semibold text-[#101b36] transition hover:bg-gray-200"
              >
                Continue Learning
              </a>
            </div>
          )}

          {/* ========================================
              STUDENT: NOT ENROLLED
          ======================================== */}
          {userRole === "student" && !isEnrolled && (
            <div className="mt-10 rounded-xl bg-[#0a1f4a] p-6 text-white">
              <h2 className="text-xl font-bold">
                Bergabung dengan Course Ini
              </h2>

              <p className="mt-3 leading-7 text-white/80">
                Ikuti course ini untuk mulai mengakses materi
                pembelajaran.
              </p>

              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrolling}
                className="mt-6 w-full rounded-lg bg-white px-6 py-3 font-semibold text-[#101b36] transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {enrolling ? "Memproses..." : "Enroll"}
              </button>

              {error && (
                <p className="mt-3 text-sm text-red-300">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
