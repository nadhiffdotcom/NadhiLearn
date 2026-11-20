
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Email atau password salah.");
        return;
      }

      // Simpan token hanya pada tab yang sedang login.
      if (!data.token) {
        setMessage("Token login tidak diterima dari server.");
        return;
      }

      sessionStorage.setItem("nadhi_token", data.token);

      // Arahkan pengguna sesuai role.
      if (data.user.role === "admin") {
        router.push("/admin/dashboard");
      } else if (
        data.user.role === "teacher" &&
        data.user.teacherStatus === "approved"
      ) {
        router.push("/teacher/dashboard");
      } else if (data.user.role === "student") {
        router.push("/student/dashboard");
      } else {
        sessionStorage.removeItem("nadhi_token");
        setMessage("Role akun tidak valid.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Terjadi kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen min-h-[100svh] items-center justify-center bg-[#0B1F3A] px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 text-[#0B1F3A] shadow-xl sm:p-8">
        <h1 className="mb-2 text-center text-2xl font-bold sm:text-3xl">
          Login NadhiLearn
        </h1>

        <p className="mb-6 text-center text-sm leading-relaxed sm:mb-8 sm:text-base">
          Selamat datang kembali! Silakan login ke akunmu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
                autoComplete="current-password"
                className="w-full min-w-0 rounded-lg border border-[#0B1F3A] px-3 py-3 pr-24 text-base outline-none transition focus:ring-2 focus:ring-[#0B1F3A]/20 sm:px-4 sm:pr-24"
                placeholder="Masukkan password"
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

          {message && (
            <p className="break-words rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0B1F3A] px-4 py-3 font-bold text-white transition hover:bg-[#17385F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm leading-relaxed sm:text-base">
          Belum punya akun?{" "}
          <a href="/register" className="font-bold underline">
            Daftar
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
