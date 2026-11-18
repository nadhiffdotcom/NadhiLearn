
"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-client";

export default function ProfileForm({ user, overview = {} }) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full rounded-lg border border-[#0B1F3A] bg-white px-4 py-3 text-[#0B1F3A] outline-none focus:ring-2 focus:ring-[#0B1F3A]";

  const studentCourses = overview.courses || [];
  const teacherCourses = overview.courses || [];
  const teacherStudents = overview.students || [];

  // Notifikasi approval Teacher berlaku selama 24 jam
  const approvedAt = user.approvedAt
    ? new Date(user.approvedAt).getTime()
    : null;

  const showTeacherWelcome =
    user.role === "teacher" &&
    approvedAt &&
    !Number.isNaN(approvedAt) &&
    Date.now() >= approvedAt &&
    Date.now() - approvedAt < 24 * 60 * 60 * 1000;

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage("Konfirmasi password baru tidak cocok.");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setMessage("Password baru minimal 8 karakter.");
      return;
    }

    setLoading(true);

    try {
      const response = await authFetch("/api/account/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          currentPassword,
          newPassword,
        }),
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Respons API profil bukan JSON:", {
          status: response.status,
          response: text.slice(0, 500),
        });

        setMessage("Server mengirim respons yang tidak valid.");
        return;
      }

      if (!response.ok) {
        setMessage(data.message || "Gagal memperbarui akun.");
        return;
      }

      setSuccess(true);
      setMessage(data.message || "Pengaturan akun berhasil diperbarui.");

      setUsername(data.user.username);
      setEmail(data.user.email);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Update profile error:", error);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* TEACHER PENDING NOTICE */}
      {user.role === "student" &&
        user.teacherStatus === "pending" && (
          <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-6 text-yellow-900">
            <h2 className="mb-2 text-lg font-bold">
              Pengajuan Teacher Sedang Ditinjau
            </h2>

            <p className="text-sm leading-relaxed">
              Pendaftaran Teacher kamu berhasil. Saat ini pengajuan
              sedang menunggu persetujuan Admin NadhiLearn.
              Kamu akan mendapatkan akses Teacher setelah disetujui.
            </p>
          </div>
        )}

      {/* TEACHER WELCOME NOTICE */}
      {showTeacherWelcome && (
        <div className="rounded-2xl border border-green-300 bg-green-50 p-6 text-green-800">
          <h2 className="mb-2 text-lg font-bold">
            Selamat! Pengajuan Teacher Disetujui
          </h2>

          <p className="text-sm leading-relaxed">
            Selamat datang sebagai Teacher NadhiLearn.
            Sekarang kamu dapat membuat dan mengelola course
            serta memantau perkembangan belajar siswa.
          </p>
        </div>
      )}

      {/* STUDENT COURSES */}
      {user.role === "student" && (
        <section className="rounded-2xl bg-white p-6 text-[#0B1F3A] md:p-8">
          <h2 className="mb-5 text-xl font-bold">
            Course Saya
          </h2>

          {studentCourses.length === 0 ? (
            <p className="text-sm text-gray-500">
              Kamu belum mengikuti course apa pun.
            </p>
          ) : (
            <div className="space-y-5">
              {studentCourses.map((course) => (
                <div
                  key={course.enrollment_id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="mb-3 flex items-center gap-4">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="h-16 w-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                        📚
                      </div>
                    )}

                    <h3 className="font-bold">
                      {course.title}
                    </h3>
                  </div>

                  <div className="mb-2 flex justify-between text-sm">
                    <span>Progress Belajar</span>
                    <span className="font-bold">
                      {course.progress}%
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{
                        width: `${course.progress}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {course.completed_contents} dari{" "}
                    {course.total_contents} materi selesai.
                  </p>

                  <a
                    href={`/student/courses/${course.course_id}`}
                    className="mt-4 inline-block text-sm font-semibold underline"
                  >
                    Lanjutkan Belajar
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TEACHER COURSES */}
      {user.role === "teacher" && (
        <section className="rounded-2xl bg-white p-6 text-[#0B1F3A] md:p-8">
          <h2 className="mb-5 text-xl font-bold">
            Course yang Saya Kelola
          </h2>

          {teacherCourses.length === 0 ? (
            <p className="text-sm text-gray-500">
              Kamu belum membuat course.
            </p>
          ) : (
            <div className="space-y-4">
              {teacherCourses.map((course) => (
                <div
                  key={course.course_id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <h3 className="mb-3 font-bold">
                    {course.course_title}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">
                        Total Siswa
                      </p>
                      <p className="mt-1 text-xl font-bold">
                        {course.total_students}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">
                        Siswa Selesai
                      </p>
                      <p className="mt-1 text-xl font-bold text-green-600">
                        {course.completed_students}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TEACHER STUDENT PROGRESS */}
      {user.role === "teacher" && (
        <section className="rounded-2xl bg-white p-6 text-[#0B1F3A] md:p-8">
          <h2 className="mb-5 text-xl font-bold">
            Progress Siswa
          </h2>

          {teacherStudents.length === 0 ? (
            <p className="text-sm text-gray-500">
              Belum ada siswa yang mengikuti course kamu.
            </p>
          ) : (
            <div className="space-y-4">
              {teacherStudents.map((student) => (
                <div
                  key={student.enrollment_id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <p className="font-bold">
                    {student.student_name}
                  </p>

                  <p className="mb-3 text-sm text-gray-500">
                    {student.student_email}
                  </p>

                  <p className="mb-2 text-sm font-semibold">
                    {student.course_title}
                  </p>

                  <div className="mb-2 flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-bold">
                      {student.progress}%
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#0B1F3A]"
                      style={{
                        width: `${student.progress}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {student.completed_contents} dari{" "}
                    {student.total_contents} materi selesai.
                  </p>
                </div>
              ))}
            </div>
          )}

          <a
            href="/teacher/student-progress"
            className="mt-5 inline-block text-sm font-semibold underline"
          >
            Lihat Semua Progress Siswa
          </a>
        </section>
      )}

      {/* PROFILE FORM */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-6 text-[#0B1F3A] md:p-8"
      >
        {/* JENIS AKUN */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold uppercase">
            Jenis Akun
          </p>

          <div className="rounded-lg border border-[#0B1F3A] px-4 py-3 font-bold capitalize">
            {user.role}
          </div>
        </div>

        {/* USERNAME */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold">
            Username
          </label>

          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={inputClass}
            minLength={3}
            maxLength={50}
            required
          />
        </div>

        {/* EMAIL */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            required
          />
        </div>

        {/* GANTI PASSWORD */}
        <div className="mb-6 border-t border-gray-300 pt-6">
          <h2 className="mb-2 text-xl font-bold">
            Ganti Password
          </h2>

          <p className="mb-5 text-sm text-gray-600">
            Kosongkan password baru jika tidak ingin menggantinya.
          </p>

          <label className="mb-2 block font-semibold">
            Password Saat Ini
          </label>

          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={inputClass}
            autoComplete="current-password"
            required
          />
        </div>

        {/* PASSWORD BARU */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold">
            Password Baru
          </label>

          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={inputClass}
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        {/* KONFIRMASI PASSWORD */}
        <div className="mb-6">
          <label className="mb-2 block font-semibold">
            Konfirmasi Password Baru
          </label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
        </div>

        {/* PESAN */}
        {message && (
          <div
            className={`mb-6 rounded-lg border p-4 ${
              success
                ? "border-green-700 bg-green-50 text-green-800"
                : "border-red-700 bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        {/* TOMBOL SIMPAN */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#0B1F3A] px-6 py-3 font-bold text-white transition hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-2 hover:outline-[#0B1F3A] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
