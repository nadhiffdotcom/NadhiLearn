"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PublicCourseDetailPage() {
  const params = useParams();
  const id = params.id;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCourse() {
      try {
        const response = await fetch(`/api/home/courses`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error("Gagal mengambil data course.");
        }

        const foundCourse = data.courses?.find(
          (item) => String(item.id) === String(id)
        );

        if (!foundCourse) {
          throw new Error("Course tidak ditemukan.");
        }

        if (active) {
          setCourse(foundCourse);
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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B1F3A] p-10 text-white">
        <p className="text-center">Memuat detail course...</p>
      </main>
    );
  }

  if (error || !course) {
    return (
      <main className="min-h-screen bg-[#0B1F3A] p-10 text-white">
        <p className="text-center text-red-400">
          {error || "Course tidak ditemukan."}
        </p>

        <div className="mt-6 text-center">
          <a href="/#courses" className="underline">
            Kembali ke Courses
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B1F3A] px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <a
          href="/#courses"
          className="inline-block text-sm transition hover:underline"
        >
          ← Kembali ke Courses
        </a>

        <div className="mt-10 rounded-2xl border border-white/20 bg-white p-8 text-[#0B1F3A] md:p-12">
          <p className="text-sm font-bold uppercase tracking-widest">
            {course.category_name || "Uncategorized"}
          </p>

          <h1 className="mt-5 text-4xl font-bold md:text-5xl">
            {course.title}
          </h1>

          <p className="mt-6 text-lg leading-8">
            {course.description || "Belum ada deskripsi course."}
          </p>

          <div className="mt-10 space-y-4 border-t border-[#0B1F3A]/20 pt-8">
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

          <div className="mt-10 rounded-xl bg-[#0B1F3A] p-6 text-white">
            <h2 className="text-xl font-bold">
              Tertarik mengikuti course ini?
            </h2>

            <p className="mt-3 leading-7 text-white/80">
              Login atau daftar sebagai Student untuk bergabung dengan
              course dan mulai belajar.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/login"
                className="rounded-lg bg-white px-6 py-3 font-semibold text-[#0B1F3A] transition hover:bg-gray-200"
              >
                Login to Enroll
              </a>

              <a
                href="/register"
                className="rounded-lg border border-white px-6 py-3 font-semibold transition hover:bg-white hover:text-[#0B1F3A]"
              >
                Sign Up
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
