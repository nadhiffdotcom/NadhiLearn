
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Email atau password salah.");
        return;
      }

      // Arahkan pengguna berdasarkan role
      if (data.user.role === "admin") {
        router.push("/admin/dashboard");
      } else if (
        data.user.role === "teacher" &&
        data.user.teacherStatus === "approved"
      ) {
        router.push("/teacher/dashboard");
      } else {
        // Student dan pengajuan Teacher yang masih pending
        router.push("/student/dashboard");
      }

      router.refresh();
    } catch (error) {
      setMessage("Terjadi kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B1F3A] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-[#0B1F3A]">
        <h1 className="mb-2 text-center text-3xl font-bold">
          Login NadhiLearn
        </h1>

        <p className="mb-8 text-center">
          Selamat datang kembali! Silakan login ke akunmu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block font-semibold">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-[#0B1F3A] px-4 py-3 outline-none"
              placeholder="Masukkan email"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-[#0B1F3A] px-4 py-3 outline-none"
              placeholder="Masukkan password"
            />
          </div>

          {message && (
            <p className="rounded-lg border border-[#0B1F3A] p-3 text-sm">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0B1F3A] py-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center">
          Belum punya akun?{" "}
          <a href="/register" className="font-bold underline">
            Daftar
          </a>
        </p>

        <p className="mt-4 text-center">
          <a href="/" className="font-semibold underline">
            Kembali ke Beranda
          </a>
        </p>
      </div>
    </main>
  );
}
