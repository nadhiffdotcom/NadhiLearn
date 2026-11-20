
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [accountType, setAccountType] = useState("student");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [teacherBackground, setTeacherBackground] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (displayName.trim().length > 100) {
      setMessage("Display Name maksimal 100 karakter.");
      return;
    }

    if (accountType === "teacher" && !teacherBackground.trim()) {
      setMessage("Mohon isi latar belakang atau pengalaman mengajar.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          display_name: displayName.trim(),
          email,
          password,
          accountType,
          teacherBackground,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Registrasi gagal.");
        return;
      }

      alert("Registrasi berhasil! Silakan login.");
      router.push("/login");
    } catch (error) {
      setMessage("Terjadi kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#0B1F3A] px-3 py-6 sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-10">
      <div className="mx-auto w-full min-w-0 max-w-lg rounded-2xl bg-white p-4 text-[#0B1F3A] shadow-xl sm:p-8">
        <h1 className="mb-2 text-center text-2xl font-bold sm:text-3xl">
          Daftar NadhiLearn
        </h1>

        <p className="mb-6 text-center text-sm leading-relaxed sm:mb-8 sm:text-base">
          Buat akun untuk mulai belajar bersama NadhiLearn.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold sm:text-base">
              Daftar sebagai
            </label>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setAccountType("student")}
                className={`min-w-0 rounded-lg border-2 px-2 py-3 text-sm font-semibold transition sm:text-base ${
                  accountType === "student"
                    ? "border-[#0B1F3A] bg-[#0B1F3A] text-white"
                    : "border-[#0B1F3A] bg-white text-[#0B1F3A]"
                }`}
              >
                Student
              </button>

              <button
                type="button"
                onClick={() => setAccountType("teacher")}
                className={`min-w-0 rounded-lg border-2 px-2 py-3 text-sm font-semibold transition sm:text-base ${
                  accountType === "teacher"
                    ? "border-[#0B1F3A] bg-[#0B1F3A] text-white"
                    : "border-[#0B1F3A] bg-white text-[#0B1F3A]"
                }`}
              >
                Teacher
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold sm:text-base">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              autoComplete="username"
              className="w-full min-w-0 rounded-lg border border-[#0B1F3A] px-3 py-3 text-base outline-none transition focus:ring-2 focus:ring-[#0B1F3A]/20 sm:px-4"
              placeholder="Masukkan username"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold sm:text-base">
              Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={100}
              autoComplete="name"
              className="w-full min-w-0 rounded-lg border border-[#0B1F3A] px-3 py-3 text-base outline-none transition focus:ring-2 focus:ring-[#0B1F3A]/20 sm:px-4"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold sm:text-base">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full min-w-0 rounded-lg border border-[#0B1F3A] px-3 py-3 text-base outline-none transition focus:ring-2 focus:ring-[#0B1F3A]/20 sm:px-4"
              placeholder="Masukkan email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold sm:text-base">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full min-w-0 rounded-lg border border-[#0B1F3A] px-3 py-3 pr-24 text-base outline-none transition focus:ring-2 focus:ring-[#0B1F3A]/20 sm:px-4 sm:pr-24"
                placeholder="Minimal 8 karakter"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#0B1F3A] hover:text-[#17385F] focus:outline-none"
              >
                {showPassword ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>
          </div>

          {accountType === "teacher" && (
            <div>
              <label className="mb-2 block text-sm font-semibold sm:text-base">
                Latar Belakang / Pengalaman Mengajar
              </label>

              <textarea
                value={teacherBackground}
                onChange={(e) => setTeacherBackground(e.target.value)}
                required
                rows={4}
                className="w-full min-w-0 resize-y rounded-lg border border-[#0B1F3A] px-3 py-3 text-base outline-none transition focus:ring-2 focus:ring-[#0B1F3A]/20 sm:px-4"
                placeholder="Ceritakan pengalaman atau keahlian Anda..."
              />

              <p className="mt-2 text-xs leading-relaxed sm:text-sm">
                Pendaftaran Teacher akan menunggu persetujuan Admin.
              </p>
            </div>
          )}

          {message && (
            <p className="break-words rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="block w-full min-w-0 max-w-full break-words rounded-lg bg-[#0B1F3A] px-3 py-3 text-center font-bold text-white transition hover:bg-[#17385F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Daftar Sekarang"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm leading-relaxed sm:text-base">
          Sudah punya akun?{" "}
          <a href="/login" className="font-bold underline">
            Login
          </a>
        </p>

        <p className="mt-4 text-center text-sm sm:text-base">
          <a href="/" className="font-semibold underline">
            Kembali ke Beranda
          </a>
        </p>
      </div>
    </main>
  );
}
